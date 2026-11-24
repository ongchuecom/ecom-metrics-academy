"""Nạp tri thức vào bảng chunks. Mỗi nguồn (source) được thay thế trọn: thêm đoạn mới, giữ đoạn không đổi (khỏi tạo lại embedding),
xóa đoạn đã biến mất khỏi nguồn; xong thì tăng meta.knowledge_version để mọi worker nạp lại.
Nguồn chính: chính web Ecom Metrics Academy (data/search.json → danh sách id, data/c/<id>.json → nội dung, data/playbooks.json)."""
import io
import json
import time
import hashlib
import requests
import numpy as np
from .gemini import doc_text

TYPES_FROM_SITE = {"metric", "concept", "framework", "term"}


def plain(s) -> str:
    return " ".join(str(s or "").replace("**", "").split())


def chunk_text(text: str, size: int = 1100, overlap: int = 150) -> list:
    text = plain(text)
    if len(text) <= size:
        return [text] if len(text) > 40 else []
    out, start = [], 0
    while start < len(text):
        end = min(len(text), start + size)
        if end < len(text):  # cắt ở cuối câu gần nhất cho dễ đọc
            dot = text.rfind(". ", start + size // 2, end)
            end = dot + 1 if dot > 0 else end
        out.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return [c for c in out if len(c) > 40]


def concept_doc(c: dict) -> dict:
    L = c.get("lesson") or {}
    parts = [f"{c.get('code')}: {c.get('vi_name')}.", plain(c.get("definition"))]
    if (c.get("formula") or {}).get("readable"):
        parts.append(f"Công thức: {c['code']} = {c['formula']['readable']}.")
    parts += [plain(p) for p in L.get("intro", [])]
    if L.get("breakdown"):
        parts.append(f"Ví dụ: {plain(L['breakdown'].get('title'))}. {plain(L['breakdown'].get('after'))}")
    for s in L.get("sections", []):
        parts.append(f"{plain(s.get('title'))}: " + " ".join(plain(b) for b in s.get("body", [])))
    if L.get("mistakes"):
        parts.append("Hay hiểu sai: " + "; ".join(plain(m) for m in L["mistakes"]))
    if L.get("remember"):
        parts.append("Nhớ: " + plain(L["remember"]))
    t = c.get("type") or "metric"
    return {"source_type": t if t in TYPES_FROM_SITE else "metric", "ref_id": c["metric_id"], "title": f"{c.get('code')}: {c.get('vi_name')}", "text": " ".join(p for p in parts if p)}


def playbook_doc(p: dict) -> dict:
    cs = p.get("case_study") or {}
    text = " ".join([plain(p.get("summary")), plain(p.get("core_correlation")), f"Tình huống: {plain(cs.get('title'))}. {plain(cs.get('context'))}",
                     " ".join(plain(b) for b in cs.get("breakdown", [])), f"Kết quả: {plain(cs.get('result'))}",
                     "Sai lầm: " + "; ".join(plain(m.get("detail")) for m in p.get("myths_and_mistakes", [])),
                     "Việc cần làm: " + "; ".join(plain(a) for a in p.get("action_checklist", []))])
    return {"source_type": "playbook", "ref_id": p["playbook_id"], "title": p.get("title", ""), "text": text}


def site_docs(base: str, get=None) -> list:
    """base: URL web (…/ecom-metrics-academy/) hoặc thư mục dist/public cục bộ."""
    def fetch(path):
        if base.startswith("http"):
            r = (get or requests.get)(base.rstrip("/") + "/" + path, timeout=20)
            r.raise_for_status()
            return r.json()
        with open(base.rstrip("/") + "/" + path, encoding="utf-8") as f:
            return json.load(f)
    ids = list(fetch("data/search.json").keys())
    docs = [concept_doc(fetch(f"data/c/{i}.json")) for i in ids]
    # lỗi ở đây phải làm hỏng cả lượt đồng bộ: nếu nuốt lỗi, upsert_source sẽ coi mọi đoạn Playbook là cũ và xóa sạch
    docs += [playbook_doc(p) for p in fetch("data/playbooks.json")["playbooks"]]
    return docs


def extract_file_text(filename: str, raw: bytes) -> str:
    low = filename.lower()
    if low.endswith(".pdf"):
        from pypdf import PdfReader
        return "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(raw)).pages)
    if low.endswith(".docx"):
        from docx import Document
        return "\n".join(p.text for p in Document(io.BytesIO(raw)).paragraphs if p.text.strip())
    if low.endswith((".txt", ".md", ".csv", ".json")):
        return raw.decode("utf-8", errors="ignore")
    raise ValueError("Chỉ nhận .pdf, .docx, .txt, .md, .csv, .json")


def upsert_source(db, embed_docs, model: str, dim: int, source: str, docs: list) -> dict:
    """docs: [{source_type, ref_id, title, text}] — thay trọn nguồn `source`."""
    rows = []
    for d in docs:
        for i, ch in enumerate(chunk_text(d["text"])):
            title = d["title"] if i == 0 else f"{d['title']} (tiếp)"
            cid = hashlib.sha1(f"{model}|{dim}|{source}|{d['source_type']}|{d.get('ref_id')}|{title}|{ch}".encode()).hexdigest()
            rows.append((cid, d["source_type"], d.get("ref_id"), title, ch))
    new_ids = {r[0] for r in rows}
    with db.conn() as c:
        have = {r["id"] for r in c.execute("SELECT id FROM chunks WHERE source=? AND model=? AND dim=?", (source, model, dim))}
    todo = [r for r in rows if r[0] not in have]
    vecs = embed_docs([doc_text(r[3], r[4]) for r in todo]) if todo else []
    now = int(time.time())
    with db.tx() as c:
        for r, v in zip(todo, vecs):
            c.execute("INSERT OR REPLACE INTO chunks(id,source,source_type,ref_id,title,content,model,dim,embedding,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                      (r[0], source, r[1], r[2], r[3], r[4], model, dim, np.asarray(v, dtype=np.float32).tobytes(), now))
        stale = [x for x in have if x not in new_ids]
        c.executemany("DELETE FROM chunks WHERE id=?", [(x,) for x in stale])
        # đoạn của mô hình embedding cũ không dùng được nữa
        c.execute("DELETE FROM chunks WHERE source=? AND (model<>? OR dim<>?)", (source, model, dim))
        c.execute("INSERT INTO meta(key,value) VALUES('knowledge_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(time.time_ns()),))
    return {"source": source, "chunks": len(rows), "embedded": len(todo), "removed": len(stale)}


def delete_source(db, source: str) -> int:
    with db.tx() as c:
        n = c.execute("DELETE FROM chunks WHERE source=?", (source,)).rowcount
        c.execute("INSERT INTO meta(key,value) VALUES('knowledge_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(time.time_ns()),))
    return n
