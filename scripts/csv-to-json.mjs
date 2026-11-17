// Chuyển file CSV (tải từ Google Sheets: File → Download → CSV) thành 7 file JSON trong src/data/stages.
// Dùng: npm run data:import -- duong-dan/metrics_master.csv [--out src/data/stages]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseCsv, rowToMetric, COLUMNS, STAGE_FILES } from './csv-lib.mjs'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const outIdx = args.indexOf('--out')
const out = outIdx >= 0 ? args[outIdx + 1] : 'src/data/stages'
if (!file) { console.error('Cách dùng: npm run data:import -- <file.csv> [--out <thư mục>]'); process.exit(1) }

const rows = parseCsv(readFileSync(file, 'utf8'))
const header = rows[0].map((h) => h.trim())
const missing = COLUMNS.filter((c) => !header.includes(c))
if (missing.length) { console.error('Thiếu cột: ' + missing.join(', ')); process.exit(1) }

const byStage = Object.fromEntries(Object.keys(STAGE_FILES).map((s) => [s, []]))
rows.slice(1).forEach((r, i) => {
  const obj = Object.fromEntries(header.map((h, j) => [h, r[j] ?? '']))
  if (!obj.metric_id.trim() || obj.metric_id.startsWith('#')) return // bỏ dòng trống hoặc dòng ghi chú
  const m = rowToMetric(obj, i + 2)
  if (!byStage[m.stage]) { console.error(`Dòng ${i + 2} (${m.metric_id}): stage không hợp lệ "${m.stage}"`); process.exit(1) }
  byStage[m.stage].push(m)
})
mkdirSync(out, { recursive: true })
for (const [stage, arr] of Object.entries(byStage)) {
  writeFileSync(join(out, STAGE_FILES[stage]), JSON.stringify(arr, null, 2) + '\n')
  console.log(`${STAGE_FILES[stage]}: ${arr.length} chỉ số`)
}
console.log('Xong. Chạy `npm run validate` để kiểm tra quan hệ, simulator và bài tập.')
