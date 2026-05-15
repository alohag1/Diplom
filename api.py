"""
FastAPI-сервер для анализа рекламных креативов.

Эндпоинты:
  POST /api/analyze         — загрузить изображение, получить анализ
  POST /api/analyze/base64  — изображение в base64
  POST /api/ingest-dataset  — загрузить датасет в базу
  GET  /api/health          — проверка работоспособности
"""

import json
import shutil
import uuid
from enum import Enum
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from config import UPLOADS_DIR, API_PORT, CATEGORIES, BASE_DIR
from models import DesignAnalysis, AnalysisRequest
from agents import DesignAnalyzer

UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Терем ок? API",
    description="Мультиагентный анализ рекламных креативов",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

analyzer: DesignAnalyzer | None = None
ingest_status: dict = {"running": False, "progress": 0, "total": 0, "done": False}


class CategoryEnum(str, Enum):
    poster = "poster"
    web_design = "web_design"
    typography = "typography"


PAGES = {
    "/": "index.html",
    "/home": "home.html",
    "/upload": "upload.html",
    "/catalog": "catalog.html",
    "/analyze": "analyze.html",
    "/reports": "reports.html",
    "/profile": "profile.html",
}


def _page_response(filename: str) -> FileResponse:
    return FileResponse(STATIC_DIR / filename)


@app.get("/", response_class=HTMLResponse)
async def root() -> FileResponse:
    return _page_response(PAGES["/"])


@app.get("/home", response_class=HTMLResponse)
async def home_page() -> FileResponse:
    return _page_response(PAGES["/home"])


@app.get("/upload", response_class=HTMLResponse)
async def upload_page() -> FileResponse:
    return _page_response(PAGES["/upload"])


@app.get("/catalog", response_class=HTMLResponse)
async def catalog_page() -> FileResponse:
    return _page_response(PAGES["/catalog"])


@app.get("/analyze", response_class=HTMLResponse)
async def analyze_page() -> FileResponse:
    return _page_response(PAGES["/analyze"])


@app.get("/reports", response_class=HTMLResponse)
async def reports_page() -> FileResponse:
    return _page_response(PAGES["/reports"])


@app.get("/profile", response_class=HTMLResponse)
async def profile_page() -> FileResponse:
    return _page_response(PAGES["/profile"])


def _ensure_analyzer() -> DesignAnalyzer:
    global analyzer
    if analyzer is None:
        analyzer = DesignAnalyzer()
    return analyzer


@app.on_event("startup")
async def startup() -> None:
    try:
        _ensure_analyzer()
    except Exception as e:
        print(f"[startup] Не удалось инициализировать анализатор: {e}", flush=True)


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "agents_ready": analyzer is not None,
        "ingest_status": ingest_status,
    }


def _score_color(score: int) -> str:
    colors = {1: "#e74c3c", 2: "#e67e22", 3: "#f1c40f", 4: "#2ecc71", 5: "#27ae60"}
    return colors.get(score, "#95a5a6")


def _score_bar(score: int) -> str:
    filled = score
    empty = 5 - score
    color = _score_color(score)
    blocks = f'<span style="color:{color}">{"█" * filled}</span>{"░" * empty}'
    return blocks


