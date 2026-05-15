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
)
from models import CriterionResult, DesignAnalysis
from image_analyzer import analyze_image_full
from clip_embedder import CLIPEmbedder
from metric_scorer import score_from_metrics


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

    def evaluate_all(
        self,
        image_path: str,
        image_description: str,
        metrics: dict,
    ) -> tuple[list[CriterionResult], dict]:
        _log("  [CLIP] Ищу визуально похожие в датасете...")
        clip_result = self._clip.score_by_neighbors(image_path, top_k=10)
        _log(f"  [CLIP] Score: {clip_result['score']}/5 "
             f"(good: {clip_result.get('good_count', 0)}, "
             f"bad: {clip_result.get('bad_count', 0)})")

        try:
            results = self._evaluate_with_llm(image_description, clip_result)
            if results:
                return results, clip_result
        except Exception as e:
            _log(f"  [LLM] Ошибка ({e}). Использую эвристический скоринг.")

        _log("  [Fallback] Скоринг по метрикам + CLIP.")
        results = score_from_metrics(metrics, clip_result["score"])
        return results, clip_result

    def _evaluate_with_llm(
        self, image_description: str, clip_result: dict
    ) -> list[CriterionResult]:
        book_context = self._retrieve_book_context(
            "дизайн типографика цвет композиция иерархия"
        )
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
        self, image_path: str, category: str | None = None
    ) -> DesignAnalysis:
        _log(f"\n{'='*50}")
        _log(f"  Анализирую: {Path(image_path).name}")
        _log(f"{'='*50}")

        _log("  [ImageAnalyzer] Извлекаю метрики...")
        full = analyze_image_full(image_path)
        description = full["description"]
        metrics = full["metrics"]

        criteria_results, clip_result = self.critic_agent.evaluate_all(
            image_path, description, metrics
        )

        overall = sum(c.score for c in criteria_results) / len(criteria_results)
        summary_parts = [f"{c.name}: {c.score}/5" for c in criteria_results]
        summary = (
            f"Общая оценка: {overall:.1f}/5. "
            + ", ".join(summary_parts) + ". "
            + clip_result.get("verdict", "")
        )

        _log(f"  Итого: {overall:.1f}/5")

        return DesignAnalysis(
            image_description=description,
            criteria=criteria_results,
            overall_score=round(overall, 1),
            summary=summary,
        )

    def analyze_base64(
        self, img_b64: str, mime: str = "image/png", category: str | None = None
    ) -> DesignAnalysis:
        path = _save_base64_image(img_b64)
        return self.analyze(path, category)
