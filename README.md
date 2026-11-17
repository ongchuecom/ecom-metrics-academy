# Ecom Metrics Academy

Web app dạy các chỉ số Startup / E-commerce: **AOV, CAC, ROAS, CLV, P&L**.

## Tính năng
- **Danh sách chỉ số** (bên trái): mỗi chỉ số có định nghĩa, công thức, ví dụ tính tay, ngưỡng tham khảo và đòn bẩy cải thiện.
- **Giả lập (Simulator):** kéo thanh trượt (AOV, giá vốn, phí sàn, ngân sách quảng cáo, CPC, tỉ lệ chuyển đổi, khách quay lại, vòng đời, chi phí cố định) và xem AOV, CAC, ROAS so với ROAS hòa vốn, CLV, CLV/CAC, P&L tháng đổi ngay lập tức.
- **Bài tập thực chiến:**
  - 3 tình huống có đáp án (chấm điểm, sai lệch cho phép 2%, kèm lời giải).
  - Chẩn đoán "bệnh án tài chính": nhập số liệu một tháng, nhận danh sách triệu chứng, chẩn đoán và đơn thuốc theo mức độ Nặng / Cảnh báo / Tốt.
- **Bảng tính mẫu:** P&L tháng và Unit economics một đơn, sửa ô nhập để tính lại; tải CSV giữ nguyên công thức (mở bằng Google Sheets / Excel) hoặc chép thẳng sang bảng tính.

## Công thức chính
| Chỉ số | Công thức |
|---|---|
| AOV | Doanh thu ÷ Số đơn |
| CAC | Chi phí marketing ÷ Số khách mới |
| ROAS | Doanh thu từ quảng cáo ÷ Chi phí quảng cáo |
| ROAS hòa vốn | 1 ÷ Biên đóng góp trước quảng cáo |
| CLV | AOV × Số đơn trong vòng đời × Biên đóng góp |
| Lãi ròng | Doanh thu − Giá vốn − Chi phí biến đổi − Quảng cáo − Chi phí cố định |

## Chạy trên máy
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # xuất bản tĩnh ra thư mục dist/
```

Công nghệ: Vite 6, React 18, Tailwind CSS 4.

> Số liệu trong ví dụ là minh họa. Ngưỡng "tham khảo" chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.
