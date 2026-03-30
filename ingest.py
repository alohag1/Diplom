"""
==========================================================
  СКРИПТ 1: Загрузка PDF-книг в векторную базу данных
==========================================================

Что делает этот скрипт:
  1. Читает все PDF-файлы из папки data/
  2. Разбивает текст на фрагменты по ~1000 символов
  3. Превращает каждый фрагмент в числовой вектор (эмбеддинг)
  4. Сохраняет всё в локальную базу данных ChromaDB

Запускать ОДИН раз (или повторно, если добавили новые PDF).
"""

import sys
import time
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

from config import (
    BOOKS_DIR,
    VECTORSTORE_DIR,
    EMBEDDING_MODEL,
    OLLAMA_BASE_URL,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)


def _find_pdfs(data_dir: Path) -> list[Path]:
    """Находит все PDF-файлы в указанной папке."""
    pdfs = sorted(data_dir.glob("*.pdf"))
    if not pdfs:
        print(f"\n[!] В папке {data_dir} нет PDF-файлов.")
        print("    Положите туда ваши книги и запустите скрипт снова.\n")
        sys.exit(1)
    return pdfs


def _load_pdfs(pdf_paths: list[Path]) -> list:
    """Загружает все PDF и возвращает список страниц-документов."""
    all_docs = []
    for pdf_path in pdf_paths:
        print(f"  Загружаю: {pdf_path.name} ... ", end="", flush=True)
        try:
            loader = PyPDFLoader(str(pdf_path))
            docs = loader.load()
            all_docs.extend(docs)
            print(f"OK ({len(docs)} стр.)")
        except Exception as e:
            print(f"ОШИБКА: {e}")
    return all_docs


def _split_documents(docs: list) -> list:
    """Разбивает документы на фрагменты для поиска."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    chunks = splitter.split_documents(docs)
    return chunks


def _create_vectorstore(chunks: list) -> None:
    """Создаёт векторную базу данных из фрагментов текста."""
    embeddings = OllamaEmbeddings(
        model=EMBEDDING_MODEL,
        base_url=OLLAMA_BASE_URL,
    )

    if VECTORSTORE_DIR.exists():
        import shutil
        shutil.rmtree(VECTORSTORE_DIR)
        print("  Старая база удалена, создаю новую...")

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(VECTORSTORE_DIR),
    )


def main() -> None:
    print("=" * 60)
    print("  Design AI Analyzer — Загрузка книг в базу знаний")
    print("=" * 60)

    # Шаг 1: Поиск PDF-файлов
    print(f"\n[1/3] Ищу PDF-файлы в папке: {BOOKS_DIR}")
    pdfs = _find_pdfs(BOOKS_DIR)
    print(f"  Найдено PDF: {len(pdfs)}\n")

    # Шаг 2: Загрузка и нарезка
    print("[2/3] Загружаю и разбиваю на фрагменты:")
    docs = _load_pdfs(pdfs)
    if not docs:
        print("\n[!] Не удалось загрузить ни одной страницы.")
        sys.exit(1)

    chunks = _split_documents(docs)
    print(f"\n  Всего страниц: {len(docs)}")
    print(f"  Всего фрагментов: {len(chunks)}")

    # Шаг 3: Создание векторной базы
    print(f"\n[3/3] Создаю векторную базу данных...")
    print(f"  Модель эмбеддингов: {EMBEDDING_MODEL}")
    print(f"  Это может занять несколько минут...\n")

    start = time.time()
    _create_vectorstore(chunks)
    elapsed = time.time() - start

    print(f"\n{'=' * 60}")
    print(f"  ГОТОВО! База знаний создана за {elapsed:.0f} сек.")
    print(f"  Путь: {VECTORSTORE_DIR}")
    print(f"  Фрагментов в базе: {len(chunks)}")
    print(f"\n  Теперь запустите: python app.py")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
