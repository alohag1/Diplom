"""
Мультиагентная система анализа рекламных креативов.

Связка:
- ImageAnalyzer (Pillow + numpy) — числовые метрики картинки.
- CLIPEmbedder (transformers) — поиск похожих эталонных работ.
- Опционально: Ollama LLM (qwen3.5:9b) + RAG по книгам.
  Если Ollama недоступен, используется детерминированный
  metric_scorer на основе метрик и CLIP-сходства, поэтому
  анализ всегда возвращается клиенту.
"""

from __future__ import annotations

import base64
import json
import re
from pathlib import Path

from config import (
    OLLAMA_BASE_URL,
    LLM_MODEL,
    EMBEDDING_MODEL,
    VECTORSTORE_DIR,
    RETRIEVER_K,
    LLM_NUM_PREDICT,
    UNIFIED_CRITIC_PROMPT,
    CRITERIA_JSON_TEMPLATE,
    DESIGN_CRITERIA,
    UPLOADS_DIR,
    SCORER_VERSION,
)
from models import CriterionResult, DesignAnalysis, PaletteColor
from image_analyzer import (
    analyze_image_full,
    enrich_image_description,
    CREATIVE_TYPE_LABELS,
)
from clip_embedder import CLIPEmbedder
from metric_scorer import score_from_metrics, enrich_criteria_from_llm
from creative_resolver import resolve_creative_type


def _log(msg: str) -> None:
    print(msg, flush=True)


def _extract_json_array(text: str) -> list[dict]:
    patterns = [
        r"```json\s*(\[.*?\])\s*```",
        r"```\s*(\[.*?\])\s*```",
        r"(\[.*\])",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group(1))
                if isinstance(result, list):
                    return result
            except json.JSONDecodeError:
                continue
    single = re.search(r"(\{.*\})", text, re.DOTALL)
    if single:
        try:
            return [json.loads(single.group(1))]
        except json.JSONDecodeError:
            pass
    return []


def _save_base64_image(img_b64: str) -> str:
    import uuid
    UPLOADS_DIR.mkdir(exist_ok=True)
    path = UPLOADS_DIR / f"{uuid.uuid4().hex}.png"
    with open(path, "wb") as f:
        f.write(base64.b64decode(img_b64))
    return str(path)


def _call_llm(prompt: str) -> str:
    import ollama as ollama_sdk
    response = ollama_sdk.chat(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={"num_predict": LLM_NUM_PREDICT, "temperature": 0.2},
        think=False,
    )
    return response["message"]["content"]


def _criteria_from_llm(parsed: list[dict], clip_score: float) -> list[CriterionResult]:
    criteria_map = {c["id"]: c for c in DESIGN_CRITERIA}
    results: list[CriterionResult] = []
    for item in parsed:
        cid = item.get("id", "")
        if cid not in criteria_map:
            continue
        score = max(1, min(5, int(item.get("score", 3))))
        analysis = item.get("analysis", "Анализ недоступен")
        recs = item.get("recommendations", [])
        if isinstance(recs, str):
            recs = [recs]
        results.append(CriterionResult(
            id=cid,
            name=criteria_map[cid]["name"],
            score=score,
            analysis=analysis,
            recommendations=recs,
        ))
    fallback_score = max(1, min(5, round(clip_score)))
    for c in DESIGN_CRITERIA:
        if not any(r.id == c["id"] for r in results):
            results.append(CriterionResult(
                id=c["id"],
                name=c["name"],
                score=fallback_score,
                analysis="Оценка по визуальному сходству с эталонами.",
                recommendations=["Повторите анализ для уточнения деталей."],
            ))
    return results


