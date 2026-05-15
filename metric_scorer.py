"""
Эвристический скоринг рекламного креатива по числовым метрикам.

Используется как fallback, когда LLM-сервер (Ollama) недоступен,
а также чтобы критерии всегда были обоснованы реальными свойствами картинки.

Каждый критерий считается независимо по своим сигналам из метрик
(контраст, насыщенность, гармония, баланс), а CLIP-оценка лишь
слегка корректирует результат — это исключает ситуацию, когда все
четыре оценки равны и зависят только от похожести на датасет.
"""

from __future__ import annotations

from typing import Any

from models import CriterionResult


def score_from_metrics(
    metrics: dict[str, Any], clip_score: float
) -> list[CriterionResult]:
    """Строит 4 независимые оценки + анализ + рекомендации.

    Args:
        metrics: Результат image_analyzer.analyze_image_full()["metrics"].
        clip_score: Оценка по сходству с эталонным датасетом (1..5).
            Используется как мягкая поправка (~±0.4 балла).

    Returns:
        Список CriterionResult для типографики, цвета, иерархии и композиции.
    """
    clip_adj = _clip_adjustment(clip_score)
    return [
        _score_typography(metrics, clip_adj, clip_score),
        _score_color(metrics, clip_adj, clip_score),
        _score_hierarchy(metrics, clip_adj, clip_score),
        _score_composition(metrics, clip_adj, clip_score),
    ]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _round_score(value: float) -> int:
    return int(max(1, min(5, round(_clamp(value, 1.0, 5.0)))))


def _clip_adjustment(clip_score: float) -> float:
    """Мягкая поправка от CLIP: ±0.4 балла.

    CLIP=5 -> +0.4, CLIP=3 -> 0, CLIP=1 -> -0.4. Не должен доминировать
    над собственными сигналами критерия.
    """
    return _clamp((clip_score - 3.0) * 0.2, -0.4, 0.4)


def _score_typography(
    metrics: dict[str, Any], clip_adj: float, clip_score: float
) -> CriterionResult:
    """Типографика: контраст текст/фон, разброс яркости, общая яркость."""
    contrast = metrics["contrast"]
    score = 3.0
    notes: list[str] = []
    recs: list[str] = []

    level = contrast["contrast_level"]
    if level == "высокий":
        score += 1.2
        notes.append("высокий контраст помогает читаемости текста")
    elif level == "средний":
        score += 0.3
        notes.append("умеренный контраст — текст читается приемлемо")
    else:
        score -= 1.0
        notes.append("низкий контраст затрудняет чтение")
        recs.append(
            "Усилите контраст между текстом и фоном — добавьте подложку или "
            "измените цвет шрифта."
        )

    std = contrast["std_deviation"]
    if std >= 60:
        score += 0.5
        notes.append("заметный разброс яркости позволяет выстроить шрифтовую иерархию")
    elif std < 25:
        score -= 0.6
        notes.append("слабый разброс яркости — иерархия шрифтов выражена плохо")
        recs.append(
            "Сделайте заметную разницу в кегле и насыщенности между заголовком "
            "и основным текстом."
        )

    brightness = contrast["mean_brightness"]
    if brightness > 220 or brightness < 25:
        score -= 0.4
        notes.append("экстремальная яркость фона мешает восприятию текста")
        recs.append(
            "Уведите фон от чистого белого/чёрного — введите 5–15% сдвига по "
            "яркости, чтобы текст не «вырывало»."
        )

    score += clip_adj
    if not recs:
        recs.append("Проверьте, что заголовок крупнее основного текста минимум в 1.5 раза.")
        recs.append("Сократите количество шрифтовых гарнитур до 1–2.")

    final = _round_score(score)
    analysis = (
        f"Контраст: {level} ({contrast['contrast_ratio']:.1f}:1), разброс яркости {std:.0f}. "
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
    metrics: dict[str, Any], clip_adj: float, clip_score: float
) -> CriterionResult:
    """Цвет: насыщенность, гармония, количество доминирующих цветов."""
    saturation = metrics["saturation"]
    harmony = metrics["harmony"]
    colors = metrics["colors"]

    score = 3.0
    notes: list[str] = []
    recs: list[str] = []

    sat = saturation["mean_saturation"]
    if 30 <= sat <= 60:
        score += 1.0
        notes.append("сбалансированная насыщенность")
    elif 60 < sat <= 75:
        score += 0.4
        notes.append("яркая, но допустимая насыщенность")
    elif sat > 75:
        score -= 0.9
        notes.append("слишком яркие цвета — глаз быстро устаёт")
        recs.append(
            "Снизьте насыщенность акцентных цветов на 15–25% — креатив станет спокойнее."
        )
    elif 15 <= sat < 30:
        score -= 0.2
        notes.append("приглушённая палитра — нейтрально")
    else:
        score -= 0.7
        notes.append("слишком блёклая палитра")
        recs.append(
            "Добавьте 1 яркий акцентный цвет (≥60% насыщенности) — он направит внимание."
        )

    if "комплементарная" in harmony:
        score += 0.6
        notes.append(f"выразительная гармония ({harmony})")
    elif "триадная" in harmony:
        score += 0.5
        notes.append(f"сбалансированная гармония ({harmony})")
    elif "аналоговая" in harmony:
        score += 0.2
        notes.append("аналоговая палитра — спокойно и чисто")
    elif "монохромная" in harmony:
        score -= 0.3
        notes.append("монохромная палитра рискует выглядеть скучно")
        recs.append(
            "Введите второй оттенок (например, для CTA) — это создаст смысловой акцент."
        )
    else:
        score -= 0.2
        notes.append(f"палитра разнородная ({harmony})")

    dominant = [c for c in colors if c["percent"] >= 5]
    n_dom = len(dominant)
    if 2 <= n_dom <= 4:
        score += 0.4
        notes.append(f"палитра компактная ({n_dom} основных цвета)")
    elif n_dom >= 6:
        score -= 0.7
        notes.append(f"слишком много заметных цветов ({n_dom})")
        recs.append(
            "Сократите палитру до 3–4 основных цветов — это упростит восприятие."
        )
    elif n_dom <= 1:
        score -= 0.4
        notes.append("в кадре фактически один доминирующий цвет")

    score += clip_adj
    if not recs:
        recs.append(
            "Закрепите за каждым цветом свою функцию: фон, основной текст, акцент."
        )

    final = _round_score(score)
    analysis = (
        f"Насыщенность: {sat:.0f}%, гармония: {harmony}, доминирующих цветов: {n_dom}. "
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
    metrics: dict[str, Any], clip_adj: float, clip_score: float
) -> CriterionResult:
    """Иерархия: фокусировка визуального веса, контраст для приоритизации."""
    contrast = metrics["contrast"]
    composition = metrics["composition"]
    zones = composition["zones_activity"]

    score = 3.0
    notes: list[str] = []
    recs: list[str] = []

    values = list(zones.values())
    max_v = max(values) if values else 0.0
    avg_v = sum(values) / len(values) if values else 0.0
    focus_ratio = max_v / max(avg_v, 0.1) if max_v > 0 else 0.0

    if focus_ratio >= 2.0:
        score += 1.3
        notes.append(
            f"яркий смысловой центр в зоне «{composition['visual_weight_center']}» "
            f"(в {focus_ratio:.1f}× выше среднего)"
        )
    elif focus_ratio >= 1.5:
        score += 0.6
        notes.append(
            f"есть выделенный центр внимания (в {focus_ratio:.1f}× выше среднего)"
        )
    elif focus_ratio >= 1.2:
        score -= 0.2
        notes.append("фокус слабовыражен")
    else:
        score -= 1.0
        notes.append("внимание распределено равномерно — нет доминанты")
        recs.append(
            "Создайте визуальный центр: укрупните главный элемент или выделите его "
            "цветом / контрастом."
        )

    if contrast["contrast_level"] == "высокий":
        score += 0.4
        notes.append("высокий контраст помогает выстроить приоритеты")
    elif contrast["contrast_level"] == "низкий":
        score -= 0.6
        notes.append("низкий контраст ослабляет иерархию")
        recs.append(
            "Используйте контраст размеров и цвета, чтобы выделить заголовок и CTA."
        )

    if 1.6 <= contrast["contrast_ratio"] / 10 <= 25.0:
        # косвенно учитываем общий диапазон яркости
        pass

    score += clip_adj
    if not recs:
        recs.append(
            "Проверьте, читается ли композиция за 3 секунды: главное → второстепенное → детали."
        )
        recs.append("Удалите элементы, которые не работают на ключевое сообщение.")

    final = _round_score(score)
    analysis = (
        f"Фокус-коэффициент: {focus_ratio:.2f} (центр — «{composition['visual_weight_center']}»). "
        f"Контраст: {contrast['contrast_level']}. CLIP-сходство: {clip_score}/5. "
        + "; ".join(notes) + "."
    )
    return CriterionResult(
        id="hierarchy",
        name="Визуальная иерархия",
        score=final,
        analysis=analysis,
        recommendations=recs[:2],
    )


