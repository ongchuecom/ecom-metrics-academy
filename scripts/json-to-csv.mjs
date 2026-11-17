// Xuất toàn bộ metricsMaster ra CSV để mở bằng Google Sheets / Excel và chỉnh sửa hàng loạt.
// Dùng: npm run data:export [-- duong-dan.csv]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { COLUMNS, STAGE_FILES, metricToRow, toCsv } from './csv-lib.mjs'

const out = process.argv[2] || 'templates/metrics_master.csv'
const rows = [COLUMNS]
for (const f of Object.values(STAGE_FILES)) {
  for (const m of JSON.parse(readFileSync(join('src/data/stages', f), 'utf8'))) rows.push(metricToRow(m))
}
writeFileSync(out, toCsv(rows))
console.log(`Đã xuất ${rows.length - 1} chỉ số ra ${out}`)
