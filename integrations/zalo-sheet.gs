/**
 * Nhận form "Để lại Zalo" từ Ecom Metrics Academy và ghi vào Google Sheet này.
 *
 * Cài đặt (5 phút, làm một lần):
 * 1. Mở Google Sheet "A1demy · Zalo từ Ecom Metrics Academy" → Tiện ích mở rộng → Apps Script.
 * 2. Xoá code mẫu, dán toàn bộ file này vào, bấm Lưu.
 * 3. Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web.
 *    - Thực thi với tư cách: Tôi
 *    - Người có quyền truy cập: Bất kỳ ai
 *    Bấm Triển khai, cấp quyền, rồi sao chép "URL ứng dụng web" (dạng https://script.google.com/macros/s/…/exec).
 * 4. Gửi URL đó cho Claude (hoặc dán vào "lead.endpoint" trong src/data/site.json) để bật form trên web.
 *
 * Sheet vẫn riêng tư: người gửi form chỉ ghi thêm được dòng mới, không đọc được dữ liệu.
 */
const HEADERS = ['Thời gian', 'Tên gọi', 'Số Zalo', 'Bán ở đâu', 'Doanh thu tháng', 'Cần hỗ trợ', 'Trang gửi', 'Nguồn', 'Tóm tắt khám sức khỏe', 'Đồng ý liên hệ']

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.tryLock(10000)
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    if (d.website) return out({ ok: true }) // ô bẫy chống bot: người thật không điền
    const phone = String(d.zalo || '').replace(/[^\d+]/g, '').replace(/^\+?84/, '0')
    if (!/^0(3|5|7|8|9)\d{8}$/.test(phone)) return out({ ok: false, error: 'phone' })
    if (d.consent !== true) return out({ ok: false, error: 'consent' })
    const cache = CacheService.getScriptCache()
    if (cache.get(phone)) return out({ ok: true, dup: true }) // cùng số gửi lại trong 10 phút thì bỏ qua
    cache.put(phone, '1', 600)
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS)
    // chặn chèn công thức vào Sheet (ô bắt đầu bằng = + - @)
    const safe = (s, n) => { s = String(s == null ? '' : s).slice(0, n); return /^[=+\-@]/.test(s) ? "'" + s : s }
    sh.appendRow([new Date(), safe(d.name, 80), "'" + phone, safe(d.channel, 40), safe(d.revenue, 40), safe(d.need, 500),
      safe(d.page, 200), safe(d.source, 60), safe(d.summary, 1500), 'Có'])
    return out({ ok: true })
  } catch (err) {
    return out({ ok: false, error: 'server' })
  } finally {
    lock.releaseLock()
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
