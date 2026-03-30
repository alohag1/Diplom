"""
Индексация датасета через CLIP.
Создаёт clip_index.pkl — эмбеддинги всех 2362 изображений.

Запуск: python build_clip_index.py
"""

import pickle
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from config import DATASET_DIR, BASE_DIR
from clip_embedder import CLIPEmbedder, CLIP_INDEX_PATH

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def main() -> None:
    print("=" * 60)
    print("  CLIP-индексация датасета")
    print("=" * 60)

    if not DATASET_DIR.exists():
        print(f"\n[!] Папка {DATASET_DIR} не найдена.")
        return

    images = []
    for quality in ("good", "bad"):
        quality_dir = DATASET_DIR / quality
        if not quality_dir.exists():
            continue
        for category_dir in quality_dir.iterdir():
            if not category_dir.is_dir():
                continue
            for img_path in sorted(category_dir.iterdir()):
                if img_path.suffix.lower() in IMAGE_EXTENSIONS:
                    images.append({
                        "path": str(img_path),
                        "filename": img_path.name,
                        "quality": quality,
                        "category": category_dir.name,
                    })

    print(f"\n  Найдено изображений: {len(images)}")
    good = sum(1 for i in images if i["quality"] == "good")
    print(f"  Good: {good}, Bad: {len(images) - good}")

    embedder = CLIPEmbedder()

    print(f"\n  Создаю эмбеддинги (batch)...\n")
    start = time.time()

    paths = [img["path"] for img in images]
    embeddings = embedder.embed_images_batch(paths, batch_size=32)

    elapsed = time.time() - start
    print(f"\n  Эмбеддинги созданы за {elapsed:.0f} сек")

    index_data = {
        "index": images,
        "embeddings": embeddings,
    }
    with open(CLIP_INDEX_PATH, "wb") as f:
        pickle.dump(index_data, f)

    print(f"  Индекс сохранён: {CLIP_INDEX_PATH}")
    print(f"  Размер: {CLIP_INDEX_PATH.stat().st_size / 1024 / 1024:.1f} МБ")
    print(f"\n{'='*60}")
    print(f"  ГОТОВО!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
