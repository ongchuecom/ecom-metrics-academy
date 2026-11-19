// Tóm tắt góp ý từ repo riêng ecom-metrics-feedback (file feedback/YYYY-MM.jsonl, mỗi dòng một lượt).
// Dùng: npm run feedback:summary -- <thư-mục-repo-góp-ý> [--since 2026-11-19T00:00:00Z] [--json]
// In điểm theo bài (mới và từ trước tới nay) và danh sách góp ý mới để AI rà soát (skill ra-soat-gop-y).
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--')) || '../ecom-metrics-feedback'
const since = args.includes('--since') ? new Date(args[args.indexOf('--since') + 1]) : new Date(Date.now() - 49 * 3600e3)
const fdir = join(dir, 'feedback')
if (!existsSync(fdir)) { console.log(`Chưa có góp ý nào (${fdir} chưa tồn tại).`); process.exit(0) }
const rows = readdirSync(fdir).filter((f) => f.endsWith('.jsonl')).sort()
  .flatMap((f) => readFileSync(join(fdir, f), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }))
  .filter(Boolean)

const slug = {}
for (const f of readdirSync('src/data/stages')) for (const m of JSON.parse(readFileSync(`src/data/stages/${f}`, 'utf8'))) slug[m.metric_id] = `chi-so/${m.slug}/`
for (const p of JSON.parse(readFileSync('src/data/playbooks.json', 'utf8')).playbooks) slug[p.playbook_id] = `playbook/${p.slug}/`

const isNew = (r) => new Date(r.t) > since
const pages = {}
for (const r of rows) {
  const p = (pages[r.page] ||= { page: r.page, title: r.title, url: slug[r.page] ? 'https://ongchuecom.github.io/ecom-metrics-academy/' + slug[r.page] : '', all: [], fresh: [], comments: [] })
  if (r.rating) { p.all.push(r.rating); if (isNew(r)) p.fresh.push(r.rating) }
  if (r.comment && isNew(r)) p.comments.push({ t: r.t, stars: r.rating || r.rating_ref || null, text: r.comment, device: r.device })
}
const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null)
const list = Object.values(pages).map((p) => ({ ...p, avgAll: avg(p.all), avgNew: avg(p.fresh), nAll: p.all.length, nNew: p.fresh.length, needsFix: p.all.length >= 3 && avg(p.all) <= 3.5 }))
  .filter((p) => p.nNew || p.comments.length || p.needsFix)
  .sort((a, b) => (b.needsFix - a.needsFix) || ((a.avgAll ?? 9) - (b.avgAll ?? 9)))
const fresh = rows.filter(isNew)
if (args.includes('--json')) { console.log(JSON.stringify({ since, total: rows.length, fresh: fresh.length, pages: list.map(({ all, fresh, ...x }) => x) }, null, 2)); process.exit(0) }
console.log(`Góp ý từ ${since.toISOString()}: ${fresh.length} lượt mới / ${rows.length} lượt từ trước tới nay.`)
if (!fresh.length) { console.log('Không có góp ý mới.'); process.exit(0) }
for (const p of list) {
  console.log(`\n${p.needsFix ? '⚠ ' : ''}${p.title} (${p.page})  ${p.url}`)
  console.log(`  Sao mới: ${p.nNew} lượt, TB ${p.avgNew ?? '–'} · Từ trước tới nay: ${p.nAll} lượt, TB ${p.avgAll ?? '–'}`)
  for (const c of p.comments) console.log(`  - [${c.stars ? c.stars + '★' : 'không chấm'}, ${c.device}] ${c.text.replace(/\s+/g, ' ')}`)
}
