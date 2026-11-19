# Ecom Metrics Academy

- Dữ liệu chỉ số được sinh ra, không sửa tay `src/data/stages/*.json`. Sửa ở `data-src/`, rồi chạy `npm run data:pack`.
- Bài đọc nằm ở `src/data/lessons.json`. Bài mẫu chuẩn là `vn_fin_breakeven_roas`.
- Khi người dùng dán một bài viết để tìm khái niệm hoặc sinh chỉ số mới, làm theo skill `.claude/skills/bai-viet-sinh-chi-so/SKILL.md`.
- Mỗi lần push lên `main`, GitHub Actions tự dựng web lên GitHub Pages.
- Chấm sao, góp ý ẩn danh và chia sẻ nằm ở `src/components/PageFeedback.jsx`. Góp ý được ghi qua `integrations/sheet-receiver.gs` thành file JSONL trong repo riêng `ongchuecom/ecom-metrics-feedback` (không dùng Drive). Xem tóm tắt bằng `npm run feedback:summary`.
- Rà góp ý (theo lịch mỗi 2 ngày, hoặc khi được nhờ) làm theo skill `.claude/skills/ra-soat-gop-y/SKILL.md`.
