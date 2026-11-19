# Ecom Metrics Academy

Web app dạy 63 chỉ số Startup/E-commerce, chia theo 7 khâu vận hành: sản phẩm, traffic, chuyển đổi, kho vận, giữ chân, tài chính và đội ngũ.

**Bản chạy thử:** https://ongchuecom.github.io/ecom-metrics-academy/

## Tính năng
- **Giao diện** theo bộ nhận diện Ông chú Ecom / A1demy:
  - font Montserrat và Be Vietnam Pro;
  - màu vàng chanh, xanh lá, cam đỏ, mỗi màu một ý nghĩa cố định;
  - ưu tiên mobile: thanh trên cùng có ngăn kéo chọn chỉ số, tab dạng pill vuốt ngang.
- **Video motion cho mọi chỉ số**, dựng từ dữ liệu, không cần file MP4:
  - các cảnh Mở đầu → Nói gọn → Công thức → Ví dụ → Mạng lưới → Chốt;
  - tự phát khi cuộn tới;
  - có giọng đọc tiếng Việt nếu trình duyệt hỗ trợ.
- **Video bài giảng quay thật:** điền `media.video_url` (link Google Drive hoặc YouTube) cho chỉ số, hoặc dùng cột `video_url` trong CSV.
- **Mục Tài liệu và Sách & khóa học:** sửa trong `src/data/site.json`:
  - link thư mục Drive;
  - danh sách file;
  - tiêu đề, ảnh, link sang ongchuecom.com.
- **Thanh bên:** tìm theo mã hoặc tên tiếng Việt (gõ không dấu vẫn ra) và lọc theo 7 khâu.
- **Bài học:**
  - định nghĩa;
  - công thức hiển thị bằng KaTeX, kèm bản đọc được;
  - số tham khảo TikTok VN / Meta VN / D2C Mỹ (chỉ khi có số đáng tin).
- **Sơ đồ phụ thuộc** đặt dưới công thức:
  - cột Đầu vào → chỉ số đang học → Đầu ra và Đánh đổi;
  - xanh là thuận chiều, cam là nghịch chiều, tím là đánh đổi;
  - bấm vào một thẻ để chuyển sang chỉ số đó.
- **Giả lập chỉ số:** thanh trượt sinh từ JSON; ô kết quả chuyển đỏ khi vượt `warning_threshold`.
- **Bài tập chẩn đoán:**
  - hồ sơ bệnh án, bước 1 là tính toán (có gợi ý công thức, chấm theo dung sai);
  - bước 2 là quyết định chiến lược, chỉ mở khi bước 1 đúng.
- **Khám sức khỏe shop:** nhập số liệu thật của shop, nhận chẩn đoán.
- **Mô phỏng tổng thể:** P&L một tháng.
- **Bảng tính mẫu:** tải CSV giữ nguyên công thức.
- **Link chia sẻ** đúng bài, ví dụ `#fin_roas/homework`.

## Cấu trúc dữ liệu
```
src/data/stages/01_product.json … 07_team.json   # mỗi khâu một file, schema metricsMaster (SPEC V2)
src/data/index.js                                # gộp thành metricsMaster, metricById, STAGES
src/lib/formula.js                               # bộ tính formula_eval an toàn (không dùng eval)
```
Mỗi chỉ số có các trường:
- bắt buộc: `metric_id, code, name, vi_name, stage, sub_group, definition, formula{readable, latex}, benchmarks, relationships`;
- tùy chọn: `simulator` và `diagnostic_homework`.

`formula_eval` hỗ trợ:
- số, tên control và tên output đứng trước;
- các phép `+ - * / %` và dấu ngoặc;
- các hàm `min max abs round pow sqrt`.

## Thêm hoặc sửa chỉ số bằng Google Sheets
1. `npm run data:export` xuất toàn bộ dữ liệu ra `templates/metrics_master.csv`.
   - Mẫu rút gọn có ví dụ: `templates/metrics_master_template.csv`.
