// Máy kiểm nội dung trước khi bài đến tay người duyệt:
//  1. khuôn bài và biểu đồ (đúng kiểu, đủ trường, số là số)
//  2. phép tính viết trong bài: "a + b − c = d", "a ÷ b = c", "a × b = c" phải đúng
//  3. trùng: tên/mã trùng khái niệm khác (lỗi), định nghĩa quá giống (cảnh báo)
//  4. mức rủi ro: bài nói về thuế, luật, phạt, số liệu tiền bạc phải gắn risk "high" (duyệt từng bài)
//  5. khẩu vị: không chèn tên thương hiệu vào bài, không để trống phần cần nhớ
// Dùng: node scripts/check-content.mjs [--all] [--ids id1,id2] [--json]
//   mặc định kiểm khái niệm mới (content/concepts) + cảnh báo phép tính cho cả bài cũ; --all kiểm sâu mọi bài.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const ALL = args.includes('--all')
const only = args.includes('--ids') ? new Set(args[args.indexOf('--ids') + 1].split(',')) : null
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
if (!existsSync('src/data/catalog.json')) { console.error('Chưa có src/data/catalog.json, chạy npm run content trước.'); process.exit(1) }
const catalog = read('src/data/catalog.json')
const full = Object.fromEntries(catalog.items.map((c) => [c.id, read(join('public/data/c', `${c.id}.json`))]))
const newIds = new Set(existsSync('content/concepts') ? readdirSync('content/concepts').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')) : [])

const errors = [], warns = []
const E = (id, m) => errors.push({ id, m }), W = (id, m) => warns.push({ id, m })
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const plain = (s) => String(s || '').replace(/\*\*/g, '')

// ---------- 2. phép tính ----------
// Số kiểu Việt: 1.000 (nghìn), 2,5 (thập phân), 12% , 80tr, 30k, 1,5 tỷ
const NUM = String.raw`-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?`
const UNIT = String.raw`(?:\s?(?:tr|triệu|k|nghìn|đ|tỷ|%|ngày|tháng|đơn|lần|người|x))?`
const OP = String.raw`\s*[+\-−–×x*÷/]\s*`
const EQ_RE = new RegExp(String.raw`(?<![\w.,])((?:${NUM})${UNIT}(?:${OP}\(?(?:${NUM})${UNIT}\)?)+)\s*=\s*(${NUM})(${UNIT})`, 'gu')
const toNum = (s) => Number(s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
const unitOf = (s) => (s.match(/(tr|triệu|k|nghìn|đ|tỷ|%|ngày|tháng|đơn|lần|người|x)\s*$/u) || [])[1] || ''
// quy đổi đơn vị tiền và phần trăm về cùng gốc để so: 250k = 250.000, 1,5 tỷ = 1.500.000.000, 20% = 0,2
const MULT = { k: 1e3, 'nghìn': 1e3, tr: 1e6, 'triệu': 1e6, 'tỷ': 1e9, '%': 0.01 }
const scaled = (n, u) => n * (MULT[u] || 1)
function evalExpr(expr) {
  // tách số và phép tính; bỏ đơn vị; giữ ngoặc
  const toks = []
  const re = new RegExp(String.raw`(${NUM})(${UNIT})|([+\-−–×x*÷/()])`, 'gu')
  let m
  while ((m = re.exec(expr))) {
    if (m[1] !== undefined) toks.push(scaled(toNum(m[1]), unitOf(m[2] || '')))
    else { const o = m[3]; toks.push(o === '−' || o === '–' ? '-' : o === '×' || o === 'x' ? '*' : o === '÷' ? '/' : o) }
  }
  // dấu trừ đứng đầu một số sau toán tử đã được gộp vào NUM; đánh giá bằng thuật toán sân ga
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 }
  const out = [], ops = []
  for (const t of toks) {
    if (typeof t === 'number') out.push(t)
    else if (t === '(') ops.push(t)
    else if (t === ')') { while (ops.length && ops.at(-1) !== '(') out.push(ops.pop()); ops.pop() }
    else { while (ops.length && ops.at(-1) !== '(' && prec[ops.at(-1)] >= prec[t]) out.push(ops.pop()); ops.push(t) }
  }
  while (ops.length) out.push(ops.pop())
  const st = []
  for (const t of out) {
    if (typeof t === 'number') { st.push(t); continue }
    const b = st.pop(), a = st.pop()
    if (a === undefined || b === undefined) return NaN
    st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b)
  }
  return st.length === 1 ? st[0] : NaN
}
function checkMath(id, where, text) {
  for (const m of plain(text).matchAll(EQ_RE)) {
    const [whole, left, right, ru] = m
    // "100%" bên phải và số lẻ phần trăm bên trái: bỏ qua phép tính trộn đơn vị khó đoán
    const lu = [...left.matchAll(new RegExp(String.raw`(${NUM})(${UNIT})`, 'gu'))].map((x) => unitOf(x[2] || ''))
    if (ru.trim() === '%' && lu.every((u) => u !== '%') && !/[÷/]/.test(left)) continue
    const got = evalExpr(left)
    const ruu = unitOf(ru || '')
    if (!Number.isFinite(got)) continue
    // bên phải có thể ghi theo đơn vị (20tr) hoặc không (1,5 khi bên trái là tỷ lệ); thử cả hai cách hiểu
    const want = toNum(right)
    const cands = [scaled(want, ruu), want, ruu === '%' ? want / 100 : null].filter((x) => x !== null)
    const dec = (right.split(',')[1] || '').length
    const tol = (w) => Math.max(Math.abs(w) * 0.006, 0.5 * Math.pow(10, -dec) * (MULT[ruu] && w === scaled(want, ruu) ? MULT[ruu] : 1))
    if (!cands.some((w) => Math.abs(got - w) <= tol(w))) {
      (newIds.has(id) ? E : W)(id, `phép tính sai ở ${where}: "${whole.trim()}" (tính ra ${Math.round(got * 1000) / 1000})`)
    }
  }
}

