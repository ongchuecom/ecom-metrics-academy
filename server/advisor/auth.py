"""Xác thực bằng phiên đăng nhập Firebase (Google/Facebook) mà web đã có: máy chủ không giữ mật khẩu.
Khóa công khai của Google được nhớ 1 giờ để không phải tải lại mỗi request."""
import time
import threading
import requests
from google.auth import jwt as gjwt

CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"


class FirebaseVerifier:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self._certs, self._exp, self._lock = None, 0, threading.Lock()

    def _get_certs(self):
        with self._lock:
            if not self._certs or time.time() > self._exp:
                r = requests.get(CERTS_URL, timeout=10)
                r.raise_for_status()
                self._certs, self._exp = r.json(), time.time() + 3600
            return self._certs

    def __call__(self, token: str) -> dict:
        """Trả claims nếu hợp lệ; ném ValueError nếu không."""
        claims = gjwt.decode(token, certs=self._get_certs(), audience=self.project_id)
        if claims.get("iss") != f"https://securetoken.google.com/{self.project_id}":
            raise ValueError("iss")
        if not claims.get("sub") or len(claims["sub"]) > 128:
            raise ValueError("sub")
        return {"uid": claims["sub"], "email": claims.get("email", ""), "name": claims.get("name", ""),
                "email_verified": bool(claims.get("email_verified")), "provider": (claims.get("firebase") or {}).get("sign_in_provider", "")}
