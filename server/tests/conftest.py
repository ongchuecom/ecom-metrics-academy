import os
import re
import sys
import hashlib
import numpy as np
import pytest

os.environ["ADVISOR_NO_AUTOAPP"] = "1"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from advisor.config import Settings  # noqa: E402
from advisor.app import create_app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

DIM = 64


def fake_vec(text: str) -> np.ndarray:
    """Vector giả: túi từ băm vào 64 chiều, đủ để câu hỏi giống tài liệu thì điểm cao."""
    v = np.zeros(DIM, dtype=np.float32)
    for w in re.findall(r"\w+", text.lower()):
        v[int(hashlib.md5(w.encode()).hexdigest(), 16) % DIM] += 1
    n = np.linalg.norm(v)
    return v / n if n else v


class FakeGemini:
    def __init__(self):
        self.pieces = ["**Bắt bệnh:** CM2 mỏng. ", "Việc làm ngay: tính lại ROAS hòa vốn.", "<c", 'tx>{"sp":"áo","kenh":"TikTok","dt":"500tr","van_de":["ROAS thấp"]}</ctx>']
        self.fail = False
        self.calls = 0

    async def embed_query(self, q):
        return fake_vec(q)

    def embed_docs(self, texts):
        return [fake_vec(t) for t in texts]

    async def stream(self, system, prompt):
        self.calls += 1
        self.last_prompt = prompt
        if self.fail:
            raise RuntimeError("gemini down")
        for p in self.pieces:
            yield p


def verifier(token):
    if not token.startswith("tok-"):
        raise ValueError("bad")
    uid = token[4:]
    return {"uid": uid, "email": f"{uid}@example.com", "name": uid.upper(), "email_verified": True}


@pytest.fixture
def env(tmp_path):
    s = Settings(firebase_project_id="ema-test", sepay_webhook_key="k" * 32, bank_bin="970422", bank_account="0123456789",
                 bank_account_name="NGUYEN VAN A", admin_uids=["admin1"], db_path=str(tmp_path / "t.db"), embed_dim=DIM,
                 embed_model="fake-embed", user_rate_per_min=1000, ip_rate_per_min=1000)
    g = FakeGemini()
    app = create_app(s, gemini=g, verifier=verifier)
    return {"client": TestClient(app), "app": app, "gemini": g, "s": s}


def H(uid):
    return {"Authorization": f"Bearer tok-{uid}"}


def read_sse(resp):
    import json
    return [json.loads(line[6:]) for line in resp.text.split("\n") if line.startswith("data: ")]