def _score_composition(
    metrics: dict[str, Any], clip_adj: float, clip_score: float
) -> CriterionResult:
    """Композиция: горизонтальный/вертикальный баланс, общая уравновешенность."""
    composition = metrics["composition"]
    score = 3.0
    notes: list[str] = []
    recs: list[str] = []

    h_imb = composition["horizontal_balance"]
    v_imb = composition["vertical_balance"]
    verdict = composition["balance_verdict"]

    if "хорошо" in verdict:
        score += 1.3
        notes.append("композиция уравновешена")
    elif "умеренный" in verdict:
        score -= 0.1
        notes.append("умеренный дисбаланс — терпимо, но заметно")
        recs.append(
            "Подровняйте отступы и попробуйте сетку из 12 колонок для более точного "
            "выравнивания."
        )
    else:
        score -= 1.1
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
    if max_imb < 6:
        score += 0.3
        notes.append("дисбаланс почти нулевой")
    elif max_imb > 35:
        score -= 0.5
        notes.append(f"отклонение по яркости сторон достигает {max_imb:.0f}")

    aspect = metrics.get("aspect_ratio", 1.0)
    if 0.5 <= aspect <= 2.0:
        score += 0.2
    else:
        score -= 0.3
        notes.append(
            f"экстремальное соотношение сторон ({aspect:.2f}) усложняет композицию"
        )

    score += clip_adj
    if not recs:
        recs.append(
            "Проверьте композицию по правилу третей: ключевые элементы должны "
            "попадать на пересечения линий."
        )
        recs.append("Оставьте «воздух» по краям — не менее 5% ширины с каждой стороны.")

    final = _round_score(score)
    analysis = (
        f"Баланс: {verdict}. Гориз. отклонение {h_imb:.0f}, верт. {v_imb:.0f}. "
        f"CLIP-сходство: {clip_score}/5. " + "; ".join(notes) + "."
    )
    return CriterionResult(
        id="composition",
        name="Композиция",
        score=final,
        analysis=analysis,
        recommendations=recs[:2],
    )
