---
name: sinh-lo-khai-niem
description: Sinh hàng loạt khái niệm Ecom và khởi nghiệp (chỉ số, khái niệm, khung làm việc, thuật ngữ) cho Ecom Metrics Academy theo lô 20–100 bài, từ kho đề cử, sách Ecom Truyền Kỳ hoặc bài viết; qua máy kiểm rồi lên web với nhãn đang duyệt. Dùng khi người dùng nói "sinh thêm khái niệm", "làm lô mới", "lên 1000 khái niệm", "viết tiếp kho đề cử", "duyệt lô …".
---

# Sinh khái niệm theo lô

Mục tiêu là lên hàng nghìn khái niệm mà không hạ chất lượng. Mỗi bài đi qua 4 bước: **đề cử → viết → máy kiểm → duyệt**.

## 1. Đề cử (`content/backlog.json`)

Mỗi đề cử có các trường:

```json
{ "name": "Khởi nghiệp tinh gọn", "domain": "08_startup_strategy", "topic": "khoi-nghiep-tinh-gon", "type": "concept",
  "source": "Sách Ecom Truyền Kỳ, mục Khởi nghiệp tinh gọn", "why": "chủ shop mới hay đốt tiền trước khi kiểm chứng", "priority": 1, "status": "todo" }
```

- Lĩnh vực và chủ đề lấy từ `data-src/taxonomy.json`. Chưa có chủ đề hợp thì thêm chủ đề mới vào đó.
- **Loại:**
  - `metric`: đo được bằng số, có công thức.
  - `concept`: cách hiểu, nguyên lý.
  - `framework`: các bước, ma trận để ra quyết định.
  - `term`: thuật ngữ ngắn.
- **Trước khi thêm đề cử, kiểm trùng:** `npm run scan:article -- <file có tên khái niệm>` hoặc tìm trong `src/data/catalog.json`. Trùng thì thêm tên gọi khác vào `data-src/aliases.json`, không tạo bài mới.
- **Ưu tiên** (priority 1 cao nhất): khái niệm mà chủ shop Việt gặp hằng ngày, sách có ví dụ, nối được với khái niệm đã có.

## 2. Viết (mỗi khái niệm một file `content/concepts/<id>.json`)

- `id` theo mẫu `vn_<prod|mkt|sales|ops|ret|fin|team|str>_<ten_ngan>`. Tên file phải đúng `<id>.json`.
- **Bài mẫu chuẩn:**
  - Chỉ số: `vn_fin_breakeven_roas` trong `src/data/lessons.json`.
  - Khái niệm không có công thức: xem các file đã có trong `content/concepts/` có `"review": "approved"`.

```json
{
  "id": "vn_str_lean_startup",
  "type": "concept",
  "domain": "08_startup_strategy",
  "topic": "khoi-nghiep-tinh-gon",
  "code": "Khởi nghiệp tinh gọn",
  "vi_name": "Khởi nghiệp tinh gọn (Lean Startup)",
  "definition": "Một hai câu, nói như với chủ shop.",
  "aliases": ["lean startup", "MVP"],
  "related": ["vn_fin_cash_runway"],
  "playbook_refs": [],
  "formula": { "readable": "…" },
  "basis": { "type": "standard", "note": "Khái niệm chuẩn (Lean Startup, Eric Ries)." },
  "risk": "normal",
  "review": "draft",
  "batch": "2026-11-19-a",
  "sources": [{ "title": "Sách Ecom Truyền Kỳ", "note": "mục Khởi nghiệp tinh gọn" }],
  "lesson": {
    "subtitle": "Câu chủ shop hay tự hỏi?",
    "intro": ["**Câu định nghĩa in đậm.** Ví dụ có số…", "Vì sao quan trọng, nói thẳng…"],
    "breakdown": { "title": "…", "chart": { "type": "bars|compare|line|funnel|steps|matrix", "...": "..." }, "after": "…" },
    "sections": [{ "title": "…", "chart": { }, "body": ["…"] }],
    "mistakes": ["…", "…"],
    "remember": "Một câu để nhớ."
  }
}
```

