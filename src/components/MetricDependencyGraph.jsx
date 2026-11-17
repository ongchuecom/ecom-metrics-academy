import { metricById } from '../data/index.js'

const IMPACT = {
  direct: { label: 'Thuận chiều', sign: '↑ ↑', badge: 'bg-sky-100 text-sky-800 ring-sky-200', edge: 'border-l-sky-500' },
  inverse: { label: 'Nghịch chiều', sign: '↑ ↓', badge: 'bg-orange-100 text-orange-800 ring-orange-200', edge: 'border-l-orange-500' },
  trade: { label: 'Đánh đổi', sign: '⇄', badge: 'bg-violet-100 text-violet-800 ring-violet-200', edge: 'border-l-violet-500' },
}

function NodeCard({ rel, kind, onSelect, delay }) {
  const target = metricById[rel.metric_id]
  const s = IMPACT[kind]
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-bold text-stone-900">{target ? target.code : rel.metric_id}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${s.badge}`} title={s.label}>
          {s.sign} {s.label}
        </span>
      </div>
      {target && <p className="text-xs text-stone-500">{target.vi_name}</p>}
      {rel.note && <p className="mt-1 text-xs leading-snug text-stone-700">{rel.note}</p>}
    </>
  )
  const cls = `fade-up block w-full rounded-xl border border-stone-200 border-l-4 ${s.edge} bg-white p-2.5 text-left shadow-sm`
  if (!target) return <div className={`${cls} opacity-60`} style={{ animationDelay: `${delay}ms` }}>{body}<p className="mt-1 text-[10px] text-stone-400">Chưa có bài học</p></div>
  return (
    <button onClick={() => onSelect(rel.metric_id)} className={`${cls} transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow`} style={{ animationDelay: `${delay}ms` }}>
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
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">{title}</p>
        {hint && <p className="text-[11px] text-stone-400">{hint}</p>}
      </div>
      {children}
      {empty && <p className="rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-400">{empty}</p>}
    </div>
  )
}

export default function MetricDependencyGraph({ metric, onSelect }) {
  const { upstream_drivers: up = [], downstream_impacts: down = [], trade_offs: trade = [] } = metric.relationships || {}
  return (
    <section aria-label="Sơ đồ phụ thuộc chỉ số" className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-stone-900">Chỉ số này đứng ở đâu trong cỗ máy?</h3>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {Object.entries(IMPACT).map(([k, s]) => (
            <span key={k} className={`rounded-full px-2 py-0.5 font-medium ring-1 ${s.badge}`}>{s.sign} {s.label}</span>
          ))}
        </div>
      </div>
      <div className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)_auto_minmax(0,1fr)] md:gap-3">
        <Column title="Đầu vào" hint="Chỉ số kéo chỉ số này lên/xuống" empty={up.length ? null : 'Chỉ số gốc, không phụ thuộc chỉ số nào trong hệ thống.'}>
          {up.map((r, i) => <NodeCard key={r.metric_id} rel={r} kind={r.impact} onSelect={onSelect} delay={i * 60} />)}
        </Column>
        <FlowArrow />
        <div key={metric.metric_id} className="fade-up rounded-2xl bg-stone-900 p-4 text-center text-white shadow-lg ring-4 ring-brand-500/30">
          <p className="text-[11px] uppercase tracking-widest text-brand-100/80">Đang học</p>
          <p className="text-2xl font-extrabold">{metric.code}</p>
          <p className="text-xs text-stone-300">{metric.vi_name}</p>
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
    </section>
  )
}
