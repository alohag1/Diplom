"""
CLIP-эмбеддинги для визуального поиска похожих изображений.

Использует модель openai/clip-vit-base-patch32 (~600 МБ).
Работает на CPU, <1 сек на изображение.
"""

import json
import pickle
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

from config import BASE_DIR

CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"
CLIP_INDEX_PATH = BASE_DIR / "clip_index.pkl"


class CLIPEmbedder:
    """Создаёт CLIP-эмбеддинги и ищет похожие изображения."""

    def __init__(self) -> None:
        print("  Загружаю CLIP модель...", flush=True)
        self._processor = CLIPProcessor.from_pretrained(CLIP_MODEL_NAME)
        self._model = CLIPModel.from_pretrained(CLIP_MODEL_NAME)
        self._model.eval()
        self._index: list[dict] | None = None
        self._embeddings: np.ndarray | None = None

        if CLIP_INDEX_PATH.exists():
            self._load_index()

    def _load_index(self) -> None:
        with open(CLIP_INDEX_PATH, "rb") as f:
            data = pickle.load(f)
        self._index = data["index"]
        self._embeddings = data["embeddings"]
        print(f"  CLIP индекс: {len(self._index)} изображений", flush=True)

    @torch.no_grad()
    def _get_image_embedding(self, pixel_values: torch.Tensor) -> np.ndarray:
        """Извлекает эмбеддинг через vision_model + projection."""
        vision_out = self._model.vision_model(pixel_values=pixel_values)
        pooled = vision_out.pooler_output
        projected = self._model.visual_projection(pooled)
        return projected.detach().numpy()

    @torch.no_grad()
    def embed_image(self, image_path: str) -> np.ndarray:
        img = Image.open(image_path).convert("RGB")
        inputs = self._processor(images=img, return_tensors="pt")
        emb = self._get_image_embedding(inputs["pixel_values"])
        emb = emb.squeeze()
        emb = emb / np.linalg.norm(emb)
        return emb

    @torch.no_grad()
    def embed_images_batch(self, image_paths: list[str], batch_size: int = 32) -> np.ndarray:
        all_embs = []
        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i:i + batch_size]
            images = []
            for p in batch_paths:
                try:
                    images.append(Image.open(p).convert("RGB"))
                except Exception:
                    images.append(Image.new("RGB", (224, 224)))
            inputs = self._processor(images=images, return_tensors="pt", padding=True)
            embs = self._get_image_embedding(inputs["pixel_values"])
            norms = np.linalg.norm(embs, axis=1, keepdims=True)
            norms[norms == 0] = 1
            embs = embs / norms
            all_embs.append(embs)
        return np.vstack(all_embs)

    def find_similar(self, image_path: str, top_k: int = 10) -> list[dict]:
        """Находит top_k визуально похожих из индекса."""
        if self._index is None or self._embeddings is None:
            return []

        query_emb = self.embed_image(image_path)
        similarities = self._embeddings @ query_emb
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            item = self._index[idx].copy()
            item["similarity"] = float(similarities[idx])
            results.append(item)
        return results

    def score_by_neighbors(self, image_path: str, top_k: int = 10) -> dict:
        """Оценивает изображение по соседям из датасета."""
        neighbors = self.find_similar(image_path, top_k)
        if not neighbors:
            return {"score": 3.0, "good_ratio": 0.5, "neighbors": [], "verdict": "Индекс не загружен"}

        good_count = sum(1 for n in neighbors if n["quality"] == "good")
        bad_count = top_k - good_count
        good_ratio = good_count / top_k

        score = round(1 + good_ratio * 4, 1)

        categories = {}
        for n in neighbors:
            cat = n.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        dominant_category = max(categories, key=categories.get) if categories else "unknown"

        if good_ratio >= 0.8:
            verdict = "Высокое качество — визуально похож на лучшие примеры из датасета"
        elif good_ratio >= 0.6:
            verdict = "Выше среднего — есть сходство с хорошими примерами"
        elif good_ratio >= 0.4:
            verdict = "Среднее качество — есть черты и хороших, и плохих примеров"
        elif good_ratio >= 0.2:
            verdict = "Ниже среднего — визуально ближе к слабым примерам"
        else:
            verdict = "Низкое качество — визуально похож на худшие примеры из датасета"

        return {
            "score": score,
            "good_ratio": good_ratio,
            "good_count": good_count,
            "bad_count": bad_count,
            "dominant_category": dominant_category,
            "verdict": verdict,
            "neighbors": [
                {
                    "filename": n.get("filename", ""),
                    "quality": n["quality"],
                    "category": n.get("category", ""),
                    "similarity": round(n["similarity"], 3),
                }
                for n in neighbors[:5]
            ],
        }
