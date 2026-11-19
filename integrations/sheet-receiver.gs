/**
 * Nhận dữ liệu từ Ecom Metrics Academy và ghi vào Google Sheet riêng tư. Có 2 loại:
 *  - Form "Để lại Zalo": ghi vào tab đầu của Sheet chứa script này ("A1demy · Zalo từ Ecom Metrics Academy").
 *  - Điểm trắc nghiệm Playbook (type = "score") cho Bảng xếp hạng: lưu ở file leaderboard.json trong cùng repo riêng.
 *    Web đọc bảng top 100 qua doGet (?action=leaderboard), được cache 60 giây.
 *  - Chấm sao và góp ý ẩn danh (type = "feedback"): KHÔNG lưu trên Drive. Mỗi lượt là một dòng JSON, nối vào
 *    file feedback/YYYY-MM-DD.jsonl (mỗi ngày một file) trong repo GitHub riêng tư FEEDBACK_REPO. AI rà soát mỗi 2 ngày đọc từ đó.
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
    if (d.type === 'score') return score(d)
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
  // chống spam: bỏ bản gửi trùng trong 10 phút, và tối đa 40 lượt ghi mỗi phút (cửa sổ cố định theo phút).
  // Chỉ phần đếm nằm trong khóa; gọi GitHub chậm thì để ngoài khóa, xung đột ghi đã có thử lại trong appendLine.
  const gate = rateGate(cache, key)
  if (gate === 'dup') return out({ ok: true, dup: true })
  if (gate === 'busy') return out({ ok: false, error: 'busy' })
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
  // mỗi ngày một file: file luôn nhỏ, ít xung đột ghi, không chạm giới hạn 1 MB của GitHub contents API
  const res = appendLine('feedback/' + row.t.slice(0, 10) + '.jsonl', JSON.stringify(row))
  if (res.ok) cache.put(key, '1', 600) // chỉ đánh dấu đã nhận khi ghi thành công, để gửi lại được nếu lỗi
  return out(res)
}

// Chống spam dùng chung: bỏ bản trùng (key) và tối đa 40 lượt ghi mỗi phút theo cửa sổ cố định
function rateGate(cache, key) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(5000)) return 'busy'
  try {
    if (key && cache.get(key)) return 'dup'
    const win = 'fb-min-' + Math.floor(Date.now() / 60000)
    const n = Number(cache.get(win) || 0)
    if (n >= 40) return 'busy'
    cache.put(win, String(n + 1), 120)
    return 'ok'
  } finally { lock.releaseLock() }
}

// ===== Bảng xếp hạng =====
// leaderboard.json: { players: { <id ngẫu nhiên>: { name, scores: { pb_01_…: 0–30 }, updated } } }
// Mỗi Playbook chỉ tính điểm lần nộp ĐẦU TIÊN; làm lại để luyện tập không đổi bảng xếp hạng. Đổi tên hiển thị thì được.
const LB_PATH = 'leaderboard.json'
const cleanName = (s) => String(s || '').normalize('NFC').replace(/[\u0000-\u001f<>]/g, '').replace(/https?:\/\/\S+|www\.\S+/gi, '')
  .replace(/\d[\d .-]{5,}\d/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Ẩn danh'

function score(d) {
  const player = String(d.player || '')
  if (!/^[a-z0-9-]{8,40}$/.test(player)) return out({ ok: false, error: 'player' })
  const scores = {}
  for (const [pb, v] of Object.entries(d.scores || {})) {
    if (/^pb_\d{2}_[a-z0-9_]{2,60}$/.test(pb) && [0, 10, 20, 30].indexOf(Number(v)) >= 0) scores[pb] = Number(v)
  }
  if (!Object.keys(scores).length) return out({ ok: false, error: 'empty' })
  const cache = CacheService.getScriptCache()
  if (rateGate(cache, null) === 'busy') return out({ ok: false, error: 'busy' })
  const name = cleanName(d.name)
  const res = updateFile(LB_PATH, (text) => {
    const lb = text ? JSON.parse(text) : { players: {} }
    const cur = lb.players[player] || { name, scores: {} }
    cur.name = name
    for (const [pb, v] of Object.entries(scores)) if (!(pb in cur.scores)) cur.scores[pb] = v
    cur.updated = new Date().toISOString()
    lb.players[player] = cur
    return JSON.stringify(lb)
  }, 'Điểm trắc nghiệm')
  if (res.ok) cache.remove('lb-top')
  return out(res)
}

function doGet(e) {
  const p = (e && e.parameter) || {}
  if (p.action !== 'leaderboard') return out({ ok: false, error: 'action' })
  const cache = CacheService.getScriptCache()
  let all = cache.get('lb-top')
  if (!all) {
    const r = readFile(LB_PATH)
    if (!r.ok) return out(r)
    const players = r.text ? JSON.parse(r.text).players : {}
    const rows = Object.keys(players).map((id) => {
      const x = players[id]
      const sc = Object.values(x.scores)
      return { id: id, name: x.name, score: sc.reduce((a, b) => a + b, 0), done: sc.length, updated: x.updated }
    }).sort((a, b) => b.score - a.score || (a.updated < b.updated ? -1 : 1))
    all = JSON.stringify(rows)
    try { cache.put('lb-top', all, 60) } catch (err) { /* bảng quá lớn để cache thì thôi */ }
  }
  const rows = JSON.parse(all)
  const meIdx = p.me ? rows.findIndex((r) => r.id === p.me) : -1
  const strip = (r, i) => ({ pos: i + 1, name: r.name, score: r.score, done: r.done }) // không trả id người chơi ra ngoài
  return out({ ok: true, total: rows.length, top: rows.slice(0, 100).map(strip), me: meIdx >= 0 ? strip(rows[meIdx], meIdx) : null })
}

// Nối một dòng vào file trong repo (một commit nhỏ mỗi lượt; repo riêng nên không kích hoạt dựng web)
function appendLine(path, line) {
  return updateFile(path, (text) => text + line + '\n', 'Góp ý mới')
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
