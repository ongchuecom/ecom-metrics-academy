import { metricById } from '../data/index.js'
import { SectionTitle } from './ui.jsx'

// Xám = thuận chiều (cùng tăng), đỏ thẫm = nghịch chiều, vàng = đánh đổi cần nhớ
const IMPACT = {
  direct: { label: 'Thuận chiều', sign: '↑ ↑', badge: 'bg-stone-100 text-ink ring-stone-300', edge: 'border-l-stone-400' },
  inverse: { label: 'Nghịch chiều', sign: '↑ ↓', badge: 'bg-coral/10 text-coral ring-coral/30', edge: 'border-l-coral' },
  trade: { label: 'Đánh đổi', sign: '⇄', badge: 'bg-marker text-navy-ink ring-amber-300', edge: 'border-l-marker' },
}

function NodeCard({ rel, kind, onSelect, delay }) {
  const target = metricById[rel.metric_id]
  const s = IMPACT[kind]
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-display font-extrabold text-ink">{target ? target.code : rel.metric_id}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${s.badge}`} title={s.label}>
          {s.sign} {s.label}
        </span>
      </div>
      {target && <p className="text-xs text-charcoal">{target.vi_name}</p>}
      {rel.note && <p className="mt-1 text-xs leading-snug text-body">{rel.note}</p>}
    </>
  )
  const cls = `fade-up block w-full rounded-xl bg-stone-50 p-3 text-left`
  if (!target) return <div className={`${cls} opacity-60`} style={{ animationDelay: `${delay}ms` }}>{body}<p className="mt-1 text-[10px] text-stone-400">Chưa có bài học</p></div>
  return (
    <button onClick={() => onSelect(rel.metric_id)} className={`${cls} transition hover:bg-brand-50`} style={{ animationDelay: `${delay}ms` }}>
      {body}
    </button>
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
      <div>
        <p className="eyebrow text-charcoal">{title}</p>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
      </div>
      {children}
      {empty && <p className="rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-400">{empty}</p>}
    </div>
  )
}

export default function MetricDependencyGraph({ metric, onSelect }) {
  const { upstream_drivers: up = [], downstream_impacts: down = [], trade_offs: trade = [] } = metric.relationships || {}
  return (
    <section aria-label="Sơ đồ phụ thuộc chỉ số" className="space-y-4">
      <SectionTitle eyebrow="Sơ đồ phụ thuộc" title={`${metric.code} đứng ở đâu trong cỗ máy?`} desc="Bấm vào một thẻ để học chỉ số đó."
        right={
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {Object.entries(IMPACT).map(([k, s]) => (
              <span key={k} className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${s.badge}`}>{s.sign} {s.label}</span>
            ))}
          </div>
        } />
      <div className="py-1">
      <div className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)_auto_minmax(0,1fr)] md:gap-3">
        <Column title="Đầu vào" hint="Chỉ số kéo chỉ số này lên/xuống" empty={up.length ? null : 'Chỉ số gốc, không phụ thuộc chỉ số nào trong hệ thống.'}>
          {up.map((r, i) => <NodeCard key={r.metric_id} rel={r} kind={r.impact} onSelect={onSelect} delay={i * 60} />)}
        </Column>
        <FlowArrow />
        <div key={metric.metric_id} className="fade-up rounded-2xl bg-white p-4 text-center ring-2 ring-brand-500">
          <p className="eyebrow text-brand-600">Đang học</p>
          <p className="font-display text-2xl font-black text-ink">{metric.code}</p>
          <p className="text-xs text-charcoal">{metric.vi_name}</p>
        </div>
        <FlowArrow />
        <div className="min-w-0 space-y-4">
          <Column title="Đầu ra" hint="Chỉ số bị chỉ số này tác động" empty={down.length ? null : 'Chỉ số cuối chuỗi.'}>
            {down.map((r, i) => <NodeCard key={r.metric_id} rel={r} kind={r.impact} onSelect={onSelect} delay={i * 60} />)}
          </Column>
          {trade.length > 0 && (
            <Column title="Đánh đổi" hint="Tối ưu quá tay sẽ làm hỏng chỉ số khác">
              {trade.map((r, i) => <NodeCard key={r.metric_id} rel={r} kind="trade" onSelect={onSelect} delay={i * 60} />)}
            </Column>
          )}
        </div>
      </div>
      </div>
    </section>
  )
}
