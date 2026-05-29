"""Pydantic-модели для структурированного вывода анализа дизайна."""

from pydantic import BaseModel, Field


class CriterionResult(BaseModel):
    """Результат оценки по одному критерию."""

    id: str = Field(description="Идентификатор критерия")
    name: str = Field(description="Название критерия на русском")
    score: int = Field(ge=1, le=5, description="Оценка от 1 до 5")
    analysis: str = Field(description="Текстовый анализ")
    recommendations: list[str] = Field(description="Рекомендации по улучшению")


class PaletteColor(BaseModel):
    """Доминирующий цвет изображения."""

    hex: str = Field(description="HEX-код цвета")
    name: str = Field(description="Название цвета на русском")
    percent: float = Field(description="Доля цвета на изображении, %")


class DesignAnalysis(BaseModel):
    """Полный результат анализа рекламного креатива."""

    image_description: str = Field(description="Описание изображения от vision-модели")
    criteria: list[CriterionResult] = Field(description="Оценки по критериям")
    overall_score: float = Field(description="Средняя оценка")
    summary: str = Field(description="Итоговое резюме")
    creative_type: str | None = Field(None, description="Определённый тип креатива")
    creative_type_label: str | None = Field(None, description="Название типа на русском")
    palette: list[PaletteColor] = Field(
        default_factory=list,
        description="Доминирующие цвета изображения",
    )
    scorer_version: str | None = Field(
        None,
        description="Версия алгоритма скоринга (для проверки актуальности сервера)",
    )


class AnalysisRequest(BaseModel):
    """Запрос на анализ (для JSON-body, когда изображение передаётся base64)."""

    image_base64: str | None = Field(None, description="Изображение в base64")
    filename: str | None = Field(None, description="Имя файла")
    description: str | None = Field(None, description="Текстовое описание креатива от пользователя")
    creative_type: str | None = Field(None, description="Тип креатива: poster, website, logo и т.д.")
