# Tùy chọn: chạy trên Cloud Run hoặc máy có Docker. Dữ liệu (SQLite) cần ổ đĩa bền: gắn volume vào /app/data
# (Cloud Run nên chạy 1 instance và gắn Cloud Storage FUSE, hoặc dùng VPS theo deploy/deploy.sh).
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY advisor ./advisor
ENV DB_PATH=/app/data/advisor.db TRUST_PROXY=0
EXPOSE 8080
CMD ["sh", "-c", "uvicorn advisor.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
