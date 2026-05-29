"""Определение типа креатива по совокупности визуальных и текстовых сигналов."""

from __future__ import annotations

import re
from typing import Any

from image_analyzer import CLIP_CATEGORY_LABELS, CREATIVE_TYPE_LABELS

CLIP_TO_CREATIVE: dict[str, str] = {
    "posters": "poster",
    "web_design": "website",
    "typography": "other",
}

_TYPE_TEXT_PATTERNS: dict[str, re.Pattern[str]] = {
    "poster": re.compile(r"\b(постер|плакат|афиш|poster)\b", re.I),
    "website": re.compile(
        r"\b(сайт|веб|website|лендинг|интерфейс|экран|страниц|веб-сайт)\b",
        re.I,
    ),
    "logo": re.compile(r"\b(логотип|лого|эмблем|logo|фирменн\w*\s+знак)\b", re.I),
    "banner": re.compile(r"\b(баннер|banner|горизонтальн\w*\s+баннер)\b", re.I),
    "mockup": re.compile(r"\b(мокап|mockup|упаковк)\b", re.I),
}

_VALID_TYPES = frozenset(CREATIVE_TYPE_LABELS.keys())


def _infer_type_from_aspect(aspect_ratio: float) -> tuple[str | None, float]:
    """Эвристика по пропорциям кадра."""
    if aspect_ratio >= 2.2:
        return "banner", 0.78
    if aspect_ratio >= 1.75:
        return "banner", 0.58
    if aspect_ratio <= 0.58:
        return "poster", 0.76
    if aspect_ratio <= 0.82:
        return "poster", 0.58
    if 0.88 <= aspect_ratio <= 1.18:
        return "logo", 0.62
    if 1.22 <= aspect_ratio <= 1.72:
        return "website", 0.52
    return "other", 0.4


def _detect_type_from_text(text: str | None) -> tuple[str | None, float]:
    """Ключевые слова в описании пользователя."""
    s = (text or "").strip()
    if not s:
        return None, 0.0
    best_type: str | None = None
    best_score = 0
    for type_id, pattern in _TYPE_TEXT_PATTERNS.items():
        hits = pattern.findall(s)
        score = len(hits)
        if score > best_score:
            best_score = score
            best_type = type_id
    if not best_type:
        return None, 0.0
    return best_type, min(0.85, 0.45 + best_score * 0.2)


def _clip_to_creative(clip_category: str | None) -> tuple[str | None, float]:
    """Маппинг категории CLIP-датасета на UI-тип."""
    if not clip_category or clip_category == "unknown":
        return None, 0.0
    mapped = CLIP_TO_CREATIVE.get(clip_category)
    if not mapped:
        return None, 0.0
    return mapped, 0.65


def resolve_creative_type(
    metrics: dict[str, Any],
    *,
    clip_category: str | None = None,
    user_description: str | None = None,
    user_selected: str | None = None,
) -> dict[str, Any]:
    """Определяет тип креатива с приоритетом визуальных сигналов.

    Веса: пропорции кадра 0.50, CLIP 0.30, текст описания 0.15,
    выбор пользователя 0.05 (может быть ошибочным).

    Returns:
        dict с ключами type, label, confidence, sources.
    """
    aspect = float(metrics.get("aspect_ratio") or 1.0)
    visual_type, visual_conf = _infer_type_from_aspect(aspect)
    clip_type, clip_conf = _clip_to_creative(clip_category)
    text_type, text_conf = _detect_type_from_text(user_description)
    selected = user_selected if user_selected in _VALID_TYPES else None

    votes: dict[str, float] = {}
    sources: dict[str, str] = {}

    if visual_type:
        votes[visual_type] = votes.get(visual_type, 0.0) + visual_conf * 0.50
        sources["visual"] = visual_type
    if clip_type:
        votes[clip_type] = votes.get(clip_type, 0.0) + clip_conf * 0.30
        sources["clip"] = clip_type
    if text_type:
        votes[text_type] = votes.get(text_type, 0.0) + text_conf * 0.15
        sources["text"] = text_type
    if selected:
        votes[selected] = votes.get(selected, 0.0) + 0.05
        sources["user"] = selected

    detected = "other"
    top_weight = 0.0
    for type_id, weight in votes.items():
        if weight > top_weight:
            top_weight = weight
            detected = type_id

    if not votes and selected:
        detected = selected
        top_weight = 0.05

    label = CREATIVE_TYPE_LABELS.get(detected, "Другое")
    clip_label = CLIP_CATEGORY_LABELS.get(clip_category or "", clip_category or "")

    return {
        "type": detected,
        "label": label,
        "confidence": round(min(1.0, top_weight), 2),
        "sources": sources,
        "clip_category": clip_category,
        "clip_label": clip_label,
        "aspect_ratio": aspect,
    }
