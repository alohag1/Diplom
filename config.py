"""Настройки проекта Design AI Analyzer."""

from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
BOOKS_DIR = DATA_DIR / "books"
DATASET_DIR = DATA_DIR / "dataset"
VECTORSTORE_DIR = BASE_DIR / "vectorstore"
DATASET_VECTORSTORE_DIR = BASE_DIR / "vectorstore_dataset"
UPLOADS_DIR = BASE_DIR / "uploads"

OLLAMA_BASE_URL = "http://localhost:11434"

LLM_MODEL = "qwen3.5:9b"
EMBEDDING_MODEL = "nomic-embed-text"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
RETRIEVER_K = 3

LLM_NUM_PREDICT = 1024

API_PORT = 8000

CATEGORIES = ["posters", "web_design", "typography"]

DESIGN_CRITERIA = [
    {
        "id": "typography",
        "name": "Типографика",
        "query": "правила типографики шрифт читаемость кегль интерлиньяж",
    },
    {
        "id": "color",
        "name": "Цветовые решения",
        "query": "цветовая палитра гармония контраст сочетание цветов",
    },
    {
        "id": "hierarchy",
        "name": "Визуальная иерархия",
        "query": "визуальная иерархия акцент внимание приоритет элементов",
    },
    {
        "id": "composition",
        "name": "Композиция",
        "query": "композиция баланс ритм пропорции сетка размещение",
    },
]

UNIFIED_CRITIC_PROMPT = (
    "Ты — Design AI Analyzer, эксперт-критик рекламных креативов.\n\n"
    "### Метрики изображения\n{image_description}\n\n"
    "### Результат CLIP-анализа (сравнение с 2362 эталонными работами)\n"
    "{clip_verdict}\n"
    "Из {clip_top_k} визуально похожих работ: {clip_good} хороших, {clip_bad} плохих.\n"
    "CLIP-оценка: {clip_score}/5.\n"
    "Похожая категория: {clip_category}.\n\n"
    "### Знания из книг по дизайну\n{book_context}\n\n"
    "### Задача\n"
    "Оцени креатив по 4 критериям. CLIP-оценка {clip_score}/5 — это объективная "
    "визуальная оценка, учитывай её при выставлении баллов.\n"
    "Если CLIP показал высокое сходство с хорошими примерами — оценки должны быть выше.\n"
    "Если с плохими — ниже.\n"
    "Шкала: 1 — очень плохо, 5 — отлично.\n"
    "Для каждого критерия: оценку, анализ (1-2 предложения), 1-2 рекомендации.\n\n"
    "### Формат ответа (строго JSON массив, без текста до и после)\n"
    "[{criteria_json_template}]"
)

CRITERIA_JSON_TEMPLATE = (
    '{{"id": "typography", "name": "Типографика", "score": <1-5>, '
    '"analysis": "<текст>", "recommendations": ["<рек1>", "<рек2>"]}}, '
    '{{"id": "color", "name": "Цветовые решения", "score": <1-5>, '
    '"analysis": "<текст>", "recommendations": ["<рек1>", "<рек2>"]}}, '
    '{{"id": "hierarchy", "name": "Визуальная иерархия", "score": <1-5>, '
    '"analysis": "<текст>", "recommendations": ["<рек1>", "<рек2>"]}}, '
    '{{"id": "composition", "name": "Композиция", "score": <1-5>, '
    '"analysis": "<текст>", "recommendations": ["<рек1>", "<рек2>"]}}'
)

SYSTEM_PROMPT = (
    "Ты — Design AI Analyzer, эксперт-помощник по дизайну, типографике, "
    "цветоведению и UX/UI.\n"
    "Твоя задача — отвечать на вопросы пользователя, опираясь на знания "
    "из предоставленных книг.\n\n"
    "### Правила\n"
    "1. Отвечай подробно и структурированно, используя информацию из контекста.\n"
    "2. Если в контексте нет ответа — честно скажи об этом.\n"
    "3. Приводи конкретные примеры и цитаты из книг, когда это уместно.\n"
    "4. Отвечай на русском языке.\n\n"
    "### Контекст из книг\n"
    "{context}"
)
