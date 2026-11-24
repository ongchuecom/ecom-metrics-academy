// Dựng nội dung cho web, chịu được hàng nghìn khái niệm:
//  - src/data/catalog.json   : chỉ mục NHẸ (tên, mã, lĩnh vực, chủ đề, câu định nghĩa ngắn…) — nằm trong code, tải 1 lần
//  - public/data/c/<id>.json : nội dung ĐẦY ĐỦ từng khái niệm (bài đọc, công thức, quan hệ, giả lập…) — chỉ tải khi mở bài
// Nguồn: chỉ số từ pack (src/data/stages/*.json + src/data/lessons.json) và khái niệm mới (content/concepts/*.json),
// phân loại theo data-src/taxonomy.json. Chạy tự động trước khi build và khi chạy dev (npm run content).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const tax = read('data-src/taxonomy.json')
const lessons = read('src/data/lessons.json')
const cases = read('src/data/cases.json')
const aliases = existsSync('data-src/aliases.json') ? read('data-src/aliases.json') : {}
const { playbooks } = read('src/data/playbooks.json')
const pbIds = new Set(playbooks.map((p) => p.playbook_id))
const slugify = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const errors = []
const err = (id, msg) => errors.push(`[${id}] ${msg}`)

// ---- phân loại ----
const domainById = Object.fromEntries(tax.domains.map((d) => [d.id, d]))
const topicById = {}
for (const d of tax.domains) for (const t of d.topics) {
  if (topicById[t.id]) err('taxonomy', `trùng id chủ đề ${t.id}`)
  topicById[t.id] = { ...t, domain: d.id }
}
const topicFor = (domain, subGroup) => domainById[domain]?.topics.find((t) => (t.sub_groups || []).includes(subGroup))?.id

// ---- chỉ số từ pack ----
const metrics = readdirSync('src/data/stages').filter((f) => f.endsWith('.json')).sort().flatMap((f) => read(join('src/data/stages', f)))
const items = []
for (const m of metrics) {
  const topic = topicFor(m.stage, m.sub_group)
  if (!topic) err(m.metric_id, `sub_group "${m.sub_group}" chưa thuộc chủ đề nào trong taxonomy.json (lĩnh vực ${m.stage})`)
  items.push({ full: { ...m, type: 'metric', topic, aliases: aliases[m.metric_id] || [], lesson: lessons[m.metric_id] || null }, source: 'pack' })
}

// ---- khái niệm mới ----
const TYPES = Object.keys(tax.types)
// Thư mục nháp (EMA_EXTRA) cho agent viết song song tự kiểm bài; EMA_OUT ghi kết quả ra chỗ riêng, không chạm web
const OUT = process.env.EMA_OUT || ''
const dirs = ['content/concepts', ...(process.env.EMA_EXTRA ? [process.env.EMA_EXTRA] : [])]
const conceptFiles = dirs.flatMap((d) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => ({ d, f })) : []))
for (const { d: dir, f } of conceptFiles) {
  let c
  try { c = read(join(dir, f)) } catch (e) { err(f, 'không đọc được JSON: ' + e.message); continue }
  const id = c.id || f.replace(/\.json$/, '')
  if (f !== `${id}.json`) err(id, `tên file phải là ${id}.json`)
  if (!TYPES.includes(c.type)) err(id, `type phải là ${TYPES.join('|')}`)
  if (!domainById[c.domain]) err(id, `domain lạ: ${c.domain}`)
  if (!topicById[c.topic] || topicById[c.topic].domain !== c.domain) err(id, `topic "${c.topic}" không thuộc lĩnh vực ${c.domain}`)
  for (const k of ['code', 'vi_name', 'definition']) if (!c[k]) err(id, `thiếu ${k}`)
  if (c.type === 'metric' && !c.formula?.readable) err(id, 'chỉ số cần formula.readable')
  if (!c.lesson?.intro?.length) err(id, 'thiếu lesson.intro')
  if (c.review && !['draft', 'approved'].includes(c.review)) err(id, 'review phải là draft|approved')
  if (c.risk && !['normal', 'high'].includes(c.risk)) err(id, 'risk phải là normal|high')
  const { lesson, related = [], ...meta } = c
  items.push({
    full: {
      ...meta, metric_id: id, stage: c.domain, sub_group: topicById[c.topic]?.label || '',
      formula: c.formula || null, aliases: c.aliases || [], playbook_refs: c.playbook_refs || [],
      relationships: { upstream_drivers: c.relationships?.upstream_drivers || [], downstream_impacts: c.relationships?.downstream_impacts || [], trade_offs: c.relationships?.trade_offs || [], related: related.map((r) => ({ metric_id: r })) },
      lesson,
    },
    source: f,
  })
}

