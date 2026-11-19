/**
 * Nhận dữ liệu từ Ecom Metrics Academy và ghi vào Google Sheet riêng tư. Có 2 loại:
 *  - Form "Để lại Zalo": ghi vào tab đầu của Sheet chứa script này ("A1demy · Zalo từ Ecom Metrics Academy").
 *  - Chấm sao và góp ý ẩn danh (type = "feedback"): KHÔNG lưu trên Drive. Mỗi lượt vào hàng chờ (Thuộc tính tập lệnh, trả lời ngay
 *    trong chưa tới 1 giây), cứ 5 phút hàm flushFeedback gom cả hàng chờ thành MỘT lần ghi vào file feedback/YYYY-MM-DD.jsonl
 *    trong repo GitHub riêng tư FEEDBACK_REPO. AI rà soát mỗi 2 ngày đọc từ đó.
 *
 * Cài đặt (5 phút, làm một lần; đã cài bản cũ thì dán đè rồi triển khai lại):
 * 1. Mở Google Sheet "A1demy · Zalo từ Ecom Metrics Academy" → Tiện ích mở rộng → Apps Script.
 * 2. Xoá code cũ, dán toàn bộ file này vào, bấm Lưu.
 * 3. Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web.
 *    - Thực thi với tư cách: Tôi
 *    - Người có quyền truy cập: Bất kỳ ai
 *    Bấm Triển khai, cấp quyền, rồi sao chép "URL ứng dụng web"
 *    (dạng https://script.google.com/macros/s/…/exec).
 *    Nếu đã có triển khai cũ: Triển khai → Quản lý triển khai → sửa → Phiên bản: Mới, để giữ nguyên URL.
 * 4. Gửi URL đó cho Claude (hoặc dán vào "lead.endpoint" trong src/data/site.json) để bật form trên web.
 *
 * 5. Bật lưu góp ý (làm một lần):
 *    a. Tạo repo GitHub RIÊNG TƯ tên ecom-metrics-feedback trong tài khoản ongchuecom (để trống, không cần file).
 *    b. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token:
 *       Repository access: Only select repositories → ecom-metrics-feedback; Permissions → Contents: Read and write.
 *    c. Apps Script → Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → thêm GITHUB_TOKEN = token vừa tạo.
 *       Token chỉ nằm trong Apps Script của anh, không dán vào chat hay repo.
 *
 * 6. Bật lịch gom góp ý (làm một lần): trong trình soạn Apps Script chọn hàm installTriggers rồi bấm Chạy, cấp quyền.
 *    Hàm này tạo lịch chạy flushFeedback mỗi 5 phút. Bảng xếp hạng không còn qua đây: nó chạy trên Firestore.
 *
 * Sheet và repo góp ý vẫn riêng tư: người gửi chỉ ghi thêm được dòng mới, không đọc được dữ liệu.
 */
const HEADERS = ['Thời gian', 'Tên gọi', 'Số Zalo', 'Bán ở đâu', 'Doanh thu tháng', 'Cần hỗ trợ', 'Trang gửi', 'Nguồn', 'Tóm tắt khám sức khỏe', 'Đồng ý liên hệ']
const FEEDBACK_REPO = 'ongchuecom/ecom-metrics-feedback'

// chặn chèn công thức vào Sheet (ô bắt đầu bằng = + - @)
const safe = (s, n) => { s = String(s == null ? '' : s).slice(0, n); return /^[=+\-@]/.test(s) ? "'" + s : s }

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    if (d.website) return out({ ok: true }) // ô bẫy chống bot: người thật không điền
    if (d.type === 'feedback') return feedback(d)
    return withLock(() => lead(d))
  } catch (err) {
    return out({ ok: false, error: 'server' })
  }
}

