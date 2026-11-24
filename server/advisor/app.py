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


JOB_BEAT_EVERY, JOB_DEAD_AFTER = 20, 120  # giây
# kết quả thanh toán cần quản trị viên xử lý tay (giao diện AdminAdvisor.jsx dùng đúng bộ này)
NEED_REVIEW = ("unmatched", "underpaid", "unknown_order", "already_paid", "paid_overpaid")


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
    bg_tasks = set()  # giữ tham chiếu tác vụ trả lượt để không bị thu dọn khi khách đã ngắt
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
        await asyncio.to_thread(index.refresh)
        return {"status": "ok", "chunks": len(index.items), "knowledge_version": index.version, "model": s.chat_model, "embed": s.embed_model}

    # ---------- tài khoản & thanh toán ----------
    @app.get("/api/me")
    async def me(user: dict = Depends(current_user)):
        st = await asyncio.to_thread(billing.status, user["uid"])
        st["plans"] = {k: {"name": v["name"], "amount": v["amount"], "days": v["days"], "daily_quota": v["daily_quota"]} for k, v in PLANS.items()}
        return st

    class OrderReq(BaseModel):
        plan: str = Field(..., pattern="^(monthly|yearly)$")

    @app.post("/api/billing/create-order")
    async def create_order(req: OrderReq, user: dict = Depends(current_user)):
        if not limiter.allow("order:" + user["uid"], 10):
            raise HTTPException(429, "Thao tác hơi nhanh, đợi một chút.")
        return await asyncio.to_thread(billing.create_order, user["uid"], req.plan)

    @app.get("/api/billing/order-status/{code}")
    async def order_status(code: str, user: dict = Depends(current_user)):
        return await asyncio.to_thread(billing.order_status, user["uid"], code[:20])

    @app.post("/api/billing/webhook/sepay")
    async def sepay(request: Request, authorization: Optional[str] = Header(None)):
        body = await request.json()
        return await asyncio.to_thread(billing.handle_sepay, authorization or "", body if isinstance(body, dict) else {})

    # ---------- hỏi đáp ----------
    @app.post("/api/chat")
    async def chat(req: ChatRequest, request: Request, user: dict = Depends(current_user)):
        uid = user["uid"]
        if (s.user_rate_per_min > 0 and not limiter.allow("u:" + uid, s.user_rate_per_min)) or (s.ip_rate_per_min > 0 and not limiter.allow("ip:" + client_ip(request), s.ip_rate_per_min)):
            raise HTTPException(429, "Anh/chị hỏi hơi nhanh, đợi một phút rồi hỏi tiếp nhé.")
        st = await asyncio.to_thread(billing.reserve, uid)  # 402 hết hạn, 429 hết lượt hôm nay
        meta = {"type": "meta", "remaining_today": st["remaining_today"], "daily_limit": st["daily_limit"], "plan": st["plan"], "days_left": st["days_left"]}
        await asyncio.to_thread(index.refresh)  # nạp lại chỉ mục (đọc cả bảng) không được chặn các luồng trả lời khác
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
            delivered = refunded = False

            async def refund_once():
                # đánh dấu TRƯỚC khi chờ: nếu khách ngắt đúng lúc này, nhánh hủy không trả thêm lần nữa (luồng nền vẫn trả xong)
                nonlocal refunded
                if refunded:
                    return
                refunded = True
                # chạy trong tác vụ riêng được che (shield) và giữ tham chiếu: khách ngắt giữa chừng thì tác vụ vẫn chạy tới cùng,
                # không bị hủy khi chưa kịp vào hàng đợi luồng
                t = asyncio.ensure_future(asyncio.to_thread(billing.refund, uid, st["day"]))
                bg_tasks.add(t)
                t.add_done_callback(bg_tasks.discard)
                try:
                    await asyncio.shield(t)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    refunded = False  # trả lượt thất bại thật: để nhánh lỗi thử lại
                    raise

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
                    hits = [it for it in index.items if it["ref_id"] == req.concept_id]
                    hit = next((it for it in hits if not it["title"].endswith(" (tiếp)")), hits[0] if hits else None)
                    if hit:
                        code, _, name = hit["title"].replace(" (tiếp)", "").partition(": ")
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
                if not "".join(answer).strip():
                    # Gemini trả rỗng (bị chặn an toàn, hoặc chỉ có thẻ <ctx>): không tính lượt
                    await refund_once()
                    yield sse({"type": "error", "message": "Cố vấn chưa trả lời được câu này, anh/chị diễn đạt lại giúp. Lượt hỏi này không bị tính."})
                    return
                if standalone:
                    qa_cache.set(ck, {"answer": "".join(answer).strip(), "refs": refs[:4]})
                yield sse({"type": "done"})
            except (asyncio.CancelledError, GeneratorExit):
                # khách bấm Dừng / đóng trang trước khi nhận được chữ nào: trả lượt
                if not delivered and not refunded:
                    refunded = True
                    billing.refund(uid, st["day"])  # đang bị hủy: gọi thẳng (lệnh nhỏ một dòng), không await được nữa
                raise
            except Exception:
                try:  # lỗi phía mình: trả lại lượt hỏi (đúng một lần)
                    await refund_once()
                except Exception:
                    pass
                yield sse({"type": "error", "message": "Cố vấn đang bận, anh/chị hỏi lại sau ít phút. Lượt hỏi này không bị tính." if not delivered
                           else "Câu trả lời bị ngắt giữa chừng. Lượt hỏi này không bị tính."})

        return StreamingResponse(run(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # ---------- quản trị ----------
    def run_job(kind: str, fn, key: str = ""):
        """Mỗi loại việc (cùng key) chỉ chạy một lượt một lúc, kể cả khi bấm hai lần, có hai quản trị viên hay nhiều worker.
        Việc đang chạy gửi nhịp tim mỗi 20 giây; việc mất nhịp tim quá 2 phút (máy chủ chết giữa chừng) coi như đã chết,
        được đánh dấu lỗi và không chặn nữa. Việc chạy lâu mấy cũng không bị coi là chết nhầm."""
        jid, now = uuid.uuid4().hex[:12], int(time.time())
        kind_key = f"{kind}:{key}" if key else kind
        with db.tx() as c:
            c.execute("UPDATE jobs SET status='error', detail=?, finished_at=? WHERE status='running' AND COALESCE(heartbeat, created_at)<?",
                      ('"Máy chủ dừng khi việc đang chạy, bấm lại để chạy tiếp."', now, now - JOB_DEAD_AFTER))
            if c.execute("SELECT 1 FROM jobs WHERE kind=? AND status='running'", (kind_key,)).fetchone():
                raise HTTPException(409, "Việc này đang chạy, đợi xong rồi bấm lại.")
            c.execute("INSERT INTO jobs(id,kind,status,detail,created_at,heartbeat) VALUES(?,?, 'running', '', ?, ?)", (jid, kind_key, now, now))
        stop = threading.Event()

        def beat():
            while not stop.wait(JOB_BEAT_EVERY):
                try:
                    with db.conn() as c:
                        c.execute("UPDATE jobs SET heartbeat=? WHERE id=? AND status='running'", (int(time.time()), jid))
                except Exception:
                    pass

        def work():
            try:
                res = fn()
                status, detail = "done", res
            except Exception as e:
                status, detail = "error", str(e)[:500]
            stop.set()
            import json as _j
            with db.conn() as c:
                c.execute("UPDATE jobs SET status=?, detail=?, finished_at=? WHERE id=?", (status, _j.dumps(detail, ensure_ascii=False), int(time.time()), jid))
            index.refresh(force=True)
        threading.Thread(target=beat, daemon=True).start()
        threading.Thread(target=work, daemon=True).start()  # chạy nền: không chặn người đang chat
        return {"job_id": jid, "status": "running"}

    @app.get("/api/admin/overview")
    async def admin_overview(_: dict = Depends(admin_user)):
        return await asyncio.to_thread(overview)

    def overview():
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
                "payments_need_review": q(f"SELECT COUNT(*) FROM payments WHERE result IN ({','.join('?' * len(NEED_REVIEW))})", *NEED_REVIEW),
                "chunks": q("SELECT COUNT(*) FROM chunks"),
            }
            data["sources"] = [dict(r) for r in c.execute("SELECT source, COUNT(*) AS chunks, MAX(updated_at) AS updated_at FROM chunks GROUP BY source ORDER BY source")]
            data["jobs"] = [dict(r) for r in c.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10")]
        return data

    @app.get("/api/admin/payments")
    async def admin_payments(_: dict = Depends(admin_user)):
        return await asyncio.to_thread(payments)

    def payments():
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
        uid, email = req.uid.strip(), req.email.strip()
        if not uid and "@" not in email:
            raise HTTPException(400, "Nhập email (có @) hoặc mã tài khoản (uid).")
        if not uid:
            def lookup():
                with db.conn() as c:
                    return c.execute("SELECT uid, name, created_at FROM users WHERE lower(email)=lower(?) ORDER BY created_at", (email,)).fetchall()
            rows = await asyncio.to_thread(lookup)
            if len(rows) > 1:
                # cùng email đăng nhập bằng cả Google và Facebook = hai tài khoản: quản trị viên chọn đúng uid
                raise HTTPException(409, "Email này có " + str(len(rows)) + " tài khoản (đăng nhập Google và Facebook riêng). Hỏi khách đang dùng tài khoản nào rồi cấp theo mã: "
                                    + "; ".join(f"{r['uid']} ({r['name'] or 'không tên'})" for r in rows))
            uid = rows[0]["uid"] if rows else ""
        if not uid:
            raise HTTPException(404, "Không tìm thấy người dùng. Nhờ họ đăng nhập Cố vấn AI một lần rồi cấp.")
        return await asyncio.to_thread(billing.admin_grant, uid, req.plan, req.days)

    @app.post("/api/admin/knowledge/sync-site")
    async def sync_site(_: dict = Depends(admin_user)):
        return await asyncio.to_thread(run_job, "sync-site", lambda: ingest.upsert_source(db, gemini.embed_docs, s.embed_model, s.embed_dim, "site", ingest.site_docs(s.site_url)))

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
        return await asyncio.to_thread(run_job, "upload", fn, name)

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
            # khóa nguồn gắn với thư mục, để đồng bộ thư mục B không đụng tới tri thức của thư mục A
            prefix = f"drive:{req.folder_id}:"
            keep = {prefix + f["id"] for f in files}  # file lỗi tạm thời vẫn giữ tri thức cũ
            for f in files:
                if "doc" in f:
                    res["embedded"] += ingest.upsert_source(db, gemini.embed_docs, s.embed_model, s.embed_dim, prefix + f["id"], [f["doc"]])["embedded"]
            with db.conn() as c:  # chỉ xóa file đã biến khỏi CHÍNH thư mục này
                gone = [r["source"] for r in c.execute("SELECT DISTINCT source FROM chunks WHERE substr(source, 1, ?) = ?", (len(prefix), prefix)) if r["source"] not in keep]
            for g in gone:
                ingest.delete_source(db, g)
            res["removed_files"] = len(gone)
            return res
        return await asyncio.to_thread(run_job, "sync-drive", fn, req.folder_id)

    @app.delete("/api/admin/knowledge/source")
    async def delete_source(source: str, _: dict = Depends(admin_user)):
        if source == "site":
            raise HTTPException(400, "Nguồn web chỉ cập nhật bằng Đồng bộ từ web.")
        return {"deleted_chunks": await asyncio.to_thread(ingest.delete_source, db, source[:200])}

    app.state.db, app.state.billing, app.state.index, app.state.settings = db, billing, index, s
    return app


app = create_app() if os.environ.get("ADVISOR_NO_AUTOAPP") != "1" else None
