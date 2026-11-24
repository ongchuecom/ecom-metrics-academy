"""Chỉ mục tri thức trong RAM: ma trận vector FP16 đã chuẩn hóa + cờ từ khóa tính sẵn (không lặp Python mỗi câu hỏi).
Tự nạp lại khi meta.knowledge_version đổi (kiểm tra tối đa 10 giây/lần), nên mọi worker cùng thấy tri thức mới."""
import time
import threading
import numpy as np

DOMAIN_KEYWORDS = [
    "cm1", "cm2", "cm3", "roas", "rto", "ccc", "cac", "ltv", "clv", "aov", "cogs", "sku", "cpa", "cpm", "cpc", "tacos",
    "hoàn hàng", "bom hàng", "phí sàn", "dòng tiền", "xả kho", "tồn kho", "điểm hòa vốn", "hòa vốn", "định phí", "thuế",
]
BONUS_EACH, BONUS_MAX, BONUS_FLOOR, MIN_SCORE = 0.06, 0.18, 0.35, 0.40


class KnowledgeIndex:
    def __init__(self, db, model: str, dim: int):
        self.db, self.model, self.dim = db, model, dim
        self.items, self.matrix, self.flags = [], None, None
        self.version, self._checked, self._lock = None, 0.0, threading.Lock()

    def _load(self):
        with self.db.conn() as c:
            rows = c.execute("SELECT id, source_type, ref_id, title, content, embedding FROM chunks WHERE model=? AND dim=?", (self.model, self.dim)).fetchall()
        items, vecs = [], []
        for r in rows:
            v = np.frombuffer(r["embedding"], dtype=np.float32)
            if v.shape[0] != self.dim:
                continue
            vecs.append(v.astype(np.float16))
            items.append({"id": r["id"], "source_type": r["source_type"], "ref_id": r["ref_id"], "title": r["title"] or "", "content": r["content"]})
        self.items = items
        self.matrix = np.vstack(vecs) if vecs else None
        hay = [f"{it['title']} {it['content'][:400]}".lower() for it in items]
        self.flags = np.array([[kw in h for kw in DOMAIN_KEYWORDS] for h in hay], dtype=np.float32) if items else None

    def refresh(self, force: bool = False):
        now = time.time()
        if not force and now - self._checked < 10:
            return
        self._checked = now
        ver = self.db.meta_get("knowledge_version", "0")
        if force or ver != self.version:
            with self._lock:
                self._load()
                self.version = ver

    def search(self, q_vec: np.ndarray, query: str, top_k: int = 4) -> list:
        self.refresh()
        if self.matrix is None:
            return []
        scores = (self.matrix @ q_vec.astype(np.float16)).astype(np.float32)
        ql = query.lower()
        hit = np.array([kw in ql for kw in DOMAIN_KEYWORDS], dtype=np.float32)
        if hit.any():
            bonus = np.minimum(self.flags @ hit * BONUS_EACH, BONUS_MAX)
            scores = scores + np.where(scores >= BONUS_FLOOR, bonus, 0)
        top = np.argsort(-scores)[:top_k]
        return [{**self.items[i], "score": float(scores[i])} for i in top if scores[i] >= MIN_SCORE]