// ---------- 1. khuôn bài và biểu đồ ----------
const isNum = (x) => typeof x === 'number' && Number.isFinite(x)
function checkChart(id, where, c) {
  if (!c) return
  const bad = (m) => E(id, `${where}: ${m}`)
  switch (c.type) {
    case 'bars': if (!Array.isArray(c.items) || !c.items.length || !c.items.every((r) => typeof r[0] === 'string' && isNum(r[1]))) bad('bars cần items [[nhãn, số, kiểu?]]'); break
    case 'line': if (!Array.isArray(c.points) || c.points.length < 2 || !c.points.every((p) => isNum(p[0]) && isNum(p[1]))) bad('line cần points [[x, y]] ≥ 2 điểm'); else if (!c.points.every((p, i) => !i || p[0] > c.points[i - 1][0])) bad('line: x phải tăng dần'); break
    case 'compare': if (!Array.isArray(c.items) || !c.items.every((r) => typeof r[0] === 'string' && isNum(r[1]) && isNum(r[2]))) bad('compare cần items [[nhãn, trước, sau]]'); break
    case 'funnel': if (!Array.isArray(c.items) || !c.items.every((r) => typeof r[0] === 'string' && isNum(r[1]))) bad('funnel cần items [[nhãn, số]]'); else if (!c.items.every((r, i) => !i || r[1] <= c.items[i - 1][1])) bad('funnel: số phải giảm dần'); break
    case 'steps': if (!Array.isArray(c.items) || c.items.length < 2 || !c.items.every((r) => typeof r[0] === 'string' && typeof r[1] === 'string')) bad('steps cần items [[tên bước, mô tả]] ≥ 2'); break
    case 'matrix': if (c.x?.length !== 2 || c.y?.length !== 2 || c.cells?.length !== 2 || !c.cells.every((row) => row.length === 2 && row.every((x) => x.title && x.text))) bad('matrix cần x[2], y[2], cells 2×2 có title, text'); break
    default: bad(`kiểu biểu đồ lạ: ${c.type}`)
  }
}

const textsOf = (L) => {
  const t = []
  ;(L.intro || []).forEach((p, i) => t.push([`intro[${i}]`, p]))
  if (L.breakdown) { t.push(['breakdown.title', L.breakdown.title]); t.push(['breakdown.after', L.breakdown.after]) }
  ;(L.sections || []).forEach((s, i) => { t.push([`sections[${i}].title`, s.title]); (s.body || []).forEach((p, j) => t.push([`sections[${i}].body[${j}]`, p])) })
  ;(L.mistakes || []).forEach((p, i) => t.push([`mistakes[${i}]`, p]))
  t.push(['remember', L.remember])
  if (L.tree?.note) t.push(['tree.note', L.tree.note])
  return t.filter(([, x]) => x)
}

// ---------- 3. trùng ----------
const names = new Map()
for (const c of catalog.items) for (const n of [c.code, c.name, ...(full[c.id].aliases || [])]) {
  const k = fold(n).replace(/\s*\(.*?\)\s*/g, ' ').trim()
  if (k.length < 3) continue
  if (!names.has(k)) names.set(k, new Set())
  names.get(k).add(c.id)
}
const tokens = (s) => new Set(fold(plain(s)).split(/[^a-z0-9]+/).filter((w) => w.length > 2))
const jacc = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1) }
const defTok = Object.fromEntries(catalog.items.map((c) => [c.id, tokens(full[c.id].definition)]))

