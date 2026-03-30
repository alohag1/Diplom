"""
Мультиагентная система анализа рекламных креативов.
CLIP (визуальный поиск похожих) + qwen3.5:9b (анализ + рекомендации).
"""

import base64
import json
import re
from pathlib import Path

import ollama as ollama_sdk
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

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
from image_analyzer import analyze_image
from clip_embedder import CLIPEmbedder


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
    response = ollama_sdk.chat(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={"num_predict": LLM_NUM_PREDICT, "temperature": 0.2},
        think=False,
    )
    return response["message"]["content"]


def _fallback_criteria(clip_score: float) -> list[CriterionResult]:
    s = max(1, min(5, round(clip_score)))
    return [
        CriterionResult(
            id=c["id"], name=c["name"], score=s,
            analysis="Оценка на основе визуального сравнения с датасетом",
            recommendations=["Загрузите изображение повторно для детального анализа"],
        )
        for c in DESIGN_CRITERIA
    ]


class CriticAgent:
    """CLIP-поиск похожих + qwen3.5:9b для анализа."""

    def __init__(self) -> None:
        self._clip = CLIPEmbedder()

        embeddings = OllamaEmbeddings(
            model=EMBEDDING_MODEL,
            base_url=OLLAMA_BASE_URL,
        )
        self._books_store = Chroma(
            persist_directory=str(VECTORSTORE_DIR),
            embedding_function=embeddings,
        )

    def _retrieve_book_context(self, query: str) -> str:
        docs = self._books_store.similarity_search(query, k=RETRIEVER_K)
        return "\n\n".join(doc.page_content for doc in docs)

    def evaluate_all(
        self, image_path: str, image_description: str
    ) -> tuple[list[CriterionResult], dict]:
        _log("  [CLIP] Ищу визуально похожие в датасете...")
        clip_result = self._clip.score_by_neighbors(image_path, top_k=10)
        _log(f"  [CLIP] Score: {clip_result['score']}/5 "
             f"(good: {clip_result['good_count']}, bad: {clip_result['bad_count']})")
        _log(f"  [CLIP] {clip_result['verdict']}")

        _log("  [RAG] Собираю контекст из книг...")
        book_context = self._retrieve_book_context(
            "дизайн типографика цвет композиция иерархия"
        )

        prompt_text = UNIFIED_CRITIC_PROMPT.format(
            image_description=image_description,
            clip_verdict=clip_result["verdict"],
            clip_top_k=clip_result["good_count"] + clip_result["bad_count"],
            clip_good=clip_result["good_count"],
            clip_bad=clip_result["bad_count"],
            clip_score=clip_result["score"],
            clip_category=clip_result["dominant_category"],
            book_context=book_context,
            criteria_json_template=CRITERIA_JSON_TEMPLATE,
        )

        _log("  [LLM] Запрос в qwen3.5:9b (think=False)...")
        raw = _call_llm(prompt_text)
        _log(f"  [LLM] Ответ: {len(raw)} символов")

        parsed = _extract_json_array(raw)

        if not parsed:
            _log(f"  [LLM] Парсинг JSON не удался, используем CLIP-оценку")
            return _fallback_criteria(clip_result["score"]), clip_result

        criteria_map = {c["id"]: c for c in DESIGN_CRITERIA}
        results = []
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
            _log(f"  [LLM] {criteria_map[cid]['name']}: {score}/5")

        for c in DESIGN_CRITERIA:
            if not any(r.id == c["id"] for r in results):
                s = max(1, min(5, round(clip_result["score"])))
                results.append(CriterionResult(
                    id=c["id"], name=c["name"], score=s,
                    analysis="Оценка по CLIP-сравнению",
                    recommendations=["Повторите запрос"],
                ))

        return results, clip_result


class DesignAnalyzer:
    """Оркестратор: CLIP + image_analyzer + qwen3.5:9b."""

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
        description = analyze_image(image_path)
        _log(f"  [ImageAnalyzer] Готово ({len(description)} символов)")

        criteria_results, clip_result = self.critic_agent.evaluate_all(
            image_path, description
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
