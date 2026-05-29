"""
Эвристический скоринг рекламного креатива по числовым метрикам.

Используется как fallback, когда LLM-сервер (Ollama) недоступен,
а также чтобы критерии всегда были обоснованы реальными свойствами картинки.

Каждый критерий считается независимо по своим сигналам из метрик
(контраст, насыщенность, гармония, баланс, перегруженность), а CLIP-оценка
слегка корректирует результат.
"""

from __future__ import annotations

from typing import Any

from models import CriterionResult


def score_from_metrics(
    metrics: dict[str, Any],
    clip_score: float,
    creative_type: str | None = None,
    creative_type_label: str | None = None,
    *,
    clip_good_ratio: float | None = None,
) -> list[CriterionResult]:
    """Строит 4 независимые оценки + анализ + рекомендации.

    Args:
        metrics: Результат image_analyzer.analyze_image_full()["metrics"].
        clip_score: Оценка по сходству с эталонным датасетом (1..5).
        creative_type: ID типа креатива (poster, website, …).
        creative_type_label: Человекочитаемое название типа.
        clip_good_ratio: Доля «хороших» соседей CLIP (0..1), если известна.

    Returns:
        Список CriterionResult для типографики, цвета, иерархии и композиции.
    """
    clip_adj = _clip_adjustment(clip_score, clip_good_ratio)
    ctx = creative_type_label or "креатив"
    clutter = _clutter_signals(metrics)
    return [
        _score_typography(metrics, clip_adj, clip_score, ctx, clutter),
        _score_color(metrics, clip_adj, clip_score, ctx, clutter),
        _score_hierarchy(metrics, clip_adj, clip_score, ctx, clutter),
        _score_composition(
            metrics, clip_adj, clip_score, ctx, creative_type, clutter
        ),
    ]


def apply_metric_caps(
    results: list[CriterionResult],
    metrics: dict[str, Any],
    *,
    clip_good_ratio: float | None = None,
) -> list[CriterionResult]:
    """Ограничивает завышенные оценки по объективным метрикам."""
    clutter = _clutter_signals(metrics)
    max_score = _quality_ceiling(clutter, clip_good_ratio)
    if max_score >= 5:
        return results

    capped: list[CriterionResult] = []
    for item in results:
        if item.score <= max_score:
            capped.append(item)
            continue
        capped.append(
            CriterionResult(
                id=item.id,
                name=item.name,
                score=max_score,
                analysis=(
                    f"{item.analysis} "
                    f"(скорректировано: индекс перегруженности {clutter['index']}/100, "
                    f"потолок {max_score}/5)."
                ),
                recommendations=item.recommendations,
            )
        )
    return capped


def enrich_criteria_from_llm(
    metric_results: list[CriterionResult],
    llm_results: list[CriterionResult],
) -> list[CriterionResult]:
    """Баллы — только из метрик; LLM дополняет рекомендации."""
    llm_map = {item.id: item for item in llm_results}
    enriched: list[CriterionResult] = []
    for metric in metric_results:
        llm = llm_map.get(metric.id)
        if not llm:
            enriched.append(metric)
            continue
        recs = metric.recommendations
        if llm.recommendations:
            merged = list(dict.fromkeys(llm.recommendations + metric.recommendations))
            recs = merged[:2]
        enriched.append(
            CriterionResult(
                id=metric.id,
                name=metric.name,
                score=metric.score,
                analysis=metric.analysis,
                recommendations=recs,
            )
        )
    return enriched


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def _round_score(value: float) -> int:
    return int(max(1, min(5, round(_clamp(value, 1.0, 5.0)))))


def _clip_adjustment(clip_score: float, clip_good_ratio: float | None) -> float:
    """Мягкая поправка от CLIP: до ±0.6 балла."""
    base = _clamp((clip_score - 3.0) * 0.2, -0.4, 0.4)
    if clip_good_ratio is None:
        return base
    if clip_good_ratio <= 0.25:
        return base - 0.35
    if clip_good_ratio <= 0.4:
        return base - 0.15
    if clip_good_ratio >= 0.75:
        return base + 0.15
    return base