class CriticAgent:
    """CLIP-поиск похожих + опциональный LLM (qwen3.5:9b) для анализа."""

    def __init__(self) -> None:
        self._clip = CLIPEmbedder()
        self._books_store = self._init_books_store()

    def _init_books_store(self):
        try:
            from langchain_ollama import OllamaEmbeddings
            from langchain_chroma import Chroma
            embeddings = OllamaEmbeddings(
                model=EMBEDDING_MODEL,
                base_url=OLLAMA_BASE_URL,
            )
            return Chroma(
                persist_directory=str(VECTORSTORE_DIR),
                embedding_function=embeddings,
            )
        except Exception as e:
            _log(f"  [RAG] Хранилище книг недоступно ({e}). Анализ без RAG.")
            return None

    def _retrieve_book_context(self, query: str) -> str:
        if self._books_store is None:
            return ""
        try:
            docs = self._books_store.similarity_search(query, k=RETRIEVER_K)
            return "\n\n".join(doc.page_content for doc in docs)
        except Exception as e:
            _log(f"  [RAG] Ошибка поиска ({e}). Контекст пуст.")
            return ""

    def _build_rag_context(
        self,
        creative_type_label: str,
        metrics: dict,
    ) -> str:
        """RAG-контекст по каждому критерию с учётом типа креатива."""
        sat = metrics.get("saturation", {}).get("mean_saturation", 0)
        n_colors = len([c for c in metrics.get("colors", []) if c.get("percent", 0) >= 5])
        parts: list[str] = []
        for criterion in DESIGN_CRITERIA:
            query = (
                f"{criterion['query']} {creative_type_label} рекламный креатив "
                f"насыщенность {sat:.0f}% цветов {n_colors}"
            )
            ctx = self._retrieve_book_context(query)
            if ctx:
                parts.append(f"--- {criterion['name']} ---\n{ctx}")
        if not parts:
            return self._retrieve_book_context(
                f"дизайн {creative_type_label} типографика цвет композиция иерархия"
            )
        return "\n\n".join(parts)

    def evaluate_all(
        self,
        image_path: str,
        image_description: str,
        metrics: dict,
        clip_result: dict,
        *,
        creative_type: str | None = None,
        creative_type_label: str | None = None,
        scoring_type: str | None = None,
        scoring_type_label: str | None = None,
        user_description: str | None = None,
    ) -> list[CriterionResult]:
        _log("  [CLIP] Score: {}/5 (good: {}, bad: {})".format(
            clip_result["score"],
            clip_result.get("good_count", 0),
            clip_result.get("bad_count", 0),
        ))

        type_label = scoring_type_label or creative_type_label or "креатив"
        score_type = scoring_type or creative_type or "other"
        user_desc = (user_description or "").strip() or "не указано"

        metric_results = score_from_metrics(
            metrics,
            clip_result["score"],
            creative_type=score_type,
            creative_type_label=type_label,
            clip_good_ratio=clip_result.get("good_ratio"),
        )
        _log(f"  [Metrics v{SCORER_VERSION}] Баллы: " + ", ".join(
            f"{c.id}={c.score}" for c in metric_results
        ))

        try:
            llm_results = self._evaluate_with_llm(
                image_description,
                clip_result,
                metrics=metrics,
                creative_type=creative_type or "other",
                creative_type_label=creative_type_label or type_label,
                user_description=user_desc,
            )
            if llm_results:
                _log("  [LLM] Рекомендации от модели; оценки — из метрик.")
                return enrich_criteria_from_llm(metric_results, llm_results)
        except Exception as e:
            _log(f"  [LLM] Ошибка ({e}). Только метрики.")

        return metric_results

    def _evaluate_with_llm(
        self,
        image_description: str,
        clip_result: dict,
        *,
        metrics: dict,
        creative_type: str,
        creative_type_label: str,
        user_description: str,
    ) -> list[CriterionResult]:
        book_context = self._build_rag_context(creative_type_label, metrics)
        prompt_text = UNIFIED_CRITIC_PROMPT.format(
            image_description=image_description,
            clip_verdict=clip_result["verdict"],
            clip_top_k=clip_result.get("good_count", 0)
            + clip_result.get("bad_count", 0),
            clip_good=clip_result.get("good_count", 0),
            clip_bad=clip_result.get("bad_count", 0),
            clip_score=clip_result["score"],
            clip_category=clip_result.get("dominant_category", "—"),
            book_context=book_context,
            criteria_json_template=CRITERIA_JSON_TEMPLATE,
            creative_type=creative_type,
            creative_type_label=creative_type_label,
            user_description=user_description,
        )

        _log("  [LLM] Запрос в qwen3.5:9b (think=False)...")
        raw = _call_llm(prompt_text)
        _log(f"  [LLM] Ответ: {len(raw)} символов")

        parsed = _extract_json_array(raw)
        if not parsed:
            _log("  [LLM] JSON не распознан — переход на fallback.")
            return []

        return _criteria_from_llm(parsed, clip_result["score"])


