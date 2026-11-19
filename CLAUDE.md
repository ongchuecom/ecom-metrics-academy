# Ecom Metrics Academy

- Dữ liệu chỉ số được sinh ra, không sửa tay `src/data/stages/*.json`. Sửa ở `data-src/`, rồi chạy `npm run data:pack`.
- Mô hình nội dung cho hàng nghìn khái niệm: phân loại Lĩnh vực → Chủ đề → Khái niệm ở `data-src/taxonomy.json`; khái niệm mới (khái niệm, khung làm việc, thuật ngữ, chỉ số) mỗi cái một file `content/concepts/<id>.json`. `scripts/build-content.mjs` (chạy tự động khi build/dev) sinh chỉ mục nhẹ `src/data/catalog.json` và nội dung đầy đủ `public/data/c/<id>.json` (tải khi mở bài, `useConcept` trong `src/lib/content.js`). Hai file sinh ra này không commit. Không import `lessons.json` vào giao diện.
- Bài đọc nằm ở `src/data/lessons.json`. Bài mẫu chuẩn là `vn_fin_breakeven_roas`.
- Khi người dùng dán một bài viết để tìm khái niệm hoặc sinh chỉ số mới, làm theo skill `.claude/skills/bai-viet-sinh-chi-so/SKILL.md`.
- Mỗi lần push lên `main`, GitHub Actions tự dựng web lên GitHub Pages.
- Chấm sao, góp ý ẩn danh và chia sẻ nằm ở `src/components/PageFeedback.jsx`. Góp ý vào hàng chờ của `integrations/sheet-receiver.gs`, cứ 5 phút gom thành một commit file JSONL trong repo riêng `ongchuecom/ecom-metrics-feedback` (không dùng Drive). Xem tóm tắt bằng `npm run feedback:summary`.
- Rà góp ý (theo lịch mỗi 2 ngày, hoặc khi được nhờ) làm theo skill `.claude/skills/ra-soat-gop-y/SKILL.md`.
- Trắc nghiệm Playbook nằm ở `data-src/quizzes.json` (kèm `gamification_config`), nạp vào `src/data/playbooks.json` bằng `npm run data:pack`. Điểm lần nộp đầu mỗi Playbook là điểm chính thức. Điểm và bảng xếp hạng lưu trên Firestore (`players/{uid}`, `src/lib/db.js`), cần đăng nhập. Quy tắc bảo mật `integrations/firestore.rules` được sinh tự động từ dữ liệu Playbook (`npm run data:pack`), build sẽ báo lỗi nếu file lệch.
- Đăng nhập Google/Facebook qua Firebase Authentication (`src/lib/auth.jsx`, `src/components/Login.jsx`), cấu hình ở `auth.firebase` trong `src/data/site.json`; để trống `apiKey` thì nút đăng nhập ẩn. SDK chỉ tải khi cần. Hướng dẫn cài: `integrations/SETUP-DANG-NHAP.md`.
- Kiểm thử với bộ giả lập Firebase: build với `VITE_FB_EMULATOR=1` (nối Auth 9099, Firestore 8085); bản chạy thật không có đoạn này.
- Trang quản trị `/quan-tri/` (`src/components/Admin.jsx`, tải khi cần, không có trong sitemap): tổng quan, người chơi (xóa tên vi phạm), góp ý (đọc repo riêng bằng token chỉ-đọc lưu trên máy quản trị viên), nội dung, cài đặt. Quyền quản trị theo `admin.uids` trong `site.json`, được ghi vào `firestore.rules` khi chạy `npm run data:pack`.
