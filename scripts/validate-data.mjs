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
  for (const k of ['metric_id', 'code', 'vi_name', 'stage', 'sub_group', 'definition']) if (!m[k]) err(id, `thiếu trường ${k}`)
  if (!STAGES.includes(m.stage)) err(id, `stage không hợp lệ: ${m.stage}`)
  if (!m.formula?.readable) err(id, 'thiếu formula.readable')
  const rel = m.relationships || {}
  for (const k of ['upstream_drivers', 'downstream_impacts', 'trade_offs']) {
    for (const r of rel[k] || []) {
      if (!ids.has(r.metric_id)) err(id, `${k} trỏ tới id không tồn tại: ${r.metric_id}`)
      if (k !== 'trade_offs' && r.impact && !['direct', 'inverse'].includes(r.impact)) err(id, `${k}.${r.metric_id}: impact phải là direct|inverse`)
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
// Playbook: liên kết hai chiều phải khớp
const pbs = JSON.parse(readFileSync(join(dir, '../playbooks.json'), 'utf8')).playbooks
// Trắc nghiệm: đủ phương án, đáp án đúng có thật, id câu không trùng; thang xếp hạng phủ kín từ 0 tới điểm tối đa
const gam = JSON.parse(readFileSync(join(dir, '../playbooks.json'), 'utf8')).gamification
const qids = new Set()
let maxScore = 0
for (const p of pbs) for (const q of p.quiz || []) {
  if (qids.has(q.question_id)) err(p.playbook_id, `câu hỏi trùng id ${q.question_id}`)
  qids.add(q.question_id)
  if ((q.options || []).length < 2) err(q.question_id, 'cần ít nhất 2 phương án')
  if (!(q.options || []).some((o) => o.id === q.correct_option)) err(q.question_id, `đáp án ${q.correct_option} không có trong phương án`)
  if (!(q.points > 0)) err(q.question_id, 'points phải > 0')
  if (!q.explanation) err(q.question_id, 'thiếu giải thích')
  maxScore += q.points || 0
}
if (gam) {
  if (gam.max_total_score !== maxScore) err('gamification', `max_total_score ${gam.max_total_score} khác tổng điểm các câu ${maxScore}`)
  const ranks = [...gam.ranks].sort((a, b) => a.min_score - b.min_score)
  if (ranks[0]?.min_score !== 0) err('gamification', 'cấp bậc thấp nhất phải bắt đầu từ 0')
  for (let i = 1; i < ranks.length; i++) if (ranks[i].min_score > ranks[i - 1].max_score + (gam.points_per_question || 1)) err('gamification', `hở điểm giữa ${ranks[i - 1].title} và ${ranks[i].title}`)
}
const pbIds = new Set(pbs.map((p) => p.playbook_id))
for (const m of all) for (const r of m.playbook_refs || []) {
  if (!pbIds.has(r)) err(m.metric_id, `playbook_refs trỏ tới Playbook không tồn tại: ${r}`)
  else if (!pbs.find((p) => p.playbook_id === r).linked_metrics.includes(m.metric_id)) err(m.metric_id, `${r} chưa liên kết ngược lại chỉ số này`)
}
for (const p of pbs) for (const x of p.linked_metrics) {
  if (!ids.has(x)) err(p.playbook_id, `linked_metrics trỏ tới chỉ số không tồn tại: ${x}`)
  else if (!(all.find((m) => m.metric_id === x).playbook_refs || []).includes(p.playbook_id)) err(p.playbook_id, `${x} chưa liên kết ngược lại Playbook này`)
}
// Bài đọc (lessons.json): id phải tồn tại, id trong cây công thức phải tồn tại
const lessons = JSON.parse(readFileSync(join(dir, '../lessons.json'), 'utf8'))
const treeIds = (n, out = []) => { if (n && typeof n === 'object') { if (n.id) out.push(n.id); (n.eq || []).forEach((c) => treeIds(c, out)) } return out }
for (const m of all) if (!lessons[m.metric_id]) err(m.metric_id, 'chưa có bài đọc trong lessons.json')
for (const m of all) if (m.basis && !['standard', 'custom'].includes(m.basis.type)) err(m.metric_id, 'basis.type phải là standard|custom')
for (const m of all) if (m.review && !['draft', 'approved'].includes(m.review)) err(m.metric_id, `review phải là draft|approved`)
for (const [id, L] of Object.entries(lessons)) {
  if (id.startsWith('_')) continue
  if (!ids.has(id)) err(id, 'lessons.json: metric_id không tồn tại')
  for (const t of treeIds(L.tree?.expr)) if (!ids.has(t)) err(id, `lessons.json: cây công thức trỏ tới id không tồn tại ${t}`)
}
// Tình huống thực tế (cases.json): id phải tồn tại, file video/poster/srt phải có trong public/
import { existsSync } from 'node:fs'
const cases = JSON.parse(readFileSync(join(dir, '../cases.json'), 'utf8'))
for (const [id, c] of Object.entries(cases)) {
  if (id.startsWith('_')) continue
  if (!ids.has(id)) err(id, 'cases.json: metric_id không tồn tại')
  for (const k of ['video', 'poster', 'srt']) if (c[k] && !existsSync(join(dir, '../../../public', c[k]))) err(id, `cases.json: thiếu file public/${c[k]}`)
  if (!c.playbook?.actions?.length || c.playbook.actions.length > 3) err(id, 'cases.json: playbook cần 1–3 việc làm')
}
const withSim = all.filter((m) => m.simulator).length
const withHw = all.filter((m) => m.diagnostic_homework).length
if (errors.length) {
  console.error(`✗ ${errors.length} lỗi:\n` + errors.join('\n'))
  process.exit(1)
}
console.log(`✓ ${all.length} chỉ số hợp lệ · ${withSim} có simulator · ${withHw} có bài tập chẩn đoán · ${Object.keys(cases).filter((k) => !k.startsWith('_')).length} có tình huống thực tế · ${pbs.length} Playbook · ${qids.size} câu trắc nghiệm`)