class DesignAnalyzer:
    """Оркестратор анализа: метрики + CLIP + (опционально) LLM."""

    def __init__(self) -> None:
        _log("Инициализация агентов...")
        self.critic_agent = CriticAgent()
        _log("Агенты готовы.")

    def analyze(
        self,
        image_path: str,
        category: str | None = None,
        creative_type: str | None = None,
        user_description: str | None = None,
    ) -> DesignAnalysis:
        _log(f"\n{'='*50}")
        _log(f"  Анализирую: {Path(image_path).name}")
        _log(f"{'='*50}")

        _log("  [ImageAnalyzer] Извлекаю метрики...")
        full = analyze_image_full(image_path)
        description = full["description"]
        metrics = full["metrics"]

        _log("  [CLIP] Ищу визуально похожие в датасете...")
        clip_result = self.critic_agent._clip.score_by_neighbors(image_path, top_k=10)

        resolved = resolve_creative_type(
            metrics,
            clip_category=clip_result.get("dominant_category"),
            user_description=user_description,
            user_selected=creative_type,
        )
        detected_type = resolved["type"]
        detected_label = resolved["label"]
        user_type = (
            creative_type
            if creative_type in CREATIVE_TYPE_LABELS
            else None
        )
        display_type = user_type or detected_type
        display_label = CREATIVE_TYPE_LABELS.get(display_type, detected_label)
        scoring_type = user_type or detected_type
        scoring_label = CREATIVE_TYPE_LABELS.get(scoring_type, detected_label)
        _log(
            f"  [Type] Скоринг: {scoring_label} ({scoring_type}). "
            f"Отображение: {display_label} ({display_type})."
        )

        criteria_results = self.critic_agent.evaluate_all(
            image_path,
            description,
            metrics,
            clip_result,
            creative_type=detected_type,
            creative_type_label=detected_label,
            scoring_type=scoring_type,
            scoring_type_label=scoring_label,
            user_description=user_description,
        )

        description = enrich_image_description(
            description,
            creative_type=display_type,
            user_description=user_description,
            clip_category=clip_result.get("dominant_category"),
        )

        overall = sum(c.score for c in criteria_results) / len(criteria_results)
        summary_parts = [f"{c.name}: {c.score}/5" for c in criteria_results]
        summary = (
            f"Тип креатива: {display_label}. "
            f"Общая оценка: {overall:.1f}/5. "
            + ", ".join(summary_parts) + ". "
            + clip_result.get("verdict", "")
        )

        _log(f"  Итого: {overall:.1f}/5")

        palette = [
            PaletteColor(hex=c["hex"], name=c["name"], percent=c["percent"])
            for c in metrics.get("colors", [])
        ]

        return DesignAnalysis(
            image_description=description,
            criteria=criteria_results,
            overall_score=round(overall, 1),
            summary=summary,
            creative_type=display_type,
            creative_type_label=display_label,
            palette=palette,
            scorer_version=SCORER_VERSION,
        )

    def analyze_base64(
        self,
        img_b64: str,
        mime: str = "image/png",
        category: str | None = None,
        creative_type: str | None = None,
        user_description: str | None = None,
    ) -> DesignAnalysis:
        path = _save_base64_image(img_b64)
        return self.analyze(
            path,
            category,
            creative_type=creative_type,
            user_description=user_description,
        )
