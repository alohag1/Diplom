"""Pydantic-модели для структурированного вывода анализа дизайна."""

from pydantic import BaseModel, Field


class CriterionResult(BaseModel):
    """Результат оценки по одному критерию."""

    id: str = Field(description="Идентификатор критерия")
    name: str = Field(description="Название критерия на русском")
    score: int = Field(ge=1, le=5, description="Оценка от 1 до 5")
    analysis: str = Field(description="Текстовый анализ")
    recommendations: list[str] = Field(description="Рекомендации по улучшению")


class DesignAnalysis(BaseModel):
    """Полный результат анализа рекламного креатива."""

    image_description: str = Field(description="Описание изображения от vision-модели")
    criteria: list[CriterionResult] = Field(description="Оценки по критериям")
    overall_score: float = Field(description="Средняя оценка")
    summary: str = Field(description="Итоговое резюме")


class AnalysisRequest(BaseModel):
    """Запрос на анализ (для JSON-body, когда изображение передаётся base64)."""

    image_base64: str | None = Field(None, description="Изображение в base64")
    filename: str | None = Field(None, description="Имя файла")
