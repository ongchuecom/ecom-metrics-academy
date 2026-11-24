"""Ứng dụng FastAPI. Chạy: uvicorn advisor.app:app (đọc cấu hình từ .env / biến môi trường)."""
import os
import time
import uuid
import asyncio
import threading
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from .config import Settings, PLANS
from .db import DB
from .billing import Billing
from .knowledge import KnowledgeIndex
from .chat import ChatRequest, SYSTEM_PROMPT, build_prompt, CtxSplitter, TTLCache, RateLimiter, cache_key, sse
from . import ingest


def create_app(settings: Optional[Settings] = None, gemini=None, verifier=None) -> FastAPI:
    s = settings or Settings.from_env()
    db = DB(s.db_path)
    billing = Billing(db, s)
    index = KnowledgeIndex(db, s.embed_model, s.embed_dim)
    if gemini is None:
        from .gemini import Gemini
        gemini = Gemini(s.chat_model, s.embed_model, s.embed_dim)
    if verifier is None:
        from .auth import FirebaseVerifier
        verifier = FirebaseVerifier(s.firebase_project_id)
    qa_cache, limiter = TTLCache(400, 3600), RateLimiter()
    sem = asyncio.Semaphore(s.gemini_concurrency)
    concepts = {}  # id → {code,name} để biết khách đang đọc bài nào (nạp từ chunks)

    app = FastAPI(title="Ecom Metrics Academy · Cố vấn AI", docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=s.allowed_origins, allow_credentials=False,
                       allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type"])

    def client_ip(request: Request) -> str:
        # chỉ tin header IP khi đứng sau proxy của mình (nginx đặt X-Real-IP), nếu không ai cũng giả được
        if s.trust_proxy:
            return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
        return request.client.host if request.client else "unknown"

    async def current_user(authorization: Optional[str] = Header(None)) -> dict:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "Đăng nhập (Google hoặc Facebook) để dùng Cố vấn AI, được 7 ngày dùng thử miễn phí.")
        try:
            ident = await asyncio.to_thread(verifier, authorization[7:].strip())
        except Exception:
            raise HTTPException(401, "Phiên đăng nhập hết hạn, anh/chị đăng nhập lại giúp.")
        await asyncio.to_thread(billing.ensure_user, ident)
        return ident

    async def admin_user(user: dict = Depends(current_user)) -> dict:
        if user["uid"] not in s.admin_uids:
            raise HTTPException(403, "Không có quyền quản trị.")
        return user

    @app.get("/health")
    async def health():
        index.refresh()
        return {"status": "ok", "chunks": len(index.items), "knowledge_version": index.version, "model": s.chat_model, "embed": s.embed_model}

    # ---------- tài khoản & thanh toán ----------
    @app.get("/api/me")
    async def me(user: dict = Depends(current_user)):
        st = billing.status(user["uid"])
        st["plans"] = {k: {"name": v["name"], "amount": v["amount"], "days": v["days"], "daily_quota": v["daily_quota"]} for k, v in PLANS.items()}
        return st

    class OrderReq(BaseModel):
        plan: str = Field(..., pattern="^(monthly|yearly)$")

    @app.post("/api/billing/create-order")
    async def create_order(req: OrderReq, user: dict = Depends(current_user)):
        if not limiter.allow("order:" + user["uid"], 10):
            raise HTTPException(429, "Thao tác hơi nhanh, đợi một chút.")
        return billing.create_order(user["uid"], req.plan)

    @app.get("/api/billing/order-status/{code}")
    async def order_status(code: str, user: dict = Depends(current_user)):
        return billing.order_status(user["uid"], code[:20])

    @app.post("/api/billing/webhook/sepay")
    async def sepay(request: Request, authorization: Optional[str] = Header(None)):
        body = await request.json()
        return billing.handle_sepay(authorization or "", body if isinstance(body, dict) else {})

    # ---------- hỏi đáp ----------
    @app.post("/api/chat")
    async def chat(req: ChatRequest, request: Request, user: dict = Depends(current_user)):
        uid = user["uid"]
        if not limiter.allow("u:" + uid, s.user_rate_per_min) or not limiter.allow("ip:" + client_ip(request), s.ip_rate_per_min):
            raise HTTPException(429, "Anh/chị hỏi hơi nhanh, đợi một phút rồi hỏi tiếp nhé.")
        st = billing.reserve(uid)  # 402 hết hạn, 429 hết lượt hôm nay
        meta = {"type": "meta", "remaining_today": st["remaining_today"], "daily_limit": st["daily_limit"], "plan": st["plan"], "days_left": st["days_left"]}
        index.refresh()
        standalone = not req.history and not any(req.shop_context.clean().values())
        ck = cache_key(req.message, str(index.version), req.concept_id)
        cached = qa_cache.get(ck) if standalone else None

        async def run():
            yield sse(meta)
            if cached:
                yield sse({"type": "refs", "refs": cached["refs"]})
                yield sse({"type": "delta", "text": cached["answer"]})
                yield sse({"type": "done"})
                return
            delivered = False
            try:
                search_q = " ".join([req.message] + [x for x in [req.shop_context.kenh, *req.shop_context.van_de[-2:]] if x])
                async with sem:
                    q_vec = await gemini.embed_query(search_q)
                retrieved = index.search(q_vec, search_q, top_k=4)
                refs, seen = [], set()
                for it in retrieved:
                    if it["ref_id"] and it["source_type"] != "document" and it["ref_id"] not in seen:
                        seen.add(it["ref_id"])
                        refs.append({"id": it["ref_id"], "type": it["source_type"], "title": it["title"].replace(" (tiếp)", "")})
                yield sse({"type": "refs", "refs": refs[:4]})
                focus = None
                if req.concept_id:
                    hit = next((it for it in index.items if it["ref_id"] == req.concept_id), None)
                    if hit:
                        code, _, name = hit["title"].partition(": ")
                        focus = {"code": code, "name": name}
                sp, answer = CtxSplitter(), []
                async with sem:
                    async for piece in gemini.stream(SYSTEM_PROMPT, build_prompt(req, retrieved, focus)):
                        out = sp.feed(piece)
                        if out:
                            delivered = True
                            answer.append(out)
                            yield sse({"type": "delta", "text": out})
                tail, ctx = sp.finish()
                if tail:
                    delivered = True
                    answer.append(tail)
                    yield sse({"type": "delta", "text": tail})
                if ctx:
                    yield sse({"type": "context_update", "shop_context": ctx})
                if standalone and answer:
                    qa_cache.set(ck, {"answer": "".join(answer).strip(), "refs": refs[:4]})
                yield sse({"type": "done"})
            except Exception:
                billing.refund(uid, st["day"])  # lỗi phía mình: trả lại lượt hỏi
                yield sse({"type": "error", "message": "Cố vấn đang bận, anh/chị hỏi lại sau ít phút. Lượt hỏi này không bị tính." if not delivered
                           else "Câu trả lời bị ngắt giữa chừng. Lượt hỏi này không bị tính."})

        return StreamingResponse(run(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # ---------- quản trị ----------
    def run_job(kind: str, fn):
        jid = uuid.uuid4().hex[:12]
        with db.conn() as c:
            c.execute("INSERT INTO jobs(id,kind,status,detail,created_at) VALUES(?,?, 'running', '', ?)", (jid, kind, int(time.time())))

        def work():
            try:
                res = fn()
                status, detail = "done", res
            except Exception as e:
                status, detail = "error", str(e)[:500]
            import json as _j
            with db.conn() as c:
                c.execute("UPDATE jobs SET status=?, detail=?, finished_at=? WHERE id=?", (status, _j.dumps(detail, ensure_ascii=False), int(time.time()), jid))
            index.refresh(force=True)
        threading.Thread(target=work, daemon=True).start()  # chạy nền: không chặn người đang chat
        return {"job_id": jid, "status": "running"}

    @app.get("/api/admin/overview")
    async def admin_overview(_: dict = Depends(admin_user)):
        now, day = int(time.time()), billing.today()
        with db.conn() as c:
            q = lambda sql, *a: c.execute(sql, a).fetchone()[0]
            data = {
                "users": q("SELECT COUNT(*) FROM users"),
                "trial_active": q("SELECT COUNT(*) FROM users WHERE plan='trial' AND expires_at>?", now),
                "pro_active": q("SELECT COUNT(*) FROM users WHERE plan IN ('monthly','yearly') AND expires_at>?", now),
                "questions_today": q("SELECT COALESCE(SUM(used),0) FROM usage WHERE day=?", day),
                "questions_7d": q("SELECT COALESCE(SUM(used),0) FROM usage WHERE day>=date(?, '-6 day')", day),
                "revenue_30d": q("SELECT COALESCE(SUM(amount),0) FROM orders WHERE status='paid' AND paid_at>?", now - 30 * 86400),
                "payments_need_review": q("SELECT COUNT(*) FROM payments WHERE result IN ('unmatched','underpaid','unknown_order')"),
                "chunks": q("SELECT COUNT(*) FROM chunks"),
            }
            data["sources"] = [dict(r) for r in c.execute("SELECT source, COUNT(*) AS chunks, MAX(updated_at) AS updated_at FROM chunks GROUP BY source ORDER BY source")]
            data["jobs"] = [dict(r) for r in c.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10")]
        return data

    @app.get("/api/admin/payments")
    async def admin_payments(_: dict = Depends(admin_user)):
        with db.conn() as c:
            return {"payments": [dict(r) for r in c.execute("SELECT * FROM payments ORDER BY received_at DESC LIMIT 200")],
                    "orders": [dict(r) for r in c.execute("SELECT o.*, u.email FROM orders o LEFT JOIN users u ON u.uid=o.uid ORDER BY o.created_at DESC LIMIT 200")]}

    class GrantReq(BaseModel):
        uid: str = Field("", max_length=128)
        email: str = Field("", max_length=200)
        plan: str = Field("yearly", pattern="^(trial|monthly|yearly)$")
        days: int = Field(365, ge=1, le=3660)

    @app.post("/api/admin/grant")
    async def admin_grant(req: GrantReq, _: dict = Depends(admin_user)):
        uid = req.uid
        if not uid and req.email:
            with db.conn() as c:
                r = c.execute("SELECT uid FROM users WHERE lower(email)=lower(?)", (req.email.strip(),)).fetchone()
            uid = r["uid"] if r else ""
        if not uid:
            raise HTTPException(404, "Không tìm thấy người dùng. Nhờ họ đăng nhập Cố vấn AI một lần rồi cấp.")
        return billing.admin_grant(uid, req.plan, req.days)

    @app.post("/api/admin/knowledge/sync-site")
    async def sync_site(_: dict = Depends(admin_user)):
        return run_job("sync-site", lambda: ingest.upsert_source(db, gemini.embed_docs, s.embed_model, s.embed_dim, "site", ingest.site_docs(s.site_url)))

    @app.post("/api/admin/knowledge/upload")
    async def upload(file: UploadFile = File(...), title: str = Form(""), _: dict = Depends(admin_user)):
        raw = await file.read()
        if len(raw) > 25 * 1024 * 1024:
            raise HTTPException(413, "File tối đa 25 MB.")
        name = os.path.basename(file.filename or "tai-lieu")[:120]

        def fn():
            text = ingest.extract_file_text(name, raw)
            return ingest.upsert_source(db, gemini.embed_docs, s.embed_model, s.embed_dim, f"file:{name}",
                                        [{"source_type": "document", "ref_id": None, "title": title.strip() or name, "text": text}])
        return run_job("upload", fn)

    class DriveReq(BaseModel):
        folder_id: str = Field(..., pattern=r"^[A-Za-z0-9_-]{10,100}$")

    @app.post("/api/admin/knowledge/sync-drive")
    async def sync_drive(req: DriveReq, _: dict = Depends(admin_user)):
        creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
        if not creds or not os.path.exists(creds):
            raise HTTPException(400, "Chưa cấu hình GOOGLE_APPLICATION_CREDENTIALS (file khóa Service Account).")

        def fn():
            from .drive import drive_docs
            files = drive_docs(req.folder_id, creds)
            res = {"files": len(files), "errors": [f"{f['name']}: {f['error']}" for f in files if "error" in f][:20], "embedded": 0}
            keep = set()
            for f in files:
                if "doc" in f:
                    keep.add(f"drive:{f['id']}")
                    res["embedded"] += ingest.upsert_source(db, gemini.embed_docs, s.embed_model, s.embed_dim, f"drive:{f['id']}", [f["doc"]])["embedded"]
            with db.conn() as c:  # file đã bị xóa khỏi thư mục Drive: xóa tri thức của nó
                gone = [r["source"] for r in c.execute("SELECT DISTINCT source FROM chunks WHERE source LIKE 'drive:%'") if r["source"] not in keep]
            for g in gone:
                ingest.delete_source(db, g)
            res["removed_files"] = len(gone)
            return res
        return run_job("sync-drive", fn)

    @app.delete("/api/admin/knowledge/source")
    async def delete_source(source: str, _: dict = Depends(admin_user)):
        if source == "site":
            raise HTTPException(400, "Nguồn web chỉ cập nhật bằng Đồng bộ từ web.")
        return {"deleted_chunks": ingest.delete_source(db, source[:200])}

    app.state.db, app.state.billing, app.state.index, app.state.settings = db, billing, index, s
    return app


app = create_app() if os.environ.get("ADVISOR_NO_AUTOAPP") != "1" else None