def _render_html_report(result: DesignAnalysis, json_str: str) -> str:
    """Генерирует красивый HTML-отчёт."""
    criteria_html = ""
    for c in result.criteria:
        recs_html = "".join(f"<li>{r}</li>" for r in c.recommendations)
        bar_pct = c.score / 5 * 100
        color = _score_color(c.score)
        criteria_html += f"""
        <div style="margin-bottom:24px;padding:16px;background:#1e1e2e;border-radius:12px;border-left:4px solid {color}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <h3 style="margin:0;color:#e0e0e0">{c.name}</h3>
                <span style="font-size:24px;font-weight:bold;color:{color}">{c.score}/5</span>
            </div>
            <div style="background:#2a2a3e;border-radius:8px;height:12px;margin-bottom:12px;overflow:hidden">
                <div style="background:linear-gradient(90deg,#e74c3c,#f1c40f,#27ae60);width:{bar_pct}%;height:100%;border-radius:8px;transition:width 0.5s"></div>
            </div>
            <p style="color:#b0b0b0;margin:0 0 8px 0">{c.analysis}</p>
            <div style="margin-top:8px">
                <strong style="color:#e0a020">Рекомендации:</strong>
                <ul style="color:#b0b0b0;margin:4px 0 0 0;padding-left:20px">{recs_html}</ul>
            </div>
        </div>"""

    overall_color = _score_color(round(result.overall_score))
    overall_pct = result.overall_score / 5 * 100

    json_escaped = json_str.replace("</", "<\\/")

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>Design AI Analyzer — Отчёт</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0d0d1a; color: #e0e0e0; margin: 0; padding: 20px; }}
        .container {{ max-width: 800px; margin: 0 auto; }}
        h1 {{ color: #e0a020; text-align: center; }}
        .overall {{ text-align: center; padding: 24px; background: #1e1e2e; border-radius: 16px; margin-bottom: 24px; }}
        .overall-score {{ font-size: 48px; font-weight: bold; color: {overall_color}; }}
        .download-btn {{ display: inline-block; padding: 10px 24px; background: #e0a020; color: #0d0d1a; border: none;
            border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; text-decoration: none; margin-top: 16px; }}
        .download-btn:hover {{ background: #c8900a; }}
    </style>
</head>
<body>
<div class="container">
    <h1>Design AI Analyzer</h1>

    <div class="overall">
        <div style="color:#888;margin-bottom:8px">Общая оценка</div>
        <div class="overall-score">{result.overall_score}/5</div>
        <div style="background:#2a2a3e;border-radius:8px;height:16px;margin:12px auto;max-width:400px;overflow:hidden">
            <div style="background:linear-gradient(90deg,#e74c3c,#f1c40f,#27ae60);width:{overall_pct}%;height:100%;border-radius:8px"></div>
        </div>
        <p style="color:#888">{result.summary}</p>
    </div>

    {criteria_html}

    <div style="text-align:center;margin-top:24px">
        <a class="download-btn" href="#" onclick="downloadJSON()">Скачать JSON-отчёт</a>
    </div>
</div>

<script>
const reportData = {json_escaped};
function downloadJSON() {{
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {{type: 'application/json'}});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-analysis-report.json';
    a.click();
    URL.revokeObjectURL(url);
}}
</script>
</body>
</html>"""


@app.post("/api/analyze")
async def analyze_upload(
    file: UploadFile = File(...),
    category: str = Form(None),
    format: str = Form("html"),
):
    """Загрузить изображение и получить анализ.

    - **file**: изображение (jpg, png, webp)
    - **category**: тип креатива (poster, web_design, typography) — необязательно
    - **format**: формат ответа: `html` (красивый отчёт) или `json`
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Загрузите изображение (jpg, png, webp)")

    cat = category.strip().lower() if category and category.strip() else None
    if cat and cat not in CATEGORIES:
        cat = None

    ext = Path(file.filename or "image.png").suffix or ".png"
    save_path = UPLOADS_DIR / f"{uuid.uuid4().hex}{ext}"

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = _ensure_analyzer().analyze(str(save_path), cat)
    except Exception as e:
        raise HTTPException(500, f"Ошибка анализа: {e}")

    json_str = result.model_dump_json(ensure_ascii=False)

    if format and format.strip().lower() == "json":
        return JSONResponse(content=result.model_dump())

    return HTMLResponse(content=_render_html_report(result, json_str))


@app.post("/api/analyze/base64", response_model=DesignAnalysis)
async def analyze_base64(request: AnalysisRequest) -> DesignAnalysis:
    """Передать изображение в base64 и получить JSON-анализ."""
    if not request.image_base64:
        raise HTTPException(400, "Поле image_base64 обязательно")

    try:
        return _ensure_analyzer().analyze_base64(request.image_base64, category=None)
    except Exception as e:
        raise HTTPException(500, f"Ошибка анализа: {e}")


def _run_ingest() -> None:
    global ingest_status
    from ingest_dataset import ingest_dataset
    try:
        ingest_dataset(progress_callback=_update_progress)
        ingest_status["done"] = True
    except Exception as e:
        ingest_status["error"] = str(e)
    finally:
        ingest_status["running"] = False


def _update_progress(current: int, total: int) -> None:
    ingest_status["progress"] = current
    ingest_status["total"] = total


@app.post("/api/ingest-dataset")
async def ingest_dataset_endpoint(background_tasks: BackgroundTasks) -> dict:
    """Запустить загрузку датасета в фоне."""
    if ingest_status["running"]:
        return {"status": "already_running", **ingest_status}

    ingest_status.update({"running": True, "progress": 0, "total": 0, "done": False})
    background_tasks.add_task(_run_ingest)
    return {"status": "started", "message": "Загрузка запущена в фоне. Проверяйте GET /api/health"}


if __name__ == "__main__":
    print(f"\n{'='*60}", flush=True)
    print(f"  Терем ок? API v2", flush=True)
    print(f"  Сайт:         http://localhost:{API_PORT}/", flush=True)
    print(f"  Документация: http://localhost:{API_PORT}/docs", flush=True)
    print(f"{'='*60}\n", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=API_PORT)
