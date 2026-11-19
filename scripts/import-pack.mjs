// Nạp bộ dữ liệu gốc (data-src/vn_60_metrics_and_10_playbooks_pack.json) thành src/data/stages/*.json và src/data/playbooks.json.
// Bổ sung: data-src/pack-extra.json (mã ngắn + định nghĩa), data-src/carry-over.json (giả lập, bài tập, số tham khảo giữ từ bản trước).
// Liên kết chỉ số ↔ Playbook được hợp nhất hai chiều: chỉ số nhắc tới Playbook hoặc Playbook nhắc tới chỉ số đều tính.
// Dùng: npm run data:pack [-- đường-dẫn-pack.json]
import { readFileSync, writeFileSync } from 'node:fs'

const PACK = process.argv[2] || 'data-src/vn_60_metrics_and_10_playbooks_pack.json'
const pack = JSON.parse(readFileSync(PACK, 'utf8'))
const extra = JSON.parse(readFileSync('data-src/pack-extra.json', 'utf8'))
const carry = JSON.parse(readFileSync('data-src/carry-over.json', 'utf8'))

const STAGE = {
  '01_Product_RnD': ['01_product_rd', '01_product.json'],
  '02_Traffic_Acquisition': ['02_traffic_acquisition', '02_traffic.json'],
  '03_Conversion_Sales': ['03_conversion_sales', '03_sales.json'],
  '04_Fulfillment_SupplyChain': ['04_fulfillment_supply', '04_fulfillment.json'],
  '05_Retention_Lifecycle': ['05_retention_lifecycle', '05_retention.json'],
  '06_Finance_UnitEconomics': ['06_finance_unit_econ', '06_finance.json'],
  '07_Team_Productivity': ['07_team_operations', '07_team.json'],
}
const ids = new Set(pack.metrics.map((m) => m.metric_id))
const pbIds = new Set(pack.playbooks.map((p) => p.playbook_id))
const warn = []

// liên kết hai chiều
const m2p = Object.fromEntries(pack.metrics.map((m) => [m.metric_id, new Set(m.playbook_refs.filter((r) => pbIds.has(r) || !warn.push(`${m.metric_id}: Playbook không tồn tại ${r}`)))]))
const p2m = Object.fromEntries(pack.playbooks.map((p) => [p.playbook_id, new Set(p.linked_metrics.filter((x) => ids.has(x) || !warn.push(`${p.playbook_id}: chỉ số không tồn tại ${x}`)))]))
for (const [m, ps] of Object.entries(m2p)) for (const p of ps) if (!p2m[p].has(m)) { warn.push(`Bổ sung chiều ngược: ${p} → ${m}`); p2m[p].add(m) }
for (const [p, ms] of Object.entries(p2m)) for (const m of ms) if (!m2p[m].has(p)) { warn.push(`Bổ sung chiều ngược: ${m} → ${p}`); m2p[m].add(p) }

const byFile = Object.fromEntries(Object.values(STAGE).map(([, f]) => [f, []]))
for (const m of pack.metrics) {
  const st = STAGE[m.stage]; if (!st) throw new Error(`Khâu lạ: ${m.stage} (${m.metric_id})`)
  const ex = extra[m.metric_id] || [m.code, '']; if (!extra[m.metric_id]) warn.push(`${m.metric_id}: chưa có định nghĩa trong pack-extra.json`)
  const c = carry[m.metric_id] || {}
  const IMP = { direct_proportional: 'direct', inverse_proportional: 'inverse', direct: 'direct', inverse: 'inverse' }
  const rel = (arr = []) => arr.map((r) => ({ metric_id: r.metric_id, ...(IMP[r.impact] ? { impact: IMP[r.impact] } : {}), note: r.note }))
  const out = {
    metric_id: m.metric_id, code: ex[0], pack_code: m.code, name: '', vi_name: m.name, stage: st[0], sub_group: m.sub_group,
    definition: ex[1],
    formula: { readable: m.formula_readable, derived: m.formula_derived },
    benchmarks: c.benchmarks || {},
    relationships: { upstream_drivers: rel(m.relationships?.upstream_drivers), downstream_impacts: rel(m.relationships?.downstream_impacts), trade_offs: (m.relationships?.trade_offs || []).map((r) => ({ metric_id: r.metric_id, note: r.note })) },
    playbook_refs: [...m2p[m.metric_id]].sort(),
  }
  if (c.simulator) out.simulator = c.simulator
  if (c.diagnostic_homework) out.diagnostic_homework = c.diagnostic_homework
  byFile[st[1]].push(out)
}
for (const [f, arr] of Object.entries(byFile)) writeFileSync(`src/data/stages/${f}`, JSON.stringify(arr, null, 2) + '\n')
const playbooks = pack.playbooks.map((p) => ({ ...p, linked_metrics: [...p2m[p.playbook_id]] }))
writeFileSync('src/data/playbooks.json', JSON.stringify({ version: pack.version, description: pack.description, playbooks }, null, 2) + '\n')
console.log(`Đã nạp ${pack.metrics.length} chỉ số, ${playbooks.length} Playbook (${pack.version}).`)
if (warn.length) console.log(warn.map((w) => '  · ' + w).join('\n'))