// ---- kiểm tra chung ----
const ids = new Set(), slugs = new Set()
for (const { full: x } of items) {
  if (ids.has(x.metric_id)) err(x.metric_id, 'trùng id')
  ids.add(x.metric_id)
  if (!x.slug) x.slug = slugify(x.code)
  let s = x.slug, i = 2
  while (slugs.has(s)) s = `${x.slug}-${i++}`
  if (s !== x.slug) x.slug = s
  slugs.add(x.slug)
}
const treeIds = (n, out = []) => { if (n && typeof n === 'object') { if (n.id) out.push(n.id); (n.eq || []).forEach((c) => treeIds(c, out)) } return out }
for (const { full: x } of items) {
  for (const k of ['upstream_drivers', 'downstream_impacts', 'trade_offs', 'related']) for (const r of x.relationships?.[k] || []) if (!ids.has(r.metric_id)) err(x.metric_id, `${k} trỏ tới id không tồn tại: ${r.metric_id}`)
  for (const p of x.playbook_refs || []) if (!pbIds.has(p)) err(x.metric_id, `Playbook không tồn tại: ${p}`)
  for (const t of treeIds(x.lesson?.tree?.expr)) if (!ids.has(t)) err(x.metric_id, `cây công thức trỏ tới id không tồn tại: ${t}`)
}
// Quan hệ "liên quan" luôn hai chiều
const byId = Object.fromEntries(items.map(({ full }) => [full.metric_id, full]))
for (const { full: x } of items) for (const r of x.relationships?.related || []) {
  const o = byId[r.metric_id]
  if (o) { o.relationships.related = o.relationships.related || []; if (!o.relationships.related.some((z) => z.metric_id === x.metric_id)) o.relationships.related.push({ metric_id: x.metric_id }) }
}

// Lộ trình theo vai trò: id phải tồn tại
for (const p of read('src/data/paths.json').paths) for (const id of p.items) if (!ids.has(id)) err(`lộ trình ${p.id}`, `id không tồn tại: ${id}`)

if (errors.length) { console.error('✗ Nội dung chưa hợp lệ:\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1) }

// ---- xuất ----
const short = (s, n = 140) => { s = String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s }
const catalogItems = items.map(({ full: x }) => {
  const o = {
    id: x.metric_id, slug: x.slug, type: x.type, code: x.code, name: x.vi_name, domain: x.stage, topic: x.topic,
    sub: x.lesson?.subtitle || '', def: short(x.definition),
  }
  if (x.review === 'draft') o.review = 'draft'
  if (x.basis?.type === 'custom') o.custom = 1
  if (x.risk === 'high') o.risk = 'high'
  if (x.playbook_refs?.length) o.pb = x.playbook_refs
  const has = [x.simulator && 'sim', x.diagnostic_homework && 'hw', cases[x.metric_id] && 'case', x.lesson && 'lesson', x.sources?.length && 'src'].filter(Boolean)
  if (has.length) o.has = has
  return o
})
const domains = tax.domains.map((d) => ({
  id: d.id, short: d.short, label: d.label, desc: d.desc, slug: slugify(d.label),
  topics: d.topics.map((t) => ({ id: t.id, label: t.label, desc: t.desc || '', n: catalogItems.filter((c) => c.topic === t.id).length })),
}))
const catalog = { types: tax.types, domains, items: catalogItems }
const json = JSON.stringify(catalog)
catalog.version = createHash('sha1').update(json).digest('hex').slice(0, 10)
if (OUT) mkdirSync(OUT, { recursive: true })
writeFileSync(OUT ? join(OUT, 'catalog.json') : 'src/data/catalog.json', JSON.stringify(catalog) + '\n')

// Chỉ mục tìm kiếm (tải khi bấm tìm): tên gọi khác, mã pack, công thức, câu cần nhớ
const search = Object.fromEntries(items.map(({ full: x }) => [x.metric_id, [x.pack_code || '', (x.aliases || []).join(' | '), x.formula?.readable || '', String(x.lesson?.remember || '').replace(/\*\*/g, '')].join(' ¦ ')]))
mkdirSync(OUT || 'public/data', { recursive: true })
writeFileSync(join(OUT || 'public/data', 'search.json'), JSON.stringify(search))

// Playbook công khai cho máy chủ Cố vấn AI nạp tri thức (server/advisor/ingest.py)
writeFileSync(join(OUT || 'public/data', 'playbooks.json'), JSON.stringify({ playbooks: read('src/data/playbooks.json').playbooks }))

const out = OUT ? join(OUT, 'c') : 'public/data/c'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const { full } of items) writeFileSync(join(out, `${full.metric_id}.json`), JSON.stringify(full))

const kb = (n) => (n / 1024).toFixed(0) + ' KB'
const counts = Object.fromEntries(Object.keys(tax.types).map((t) => [t, catalogItems.filter((c) => c.type === t).length]))
console.log(`✓ Nội dung: ${catalogItems.length} khái niệm (${Object.entries(counts).filter(([, n]) => n).map(([t, n]) => `${n} ${tax.types[t].label.toLowerCase()}`).join(', ')}) · chỉ mục ${kb(Buffer.byteLength(JSON.stringify(catalog)))} · ${conceptFiles.length} file khái niệm mới`)
