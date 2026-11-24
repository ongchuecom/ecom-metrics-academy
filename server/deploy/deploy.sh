#!/bin/bash
# Cài hoặc cập nhật Cố vấn AI trên VPS Ubuntu/Debian. Chạy bằng quyền root từ thư mục server/ của repo:
#   sudo bash deploy/deploy.sh
set -euo pipefail
APP=/opt/ecom-advisor
cd "$(dirname "$0")/.."

echo "=== 1. Gói hệ thống ==="
apt-get update -qq
apt-get install -y -qq python3 python3-venv nginx certbot python3-certbot-nginx tzdata sqlite3 >/dev/null

echo "=== 2. Người dùng riêng, chép mã nguồn ==="
id ecomadvisor >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin ecomadvisor
mkdir -p "$APP/data"
cp -r advisor requirements.txt "$APP/"
[ -f "$APP/.env" ] || { cp .env.example "$APP/.env"; NEW_ENV=1; }
chown -R ecomadvisor:ecomadvisor "$APP/data"
chown root:ecomadvisor "$APP/.env" && chmod 640 "$APP/.env"

echo "=== 3. Thư viện Python ==="
[ -d "$APP/venv" ] || python3 -m venv "$APP/venv"
"$APP/venv/bin/pip" install -q --upgrade pip
"$APP/venv/bin/pip" install -q -r "$APP/requirements.txt"

echo "=== 4. Dịch vụ chạy nền ==="
cp deploy/ecom-advisor.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ecom-advisor >/dev/null
if [ "${NEW_ENV:-0}" = "1" ]; then
  echo "[!] Vừa tạo $APP/.env từ mẫu. Điền các giá trị bắt buộc rồi chạy: systemctl restart ecom-advisor"
  exit 0
fi
systemctl restart ecom-advisor
sleep 3
curl -fsS http://127.0.0.1:8000/health && echo || { echo "Máy chủ chưa chạy, xem: journalctl -u ecom-advisor -n 50"; exit 1; }

echo "=== 5. Nginx ==="
if [ ! -f /etc/nginx/sites-available/ecom-advisor ]; then
  cp deploy/nginx-api.conf /etc/nginx/sites-available/ecom-advisor
  ln -sf /etc/nginx/sites-available/ecom-advisor /etc/nginx/sites-enabled/ecom-advisor
  echo "[!] Sửa tên miền trong /etc/nginx/sites-available/ecom-advisor, rồi: nginx -t && systemctl reload nginx && certbot --nginx -d api.TEN-MIEN"
else
  nginx -t && systemctl reload nginx
fi
echo "Xong."
