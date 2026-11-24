"""Tài khoản, dùng thử 7 ngày, hạn mức theo ngày (giờ Việt Nam), đơn VietQR và webhook SePay.
- Người dùng xác định bằng uid Firebase; lần đầu gặp thì tặng 7 ngày dùng thử (mỗi tài khoản một lần).
- Trừ lượt bằng một câu lệnh nguyên tử: gửi đồng thời không vượt được hạn mức; Gemini lỗi thì hoàn lượt.
- Webhook: so khớp khóa chính xác; mỗi mã giao dịch SePay chỉ xử lý một lần; đơn chỉ chuyển pending → paid một lần."""
import re
import secrets
import time
from datetime import datetime
from urllib.parse import quote
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from .config import PLANS, PAID_PLANS

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # bỏ O/0, I/1 dễ gõ nhầm khi chuyển khoản tay
CODE_RE = re.compile(r"EMA[A-HJ-NP-Z2-9]{8}")
_WORD_RE = re.compile(r"(?<![A-Z0-9])EMA[A-HJ-NP-Z2-9]{8}(?![A-Z0-9])")
_ANY_RE = re.compile(r"(?=(EMA[A-HJ-NP-Z2-9]{8}))")


def code_candidates(content: str) -> list:
    """Mã đơn có thể nằm trong nội dung chuyển khoản. Ưu tiên mã đứng riêng một từ; sau đó mới tới mã bị ngân hàng
    chèn dấu cách/gạch (ghép lại rồi tìm mọi vị trí, kể cả chồng nhau). Mã thật được chọn bằng cách đối chiếu bảng orders."""
    out = [m.group(0) for m in _WORD_RE.finditer(content)]
    out += [m.group(1) for m in _ANY_RE.finditer(re.sub(r"[\s\-_.]", "", content))]
    return list(dict.fromkeys(out))


def new_order_code() -> str:
    return "EMA" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))


