// Duyệt khái niệm mới (content/concepts/*.json): đổi review "draft" → "approved".
//   node scripts/approve.mjs --batch 2026-11-19-a   duyệt cả lô, NHƯNG bỏ qua bài risk "high" (số liệu, thuế, pháp lý)
//   node scripts/approve.mjs --ids id1,id2          duyệt đích danh từng bài (kể cả risk "high")
//   node scripts/approve.mjs --list                  liệt kê bài đang chờ duyệt theo lô
// Chỉ số trong pack duyệt ở data-src/added-metrics.json như cũ.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const val = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null)
const dir = 'content/concepts'
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
const all = files.map((f) => ({ f, c: JSON.parse(readFileSync(join(dir, f), 'utf8')) }))
const drafts = all.filter(({ c }) => c.review === 'draft')

if (args.includes('--list') || !args.length) {
  const byBatch = {}
  for (const { c } of drafts) (byBatch[c.batch || '(không lô)'] ||= []).push(c)
  for (const [b, list] of Object.entries(byBatch)) {
    const high = list.filter((c) => c.risk === 'high')
    console.log(`Lô ${b}: ${list.length} bài chờ duyệt (${high.length} cần duyệt từng bài)`)
    for (const c of list) console.log(`  ${c.risk === 'high' ? '!' : ' '} ${c.id}  ${c.code}`)
  }
  if (!drafts.length) console.log('Không có bài chờ duyệt.')
  process.exit(0)
}
const batch = val('--batch'), ids = val('--ids') ? new Set(val('--ids').split(',')) : null
let n = 0, skipped = []
for (const { f, c } of drafts) {
  const pick = ids ? ids.has(c.id) : batch && c.batch === batch
  if (!pick) continue
  if (!ids && c.risk === 'high') { skipped.push(c.id); continue }
  c.review = 'approved'
  writeFileSync(join(dir, f), JSON.stringify(c, null, 2) + '\n'); n++
}
console.log(`Đã duyệt ${n} bài.${skipped.length ? ` Bỏ qua ${skipped.length} bài cần duyệt từng bài: ${skipped.join(', ')}` : ''}`)
if (ids) for (const id of ids) if (!drafts.some(({ c }) => c.id === id)) console.log(`  (không thấy bài chờ duyệt ${id})`)
