"""SQLite chế độ WAL (nhiều worker đọc/ghi không khóa nhau), mỗi lần dùng mở một kết nối ngắn."""
import os
import sqlite3
from contextlib import contextmanager

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY, email TEXT, name TEXT,
  plan TEXT NOT NULL DEFAULT 'trial', expires_at INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage (uid TEXT NOT NULL, day TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (uid, day));
CREATE TABLE IF NOT EXISTS orders (
  code TEXT PRIMARY KEY, uid TEXT NOT NULL, plan TEXT NOT NULL, amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, paid_at INTEGER NOT NULL DEFAULT 0, sepay_id TEXT
);
CREATE INDEX IF NOT EXISTS orders_uid ON orders(uid, status);
-- mọi webhook nhận được đều ghi lại (chống cộng trùng theo mã giao dịch SePay, và để xử lý tay chuyển thiếu/sai nội dung)
CREATE TABLE IF NOT EXISTS payments (
  sepay_id TEXT PRIMARY KEY, code TEXT, amount INTEGER, content TEXT, result TEXT NOT NULL, received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY, source TEXT NOT NULL, source_type TEXT NOT NULL, ref_id TEXT, title TEXT, content TEXT NOT NULL,
  model TEXT NOT NULL, dim INTEGER NOT NULL, embedding BLOB NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chunks_source ON chunks(source);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, kind TEXT, status TEXT, detail TEXT, created_at INTEGER, finished_at INTEGER);
"""


class DB:
    def __init__(self, path: str):
        self.path = path
        d = os.path.dirname(path)
        if d:
            os.makedirs(d, exist_ok=True)
        with self.conn() as c:
            c.execute("PRAGMA journal_mode=WAL")
            c.executescript(SCHEMA)

    @contextmanager
    def conn(self):
        c = sqlite3.connect(self.path, timeout=10, isolation_level=None)  # tự quản lý giao dịch bằng BEGIN
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA busy_timeout=10000")
        try:
            yield c
        finally:
            c.close()

    @contextmanager
    def tx(self):
        """Giao dịch ghi độc quyền: đọc-rồi-ghi an toàn giữa các worker."""
        with self.conn() as c:
            c.execute("BEGIN IMMEDIATE")
            try:
                yield c
                c.execute("COMMIT")
            except BaseException:
                c.execute("ROLLBACK")
                raise

    def meta_get(self, key, default=None):
        with self.conn() as c:
            r = c.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
            return r["value"] if r else default

    def meta_set(self, key, value):
        with self.conn() as c:
            c.execute("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, str(value)))
