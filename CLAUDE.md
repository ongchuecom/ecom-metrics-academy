# Ecom Metrics Academy

- Dữ liệu chỉ số được sinh ra, không sửa tay `src/data/stages/*.json`. Sửa ở `data-src/`, rồi chạy `npm run data:pack`.
- Bài đọc nằm ở `src/data/lessons.json`. Bài mẫu chuẩn là `vn_fin_breakeven_roas`.
- Khi người dùng dán một bài viết để tìm khái niệm hoặc sinh chỉ số mới, làm theo skill `.claude/skills/bai-viet-sinh-chi-so/SKILL.md`.
- Mỗi lần push lên `main`, GitHub Actions tự dựng web lên GitHub Pages.
