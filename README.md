# Терем ок?

Веб-приложение для анализа рекламных креативов на базе локальных AI-моделей.

Загрузите изображение — система оценит его по 4 критериям (типографика, цвет, иерархия, композиция), даст числовые оценки и практические рекомендации.

---

## Возможности

- Многостраничный веб-интерфейс: главная, загрузка, каталог, анализ, отчёты, профиль
- Анализ изображения за ~30 секунд
- 4 независимые оценки + сводный балл
- Поиск визуально похожих эталонов через CLIP
- RAG по книгам по дизайну (ChromaDB + nomic-embed-text)
- Fallback-скоринг по метрикам, если Ollama недоступна
- Интернационализация (RU/EN) на фронтенде

---

## Архитектура

| Компонент | Реализация | Назначение |
|---|---|---|
| LLM | `qwen3.5:9b` через Ollama | Анализ, оценки, рекомендации |
| Визуальный поиск | CLIP `clip-vit-base-patch32` | Поиск похожих эталонов |
| RAG | `nomic-embed-text` + ChromaDB | Контекст из книг по дизайну |
| Метрики | `image_analyzer.py` | Цвет, контраст, баланс, композиция |
| Скоринг | `metric_scorer.py` | Эвристические оценки по метрикам |
| Backend | FastAPI + Uvicorn | REST API и раздача статики |
| Frontend | HTML/CSS/JS (vanilla) | SPA-подобный UI с i18n |

### Как работает анализ

1. **CLIP** находит топ‑K визуально похожих изображений из датасета (2363 примера good/bad).
2. **`image_analyzer`** извлекает числовые метрики: палитра, контраст, насыщенность, баланс зон.
3. **RAG** достаёт релевантные фрагменты из книг по дизайну (≈1740 чанков из 6 книг).
4. **LLM (`qwen3.5:9b`)** получает метрики + контекст и возвращает JSON с оценками и рекомендациями.
5. Если LLM недоступна — `metric_scorer.py` строит оценки напрямую из метрик.

---

## Стек

- Python 3.11+
- FastAPI, Uvicorn, Pydantic
- LangChain, ChromaDB, Ollama
- PyTorch, Transformers (CLIP)
- HTML/CSS/JS без фреймворков

---

## Установка

### Требования

- Python 3.11+
- [Ollama](https://ollama.com/download)

### Шаги

```bash
git clone https://github.com/alohag1/Diplom.git
cd Diplom

python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux/macOS

pip install -r requirements.txt

ollama pull qwen3.5:9b
ollama pull nomic-embed-text
```

### Подготовка данных

Структура каталога `data/`:

```
data/
  books/                 # PDF-книги по дизайну
  dataset/
    good/                # Хорошие примеры
      posters/
      web_design/
      typography/
    bad/                 # Плохие примеры
      posters/
      web_design/
      typography/
```

Индексация (выполняется один раз):

```bash
python ingest.py              # книги -> ChromaDB
python build_clip_index.py    # CLIP-индекс датасета
python ingest_dataset.py      # метрики датасета -> ChromaDB
```

### Запуск

```bash
python api.py
```

Откройте http://localhost:8000

---

## Маршруты

### Страницы

| Путь | Описание |
|---|---|
| `/` | Стартовая страница |
| `/home` | Главная |
| `/upload` | Загрузка изображения |
| `/catalog` | Каталог эталонов |
| `/analyze` | Анализ креатива |
| `/grading` | Система оценок (шкала по критериям) |
| `/reports` | История отчётов |
| `/profile` | Профиль пользователя |

### API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | Состояние сервера и фонового импорта |
| GET | `/api/grading-rubric` | Шкала оценок (query: `lang=ru` или `en`) |
| POST | `/api/analyze` | Загрузить изображение (multipart), получить HTML или JSON |
| POST | `/api/analyze/base64` | Анализ изображения, переданного в base64 |
| POST | `/api/ingest-dataset` | Запустить импорт датасета в фоне |

Документация Swagger: http://localhost:8000/docs

---

## Критерии оценки

- **Типографика** — шрифты, читаемость, кегль, интерлиньяж
- **Цветовые решения** — палитра, гармония, контрастность
- **Визуальная иерархия** — акценты, приоритет элементов
- **Композиция** — баланс, ритм, пропорции, использование пространства

Шкала: **1 — очень плохо, 5 — отлично**.

---

## Структура проекта

```
├── api.py                  # FastAPI-сервер и роутинг страниц
├── agents.py               # Пайплайн анализа (CLIP + LLM + RAG)
├── creative_resolver.py    # Определение типа креатива
├── metric_scorer.py        # Эвристический скоринг по метрикам
├── image_analyzer.py       # Извлечение числовых метрик
├── clip_embedder.py        # CLIP-эмбеддинги и поиск похожих
├── ingest.py               # Индексация книг в ChromaDB
├── ingest_dataset.py       # Индексация метрик датасета
├── build_clip_index.py     # Построение CLIP-индекса
├── models.py               # Pydantic-модели
├── config.py               # Настройки и промпты
├── requirements.txt
└── static/
    ├── index.html
    ├── home.html
    ├── upload.html
    ├── catalog.html
    ├── analyze.html
    ├── grading.html
    ├── reports.html
    ├── profile.html
    ├── css/                # tokens, base, components, pages
    ├── js/                 # i18n, store, страницы, виджеты
    └── images/
```

---

## Настройки

Основные параметры — в `config.py`:

- `LLM_MODEL` — модель Ollama (по умолчанию `qwen3.5:9b`)
- `EMBEDDING_MODEL` — модель эмбеддингов (`nomic-embed-text`)
- `API_PORT` — порт сервера (`8000`)
- `CHUNK_SIZE`, `CHUNK_OVERLAP`, `RETRIEVER_K` — параметры RAG
- `DESIGN_CRITERIA` — список критериев и поисковых запросов