def _clutter_signals(metrics: dict[str, Any]) -> dict[str, Any]:
    """Нормализованные сигналы перегруженности из метрик композиции."""
    comp = metrics.get("composition", {})
    return {
        "index": comp.get("clutter_index", 0.0),
        "level": comp.get("clutter_level", "низкая"),
        "active_zones": comp.get("active_zones_count", 0),
        "total_zones": comp.get("total_zones", 9),
        "busy_ratio": comp.get("busy_ratio", 0.0),
        "competing": comp.get("competing_zones_count", 0),
        "edge_density": comp.get("global_edge_density", 0.0),
    }


def _quality_ceiling(
    clutter: dict[str, Any],
    clip_good_ratio: float | None,
) -> int:
    """Верхний предел оценки при перегруженности и слабом CLIP-сходстве."""
    idx = clutter["index"]
    if idx >= 75:
        ceiling = 2
    elif idx >= 58:
        ceiling = 2
    elif idx >= 42:
        ceiling = 3
    elif idx >= 28:
        ceiling = 4
    else:
        ceiling = 5

    if clip_good_ratio is not None:
        if clip_good_ratio <= 0.2:
            ceiling = min(ceiling, 2)
        elif clip_good_ratio <= 0.35:
            ceiling = min(ceiling, 3)

    if clutter["competing"] >= 7:
        ceiling = min(ceiling, 2)
    elif clutter["competing"] >= 5:
        ceiling = min(ceiling, 3)

    return ceiling


def _clutter_penalty(clutter: dict[str, Any], *, strong: bool = False) -> float:
    """Штраф за визуальный шум и конкурирующие зоны."""
    idx = clutter["index"]
    penalty = 0.0
    if idx >= 72:
        penalty += 1.6 if strong else 1.3
    elif idx >= 52:
        penalty += 1.1 if strong else 0.9
    elif idx >= 32:
        penalty += 0.5

    if clutter["competing"] >= 7:
        penalty += 0.7
    elif clutter["competing"] >= 5:
        penalty += 0.4

    if clutter["busy_ratio"] >= 0.78:
        penalty += 0.5
    elif clutter["busy_ratio"] >= 0.67:
        penalty += 0.25

    return penalty


