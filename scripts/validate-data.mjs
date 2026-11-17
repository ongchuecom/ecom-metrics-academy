// Kiểm tra toàn vẹn dữ liệu metricsMaster: chạy `npm run validate` trước khi commit.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateOutputs } from '../src/lib/formula.js'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/data/stages')
const STAGES = ['01_product_rd', '02_traffic_acquisition', '03_conversion_sales', '04_fulfillment_supply', '05_retention_lifecycle', '06_finance_unit_econ', '07_team_operations']
const errors = []
const err = (id, msg) => errors.push(`[${id}] ${msg}`)
const all = []
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const arr = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  if (!Array.isArray(arr)) { errors.push(`${f}: không phải mảng`); continue }
  all.push(...arr.map((m) => ({ ...m, __file: f })))
}
const ids = new Set()
for (const m of all) {
  const id = m.metric_id || '(thiếu id)'
  if (ids.has(id)) err(id, 'metric_id bị trùng')
  ids.add(id)
}
for (const m of all) {
  const id = m.metric_id
  for (const k of ['metric_id', 'code', 'name', 'vi_name', 'stage', 'sub_group', 'definition']) if (!m[k]) err(id, `thiếu trường ${k}`)
  if (!STAGES.includes(m.stage)) err(id, `stage không hợp lệ: ${m.stage}`)
  if (!m.formula?.readable || !m.formula?.latex) err(id, 'thiếu formula.readable hoặc formula.latex')
  const rel = m.relationships || {}
  for (const k of ['upstream_drivers', 'downstream_impacts', 'trade_offs']) {
    for (const r of rel[k] || []) {
      if (!ids.has(r.metric_id)) err(id, `${k} trỏ tới id không tồn tại: ${r.metric_id}`)
      if (k !== 'trade_offs' && !['direct', 'inverse'].includes(r.impact)) err(id, `${k}.${r.metric_id}: impact phải là direct|inverse`)
    }
  }
  if (m.media?.video_url && !/^https:\/\//.test(m.media.video_url)) err(id, 'media.video_url phải là link https')
  if (m.simulator) {
    const s = m.simulator
    const vals = {}
    for (const c of s.controls || []) {
      if (!(c.min <= c.default && c.default <= c.max)) err(id, `control ${c.key}: default ngoài khoảng min–max`)
      vals[c.key] = c.default
    }
    const res = evaluateOutputs(s.outputs || [], vals)
    for (const o of s.outputs || []) if (!Number.isFinite(res[o.key])) err(id, `output ${o.key} không tính được ở giá trị mặc định (${o.formula_eval})`)
    for (const o of s.outputs || []) if (o.warning_threshold && !/^(>=|<=|>|<|==)\s*-?[\d.]+$/.test(o.warning_threshold.trim())) err(id, `warning_threshold sai cú pháp: ${o.warning_threshold}`)
  }
  if (m.diagnostic_homework) {
    const tasks = m.diagnostic_homework.tasks || []
    if (!tasks.length) err(id, 'bài tập không có task')
    for (const t of tasks) {
      if (t.type === 'numeric_input') {
        if (typeof t.correct_value !== 'number' || typeof t.tolerance !== 'number') err(id, `${t.task_id}: correct_value/tolerance phải là số`)
      } else if (t.type === 'strategic_decision') {
        if ((t.options || []).filter((o) => o.is_correct).length !== 1) err(id, `${t.task_id}: cần đúng 1 phương án is_correct`)
      } else err(id, `${t.task_id}: type lạ ${t.type}`)
    }
  }
}
const withSim = all.filter((m) => m.simulator).length
const withHw = all.filter((m) => m.diagnostic_homework).length
if (errors.length) {
  console.error(`✗ ${errors.length} lỗi:\n` + errors.join('\n'))
  process.exit(1)
}
console.log(`✓ ${all.length} chỉ số hợp lệ · ${withSim} có simulator · ${withHw} có bài tập chẩn đoán`)
