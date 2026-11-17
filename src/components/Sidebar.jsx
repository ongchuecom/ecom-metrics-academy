import { useMemo, useState } from 'react'
import { metricsMaster, STAGES } from '../data/index.js'

// Bỏ dấu tiếng Việt để tìm "loi nhuan" vẫn ra "Lợi nhuận"
const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const INDEX = metricsMaster.map((m) => ({ m, hay: fold([m.code, m.vi_name, m.name, m.metric_id].join(' ')) }))

export default function Sidebar({ selected, onSelect, autoFocus = false }) {
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('all')

  const groups = useMemo(() => {
    const needle = fold(q.trim())
    const hits = INDEX.filter(({ m, hay }) => (stage === 'all' || m.stage === stage) && (!needle || hay.includes(needle))).map((x) => x.m)
    return STAGES.map((s) => ({ ...s, items: hits.filter((m) => m.stage === s.id) })).filter((g) => g.items.length)
  }, [q, stage])
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <nav aria-label="Danh sách chỉ số" className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 px-3 pb-2 lg:px-4">
        <label className="block">
          <span className="sr-only">Tìm chỉ số</span>
          <input
            type="search"
            autoFocus={autoFocus}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã hoặc tên: CAC, hoàn hàng…"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base outline-none sm:text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Lọc theo khâu">
          {[{ id: 'all', short: 'Tất cả' }, ...STAGES].map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              aria-pressed={stage === s.id}
              title={s.label}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                stage === s.id ? 'bg-brand-600 text-white' : 'bg-stone-100 text-charcoal hover:bg-brand-100'
              }`}
            >
              {i > 0 && <span className="mr-1 opacity-60">{i}</span>}
              {s.short}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 lg:px-4">
        {total === 0 && <p className="px-2 py-4 text-sm text-muted">Không có chỉ số khớp “{q}”.</p>}
        {groups.map((g) => (
          <div key={g.id} className="mt-2">
            <p className="eyebrow sticky top-0 z-10 bg-white px-2 py-1.5 text-muted">
              {STAGES.findIndex((s) => s.id === g.id) + 1}. {g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((m) => {
                const active = m.metric_id === selected
                return (
                  <li key={m.metric_id}>
                    <button
                      onClick={() => onSelect(m.metric_id)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex w-full items-baseline gap-2 rounded-lg px-3 py-2 text-left transition ${
                        active ? 'bg-brand-100 text-ink' : 'text-body hover:bg-stone-50'
                      }`}
                    >
                      {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand-600" aria-hidden="true" />}
                      <span className="shrink-0 font-display text-sm font-extrabold">{m.code}</span>
                      <span className={`min-w-0 truncate text-xs ${active ? 'text-brand-800' : 'text-muted'}`}>{m.vi_name}</span>
                      {(m.simulator || m.diagnostic_homework) && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 self-center rounded-full bg-brand-500" title="Có giả lập và bài tập" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
