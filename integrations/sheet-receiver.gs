/**
 * Nhận dữ liệu từ Ecom Metrics Academy và ghi vào Google Sheet riêng tư. Có 2 loại:
 *  - Form "Để lại Zalo": ghi vào tab đầu của Sheet chứa script này ("A1demy · Zalo từ Ecom Metrics Academy").
 *  - Chấm sao và góp ý ẩn danh (type = "feedback"): ghi vào Sheet "A1demy · Góp ý Ecom Metrics Academy".
 *    Script tìm Sheet này theo tên trên Drive (tạo mới nếu chưa có). AI rà soát mỗi 2 ngày đọc từ đây.
 *
 * Cài đặt (5 phút, làm một lần; đã cài bản cũ thì dán đè rồi triển khai lại):
 * 1. Mở Google Sheet "A1demy · Zalo từ Ecom Metrics Academy" → Tiện ích mở rộng → Apps Script.
 * 2. Xoá code cũ, dán toàn bộ file này vào, bấm Lưu.
 * 3. Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web.
 *    - Thực thi với tư cách: Tôi
 *    - Người có quyền truy cập: Bất kỳ ai
 *    Bấm Triển khai, cấp quyền (có thêm quyền Drive để tìm Sheet góp ý), rồi sao chép "URL ứng dụng web"
 *    (dạng https://script.google.com/macros/s/…/exec).
 *    Nếu đã có triển khai cũ: Triển khai → Quản lý triển khai → sửa → Phiên bản: Mới, để giữ nguyên URL.
 * 4. Gửi URL đó cho Claude (hoặc dán vào "lead.endpoint" trong src/data/site.json) để bật form trên web.
 *
 * Sheet vẫn riêng tư: người gửi chỉ ghi thêm được dòng mới, không đọc được dữ liệu.
 */
const HEADERS = ['Thời gian', 'Tên gọi', 'Số Zalo', 'Bán ở đâu', 'Doanh thu tháng', 'Cần hỗ trợ', 'Trang gửi', 'Nguồn', 'Tóm tắt khám sức khỏe', 'Đồng ý liên hệ']
const FEEDBACK_NAME = 'A1demy · Góp ý Ecom Metrics Academy'
const FEEDBACK_HEADERS = ['Thời gian', 'Loại', 'Trang', 'Tên bài', 'Số sao', 'Góp ý', 'Thiết bị']

// chặn chèn công thức vào Sheet (ô bắt đầu bằng = + - @)
const safe = (s, n) => { s = String(s == null ? '' : s).slice(0, n); return /^[=+\-@]/.test(s) ? "'" + s : s }

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.tryLock(10000)
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    if (d.website) return out({ ok: true }) // ô bẫy chống bot: người thật không điền
    return d.type === 'feedback' ? feedback(d) : lead(d)
  } catch (err) {
    return out({ ok: false, error: 'server' })
  } finally {
    lock.releaseLock()
  }
}

function lead(d) {
  const phone = String(d.zalo || '').replace(/[^\d+]/g, '').replace(/^\+?84/, '0')
  if (!/^0(3|5|7|8|9)\d{8}$/.test(phone)) return out({ ok: false, error: 'phone' })
  if (d.consent !== true) return out({ ok: false, error: 'consent' })
  const cache = CacheService.getScriptCache()
  if (cache.get(phone)) return out({ ok: true, dup: true }) // cùng số gửi lại trong 10 phút thì bỏ qua
  cache.put(phone, '1', 600)
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS)
  sh.appendRow([new Date(), safe(d.name, 80), "'" + phone, safe(d.channel, 40), safe(d.revenue, 40), safe(d.need, 500),
    safe(d.page, 200), safe(d.source, 60), safe(d.summary, 1500), 'Có'])
  return out({ ok: true })
}

// Góp ý ẩn danh: không nhận tên, số điện thoại hay email
function feedback(d) {
  const rating = Number(d.rating)
  const hasRating = Number.isInteger(rating) && rating >= 1 && rating <= 5
  const comment = String(d.comment || '').trim().slice(0, 1000)
  if (!hasRating && !comment) return out({ ok: false, error: 'empty' })
  const cache = CacheService.getScriptCache()
  // chống spam: tối đa 40 lượt mỗi phút cho cả trang, và bỏ bản gửi trùng trong 10 phút
  const n = Number(cache.get('fb-min') || 0)
  if (n >= 40) return out({ ok: false, error: 'busy' })
  cache.put('fb-min', String(n + 1), 60)
  const key = 'fb-' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, [d.page, rating, comment].join('|')))
  if (cache.get(key)) return out({ ok: true, dup: true })
  cache.put(key, '1', 600)
  const sh = feedbackSheet()
  if (sh.getLastRow() === 0) sh.appendRow(FEEDBACK_HEADERS)
  const ref = Number(d.rating_ref)
  const kind = comment ? (hasRating ? 'Sao + góp ý' : ref >= 1 && ref <= 5 ? 'Góp ý (người này chấm ' + ref + ' sao)' : 'Góp ý') : 'Sao'
  sh.appendRow([new Date(), kind, safe(d.page, 200), safe(d.title, 160),
    hasRating ? rating : '', safe(comment, 1000), safe(d.device, 20)])
  return out({ ok: true })
}

function feedbackSheet() {
  const props = PropertiesService.getScriptProperties()
  let id = props.getProperty('FEEDBACK_ID')
  if (!id) {
    const it = DriveApp.getFilesByName(FEEDBACK_NAME)
    id = it.hasNext() ? it.next().getId() : SpreadsheetApp.create(FEEDBACK_NAME).getId()
    props.setProperty('FEEDBACK_ID', id)
  }
  return SpreadsheetApp.openById(id).getSheets()[0]
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