Ghi chú các trường:
- `formula`: chỉ có khi `type` là `metric`.
- `related`: chỉ trỏ tới id đã có; bộ dựng tự nối chiều ngược.
- `basis.type`: `standard` khi khái niệm có tên chung trong ngành; `custom` khi tự xây, kèm `note` nói rõ dựng từ phép phân tích nào.
- `risk`: đặt `high` khi bài nói về thuế, luật, hóa đơn, phạt, hợp đồng, bảo hiểm, hoặc số liệu tài chính dễ gây thiệt hại nếu sai.
- `review`: luôn là `draft` khi mới viết.
- `batch`: mã lô, dạng `YYYY-MM-DD-<chữ cái>`.
- `sources`: bắt buộc ghi lấy từ đâu (sách, mục nào, bài viết nào).
- Kiểu biểu đồ và dữ liệu đúng như `src/components/LessonVisuals.jsx`:
  - `bars`: `items [[nhãn, số, "focus|keep|loss"?]]`, `unit`.
  - `compare`: `labels [a,b]`, `items [[nhãn, a, b]]`.
  - `line`: `points [[x,y]]` (x tăng dần), `threshold`, `now`, `lossBelowZero`.
  - `funnel`: `items [[nhãn, số giảm dần]]`.
  - `steps`: `items [[tên bước, mô tả]]`.
  - `matrix`: `x [2]`, `y [2]`, `cells [[{title,text,tone}]]`.

**Khẩu vị (bắt buộc):**
- Văn phong sách Ecom Truyền Kỳ: nói thẳng, ngắn, ví dụ shop Việt có số (đơn 100k, 3.000 đơn/tháng…).
- **Mọi phép tính viết ra phải đúng.** Viết dạng `a + b − c = d` để máy kiểm được. Dùng 1.000 cho hàng nghìn, 2,5 cho thập phân, đơn vị k, tr, tỷ, %.
- Giữ nguyên thuật ngữ quen dùng (ROAS, CPA, MVP, KOC…), không Việt hóa gượng.
- Không chèn "Ông chú Ecom", "A1demy" vào bài.
- Không bịa số liệu thị trường, không bịa trích dẫn. Số tham khảo chỉ đưa khi nguồn có.
- Thuật ngữ (`term`) được ngắn: 1 đoạn intro, 1 biểu đồ hoặc 1 mục, phần nhớ một câu.

**Sinh song song cho lô lớn:** chia đề cử thành nhóm 8–12 bài theo chủ đề. Mỗi nhóm giao một agent, kèm:
- bài mẫu;
- danh sách id đã có (để điền `related`);
- đoạn sách liên quan, tìm bằng grep trong bản sách nếu có;
- quy tắc khẩu vị ở trên.

Agent chỉ ghi file vào `content/concepts/`, không sửa file khác.

## 3. Máy kiểm

```
npm run check        # dựng nội dung + kiểm: khuôn, phép tính, trùng, mức rủi ro, khẩu vị
```

Lỗi nào cũng phải sửa hết. Cảnh báo "định nghĩa rất giống …" thì đọc hai bài: trùng thật thì bỏ bài mới và thêm tên gọi khác vào `aliases.json`.

Sau đó build, mở thử vài bài mỗi loại trên máy tính và điện thoại. Kiểm video bảng giảng hiện biểu đồ, không tràn khung.

## 4. Duyệt (hai mức)

- **Bài `risk: high`** (số liệu, thuế, pháp lý): anh Tuấn duyệt từng bài.
  - Lệnh: `npm run approve -- --ids id1,id2`.
- **Bài còn lại:** lên web với nhãn "Mới · đang duyệt". Anh Tuấn đọc mẫu 5–10 bài trong lô.
  - Ổn thì duyệt cả lô: `npm run approve -- --batch <mã lô>` (lệnh tự bỏ qua bài high).
  - Chưa ổn thì sửa khuôn hoặc khẩu vị rồi viết lại lô.
- Xem bài chờ duyệt: `npm run approve -- --list`, hoặc trang `/quan-tri/` → Nội dung → "Chờ duyệt" / "Cần duyệt từng bài".
- Góp ý và điểm sao của người đọc chỉ ra bài nào cần xem lại trước (skill `ra-soat-gop-y`).

Cuối mỗi lô:
1. Đặt `status: done` cho đề cử đã viết trong `backlog.json`.
2. Commit lên `main`.
3. Báo người dùng: số bài, số bài high cần duyệt từng bài, mã lô, 5 bài gợi ý đọc mẫu.