// ---------- 4, 5 ----------
// khớp trọn từ có dấu (tránh 'phát' bị hiểu là 'phạt')
const RISKY = /(?<!\p{L})(thuế|luật|nghị định|thông tư|phạt|hóa đơn|hoá đơn|bảo hiểm xã hội|hợp đồng|quyết toán|truy thu)(?!\p{L})/iu

for (const c of catalog.items) {
  const id = c.id, x = full[id], L = x.lesson
  const deep = ALL || newIds.has(id)
  if (only && !only.has(id)) continue
  if (!L) { (deep ? E : W)(id, 'chưa có bài đọc'); continue }
  for (const [w, t] of textsOf(L)) checkMath(id, w, t)
  if (!deep) continue
  // khuôn
  if (!L.subtitle) E(id, 'thiếu lesson.subtitle (câu hỏi chủ shop hay tự hỏi)')
  if (!(L.intro?.length >= 1 && L.intro.length <= 3)) E(id, 'lesson.intro cần 1–3 đoạn')
  ;(L.intro || []).forEach((p, i) => { if (plain(p).length < 60) W(id, `intro[${i}] quá ngắn`); if (plain(p).length > 800) W(id, `intro[${i}] quá dài`) })
  if (!/\d/.test(textsOf(L).map(([, t]) => t).join(' '))) E(id, 'bài không có ví dụ số nào')
  if (!L.remember) E(id, 'thiếu lesson.remember (nhớ một câu)')
  if (!(L.mistakes?.length >= 2)) W(id, 'nên có ≥ 2 ý "hay hiểu sai"')
  if (L.breakdown) checkChart(id, 'breakdown.chart', L.breakdown.chart)
  ;(L.sections || []).forEach((s, i) => { if (!s.title || !s.body?.length) E(id, `sections[${i}] cần title và body`); if (s.chart) checkChart(id, `sections[${i}].chart`, s.chart) })
  if (!L.breakdown && !(L.sections || []).some((s) => s.chart)) W(id, 'chưa có biểu đồ nào (video bảng giảng sẽ chỉ có chữ)')
  if (x.type === 'metric' && !x.formula?.readable) E(id, 'chỉ số cần công thức')
  // trùng
  if (newIds.has(id)) {
    for (const n of [x.code, x.vi_name, ...(x.aliases || [])]) {
      const k = fold(n).replace(/\s*\(.*?\)\s*/g, ' ').trim()
      const other = [...(names.get(k) || [])].filter((o) => o !== id)
      if (k.length >= 3 && other.length) E(id, `tên "${n}" trùng với ${other.join(', ')}`)
    }
    for (const o of catalog.items) if (o.id !== id && jacc(defTok[id], defTok[o.id]) >= 0.55) W(id, `định nghĩa rất giống ${o.id} (${o.code}), xem có trùng không`)
  }
  // rủi ro
  const all = [x.definition, ...textsOf(L).map(([, t]) => t)].join(' ')
  if (newIds.has(id) && RISKY.test(all.normalize('NFC')) && x.risk !== 'high') E(id, 'bài nhắc thuế, luật, hóa đơn, phạt… phải đặt risk "high" để duyệt từng bài')
  // khẩu vị
  if (/Ông chú Ecom|A1demy/i.test(textsOf(L).map(([, t]) => t).join(' '))) E(id, 'không chèn tên thương hiệu (Ông chú Ecom, A1demy) vào bài')
  if (newIds.has(id) && !x.sources?.length) E(id, 'khái niệm mới phải ghi sources (lấy từ đâu)')
  if (newIds.has(id) && !x.basis?.type) E(id, 'khái niệm mới phải ghi basis.type (standard|custom)')
}

if (args.includes('--json')) { console.log(JSON.stringify({ errors, warns }, null, 2)); process.exit(errors.length ? 1 : 0) }
const show = (arr, mark) => arr.forEach(({ id, m }) => console.log(`  ${mark} [${id}] ${m}`))
if (warns.length) { console.log(`Cảnh báo (${warns.length}):`); show(warns, '·') }
if (errors.length) { console.log(`Lỗi (${errors.length}):`); show(errors, '✗'); process.exit(1) }
console.log(`✓ Máy kiểm nội dung: ${only ? only.size : catalog.items.length} bài, ${errors.length} lỗi, ${warns.length} cảnh báo`)
