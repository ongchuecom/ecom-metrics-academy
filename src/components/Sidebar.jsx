import { useMemo, useState } from 'react'
import { metricsMaster, STAGES, playbooks } from '../data/index.js'
import { PlaybookNav } from './Playbooks.jsx'

// Bỏ dấu tiếng Việt để tìm "loi nhuan" vẫn ra "Lợi nhuận"
const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const INDEX = metricsMaster.map((m) => ({ m, hay: fold([m.code, m.vi_name, m.pack_code || '', m.metric_id].join(' ')) }))

export default function Sidebar({ selected, onSelect, selectedPb, onOpenPlaybook, autoFocus = false }) {
  const [view, setView] = useState(selectedPb ? 'pb' : 'metrics')
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('all')

  const groups = useMemo(() => {
    const needle = fold(q.trim())
    const hits = INDEX.filter(({ m, hay }) => (stage === 'all' || m.stage === stage) && (!needle || hay.includes(needle))).map((x) => x.m)
    return STAGES.map((s) => ({ ...s, items: hits.filter((m) => m.stage === s.id) })).filter((g) => g.items.length)
  }, [q, stage])
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <nav aria-label="Danh sách chỉ số và Playbook" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-3 mb-2 grid grid-cols-2 gap-1 rounded-full bg-stone-100 p-1 text-sm lg:mx-4" role="tablist">
        {[['metrics', `Chỉ số · ${metricsMaster.length}`], ['pb', `Playbook · ${playbooks.length}`]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
            className={`rounded-full py-1.5 font-display font-bold transition ${view === k ? 'bg-white text-brand-600 shadow-sm' : 'text-charcoal'}`}>{l}</button>
        ))}
      </div>
      {view === 'pb' ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 lg:px-4">
          <p className="px-2 pb-2 text-xs leading-snug text-muted">Tình huống thực chiến, mỗi bài nối với các chỉ số liên quan.</p>
          <PlaybookNav selected={selectedPb} onOpen={onOpenPlaybook} />
        </div>
      ) : (<>
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
                      {m.review === 'draft' && <span className="shrink-0 self-center rounded bg-lemon px-1 text-[9px] font-bold uppercase text-navy-ink" title="Mới, đang duyệt">mới</span>}
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
      </>)}
    </nav>
  )
}
