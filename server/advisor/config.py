"""Cấu hình đọc từ biến môi trường (.env). Thiếu khóa bí mật thì từ chối khởi động, không bao giờ dùng giá trị mặc định."""
import os
from dataclasses import dataclass, field

REQUIRED = ["GEMINI_API_KEY", "FIREBASE_PROJECT_ID", "SEPAY_WEBHOOK_KEY", "BANK_BIN", "BANK_ACCOUNT", "BANK_ACCOUNT_NAME"]

PLANS = {
    "trial": {"name": "Dùng thử miễn phí 7 ngày", "amount": 0, "days": 7, "daily_quota": 15},
    "monthly": {"name": "Gói Pro tháng", "amount": 200_000, "days": 30, "daily_quota": 50},
    "yearly": {"name": "Gói Pro năm", "amount": 1_800_000, "days": 365, "daily_quota": 80},
}
PAID_PLANS = ("monthly", "yearly")


def _list(v: str) -> list:
    return [x.strip() for x in (v or "").split(",") if x.strip()]


@dataclass
class Settings:
    firebase_project_id: str
    sepay_webhook_key: str
    bank_bin: str
    bank_account: str
    bank_account_name: str
    admin_uids: list = field(default_factory=list)
    allowed_origins: list = field(default_factory=lambda: ["https://ongchuecom.github.io"])
    db_path: str = "data/advisor.db"
    chat_model: str = "gemini-flash-latest"
    embed_model: str = "gemini-embedding-2"
    embed_dim: int = 768
    timezone: str = "Asia/Ho_Chi_Minh"
    trust_proxy: bool = False  # chỉ bật khi máy chủ đứng sau nginx/Cloudflare của mình
    site_url: str = "https://ongchuecom.github.io/ecom-metrics-academy/"
    user_rate_per_min: int = 8
    ip_rate_per_min: int = 30
    gemini_concurrency: int = 20

    @classmethod
    def from_env(cls, env=None) -> "Settings":
        env = os.environ if env is None else env
        missing = [k for k in REQUIRED if not env.get(k)]
        if missing:
            raise RuntimeError("Thiếu biến môi trường bắt buộc: " + ", ".join(missing) + ". Điền vào file .env rồi khởi động lại.")
        if len(env["SEPAY_WEBHOOK_KEY"]) < 24:
            raise RuntimeError("SEPAY_WEBHOOK_KEY quá ngắn (cần ≥ 24 ký tự ngẫu nhiên).")
        return cls(
            firebase_project_id=env["FIREBASE_PROJECT_ID"],
            sepay_webhook_key=env["SEPAY_WEBHOOK_KEY"],
            bank_bin=env["BANK_BIN"],
            bank_account=env["BANK_ACCOUNT"],
            bank_account_name=env["BANK_ACCOUNT_NAME"],
            admin_uids=_list(env.get("ADMIN_UIDS", "")),
            allowed_origins=_list(env.get("ALLOWED_ORIGINS", "")) or ["https://ongchuecom.github.io"],
            db_path=env.get("DB_PATH", "data/advisor.db"),
            chat_model=env.get("CHAT_MODEL", "gemini-flash-latest"),
            embed_model=env.get("EMBED_MODEL", "gemini-embedding-2"),
            embed_dim=int(env.get("EMBED_DIM", "768")),
            trust_proxy=env.get("TRUST_PROXY", "0") == "1",
            site_url=env.get("SITE_URL", "https://ongchuecom.github.io/ecom-metrics-academy/"),
        )
