---
name: bai-viet-sinh-chi-so
description: Anh Tuấn dán một bài viết hay (bài Facebook, blog, báo cáo, ghi chú) vào Ecom Metrics Academy để hệ thống nhận diện các khái niệm, đối chiếu với các chỉ số đã có, và sinh thêm chỉ số cùng bài đọc cho khái niệm mới nếu đáng. Dùng khi người dùng dán một bài viết dài, hoặc nói "bài này hay", "quét bài này", "có khái niệm gì mới", "thêm chỉ số từ bài này", "sinh bài từ bài viết".
---

# Bài viết → chỉ số mới

Web là trang tĩnh, nên việc đọc bài và viết bài mới do Claude làm ngay trong repo này, rồi đẩy lên `main` để GitHub Actions tự dựng lại web.

## Bước 1. Lưu bài và quét

1. Lưu nguyên văn bài vào `data-src/articles/YYYY-MM-DD-<slug-ngắn>.md`. Đầu file ghi: tiêu đề, tác giả, link (nếu người dùng đưa), ngày dán.
2. Chạy `npm run scan:article -- data-src/articles/<file>.md`.
   - Mục **Đã có bài** là các chỉ số trong bài viết đã có trên web.
   - Mục **Khái niệm chưa khớp** là các viết tắt, thuật ngữ và cụm "tỷ lệ…", "chi phí…" chưa có. Đây chỉ là gợi ý thô.
3. Đọc lại toàn bài bằng mắt mình. Bộ quét chỉ bắt chữ, nên có thể sót khái niệm được diễn đạt bằng lời. Nếu bộ quét khớp nhầm (ví dụ một chữ chung chung), sửa `data-src/aliases.json`.

## Bước 2. Lọc: khái niệm nào đáng thành chỉ số mới

Khái niệm chỉ đáng thêm khi đạt **cả 4** điều kiện đầu, rồi xét thêm điều kiện 5:

1. **Đo được bằng số**, có công thức tính từ dữ liệu một shop TMĐT Việt Nam tự lấy được: Seller Center, trình quản lý quảng cáo, file kho, sổ sách.
2. **Không trùng** chỉ số đã có, kể cả trùng dưới tên khác.
   - Ví dụ: CAC hay CPO chính là CPA; LTV chính là CLV; GMV nằm trong Net Sales.
   - Nếu trùng, thêm tên gọi đó vào `data-src/aliases.json` thay vì tạo chỉ số mới.
3. **Giúp ra quyết định**: nhìn số này thì chủ shop biết nên làm gì khác đi. Không lấy những khái niệm chỉ để biết cho vui.
4. **Bài viết có ví dụ số, hoặc tự dựng được một ví dụ số hợp lý** cho shop Việt.
5. **Có tên chuẩn hay tự xây?** Ưu tiên khái niệm có tên chung trong ngành, tức là tra được trong sách tài chính, kế toán quản trị hay marketing. Ví dụ: Payback Period, MER, nCAC.
   - **Chuẩn:** dùng đúng tên ngành, kèm tên tiếng Anh trong ngoặc. Ghi `basis.type = "standard"`.
   - **Tự xây:** khi chỉ số chỉ là cách mình đóng gói một phép phân tích chuẩn thành tỷ lệ, vẫn được thêm, nhưng phải:
     - đặt tên mô tả sát nghĩa, kèm tên tiếng Anh gần nhất;
     - ghi `basis.type = "custom"` và `basis.note` nói rõ chỉ số dựng từ phép phân tích chuẩn nào.

     Web sẽ hiện dòng "Chỉ số tự xây" ngay dưới tiêu đề bài.
   - Không tự bịa tên nghe như thuật ngữ ngành khi ngành không có tên đó.

Khi không đạt thì bỏ qua và ghi lý do một dòng. Các trường hợp thường gặp:
- Chiến thuật hoặc phương pháp (ví dụ "chạy ads theo phễu").
- Khái niệm quá chung (ví dụ "thương hiệu").
- Số chỉ sàn hoặc công cụ mới có, shop không tự tính được.

Báo kết quả cho người dùng bằng một bảng ba nhóm:
- **Đã có**: chỉ số nào, kèm link `/chi-so/<slug>/`.
- **Sinh thêm**: khái niệm nào, kèm lý do một dòng, kèm cột **Chuẩn / Tự xây** (tự xây thì ghi dựng từ phép phân tích nào).
- **Bỏ qua**: khái niệm nào, kèm lý do.

Sau đó làm luôn nhóm "Sinh thêm" mà không cần hỏi lại. Người dùng đã đồng ý cơ chế "thấy hợp lý thì sinh thêm". Bài mới luôn mang nhãn **Mới · đang duyệt** cho tới khi anh Tuấn duyệt.

## Bước 3. Sinh chỉ số

Thêm một phần tử vào `metrics` trong `data-src/added-metrics.json`. Không sửa file pack gốc. Khuôn như sau:

```json
{
  "metric_id": "vn_mkt_mer",
  "code": "TY_SO_DOANH_THU_TREN_MARKETING_MER",
  "code_short": "MER",
  "name": "Hiệu quả marketing toàn shop (MER)",
  "definition": "Một câu, nói như nói với chủ shop: số này là gì và để làm gì.",
  "stage": "02_Traffic_Acquisition",
  "sub_group": "Quảng cáo",
  "playbook_refs": ["pb_.."],
  "formula_readable": "Tổng doanh thu / Tổng chi phí marketing (Ads + KOC + Affiliate + Voucher)",
  "formula_derived": "Total_Revenue / Total_Marketing_Cost",
  "relationships": {
    "upstream_drivers": [{ "metric_id": "vn_mkt_cpa", "impact": "inverse_proportional", "note": "…" }],
    "downstream_impacts": [{ "metric_id": "vn_fin_cm3", "impact": "direct_proportional", "note": "…" }],
    "trade_offs": []
  },
  "review": "draft",
  "basis": { "type": "standard", "note": "Khái niệm chuẩn (tên tiếng Anh) hoặc: Chỉ số do Ecom Metrics Academy xây từ … Đây không phải KPI có tên chung trong ngành." },
  "sources": [{ "title": "Tiêu đề bài", "author": "Tên tác giả nếu có", "url": "https://… nếu có", "file": "data-src/articles/….md" }]
}
```

Cách điền các trường:
- `stage` là một trong 7 khâu: `01_Product_RnD`, `02_Traffic_Acquisition`, `03_Conversion_Sales`, `04_Fulfillment_SupplyChain`, `05_Retention_Lifecycle`, `06_Finance_UnitEconomics`, `07_Team_Productivity`.
- `metric_id` theo mẫu `vn_<prod|mkt|sales|ops|ret|fin|team>_<tên_ngắn>`.
- `relationships`:
  - Chỉ trỏ tới id đã có.
  - Bộ nạp tự nối chiều ngược, nên chỉ số cũ sẽ hiện chỉ số mới trong sơ đồ.
- `playbook_refs`:
  - Chọn Playbook trong `src/data/playbooks.json` thực sự liên quan.
  - Bộ nạp tự thêm chiều ngược vào Playbook.
- Không có Playbook nào hợp thì để mảng rỗng.

## Bước 4. Viết bài đọc

Thêm khóa `<metric_id>` vào `src/data/lessons.json`. Bài mẫu chuẩn đã duyệt là `vn_fin_breakeven_roas`; đọc nó trước, giữ đúng cấu trúc:
- `subtitle`: câu hỏi chủ shop hay tự hỏi.
- `intro`: 2–3 đoạn.
- `tree`: cây công thức với `expr.label`, `eq`, `dir` up/down, `id` cho biến là chỉ số đã có.
- `breakdown`: `title`, `chart`, `after`.
- `sections`: 1–2 mục, mỗi mục có `chart` và `body`.
- `mistakes`, `remember`.
- `quote` chỉ khi có trích dẫn thật từ bài viết, và ghi nguồn.

Biểu đồ dùng một trong các kiểu `bars`, `line`, `funnel`, `compare`, `matrix`, `steps`. Định dạng dữ liệu xem trong `src/components/LessonVisuals.jsx`. Video bảng giảng tự dựng từ chính các biểu đồ này.

Khẩu vị bắt buộc:
- Văn phong sách Ecom Truyền Kỳ: nói thẳng, ví dụ shop Việt, có số cụ thể (đơn 100k, 3.000 đơn/tháng…).
- Giữ nguyên từ của tác giả, không Việt hóa thuật ngữ quen dùng: ROAS, CPA, MER, COD…
- Mọi con số trong ví dụ phải cộng trừ khớp nhau; tự kiểm lại phép tính trước khi lưu.
- Tên thương hiệu "Ông chú Ecom" không chèn vào bài.
- Không bịa số liệu thị trường. Số tham khảo chỉ đưa khi bài viết có, và ghi rõ lấy từ bài viết.

## Bước 5. Nạp, kiểm, đẩy

1. Chạy lần lượt:
   ```
   npm run data:pack
   npm run build
   ```
   `npm run build` đã gồm bước kiểm dữ liệu: id, liên kết hai chiều, bài đọc bắt buộc.
2. Chụp nhanh trang `/chi-so/<slug>/` trên máy tính và điện thoại bằng Playwright.
   - Kiểm phần công thức, biểu đồ và video bảng giảng không tràn khung.
   - Kiểm trang không báo lỗi.
3. Commit lên `main` gồm: `data-src/articles/…`, `data-src/added-metrics.json`, `src/data/lessons.json`, file sinh ra trong `src/data/stages/` và `src/data/playbooks.json`, cùng `aliases.json` nếu có sửa.
4. Push, rồi theo dõi lượt chạy "Deploy to GitHub Pages".
5. Báo người dùng:
   - Bảng ba nhóm ở Bước 2.
   - Link các bài mới.
   - Nhắc rằng các bài này đang mang nhãn "Mới · đang duyệt".

## Duyệt

Khi anh Tuấn nói "duyệt <chỉ số>":
1. Đổi `review` thành `approved` trong `data-src/added-metrics.json`.
2. Chạy `npm run data:pack`, rồi commit và push.

Khi anh nói "bỏ <chỉ số>":
1. Xóa phần tử đó khỏi `data-src/added-metrics.json`, và xóa khóa của nó trong `lessons.json`.
2. Chạy `npm run data:pack`, rồi commit và push.
