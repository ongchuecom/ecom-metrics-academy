"""Lớp mỏng quanh Gemini để dễ thay bằng bản giả khi kiểm thử.
gemini-embedding-2 không nhận task_type: ghi nhiệm vụ ngay trong chữ (theo tài liệu Gemini API)."""
import numpy as np


def query_text(q: str) -> str:
    return f"task: question answering | query: {q}"


def doc_text(title: str, content: str) -> str:
    return f"title: {title or 'none'} | text: {content}"


def normalize(v) -> np.ndarray:
    v = np.asarray(v, dtype=np.float32)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


class Gemini:
    def __init__(self, chat_model: str, embed_model: str, embed_dim: int):
        from google import genai
        from google.genai import types
        self.types = types
        self.client = genai.Client()  # đọc GEMINI_API_KEY từ môi trường
        self.chat_model, self.embed_model, self.embed_dim = chat_model, embed_model, embed_dim

    def _cfg(self):
        return self.types.EmbedContentConfig(output_dimensionality=self.embed_dim)

    async def embed_query(self, q: str) -> np.ndarray:
        r = await self.client.aio.models.embed_content(model=self.embed_model, contents=query_text(q), config=self._cfg())
        return normalize(r.embeddings[0].values)

    def embed_docs(self, texts: list) -> list:
        """Đồng bộ, gọi trong luồng phụ (nạp tri thức), theo lô 50."""
        out = []
        for i in range(0, len(texts), 50):
            r = self.client.models.embed_content(model=self.embed_model, contents=texts[i:i + 50], config=self._cfg())
            out.extend(normalize(e.values) for e in r.embeddings)
        return out

    async def stream(self, system: str, prompt: str):
        cfg = self.types.GenerateContentConfig(system_instruction=system, temperature=0.35, max_output_tokens=900)
        resp = await self.client.aio.models.generate_content_stream(model=self.chat_model, contents=prompt, config=cfg)
        async for chunk in resp:
            if chunk.text:
                yield chunk.text
