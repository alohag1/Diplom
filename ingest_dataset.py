"""
Загрузка датасета изображений (good/bad) в векторную базу.

Структура папок:
  dataset/
    good/
      poster/
      web_design/
      typography/
    bad/
      poster/
      web_design/
      typography/

Запуск: python ingest_dataset.py
"""

import sys
import time
from pathlib import Path
from typing import Callable

from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

from config import (
    DATASET_DIR,
    DATASET_VECTORSTORE_DIR,
    EMBEDDING_MODEL,
    OLLAMA_BASE_URL,
)
from image_analyzer import analyze_image

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def _find_images(dataset_dir: Path) -> list[dict]:
    """Находит все изображения и определяет quality/category по пути."""
    images = []
    for quality in ("good", "bad"):
        quality_dir = dataset_dir / quality
        if not quality_dir.exists():
            continue
        for category_dir in quality_dir.iterdir():
            if not category_dir.is_dir():
                continue
            category = category_dir.name
            for img_path in sorted(category_dir.iterdir()):
                if img_path.suffix.lower() in IMAGE_EXTENSIONS:
                    images.append({
                        "path": img_path,
                        "quality": quality,
                        "category": category,
                    })
    return images


def _analyze_and_create_doc(img_info: dict) -> Document | None:
    """Анализирует изображение и создаёт Document для ChromaDB."""
    try:
        metrics = analyze_image(str(img_info["path"]))
    except Exception as e:
        print(f"    Ошибка: {img_info['path'].name} — {e}", flush=True)
        return None

    quality_ru = "ХОРОШИЙ пример" if img_info["quality"] == "good" else "ПЛОХОЙ пример"
    category_map = {
        "poster": "афиша/постер",
        "web_design": "веб-дизайн",
        "typography": "типографика",
    }
    cat_ru = category_map.get(img_info["category"], img_info["category"])

    text = (
        f"Эталонный пример: {quality_ru} ({cat_ru})\n"
        f"Файл: {img_info['path'].name}\n\n"
        f"{metrics}"
    )

    return Document(
        page_content=text,
        metadata={
            "quality": img_info["quality"],
            "category": img_info["category"],
            "filename": img_info["path"].name,
            "source": str(img_info["path"]),
        },
    )


def ingest_dataset(
    progress_callback: Callable[[int, int], None] | None = None,
) -> None:
    """Загружает датасет в ChromaDB."""
    print("=" * 60, flush=True)
    print("  Загрузка датасета изображений", flush=True)
    print("=" * 60, flush=True)

    if not DATASET_DIR.exists():
        print(f"\n[!] Папка {DATASET_DIR} не найдена.", flush=True)
        print("    Создайте структуру:", flush=True)
        print("    dataset/good/poster/", flush=True)
        print("    dataset/good/web_design/", flush=True)
        print("    dataset/good/typography/", flush=True)
        print("    dataset/bad/poster/", flush=True)
        print("    dataset/bad/web_design/", flush=True)
        print("    dataset/bad/typography/", flush=True)
        return

    images = _find_images(DATASET_DIR)
    if not images:
        print("[!] Не найдено изображений в датасете.", flush=True)
        return

    print(f"\n  Найдено изображений: {len(images)}", flush=True)

    good = sum(1 for i in images if i["quality"] == "good")
    bad = sum(1 for i in images if i["quality"] == "bad")
    print(f"  Хороших: {good}, Плохих: {bad}", flush=True)

    categories = {}
    for img in images:
        cat = img["category"]
        categories[cat] = categories.get(cat, 0) + 1
    for cat, count in categories.items():
        print(f"  {cat}: {count}", flush=True)

    print(f"\n  Анализирую изображения...\n", flush=True)
    start = time.time()

    documents = []
    for i, img_info in enumerate(images):
        if progress_callback:
            progress_callback(i + 1, len(images))

        if (i + 1) % 50 == 0 or i == 0:
            elapsed = time.time() - start
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            remaining = (len(images) - i - 1) / rate if rate > 0 else 0
            print(
                f"  [{i+1}/{len(images)}] "
                f"~{remaining:.0f} сек осталось",
                flush=True,
            )

        doc = _analyze_and_create_doc(img_info)
        if doc:
            documents.append(doc)

    if not documents:
        print("[!] Не удалось обработать ни одного изображения.", flush=True)
        return

    print(f"\n  Создаю векторную базу датасета ({len(documents)} документов)...", flush=True)

    embeddings = OllamaEmbeddings(
        model=EMBEDDING_MODEL,
        base_url=OLLAMA_BASE_URL,
    )

    if DATASET_VECTORSTORE_DIR.exists():
        import shutil
        shutil.rmtree(DATASET_VECTORSTORE_DIR)

    BATCH_SIZE = 50
    for batch_start in range(0, len(documents), BATCH_SIZE):
        batch = documents[batch_start:batch_start + BATCH_SIZE]
        if batch_start == 0:
            Chroma.from_documents(
                documents=batch,
                embedding=embeddings,
                persist_directory=str(DATASET_VECTORSTORE_DIR),
            )
        else:
            store = Chroma(
                persist_directory=str(DATASET_VECTORSTORE_DIR),
                embedding_function=embeddings,
            )
            store.add_documents(batch)
        print(f"  Загружено: {min(batch_start + BATCH_SIZE, len(documents))}/{len(documents)}", flush=True)

    elapsed = time.time() - start
    print(f"\n{'='*60}", flush=True)
    print(f"  ГОТОВО! Датасет загружен за {elapsed:.0f} сек.", flush=True)
    print(f"  Документов: {len(documents)}", flush=True)
    print(f"  Путь: {DATASET_VECTORSTORE_DIR}", flush=True)
    print(f"\n  Перезапустите API: python api.py", flush=True)
    print(f"{'='*60}", flush=True)


if __name__ == "__main__":
    ingest_dataset()