// Chạy fn khi giữ được khóa; không giữ được trong 10 giây thì báo bận thay vì chạy không khóa
function withLock(fn) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) return out({ ok: false, error: 'busy' })
  try { return fn() } finally { lock.releaseLock() }
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
  const key = 'fb-' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, [d.page, rating, comment].join('|')))
  // Không khóa, không gọi GitHub: mỗi lượt chỉ đọc/ghi bộ nhớ đệm và một thuộc tính, nên chịu được nhiều người cùng lúc.
  if (cache.get(key)) return out({ ok: true, dup: true })
  const win = 'fb-min-' + Math.floor(Date.now() / 60000)
  const n = Number(cache.get(win) || 0) // đếm gần đúng, đủ để chặn spam
  if (n >= 600) return out({ ok: false, error: 'busy' })
  cache.put(win, String(n + 1), 120)
  const ref = Number(d.rating_ref)
  const row = {
    t: new Date().toISOString(),
    kind: comment ? (hasRating ? 'rating+comment' : 'comment') : 'rating',
    page: String(d.page || '').slice(0, 120),
    title: String(d.title || '').slice(0, 160),
    rating: hasRating ? rating : null,
    rating_ref: !hasRating && ref >= 1 && ref <= 5 ? ref : null, // sao người này đã chấm riêng, không tính lại vào trung bình
    comment: comment || null,
    device: String(d.device || '').slice(0, 20),
  }
  try {
    PropertiesService.getScriptProperties().setProperty('q-' + row.t + '-' + Math.random().toString(36).slice(2, 8), JSON.stringify(row))
  } catch (err) {
    return out({ ok: false, error: 'busy' }) // hàng chờ đầy (giới hạn 500 KB), trình duyệt sẽ tự gửi lại sau
  }
  cache.put(key, '1', 600)
  return out({ ok: true })
}

// Chạy theo lịch 5 phút: gom hàng chờ, mỗi ngày một file, mỗi file MỘT commit; ghi xong mới xóa khỏi hàng chờ
function flushFeedback() {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(1000)) return // lần chạy trước chưa xong
  try {
    const props = PropertiesService.getScriptProperties()
    const all = props.getProperties()
    const keys = Object.keys(all).filter((k) => k.indexOf('q-') === 0).sort()
    const byDay = {}
    for (const k of keys) (byDay[k.slice(2, 12)] = byDay[k.slice(2, 12)] || []).push(k)
    for (const day of Object.keys(byDay)) {
      const ks = byDay[day]
      const lines = ks.map((k) => all[k]).join('\n') + '\n'
      const res = updateFile('feedback/' + day + '.jsonl', (text) => text + lines, 'Góp ý (' + ks.length + ' lượt)')
      if (res.ok) ks.forEach((k) => props.deleteProperty(k))
    }
  } finally { lock.releaseLock() }
}

function installTriggers() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'flushFeedback').forEach((t) => ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('flushFeedback').timeBased().everyMinutes(5).create()
}

function gh() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN')
  return token ? { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } : null
}

// Đọc file: trả { ok, text, sha }. File chưa có thì text rỗng, sha null.
function readFile(path) {
  const headers = gh()
  if (!headers) return { ok: false, error: 'no-token' }
  const url = 'https://api.github.com/repos/' + FEEDBACK_REPO + '/contents/' + path
  const cur = UrlFetchApp.fetch(url, { headers, muteHttpExceptions: true })
  if (cur.getResponseCode() === 404) return { ok: true, text: '', sha: null }
  if (cur.getResponseCode() !== 200) return { ok: false, error: 'github-' + cur.getResponseCode() }
  const j = JSON.parse(cur.getContentText())
  let text = j.content ? Utilities.newBlob(Utilities.base64Decode(j.content.replace(/\n/g, ''))).getDataAsString('UTF-8') : ''
  if (j.size > 0 && !text) {
    // file lớn: API không trả nội dung base64, lấy bản thô; vẫn không có thì dừng, tuyệt đối không ghi đè
    const raw = UrlFetchApp.fetch(url, { headers: Object.assign({}, headers, { Accept: 'application/vnd.github.raw' }), muteHttpExceptions: true })
    if (raw.getResponseCode() !== 200) return { ok: false, error: 'github-raw-' + raw.getResponseCode() }
    text = raw.getContentText('UTF-8')
    if (!text) return { ok: false, error: 'empty-read' }
  }
  return { ok: true, text, sha: j.sha }
}

// Đọc – sửa – ghi, thử lại khi có lượt khác vừa ghi (409/422)
function updateFile(path, transform, message) {
  const headers = gh()
  if (!headers) return { ok: false, error: 'no-token' }
  const url = 'https://api.github.com/repos/' + FEEDBACK_REPO + '/contents/' + path
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = readFile(path)
    if (!cur.ok) return cur
    const body = { message: message, content: Utilities.base64Encode(transform(cur.text), Utilities.Charset.UTF_8) }
    if (cur.sha) body.sha = cur.sha
    const res = UrlFetchApp.fetch(url, { method: 'put', headers, payload: JSON.stringify(body), contentType: 'application/json', muteHttpExceptions: true })
    const code = res.getResponseCode()
    if (code === 200 || code === 201) return { ok: true }
    if (code !== 409 && code !== 422) return { ok: false, error: 'github-' + code }
    Utilities.sleep(400)
  }
  return { ok: false, error: 'conflict' }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
