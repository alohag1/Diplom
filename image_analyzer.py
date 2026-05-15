"""
Программный анализ изображений без vision-модели.

Извлекает из картинки числовые метрики:
- Доминирующие цвета и их палитра
- Контрастность, яркость, насыщенность
- Баланс композиции (правило третей)
- Распределение визуального веса по зонам
"""

import colorsys
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


def _rgb_to_name(r: int, g: int, b: int) -> str:
    """Приблизительное название цвета на русском."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    h_deg = h * 360
    s_pct = s * 100
    v_pct = v * 100

    if v_pct < 15:
        return "чёрный"
    if v_pct > 85 and s_pct < 10:
        return "белый"
    if s_pct < 15:
        if v_pct < 40:
            return "тёмно-серый"
        if v_pct < 70:
            return "серый"
        return "светло-серый"

    color_names = [
        (15, "красный"), (40, "оранжевый"), (70, "жёлтый"),
        (160, "зелёный"), (200, "голубой"), (260, "синий"),
        (290, "фиолетовый"), (340, "розовый"), (360, "красный"),
    ]
    for threshold, name in color_names:
        if h_deg < threshold:
            if v_pct < 40:
                return f"тёмно-{name}"
            return name
    return "красный"


def _quantize_colors(img: Image.Image, n_colors: int = 8) -> list[dict]:
    """Извлекает доминирующие цвета через квантизацию Pillow."""
    small = img.copy()
    small.thumbnail((150, 150))
    quantized = small.quantize(colors=n_colors, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    pixels = list(quantized.getdata())
    total = len(pixels)
    counts = Counter(pixels)

    colors = []
    for idx, count in counts.most_common(n_colors):
        if palette is None:
            continue
        r, g, b = palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2]
        pct = round(count / total * 100, 1)
        hex_color = f"#{r:02x}{g:02x}{b:02x}"
        name = _rgb_to_name(r, g, b)
        colors.append({
            "rgb": (r, g, b),
            "hex": hex_color,
            "name": name,
            "percent": pct,
        })
    return colors


def _analyze_contrast(img: Image.Image) -> dict:
    """Анализирует контрастность и яркость."""
    gray = np.array(img.convert("L"), dtype=np.float64)
    mean_brightness = float(np.mean(gray))
    std_brightness = float(np.std(gray))
    min_val = float(np.min(gray))
    max_val = float(np.max(gray))
    contrast_ratio = (max_val + 0.05) / (min_val + 0.05)

    if std_brightness > 70:
        contrast_level = "высокий"
    elif std_brightness > 40:
        contrast_level = "средний"
    else:
        contrast_level = "низкий"

    if mean_brightness > 180:
        brightness_level = "светлое изображение"
    elif mean_brightness > 80:
        brightness_level = "среднее по яркости"
    else:
        brightness_level = "тёмное изображение"

    return {
        "mean_brightness": round(mean_brightness, 1),
        "std_deviation": round(std_brightness, 1),
        "contrast_ratio": round(contrast_ratio, 1),
        "contrast_level": contrast_level,
        "brightness_level": brightness_level,
    }


def _analyze_saturation(img: Image.Image) -> dict:
    """Средняя насыщенность и распределение."""
    hsv = img.convert("HSV")
    arr = np.array(hsv, dtype=np.float64)
    s_channel = arr[:, :, 1]
    mean_sat = float(np.mean(s_channel)) / 255 * 100
    std_sat = float(np.std(s_channel)) / 255 * 100

    if mean_sat > 60:
        level = "высокая насыщенность (яркие, сочные цвета)"
    elif mean_sat > 30:
        level = "средняя насыщенность"
    else:
        level = "низкая насыщенность (приглушённые, пастельные тона)"

    return {
        "mean_saturation": round(mean_sat, 1),
        "saturation_level": level,
    }


def _analyze_composition(img: Image.Image) -> dict:
    """Анализ композиции: баланс по зонам, правило третей."""
    gray = np.array(img.convert("L"), dtype=np.float64)
    h, w = gray.shape

    left = float(np.mean(gray[:, : w // 2]))
    right = float(np.mean(gray[:, w // 2 :]))
    top = float(np.mean(gray[: h // 2, :]))
    bottom = float(np.mean(gray[h // 2 :, :]))

    h_balance = abs(left - right)
    v_balance = abs(top - bottom)

    if h_balance < 10 and v_balance < 10:
        balance = "хорошо сбалансировано"
    elif h_balance < 25 and v_balance < 25:
        balance = "умеренный дисбаланс"
    else:
        balance = "значительный дисбаланс"

    edge_arr = np.abs(np.diff(gray, axis=1)).astype(np.float64)
    third_h, third_w = h // 3, w // 3
    zones = {}
    zone_names = [
        ("верх-лево", (0, third_h, 0, third_w)),
        ("верх-центр", (0, third_h, third_w, 2 * third_w)),
        ("верх-право", (0, third_h, 2 * third_w, w)),
        ("центр-лево", (third_h, 2 * third_h, 0, third_w)),
        ("центр", (third_h, 2 * third_h, third_w, 2 * third_w)),
        ("центр-право", (third_h, 2 * third_h, 2 * third_w, w)),
        ("низ-лево", (2 * third_h, h, 0, third_w)),
        ("низ-центр", (2 * third_h, h, third_w, 2 * third_w)),
        ("низ-право", (2 * third_h, h, 2 * third_w, w)),
    ]
    for name, (y1, y2, x1, x2) in zone_names:
        zone_edge = edge_arr[y1:y2, x1:min(x2, edge_arr.shape[1])]
        zones[name] = round(float(np.mean(zone_edge)), 1)

    max_zone = max(zones, key=zones.get)

    return {
        "horizontal_balance": round(h_balance, 1),
        "vertical_balance": round(v_balance, 1),
        "balance_verdict": balance,
        "visual_weight_center": max_zone,
        "zones_activity": zones,
    }


def _get_color_harmony(colors: list[dict]) -> str:
    """Определяет тип цветовой гармонии."""
    hues = []
    for c in colors:
        if c["percent"] < 5:
            continue
        r, g, b = c["rgb"]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s > 0.15 and v > 0.15:
            hues.append(h * 360)

    if len(hues) < 2:
        return "монохромная (один основной цвет)"

    hue_diffs = []
    for i in range(len(hues)):
        for j in range(i + 1, len(hues)):
            diff = abs(hues[i] - hues[j])
            diff = min(diff, 360 - diff)
            hue_diffs.append(diff)

    max_diff = max(hue_diffs) if hue_diffs else 0
    avg_diff = sum(hue_diffs) / len(hue_diffs) if hue_diffs else 0

    if max_diff < 30:
        return "аналоговая (близкие оттенки)"
    if 150 < max_diff < 210:
        return "комплементарная (противоположные цвета)"
    if 90 < max_diff < 150:
        return "триадная или расщеплённая"
    return f"смешанная (разброс оттенков ~{avg_diff:.0f}°)"


def analyze_image_full(image_path: str) -> dict[str, Any]:
    """Полный анализ изображения: текстовое описание + сырые метрики."""
    img = Image.open(image_path).convert("RGB")
    w, h = img.size

    colors = _quantize_colors(img, n_colors=8)
    contrast = _analyze_contrast(img)
    saturation = _analyze_saturation(img)
    composition = _analyze_composition(img)
    harmony = _get_color_harmony(colors)

    description = _build_description_text(
        w, h, colors, harmony, contrast, saturation, composition
    )
    metrics = {
        "width": w,
        "height": h,
        "aspect_ratio": round(w / h, 2),
        "colors": colors,
        "harmony": harmony,
        "contrast": contrast,
        "saturation": saturation,
        "composition": composition,
    }
    return {"description": description, "metrics": metrics}


def analyze_image(image_path: str) -> str:
    """Текстовое описание изображения для LLM."""
    return analyze_image_full(image_path)["description"]


def _build_description_text(
    w: int,
    h: int,
    colors: list[dict],
    harmony: str,
    contrast: dict,
    saturation: dict,
    composition: dict,
) -> str:
    """Собирает читаемое описание (без markdown-заголовков и палитры)."""
    lines = [
        "Технические данные изображения",
        f"Размер: {w}x{h} пикселей, соотношение сторон: {w/h:.2f}",
        f"Тип цветовой гармонии: {harmony}",
        "",
        "Контрастность и яркость",
        f"Средняя яркость: {contrast['mean_brightness']}/255 — {contrast['brightness_level']}",
        f"Контрастность: {contrast['contrast_level']} (разброс: {contrast['std_deviation']})",
        f"Диапазон яркости: {contrast['contrast_ratio']:.1f}:1",
        "",
        "Насыщенность",
        f"Средняя насыщенность: {saturation['mean_saturation']:.0f}% — {saturation['saturation_level']}",
        "",
        "Композиция",
        f"Баланс: {composition['balance_verdict']}",
        f"Горизонтальный дисбаланс: {composition['horizontal_balance']} (лево vs право)",
        f"Вертикальный дисбаланс: {composition['vertical_balance']} (верх vs низ)",
        f"Основной визуальный вес: зона «{composition['visual_weight_center']}»",
    ]
    return "\n".join(lines)
