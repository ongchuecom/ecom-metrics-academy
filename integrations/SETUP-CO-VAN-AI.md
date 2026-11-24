# Cài Cố vấn AI (hỏi đáp, dùng thử 7 ngày, gói Pro trả qua VietQR)

Web Ecom Metrics Academy là trang tĩnh trên GitHub Pages. Cố vấn AI cần một máy chủ riêng (thư mục `server/`) vì phải giữ khóa Gemini, đếm lượt hỏi và nhận tiền. Trước khi làm, đăng nhập Google/Facebook phải chạy được (xem `SETUP-DANG-NHAP.md`).

Khi `site.json → advisor.endpoint` còn để trống, trang `/hoi-dap/`, nút "Hỏi Cố vấn AI" và mục quản trị "Cố vấn AI" tự ẩn. Web vẫn chạy bình thường.

## Cần chuẩn bị

| Thứ cần có | Lấy ở đâu |
|---|---|
| VPS Ubuntu 22.04 hoặc 24.04, 1 vCPU, 1–2 GB RAM | Nhà cung cấp VPS bất kỳ |
| Tên miền phụ cho máy chủ, ví dụ `api.ten-mien.vn` | Thêm bản ghi A trỏ về IP của VPS |
| Khóa Gemini API | aistudio.google.com → Get API key (bật thanh toán để có hạn mức đủ dùng) |
| Tài khoản SePay đã liên kết tài khoản ngân hàng nhận tiền | sepay.vn |
| `projectId` Firebase | Giống `site.json → auth.firebase.projectId` |

Khóa Gemini và khóa SePay chỉ điền vào file `.env` trên VPS. Không dán vào chat, không commit lên repo.

## Bước 1. Cài máy chủ

```bash
git clone https://github.com/ongchuecom/ecom-metrics-academy.git
cd ecom-metrics-academy/server
sudo bash deploy/deploy.sh
```

Lần đầu, script tạo `/opt/ecom-advisor/.env` từ mẫu rồi dừng lại.

## Bước 2. Điền `.env`

```bash
sudo nano /opt/ecom-advisor/.env
```

- `GEMINI_API_KEY`: khóa vừa lấy.
- `FIREBASE_PROJECT_ID`: projectId Firebase.
- `SEPAY_WEBHOOK_KEY`: tạo bằng `openssl rand -hex 24`. Giữ lại chuỗi này để dán vào SePay ở bước 4.
- `BANK_BIN`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME`: tài khoản nhận tiền. `BANK_BIN` là mã ngân hàng, ví dụ 970422 là MB Bank. Tên chủ tài khoản viết hoa, không dấu.
- `ADMIN_UIDS`: uid Firebase của quản trị viên, giống `site.json → admin.uids`.

Thiếu một giá trị bắt buộc thì máy chủ từ chối khởi động và báo thiếu gì (`journalctl -u ecom-advisor -n 50`).

Chạy lại script để khởi động:

```bash
sudo bash deploy/deploy.sh
```

## Bước 3. Tên miền và HTTPS

```bash
sudo nano /etc/nginx/sites-available/ecom-advisor        # đổi api.TEN-MIEN-CUA-ANH thành tên miền thật
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.ten-mien.vn
curl https://api.ten-mien.vn/health                      # thấy "status":"ok" là được
```

## Bước 4. Nối SePay

Trong SePay, vào phần WebHooks và thêm một webhook:

- **Gọi đến URL:** `https://api.ten-mien.vn/api/billing/webhook/sepay`
- **Sự kiện:** tiền vào.
- **Kiểu chứng thực:** API Key. Dán đúng chuỗi `SEPAY_WEBHOOK_KEY`.

Khách quét QR, nội dung chuyển khoản là mã đơn dạng `EMAxxxxxxxx`. Khi SePay báo tiền về đúng mã và đủ số tiền, gói Pro tự kích hoạt và trang của khách tự chuyển sang "Đã kích hoạt". Khoản chuyển thiếu, sai nội dung hay không có mã sẽ hiện ở Quản trị → Cố vấn AI → "Thanh toán cần xử lý tay".

## Bước 5. Bật trên web

1. Mở `src/data/site.json` và điền `"advisor": { "endpoint": "https://api.ten-mien.vn" }`.
2. Push lên `main`. GitHub Actions sẽ tự dựng lại web.

## Bước 6. Nạp tri thức lần đầu

Đăng nhập bằng tài khoản quản trị, mở `/quan-tri/` → **Cố vấn AI**, rồi bấm **Đồng bộ từ web**. Máy chủ đọc toàn bộ khái niệm và Playbook trên web rồi tạo chỉ mục tìm kiếm. Mất khoảng 1–3 phút; tiến độ hiện ở danh sách việc.

Bấm lại nút này mỗi khi web có thêm bài. Máy chủ chỉ tạo embedding cho đoạn mới hoặc đoạn đã sửa, và xóa đoạn của bài đã gỡ.

Ngoài web, tri thức còn nạp được từ hai nguồn:

- **Tài liệu riêng (PDF, DOCX, TXT, MD, CSV, tối đa 25 MB):** bấm **Chọn tài liệu**, rồi **Nạp**.
- **Thư mục Google Drive:**
  1. Tạo Service Account trên Google Cloud.
  2. Chép file JSON của Service Account lên VPS.
  3. Điền đường dẫn file vào `GOOGLE_APPLICATION_CREDENTIALS` trong `.env`.
  4. Chia sẻ thư mục Drive (quyền xem) cho email của Service Account.
  5. Dán ID thư mục vào ô **Đồng bộ Drive**.

## Gói và hạn mức

Gói và hạn mức nằm trong `server/advisor/config.py` → `PLANS`. Muốn đổi giá hay số câu thì sửa ở đó rồi chạy lại `deploy.sh`.

| Gói | Giá | Thời hạn | Câu hỏi mỗi ngày |
|---|---|---|---|
| Dùng thử | miễn phí | 7 ngày | 15 |
| Pro tháng | 200.000đ | 30 ngày | 50 |
| Pro năm | 1.800.000đ | 365 ngày | 80 |

- Mỗi tài khoản Google hoặc Facebook được dùng thử một lần.
- Lượt hỏi được tính lại lúc 0 giờ theo giờ Việt Nam.
- Câu hỏi lỗi (Gemini không trả lời) không bị trừ lượt.

## Cập nhật và sao lưu

- **Cập nhật mã:** `git pull`, rồi `sudo bash server/deploy/deploy.sh`. Script giữ nguyên `.env` và dữ liệu.
- **Dữ liệu:** toàn bộ nằm trong `/opt/ecom-advisor/data/advisor.db` (người dùng, đơn hàng, thanh toán, tri thức). Sao lưu file này định kỳ, ví dụ: `sqlite3 advisor.db ".backup /root/advisor-$(date +%F).db"`.
- **Nhật ký:** `journalctl -u ecom-advisor -f`.

## Kiểm thử trên máy

```bash
cd server && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt pytest httpx
.venv/bin/pytest -q
```

Bộ kiểm thử dùng Gemini giả, nên không cần khóa và không tốn tiền.
