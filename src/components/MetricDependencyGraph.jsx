import { metricById } from '../data/index.js'
import { SectionTitle } from './ui.jsx'

// Xám = thuận chiều (cùng tăng), đỏ thẫm = nghịch chiều, vàng = đánh đổi cần nhớ
const IMPACT = {
  direct: { label: 'Thuận chiều', sign: '↑ ↑', badge: 'bg-stone-100 text-ink ring-stone-300', edge: 'border-l-stone-400' },
  inverse: { label: 'Nghịch chiều', sign: '↑ ↓', badge: 'bg-coral/10 text-coral ring-coral/30', edge: 'border-l-coral' },
  link: { label: 'Liên quan', sign: '↔', badge: 'bg-stone-100 text-charcoal ring-stone-200', edge: '' },
  trade: { label: 'Đánh đổi', sign: '⇄', badge: 'bg-marker text-navy-ink ring-amber-300', edge: 'border-l-marker' },
}

function NodeCard({ rel, kind, onSelect, delay }) {
  const target = metricById[rel.metric_id]
  const s = IMPACT[kind]
  // Gọn một dòng: mã + tên. Chỉ nghịch chiều và đánh đổi mới có dấu hiệu (đó là điều cần chú ý); ghi chú dài để trong tooltip.
  const mark = kind === 'inverse' || kind === 'trade'
  const body = (
    <span className="flex items-baseline gap-2">
      <span className="shrink-0 font-semibold text-ink">{target ? target.code : rel.metric_id}</span>
      <span className="min-w-0 truncate text-xs text-muted">{target?.vi_name}</span>
      {mark && <span className={`ml-auto shrink-0 rounded px-1 text-[10px] font-semibold ${s.badge}`}>{s.sign} {s.label}</span>}
    </span>
  )
  const cls = `fade-up block w-full rounded-lg px-3 py-2 text-left ring-1 ring-stone-200`
  const tip = [target?.vi_name, rel.note].filter(Boolean).join(' · ')
  if (!target) return <div className={`${cls} opacity-60`} title="Chưa có bài học" style={{ animationDelay: `${delay}ms` }}>{body}</div>
  return (
    <button onClick={() => onSelect(rel.metric_id)} title={tip} className={`${cls} transition hover:bg-stone-50`} style={{ animationDelay: `${delay}ms` }}>
      {body}
    </button>
  )
}

// Khái niệm liên quan: hàng nút gọn, tên đầy đủ trong tooltip
function Chips({ list, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((r) => {
        const t = metricById[r.metric_id]
        return t ? <button key={r.metric_id} onClick={() => onSelect(r.metric_id)} title={t.vi_name}
          className="rounded-full px-3 py-1 text-sm font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50">{t.code}</button> : null
      })}
    </div>
  )
}

// Mũi tên nét đứt chạy: ngang trên desktop, dọc trên mobile
function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-stone-400" aria-hidden="true">
      <svg viewBox="0 0 48 24" className="hidden h-6 w-12 md:block">
        <line x1="2" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="2.5" className="flow-line" />
        <path d="M38 6 L46 12 L38 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 24 36" className="h-8 w-6 md:hidden">
        <line x1="12" y1="2" x2="12" y2="28" stroke="currentColor" strokeWidth="2.5" className="flow-line" />
        <path d="M6 26 L12 34 L18 26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function Column({ title, hint, children, empty }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="eyebrow text-muted" title={hint}>{title}</p>
      {children}
      {empty && <p className="rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-400">{empty}</p>}
    </div>
  )
}

export default function MetricDependencyGraph({ metric, onSelect }) {
  const { upstream_drivers: up = [], downstream_impacts: down = [], trade_offs: trade = [], related = [] } = metric.relationships || {}
  // Khái niệm không có quan hệ nhân quả rõ ràng: chỉ hiện nhóm "Liên quan"
  if (!up.length && !down.length && !trade.length) return related.length ? (
    <section aria-label="Khái niệm liên quan" className="space-y-3">
      <SectionTitle title={`Học ${metric.code} xong, đọc tiếp`} />
      <Chips list={related} onSelect={onSelect} />
    </section>
  ) : null
  return (
    <section aria-label="Sơ đồ phụ thuộc chỉ số" className="space-y-4">
      <SectionTitle title={`${metric.code} đứng ở đâu trong cỗ máy?`} />
      <div className="py-1">
      <div className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)_auto_minmax(0,1fr)] md:gap-3">
        <Column title="Đầu vào" hint="Chỉ số kéo chỉ số này lên/xuống" empty={up.length ? null : 'Chỉ số gốc, không phụ thuộc chỉ số nào trong hệ thống.'}>
          {up.map((r, i) => <NodeCard key={r.metric_id} rel={r} kind={r.impact || 'link'} onSelect={onSelect} delay={i * 60} />)}
        </Column>
        <FlowArrow />
        <div key={metric.metric_id} className="fade-up rounded-2xl bg-white p-4 text-center ring-2 ring-brand-500">
          <p className="font-display text-2xl font-bold text-ink">{metric.code}</p>
          <p className="text-xs text-charcoal">{metric.vi_name}</p>
        </div>
        <FlowArrow />
        <div className="min-w-0 space-y-4">
          <Column title="Đầu ra" hint="Chỉ số bị chỉ số này tác động" empty={down.length ? null : 'Chỉ số cuối chuỗi.'}>
            {down.map((r, i) => <NodeCard key={r.metric_id} rel={r} kind={r.impact || 'link'} onSelect={onSelect} delay={i * 60} />)}
          </Column>
          {trade.length > 0 && (
            <Column title="Đánh đổi" hint="Tối ưu quá tay sẽ làm hỏng chỉ số khác">
              {trade.map((r, i) => <NodeCard key={r.metric_id} rel={r} kind="trade" onSelect={onSelect} delay={i * 60} />)}
            </Column>
          )}
        </div>
      </div>
      </div>
      {related.length > 0 && (
        <div>
          <p className="eyebrow mb-2 text-muted">Liên quan</p>
          <Chips list={related} onSelect={onSelect} />
        </div>
      )}
    </section>
  )
}
