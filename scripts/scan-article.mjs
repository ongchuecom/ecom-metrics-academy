// Quét một bài viết: tìm các chỉ số đã có trong 60+ bài, và gom các khái niệm lạ có thể đáng sinh thêm.
// Dùng: npm run scan:article -- đường-dẫn-bài.md   (hoặc dán bài qua stdin)   thêm --json để lấy dữ liệu máy đọc.
// Bước lọc cuối (khái niệm nào đáng thành bài) do Claude làm theo .claude/skills/bai-viet-sinh-chi-so/SKILL.md.
import { readFileSync, readdirSync } from 'node:fs'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const file = args.find((a) => !a.startsWith('--'))
const text = readFileSync(file || 0, 'utf8')

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const re = (term) => new RegExp(`(^|[^a-z0-9])${esc(fold(term))}(?=$|[^a-z0-9])`, 'g')

const metrics = readdirSync('src/data/stages').sort().flatMap((f) => JSON.parse(readFileSync(`src/data/stages/${f}`, 'utf8')))
const aliases = JSON.parse(readFileSync('data-src/aliases.json', 'utf8'))
const F = fold(text)

const termsOf = (m) => {
  const t = new Set([m.code, m.vi_name.replace(/\s*\(.*$/, ''), ...(aliases[m.metric_id] || [])])
  // phần trong ngoặc của tên (ví dụ "Tỷ lệ bom hàng / RTO"): chỉ lấy viết tắt hoặc cụm từ 2 chữ trở lên, bỏ chữ chung chung
  const GENERIC = new Set(['doanh thu', 'don', 'nhan su', 'ca', 'gia nhap thuc te', 'san', 'web', '%'])
  for (const inner of m.vi_name.match(/\(([^)]+)\)/g) || []) inner.slice(1, -1).split(/\s*[/,–]\s*|\s+-\s+/).forEach((x) => {
    x = x.trim(); if (!GENERIC.has(fold(x)) && (/^[A-Z]{2,}/.test(x) || x.split(/\s+/).length >= 2)) t.add(x)
  })
  return [...t].map((x) => x.trim()).filter((x) => x.length >= 2)
}
const snippet = (idx, len) => text.slice(Math.max(0, idx - 60), idx + len + 60).replace(/\s+/g, ' ').trim()

// 1. Chỉ số đã có
const found = []
const known = new Set()
for (const m of metrics) {
  let hits = 0, first = null, by = new Set()
  for (const term of termsOf(m)) {
    known.add(fold(term))
    for (const x of F.matchAll(re(term))) { hits++; by.add(term); if (first == null) first = x.index + x[1].length }
  }
  if (hits) found.push({ metric_id: m.metric_id, code: m.code, slug: m.slug, hits, terms: [...by], context: snippet(first, 20) })
}
found.sort((a, b) => b.hits - a.hits)

// 2. Khái niệm lạ: viết tắt và cụm "tỷ lệ …", "chi phí …"… chưa khớp chỉ số nào
const TRIG = ['ty le', 'chi phi', 'doanh thu', 'loi nhuan', 'bien', 'so ngay', 'thoi gian', 'vong quay', 'gia tri', 'he so', 'chi so']
const cand = new Map()
const add = (term, idx, kind) => {
  const k = fold(term).trim()
  if (k.length < 2 || known.has(k)) return
  const c = cand.get(k) || { term: term.trim(), kind, count: 0, context: snippet(idx, term.length) }
  c.count++; cand.set(k, c)
}
for (const x of text.matchAll(/\b[a-z]?[A-Z][A-Za-z]{0,2}[A-Z]{1,5}\d?\b/g)) add(x[0], x.index, 'viết tắt')
for (const x of text.matchAll(/\b[A-Za-z]+(?: [A-Za-z]+)? (?:rate|period|ratio|margin|cost|value|time|score|index|share|velocity|turnover|payback)\b/gi)) add(x[0], x.index, 'thuật ngữ')
for (const x of text.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g)) add(x[0], x.index, 'thuật ngữ')
for (const t of TRIG) for (const x of F.matchAll(new RegExp(`(^|[^a-z0-9])(${t}(?: [a-z0-9]+){1,4}?)(?=[,.;:()\\n]| la | = | tang | giam | cua | tren |$)`, 'g'))) {
  const i = x.index + x[1].length
  add(text.slice(i, i + x[2].length), i, 'cụm chỉ số')
}
const unknown = [...cand.values()].sort((a, b) => b.count - a.count).slice(0, 40)

if (asJson) { console.log(JSON.stringify({ found, unknown }, null, 2)); process.exit(0) }
console.log(`Bài dài ${text.length} ký tự.\n\n▸ Đã có bài (${found.length} chỉ số):`)
for (const f of found) console.log(`  ${String(f.hits).padStart(3)}×  ${f.code.padEnd(26)} ${f.terms.join(', ')}\n        “…${f.context}…”`)
console.log(`\n▸ Khái niệm chưa khớp (${unknown.length}), cần xem có đáng thành chỉ số mới không:`)
for (const u of unknown) console.log(`  ${String(u.count).padStart(3)}×  [${u.kind}] ${u.term}\n        “…${u.context}…”`)
