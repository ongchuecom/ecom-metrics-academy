// Tự gắn link thuật ngữ: trong bài, tên khái niệm nào đã có bài riêng thì thành link (rê chuột thấy định nghĩa ngắn).
// Mỗi thuật ngữ chỉ gắn link ở lần xuất hiện đầu tiên trong bài; không tự gắn link tới chính bài đang đọc.
import { metricsMaster } from '../data/index.js'
import { href } from './route.js'
import { prefetchConcept } from './content.js'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Tên hiển thị dạng "Tỷ lệ hoàn hàng (Tỷ lệ bom hàng / RTO)" → lấy phần trước ngoặc
const mainName = (s) => s.replace(/\s*\(.*$/, '').trim()
const GENERIC = new Set(['doanh thu', 'lợi nhuận', 'chi phí', 'giá vốn'])

const terms = []
for (const m of metricsMaster) {
  const add = (t, cs) => { t = t.trim(); if (t.length >= 3 && !GENERIC.has(t.toLowerCase())) terms.push({ t, id: m.metric_id, cs }) }
  add(m.code, /^[A-Z0-9][A-Z0-9 /&-]*$/.test(m.code)) // mã viết hoa (CM2, ROAS) khớp đúng hoa thường
  const n = mainName(m.vi_name)
  if (n.toLowerCase() !== m.code.toLowerCase() && n.split(/\s+/).length >= 2) add(n, false)
}
terms.sort((a, b) => b.t.length - a.t.length)
const byLower = new Map(), byExact = new Map()
for (const x of terms) (x.cs ? byExact : byLower).set(x.cs ? x.t : x.t.toLowerCase(), x)
const L = '\\p{L}\\p{N}'
const RE = terms.length ? new RegExp(`(?<![${L}])(${terms.map((x) => esc(x.t)).join('|')})(?![${L}])`, 'giu') : null
const defOf = Object.fromEntries(metricsMaster.map((m) => [m.metric_id, m]))

// Trả về mảng node: chữ thường xen link. used: Set id đã gắn link trong bài này.
export function linkify(text, { selfId, used, onSelect, keyPrefix = '' }) {
  if (!RE || !text) return [text]
  const out = []
  let last = 0, k = 0
  for (const m of text.matchAll(RE)) {
    const hit = byExact.get(m[1]) || byLower.get(m[1].toLowerCase())
    if (!hit || hit.id === selfId || used.has(hit.id)) continue
    used.add(hit.id)
    if (m.index > last) out.push(text.slice(last, m.index))
    const c = defOf[hit.id]
    out.push(
      <a key={`${keyPrefix}g${k++}`} href={href({ type: 'metric', id: hit.id })} title={`${c.code}: ${c.definition}`}
        onMouseEnter={() => prefetchConcept(hit.id)}
        onClick={(e) => { if (onSelect) { e.preventDefault(); onSelect(hit.id) } }}
        className="underline decoration-brand-500/40 decoration-dotted underline-offset-[3px] hover:text-brand-700 hover:decoration-brand-600">{m[1]}</a>,
    )
    last = m.index + m[1].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