def _clutter_notes(clutter: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    if clutter["index"] >= 52:
        notes.append(
            f"перегруженность {clutter['level']} "
            f"(индекс {clutter['index']}/100)"
        )
    if clutter["competing"] >= 5:
        notes.append(
            f"{clutter['competing']} зон конкурируют за внимание"
        )
    return notes


def _clutter_recs(clutter: dict[str, Any], ctx: str) -> list[str]:
    recs: list[str] = []
    if clutter["index"] >= 42:
        recs.append(
            f"Индекс перегруженности {clutter['index']}/100 — уберите "
            f"второстепенные блоки в {ctx}, оставьте 1 главный и 1–2 "
            f"вспомогательных элемента."
        )
    if clutter["competing"] >= 5:
        recs.append(
            f"Сейчас {clutter['competing']} зон одновременно тянут внимание — "
            f"ослабьте боковые колонки и декоративные элементы."
        )
    return recs


def _score_typography(
    metrics: dict[str, Any],
    clip_adj: float,
    clip_score: float,
    ctx: str,
    clutter: dict[str, Any],
) -> CriterionResult:
    """Типографика: контраст, разброс яркости, перегруженность текстовых блоков."""
    contrast = metrics["contrast"]
    score = 2.5
    notes: list[str] = []
    recs: list[str] = []

    level = contrast["contrast_level"]
    if level == "высокий":
        score += 0.8
        notes.append("контраст текста и фона достаточный для чтения")
    elif level == "средний":
        score += 0.2
        notes.append("умеренный контраст — текст читается приемлемо")
    else:
        score -= 0.8
        notes.append("низкий контраст затрудняет чтение")
        recs.append(
            "Усилите контраст между текстом и фоном — добавьте подложку или "
            "измените цвет шрифта."
        )

    std = contrast["std_deviation"]
    n_dom = len([c for c in metrics.get("colors", []) if c.get("percent", 0) >= 5])
    visual_noise = std >= 65 and n_dom >= 4

    if std >= 60 and clutter["index"] < 45 and not visual_noise:
        score += 0.4
        notes.append("разброс яркости помогает выстроить шрифтовую иерархию")
    elif visual_noise or (std >= 60 and clutter["index"] >= 35):
        score -= 0.7
        notes.append(
            "высокий разброс яркости и много цветов — шум, а не типографическая иерархия"
        )
        recs.append(
            "Сократите число шрифтовых стилей до 2–3 и уберите декоративный текст."
        )
    elif std < 25:
        score -= 0.5
        notes.append("слабый разброс яркости — иерархия шрифтов выражена плохо")
        recs.append(
            "Сделайте заметную разницу в кегле и насыщенности между заголовком "
            "и основным текстом."
        )

    brightness = contrast["mean_brightness"]
    if brightness > 220 or brightness < 25:
        score -= 0.3
        notes.append("экстремальная яркость фона мешает восприятию текста")

    clutter_pen = _clutter_penalty(clutter, strong=True)
    if clutter_pen > 0:
        score -= clutter_pen
        notes.extend(_clutter_notes(clutter))
        recs.extend(_clutter_recs(clutter, ctx))

    score += clip_adj
    if not recs:
        recs.append(
            f"При контрасте {contrast['contrast_ratio']:.1f}:1 и разбросе яркости {std:.0f} "
            f"для {ctx}: выделите один заголовок — увеличьте его кегль минимум в 1.5× "
            f"относительно основного текста."
        )

    final = _round_score(score)
    final = min(final, _quality_ceiling(clutter, None))
    analysis = (
        f"Контраст: {level} ({contrast['contrast_ratio']:.1f}:1), разброс яркости {std:.0f}. "
        f"Перегруженность: {clutter['level']} ({clutter['index']}/100). "
        f"CLIP-сходство: {clip_score}/5. " + "; ".join(notes) + "."
    )
    return CriterionResult(
        id="typography",
        name="Типографика",
        score=final,
        analysis=analysis,
        recommendations=recs[:2],
    )


def _score_color(
    metrics: dict[str, Any],
    clip_adj: float,
    clip_score: float,
    ctx: str,
    clutter: dict[str, Any],
) -> CriterionResult:
    """Цвет: насыщенность, гармония, количество доминирующих цветов."""
    saturation = metrics["saturation"]
    harmony = metrics["harmony"]
    colors = metrics["colors"]

    score = 2.5
    notes: list[str] = []
    recs: list[str] = []

    sat = saturation["mean_saturation"]
    if 30 <= sat <= 60:
        score += 0.9
        notes.append("сбалансированная насыщенность")
    elif 60 < sat <= 75:
        score += 0.2
        notes.append("яркая, но допустимая насыщенность")
    elif sat > 75:
        score -= 1.1
        notes.append("слишком яркие цвета — глаз быстро устаёт")
        recs.append(
            "Снизьте насыщенность акцентных цветов на 15–25% — креатив станет спокойнее."
        )
    elif 15 <= sat < 30:
        score -= 0.1
        notes.append("приглушённая палитра — нейтрально")
    else:
        score -= 0.6
        notes.append("слишком блёклая палитра")
        recs.append(
            "Добавьте 1 яркий акцентный цвет (≥60% насыщенности) — он направит внимание."
        )

    if "комплементарная" in harmony:
        score += 0.5
        notes.append(f"выразительная гармония ({harmony})")
    elif "триадная" in harmony:
        score += 0.4
        notes.append(f"сбалансированная гармония ({harmony})")
    elif "аналоговая" in harmony:
        score += 0.2
        notes.append("аналоговая палитра — спокойно и чисто")
    elif "монохромная" in harmony:
        score -= 0.2
        notes.append("монохромная палитра рискует выглядеть скучно")
    else:
        score -= 0.5
        notes.append(f"палитра разнородная ({harmony})")
        recs.append(
            "Сведите палитру к 3–4 согласованным оттенкам вместо хаотичного набора."
        )

    dominant = [c for c in colors if c["percent"] >= 5]
    n_dom = len(dominant)
    if 2 <= n_dom <= 4:
        score += 0.3
        notes.append(f"палитра компактная ({n_dom} основных цвета)")
    elif n_dom >= 6:
        score -= 1.0
        notes.append(f"слишком много заметных цветов ({n_dom})")
        recs.append(
            "Сократите палитру до 3–4 основных цветов — это упростит восприятие."
        )
    elif n_dom <= 1:
        score -= 0.3
        notes.append("в кадре фактически один доминирующий цвет")

    if clutter["index"] >= 52 and n_dom >= 5:
        score -= 0.4
        notes.append("много цветов усиливает ощущение хаоса")

    score += clip_adj
    if not recs:
        dominant_names = ", ".join(c["name"] for c in dominant[:4]) or "не определены"
        recs.append(
            f"Сейчас {n_dom} заметных цветов при насыщенности {sat:.0f}% ({harmony}) — "
            f"для {ctx} оставьте 3–4: {dominant_names}."
        )

    final = _round_score(score)
    final = min(final, _quality_ceiling(clutter, None))
    analysis = (
        f"Насыщенность: {sat:.0f}%, гармония: {harmony}, доминирующих цветов: {n_dom}. "
        f"Перегруженность: {clutter['index']}/100. "
        f"CLIP-сходство: {clip_score}/5. " + "; ".join(notes) + "."
    )
    return CriterionResult(
        id="color",
        name="Цветовые решения",
        score=final,
        analysis=analysis,
        recommendations=recs[:2],
    )


def _score_hierarchy(
    metrics: dict[str, Any],
    clip_adj: float,
    clip_score: float,
    ctx: str,
    clutter: dict[str, Any],
) -> CriterionResult:
    """Иерархия: фокус внимания при низкой перегруженности."""
    contrast = metrics["contrast"]
    composition = metrics["composition"]
    zones = composition["zones_activity"]

    score = 2.5
    notes: list[str] = []
    recs: list[str] = []

    values = list(zones.values())
    max_v = max(values) if values else 0.0
    avg_v = sum(values) / len(values) if values else 0.0
    focus_ratio = max_v / max(avg_v, 0.1) if max_v > 0 else 0.0

    if clutter["competing"] >= 6:
        score -= 1.4
        notes.append(
            f"{clutter['competing']} зон одновременно конкурируют — иерархия разрушена"
        )
        recs.append(
            f"Оставьте один доминирующий блок в зоне «{composition['visual_weight_center']}», "
            f"остальные ослабьте контрастом или размером."
        )
    elif clutter["competing"] >= 4:
        score -= 0.7
        notes.append("несколько равнозначных акцентов мешают выделить главное")
    elif focus_ratio >= 2.0 and clutter["index"] < 45:
        score += 1.0
        notes.append(
            f"яркий смысловой центр в зоне «{composition['visual_weight_center']}» "
            f"(в {focus_ratio:.1f}× выше среднего)"
        )
    elif focus_ratio >= 1.5 and clutter["index"] < 52:
        score += 0.4
        notes.append(
            f"есть выделенный центр внимания (в {focus_ratio:.1f}× выше среднего)"
        )
    elif focus_ratio >= 1.2:
        score -= 0.3
        notes.append("фокус слабовыражен на фоне шума")
    else:
        score -= 0.9
        notes.append("внимание распределено равномерно — нет доминанты")
        recs.append(
            "Создайте визуальный центр: укрупните главный элемент или выделите его "
            "цветом / контрастом."
        )

    if contrast["contrast_level"] == "высокий" and clutter["index"] < 50:
        score += 0.3
        notes.append("контраст помогает выстроить приоритеты")
    elif contrast["contrast_level"] == "низкий":
        score -= 0.5
        notes.append("низкий контраст ослабляет иерархию")

    score -= _clutter_penalty(clutter) * 0.6
    notes.extend(_clutter_notes(clutter))
    recs.extend(_clutter_recs(clutter, ctx))

    score += clip_adj
    if len(recs) < 2:
        center = composition["visual_weight_center"]
        recs.append(
            f"Фокус-коэффициент {focus_ratio:.2f}, активных зон "
            f"{clutter['active_zones']}/{clutter['total_zones']} — "
            f"упростите {ctx}, оставив главный блок в «{center}»."
        )

    final = _round_score(score)
    final = min(final, _quality_ceiling(clutter, None))
    analysis = (
        f"Фокус-коэффициент: {focus_ratio:.2f} (центр — «{composition['visual_weight_center']}»). "
        f"Конкурирующих зон: {clutter['competing']}. "
        f"Перегруженность: {clutter['index']}/100. "
        f"CLIP-сходство: {clip_score}/5. " + "; ".join(notes) + "."
    )
    return CriterionResult(
        id="hierarchy",
        name="Визуальная иерархия",
        score=final,
        analysis=analysis,
        recommendations=recs[:2],
    )


def _score_composition(
    metrics: dict[str, Any],
    clip_adj: float,
    clip_score: float,
    ctx: str,
    creative_type: str | None,
    clutter: dict[str, Any],
) -> CriterionResult:
    """Композиция: баланс только при умеренной перегруженности."""
    composition = metrics["composition"]
    score = 2.5
    notes: list[str] = []
    recs: list[str] = []

    h_imb = composition["horizontal_balance"]
    v_imb = composition["vertical_balance"]
    verdict = composition["balance_verdict"]

    if clutter["index"] >= 58:
        score -= 0.8
        notes.append(
            "симметрия не спасает перегруженную композицию"
        )
        recs.append(
            f"Индекс перегруженности {clutter['index']}/100 — упростите сетку {ctx}: "
            f"меньше колонок, больше воздуха между блоками."
        )
    elif "хорошо" in verdict and clutter["index"] < 42:
        score += 0.9
        notes.append("композиция уравновешена и не перегружена")
    elif "хорошо" in verdict:
        score += 0.2
        notes.append("геометрический баланс есть, но макет перегружен деталями")
    elif "умеренный" in verdict:
        score -= 0.2
        notes.append("умеренный дисбаланс — терпимо, но заметно")
        recs.append(
            "Подровняйте отступы и попробуйте сетку из 12 колонок для более точного "
            "выравнивания."
        )
    else:
        score -= 0.9
        notes.append("заметный дисбаланс между сторонами кадра")
        if h_imb >= v_imb:
            recs.append(
                f"Лево/право расходятся на {h_imb:.0f}. Перенесите элементы или массу "
                f"на менее загруженную сторону."
            )
        else:
            recs.append(
                f"Верх/низ расходятся на {v_imb:.0f}. Уравновесьте противовесом или "
                f"измените отступы."
            )

    max_imb = max(h_imb, v_imb)
    if creative_type == "website" and v_imb >= 35:
        score -= 0.6
        notes.append(f"вертикальный дисбаланс {v_imb:.0f} — типичен для перегруженных вёрсток")
        recs.append(
            "Выровняйте вертикальный ритм: одинаковые отступы между секциями, "
            "меньше блоков разной высоты."
        )

    if max_imb < 6 and clutter["index"] < 40:
        score += 0.2
        notes.append("дисбаланс почти нулевой")
    elif max_imb > 35:
        score -= 0.4
        notes.append(f"отклонение по яркости сторон достигает {max_imb:.0f}")

    score -= _clutter_penalty(clutter, strong=True) * 0.85
    notes.extend(_clutter_notes(clutter))
    recs.extend(_clutter_recs(clutter, ctx))

    aspect = metrics.get("aspect_ratio", 1.0)
    if 0.5 <= aspect <= 2.0:
        score += 0.1
    else:
        score -= 0.3
        notes.append(
            f"экстремальное соотношение сторон ({aspect:.2f}) усложняет композицию"
        )

    score += clip_adj
    if len(recs) < 2:
        type_hint = ""
        if creative_type == "website":
            type_hint = " Для веб-страницы выровняйте блоки по сетке и уберите наложения."
        recs.append(
            f"Баланс: {verdict} (гориз. {h_imb:.0f}, верт. {v_imb:.0f})."
            f"{type_hint} Освободите края — минимум 5% ширины с каждой стороны."
        )

    final = _round_score(score)
    final = min(final, _quality_ceiling(clutter, None))
    analysis = (
        f"Баланс: {verdict}. Гориз. отклонение {h_imb:.0f}, верт. {v_imb:.0f}. "
        f"Перегруженность: {clutter['level']} ({clutter['index']}/100). "
        f"CLIP-сходство: {clip_score}/5. " + "; ".join(notes) + "."
    )
    return CriterionResult(
        id="composition",
        name="Композиция",
        score=final,
        analysis=analysis,
        recommendations=recs[:2],
    )