2. Mở file bằng Google Sheets (File → Import) và sửa. Cách ghi từng loại cột:
   - **upstream_drivers, downstream_impacts:** mỗi quan hệ một dòng trong ô (Ctrl+Enter), dạng `metric_id | direct | ghi chú` (hoặc `inverse` thay cho `direct`).
   - **trade_offs:** mỗi dòng dạng `metric_id | ghi chú`.
   - **simulator_json, homework_json:** JSON đúng schema; để trống nếu chưa có.
   - **Dòng ghi chú hoặc nháp:** bắt đầu `metric_id` bằng `#` thì dòng đó bị bỏ qua.
3. Tải về CSV (File → Download → CSV), rồi chạy `npm run data:import -- duong-dan/file.csv`.
4. Chạy `npm run validate` để kiểm tra:
   - id trùng;
   - quan hệ trỏ tới id không tồn tại;
   - output không tính được;
   - câu hỏi quyết định không có đúng 1 đáp án.

   Lệnh `npm run build` cũng tự chạy bước kiểm tra này.

## Đường dẫn và SEO
- Mỗi bài có link riêng:
  - `/chi-so/<slug>/` cho chỉ số;
  - `/playbook/<slug>/` cho Playbook;
  - `/kham-suc-khoe/` cho công cụ khám sức khỏe;
  - `/` cho trang chủ.
- Link cũ dạng `#vn_fin_cm2` vẫn mở được và tự chuyển sang link mới.
- Sau `vite build`, `scripts/prerender.mjs` tạo trang tĩnh cho 72 đường dẫn, kèm tiêu đề, mô tả và nội dung chữ để Google đọc. Script cũng sinh `sitemap.xml`, `robots.txt` và `404.html`.
- Tìm kiếm chung (chỉ số và Playbook, gõ không dấu): bấm Ctrl+K hoặc `/`.

## Dữ liệu gốc: 60 chỉ số và 10 Playbook
- File gốc: `data-src/vn_60_metrics_and_10_playbooks_pack.json`.
- Phần bổ sung:
  - `data-src/pack-extra.json`: mã ngắn hiển thị và định nghĩa từng chỉ số.
  - `data-src/carry-over.json`: giả lập, bài tập, số tham khảo giữ từ bản trước.
- Chạy `npm run data:pack` để sinh `src/data/stages/*.json` và `src/data/playbooks.json`.
- Liên kết chỉ số ↔ Playbook được hợp nhất hai chiều: chỉ số nhắc tới Playbook, hoặc Playbook nhắc tới chỉ số, đều hiện ở cả hai phía.
- `npm run validate` kiểm tra liên kết hai chiều khớp nhau.

## Video tình huống thực tế sau mỗi bài
- Mỗi bài có mục **Tình huống thực tế**:
  - một video 16:9 dựng theo skill `a1demy-explainer-video`, phong cách Màn hình thật;
  - một **playbook** viết theo skill `a1demy-google-docs-2`, gồm dấu hiệu, vì sao, ô tự soi tính bằng số của shop mình, 3 việc làm kèm số tiền, lỗi hay gặp.
- Dữ liệu nằm ở `src/data/cases.json`, video đóng gói ở `public/films/<metric_id>/`:
  - `index.html`: trình phát tự chạy;
  - `nhac.mp3`;
  - `poster.jpg`;
  - `loi-doc.srt`.
- Mã nguồn từng cảnh nằm ở `films-src/<metric_id>/`.
- Dựng lại (cần bộ khung trong skill `a1demy-social-video`):
  `python3 films-src/build.py films-src/<id>/spec.json out`, rồi `python3 films-src/make_player.py out public/films/<id>/index.html nhac.mp3`.
- `npm run validate` kiểm tra id và file của từng tình huống.

## Chạy
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # kiểm tra dữ liệu + build ra dist/
```
Mỗi lần push lên `main`, GitHub Actions tự build và deploy lên nhánh `gh-pages`.

> Số liệu trong ví dụ và bài tập là minh họa. Quy ước CM1/CM2/CM3 trong app: CM1 trước quảng cáo, CM2 sau quảng cáo, CM3 sau mọi chi phí marketing; các tài liệu khác có thể chia khác.
