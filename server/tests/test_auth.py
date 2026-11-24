"""Kiểm bộ xác thực Firebase bằng khóa RSA tự tạo (thay cho khóa công khai của Google)."""
import time
import datetime
import pytest
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from google.auth import crypt, jwt as gjwt
from advisor.auth import FirebaseVerifier


def make_key():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test")])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(1)
            .not_valid_before(now - datetime.timedelta(days=1)).not_valid_after(now + datetime.timedelta(days=1)).sign(key, hashes.SHA256()))
    pem_key = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    return crypt.RSASigner.from_string(pem_key, key_id="k1"), cert.public_bytes(serialization.Encoding.PEM).decode()


def token(signer, **over):
    now = int(time.time())
    claims = {"iss": "https://securetoken.google.com/ema", "aud": "ema", "sub": "uid123", "iat": now, "exp": now + 3600,
              "email": "a@b.vn", "email_verified": True, "firebase": {"sign_in_provider": "google.com"}}
    claims.update(over)
    return gjwt.encode(signer, claims).decode()


def test_firebase_verifier():
    signer, cert = make_key()
    other, _ = make_key()
    v = FirebaseVerifier("ema")
    v._certs, v._exp = {"k1": cert}, time.time() + 999
    assert v(token(signer))["uid"] == "uid123"
    with pytest.raises(Exception):
        v(token(other))                      # ký bằng khóa lạ
    with pytest.raises(Exception):
        v(token(signer, aud="du-an-khac"))   # token của dự án Firebase khác
    with pytest.raises(Exception):
        v(token(signer, iss="https://evil"))  # sai bên cấp
    with pytest.raises(Exception):
        v(token(signer, iat=int(time.time()) - 7200, exp=int(time.time()) - 3600))  # hết hạn
