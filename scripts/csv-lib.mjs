// Định dạng CSV dùng chung cho import/export metricsMaster (Google Sheets / Excel).
export const COLUMNS = [
  'metric_id', 'code', 'name', 'vi_name', 'stage', 'sub_group', 'definition',
  'formula_readable', 'formula_latex',
  'bench_tiktok_vn', 'bench_meta_vn', 'bench_d2c_us', 'bench_tham_khao',
  'upstream_drivers', 'downstream_impacts', 'trade_offs',
  'simulator_json', 'homework_json',
]
export const STAGE_FILES = {
  '01_product_rd': '01_product.json',
  '02_traffic_acquisition': '02_traffic.json',
  '03_conversion_sales': '03_sales.json',
  '04_fulfillment_supply': '04_fulfillment.json',
  '05_retention_lifecycle': '05_retention.json',
  '06_finance_unit_econ': '06_finance.json',
  '07_team_operations': '07_team.json',
}
const BENCH = ['tiktok_vn', 'meta_vn', 'd2c_us', 'tham_khao']

// RFC 4180: hỗ trợ ô có dấu phẩy, ngoặc kép, xuống dòng (Alt+Enter trong Sheets)
export function parseCsv(text) {
  text = text.replace(/^﻿/, '')
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false }
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}
const esc = (s) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
export const toCsv = (rows) => '﻿' + rows.map((r) => r.map((x) => esc(String(x ?? ''))).join(',')).join('\n') + '\n'

// Quan hệ: mỗi dòng trong ô là "metric_id | direct|inverse | ghi chú"; trade_offs: "metric_id | ghi chú"
const lines = (s) => (s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
function parseRel(s, withImpact) {
  return lines(s).map((l) => {
    const parts = l.split('|').map((x) => x.trim())
    if (withImpact) return { metric_id: parts[0], impact: parts[1], note: parts.slice(2).join(' | ') }
    return { metric_id: parts[0], note: parts.slice(1).join(' | ') }
  })
}
const relToCell = (arr, withImpact) => (arr || []).map((r) => (withImpact ? [r.metric_id, r.impact, r.note] : [r.metric_id, r.note]).join(' | ')).join('\n')

export function metricToRow(m) {
  const b = m.benchmarks || {}
  return [
    m.metric_id, m.code, m.name, m.vi_name, m.stage, m.sub_group, m.definition,
    m.formula?.readable, m.formula?.latex,
    ...BENCH.map((k) => b[k] || ''),
    relToCell(m.relationships?.upstream_drivers, true),
    relToCell(m.relationships?.downstream_impacts, true),
    relToCell(m.relationships?.trade_offs, false),
    m.simulator ? JSON.stringify(m.simulator) : '',
    m.diagnostic_homework ? JSON.stringify(m.diagnostic_homework) : '',
  ]
}

export function rowToMetric(obj, line) {
  const bench = {}
  for (const k of BENCH) if (obj['bench_' + k]?.trim()) bench[k] = obj['bench_' + k].trim()
  const parseJson = (k) => {
    if (!obj[k]?.trim()) return undefined
    try { return JSON.parse(obj[k]) } catch (e) { throw new Error(`Dòng ${line} (${obj.metric_id}): cột ${k} không phải JSON hợp lệ – ${e.message}`) }
  }
  const m = {
    metric_id: obj.metric_id.trim(), code: obj.code.trim(), name: obj.name.trim(), vi_name: obj.vi_name.trim(),
    stage: obj.stage.trim(), sub_group: obj.sub_group.trim(), definition: obj.definition.trim(),
    formula: { readable: obj.formula_readable.trim(), latex: obj.formula_latex.trim() },
    benchmarks: bench,
    relationships: {
      upstream_drivers: parseRel(obj.upstream_drivers, true),
      downstream_impacts: parseRel(obj.downstream_impacts, true),
      trade_offs: parseRel(obj.trade_offs, false),
    },
  }
  const sim = parseJson('simulator_json'); if (sim) m.simulator = sim
  const hw = parseJson('homework_json'); if (hw) m.diagnostic_homework = hw
  return m
}
