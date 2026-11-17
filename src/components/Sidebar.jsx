import { useMemo, useState } from 'react'
import { metricsMaster, STAGES } from '../data/index.js'

// Bỏ dấu tiếng Việt để tìm "loi nhuan" vẫn ra "Lợi nhuận"
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const INDEX = metricsMaster.map((m) => ({ m, hay: fold([m.code, m.vi_name, m.name, m.metric_id].join(' ')) }))

export default function Sidebar({ selected, onSelect }) {
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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã hoặc tên: CAC, hoàn hàng…"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Lọc theo khâu">
          {[{ id: 'all', short: 'Tất cả' }, ...STAGES].map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              aria-pressed={stage === s.id}
              title={s.label}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                stage === s.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {i > 0 && <span className="mr-1 opacity-60">{i}</span>}
              {s.short}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-64 min-h-0 flex-1 overflow-y-auto px-3 pb-4 lg:max-h-none lg:px-4">
        {total === 0 && <p className="px-2 py-4 text-sm text-stone-500">Không có chỉ số khớp “{q}”.</p>}
        {groups.map((g) => (
          <div key={g.id} className="mt-2">
            <p className="sticky top-0 z-10 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
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
                      className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                        active ? 'bg-brand-600 text-white shadow' : 'text-stone-700 hover:bg-brand-50'
                      }`}
                    >
                      <span className="shrink-0 text-sm font-bold">{m.code}</span>
                      <span className={`min-w-0 truncate text-xs ${active ? 'text-brand-100' : 'text-stone-500'}`}>{m.vi_name}</span>
                      {(m.simulator || m.diagnostic_homework) && (
                        <span className={`ml-auto shrink-0 text-[10px] ${active ? 'text-brand-100' : 'text-accent-600'}`} title="Có giả lập và bài tập">●</span>
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