class Billing:
    def __init__(self, db, settings):
        self.db, self.s = db, settings
        self.tz = ZoneInfo(settings.timezone)

    def today(self) -> str:
        return datetime.now(self.tz).strftime("%Y-%m-%d")

    # ---------- người dùng ----------
    def ensure_user(self, ident: dict) -> None:
        now = int(time.time())
        with self.db.tx() as c:
            r = c.execute("SELECT uid FROM users WHERE uid=?", (ident["uid"],)).fetchone()
            if not r:
                c.execute("INSERT INTO users(uid,email,name,plan,expires_at,created_at) VALUES(?,?,?,?,?,?)",
                          (ident["uid"], ident.get("email", ""), ident.get("name", ""), "trial", now + PLANS["trial"]["days"] * 86400, now))
            else:
                c.execute("UPDATE users SET email=COALESCE(NULLIF(?,''),email), name=COALESCE(NULLIF(?,''),name) WHERE uid=?",
                          (ident.get("email", ""), ident.get("name", ""), ident["uid"]))

    def status(self, uid: str) -> dict:
        now = int(time.time())
        with self.db.conn() as c:
            u = c.execute("SELECT * FROM users WHERE uid=?", (uid,)).fetchone()
            used = c.execute("SELECT used FROM usage WHERE uid=? AND day=?", (uid, self.today())).fetchone()
        if not u:
            raise HTTPException(401, "Tài khoản không tồn tại.")
        active = u["expires_at"] > now
        plan = u["plan"]
        limit = PLANS.get(plan, PLANS["trial"])["daily_quota"]
        used_n = used["used"] if used else 0
        return {
            "uid": uid, "email": u["email"], "name": u["name"], "plan": plan if active else "expired",
            "plan_name": PLANS.get(plan, {}).get("name", plan), "is_active": active, "was_paid": plan in PAID_PLANS, "is_trial": active and plan == "trial",
            "is_pro": active and plan in PAID_PLANS, "expires_at": u["expires_at"],
            "days_left": max(0, -(-(u["expires_at"] - now) // 86400)) if active else 0,
            "daily_limit": limit, "used_today": used_n, "remaining_today": max(0, limit - used_n) if active else 0,
        }

    # ---------- hạn mức ----------
    def reserve(self, uid: str) -> dict:
        st = self.status(uid)
        if not st["is_active"]:
            vnd = lambda n: f"{n:,}".replace(",", ".") + "đ"
            prices = f"{vnd(PLANS['monthly']['amount'])}/tháng hoặc {vnd(PLANS['yearly']['amount'])}/năm"
            raise HTTPException(402, ("Gói Pro đã hết hạn. Gia hạn" if st["was_paid"] else "Hết hạn dùng thử. Nâng cấp") + f" gói Pro ({prices}) để tiếp tục hỏi Cố vấn AI.")
        day = self.today()
        with self.db.conn() as c:
            c.execute("INSERT INTO usage(uid,day,used) VALUES(?,?,0) ON CONFLICT(uid,day) DO NOTHING", (uid, day))
            cur = c.execute("UPDATE usage SET used=used+1 WHERE uid=? AND day=? AND used<?", (uid, day, st["daily_limit"]))
            if cur.rowcount != 1:
                raise HTTPException(429, f"Anh/chị đã dùng hết {st['daily_limit']} câu hỏi hôm nay. Hạn mức làm mới lúc 0h (giờ Việt Nam).")
        st["used_today"] += 1
        st["remaining_today"] = st["daily_limit"] - st["used_today"]
        st["day"] = day
        return st

    def refund(self, uid: str, day: str) -> None:
        with self.db.conn() as c:
            c.execute("UPDATE usage SET used=used-1 WHERE uid=? AND day=? AND used>0", (uid, day))

    # ---------- đơn hàng ----------
    def create_order(self, uid: str, plan: str) -> dict:
        if plan not in PAID_PLANS:
            raise HTTPException(400, "Gói không hợp lệ (monthly hoặc yearly).")
        now, p = int(time.time()), PLANS[plan]
        with self.db.tx() as c:
            # dùng lại đơn đang chờ cùng gói trong 30 phút, tránh sinh nhiều mã khi bấm lại
            r = c.execute("SELECT code FROM orders WHERE uid=? AND plan=? AND status='pending' AND created_at>? ORDER BY created_at DESC LIMIT 1",
                          (uid, plan, now - 1800)).fetchone()
            code = r["code"] if r else None
            if not code:
                for _ in range(5):
                    code = new_order_code()
                    if not c.execute("SELECT 1 FROM orders WHERE code=?", (code,)).fetchone():
                        break
                c.execute("INSERT INTO orders(code,uid,plan,amount,status,created_at) VALUES(?,?,?,?, 'pending', ?)", (code, uid, plan, p["amount"], now))
        qr = (f"https://img.vietqr.io/image/{quote(self.s.bank_bin)}-{quote(self.s.bank_account)}-compact2.png"
              f"?amount={p['amount']}&addInfo={quote(code)}&accountName={quote(self.s.bank_account_name)}")
        return {"order_code": code, "plan": plan, "plan_name": p["name"], "amount": p["amount"], "qr_url": qr, "transfer_content": code,
                "bank_account": self.s.bank_account, "bank_account_name": self.s.bank_account_name}

    def order_status(self, uid: str, code: str) -> dict:
        with self.db.conn() as c:
            r = c.execute("SELECT status, plan FROM orders WHERE code=? AND uid=?", (code.upper(), uid)).fetchone()
        if not r:
            raise HTTPException(404, "Không tìm thấy đơn hàng.")
        return {"order_code": code.upper(), "status": r["status"], "plan": r["plan"]}

    def _extend(self, c, uid: str, plan: str, days: int) -> int:
        now = int(time.time())
        u = c.execute("SELECT plan, expires_at FROM users WHERE uid=?", (uid,)).fetchone()
        paid_active = u and u["plan"] in PAID_PLANS and u["expires_at"] > now
        trial_active = u and u["plan"] == "trial" and u["expires_at"] > now
        # đang trả tiền: cộng nối tiếp. Gia hạn dùng thử khi còn hạn: cộng nối tiếp. Mua Pro khi đang dùng thử: tính từ hôm nay
        base = u["expires_at"] if paid_active or (plan == "trial" and trial_active) else now
        # mua gói tháng khi gói năm còn hạn: giữ nhãn gói năm (hạn mức cao hơn), chỉ cộng ngày
        rank = {"trial": 0, "monthly": 1, "yearly": 2}
        new_plan = u["plan"] if paid_active and rank.get(u["plan"], 0) > rank.get(plan, 0) else plan
        exp = base + days * 86400
        c.execute("UPDATE users SET plan=?, expires_at=? WHERE uid=?", (new_plan, exp, uid))
        return exp

    def handle_sepay(self, auth_header: str, body: dict) -> dict:
        expected = f"Apikey {self.s.sepay_webhook_key}"
        if not auth_header or not secrets.compare_digest(auth_header.strip().encode(), expected.encode()):
            raise HTTPException(403, "Unauthorized")
        sid = str(body.get("id", "")).strip()
        if not sid:
            raise HTTPException(400, "missing id")
        amount = int(body.get("transferAmount") or 0)
        content = f"{body.get('content') or ''} {body.get('description') or ''}".upper()
        cands = code_candidates(content)
        code = cands[0] if cands else None
        now = int(time.time())
        with self.db.tx() as c:
            if c.execute("SELECT 1 FROM payments WHERE sepay_id=?", (sid,)).fetchone():
                return {"success": True, "duplicate": True}
            result = "ignored"
            if body.get("transferType") != "in" or amount <= 0:
                result = "ignored"
            elif not code:
                result = "unmatched"
            else:
                found = [x for x in cands if c.execute("SELECT 1 FROM orders WHERE code=?", (x,)).fetchone()]
                pending = [x for x in found if c.execute("SELECT 1 FROM orders WHERE code=? AND status='pending'", (x,)).fetchone()]
                code = (pending or found or [code])[0]
                o = c.execute("SELECT uid, plan, amount, status FROM orders WHERE code=?", (code,)).fetchone()
                if not o:
                    result = "unknown_order"
                elif o["status"] == "paid":
                    result = "already_paid"
                elif amount < o["amount"]:
                    result = "underpaid"
                else:
                    cur = c.execute("UPDATE orders SET status='paid', paid_at=?, sepay_id=? WHERE code=? AND status='pending'", (now, sid, code))
                    if cur.rowcount == 1:
                        self._extend(c, o["uid"], o["plan"], PLANS[o["plan"]]["days"])
                        result = "paid" if amount == o["amount"] else "paid_overpaid"
                    else:
                        result = "already_paid"
            c.execute("INSERT INTO payments(sepay_id,code,amount,content,result,received_at) VALUES(?,?,?,?,?,?)", (sid, code, amount, content[:500], result, now))
        return {"success": True, "result": result}

    def admin_grant(self, uid: str, plan: str, days: int) -> dict:
        if plan not in PLANS or not (1 <= days <= 3660):
            raise HTTPException(400, "Gói hoặc số ngày không hợp lệ.")
        with self.db.tx() as c:
            if not c.execute("SELECT 1 FROM users WHERE uid=?", (uid,)).fetchone():
                raise HTTPException(404, "Người dùng chưa từng đăng nhập Cố vấn AI. Nhờ họ đăng nhập một lần rồi cấp.")
            exp = self._extend(c, uid, plan, days)
            actual = c.execute("SELECT plan FROM users WHERE uid=?", (uid,)).fetchone()["plan"]
        return {"uid": uid, "plan": actual, "expires_at": exp}
