import { useEffect, useState } from 'react'
import { metricsMaster, STAGES, playbooks, conceptsByTopic, metricById } from '../data/index.js'
import { PlaybookNav } from './Playbooks.jsx'
import { prefetchConcept } from '../lib/content.js'

// Thanh bên dạng cây Lĩnh vực → Chủ đề → Khái niệm. Chỉ mở sẵn nhánh đang xem, nên 1.000 bài vẫn gọn.
// Chủ đề quá đông (> MAX_INLINE bài) chỉ hiện vài bài đầu và link sang trang chủ đề.
const MAX_INLINE = 25

function Item({ m, active, onSelect }) {
  return (
    <li>
      <button onClick={() => onSelect(m.metric_id)} onMouseEnter={() => prefetchConcept(m.metric_id)} aria-current={active ? 'page' : undefined}
        className={`relative flex w-full items-baseline gap-2 rounded-lg py-1.5 pl-5 pr-2 text-left transition ${active ? 'bg-brand-100 text-ink' : 'text-body hover:bg-stone-50'}`}>
        {active && <span className="absolute inset-y-1.5 left-1 w-1 rounded-full bg-brand-600" aria-hidden="true" />}
        <span className="shrink-0 font-display text-[13px] font-extrabold">{m.code}</span>
        <span className={`min-w-0 truncate text-xs ${active ? 'text-brand-800' : 'text-muted'}`}>{m.vi_name}</span>
        {m.review === 'draft' && <span className="shrink-0 self-center rounded bg-lemon px-1 text-[9px] font-bold uppercase text-navy-ink" title="Mới, đang duyệt">mới</span>}
        {(m.simulator || m.diagnostic_homework) && <span className="ml-auto h-1.5 w-1.5 shrink-0 self-center rounded-full bg-brand-500" title="Có giả lập hoặc bài tập" />}
      </button>
    </li>
  )
}

export default function Sidebar({ selected, onSelect, selectedPb, onOpenPlaybook, selectedTopic, onOpenTopic }) {
  const [view, setView] = useState(selectedPb ? 'pb' : 'concepts')
  const cur = metricById[selected]
  const activeTopic = cur?.topic || selectedTopic
  const activeDomain = cur?.stage || STAGES.find((d) => d.topics.some((t) => t.id === selectedTopic))?.id
  const [openD, setOpenD] = useState(() => new Set(activeDomain ? [activeDomain] : []))
  const [openT, setOpenT] = useState(() => new Set(activeTopic ? [activeTopic] : []))
  // mở nhánh của bài đang xem khi chuyển bài
  useEffect(() => {
    if (activeDomain) setOpenD((s) => (s.has(activeDomain) ? s : new Set([...s, activeDomain])))
    if (activeTopic) setOpenT((s) => (s.has(activeTopic) ? s : new Set([...s, activeTopic])))
  }, [activeDomain, activeTopic])
  const toggle = (set, setter, id) => setter(() => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <nav aria-label="Mục lục khái niệm và Playbook" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-3 mb-2 grid grid-cols-2 gap-1 rounded-full bg-stone-100 p-1 text-sm lg:mx-4" role="tablist">
        {[['concepts', `Khái niệm · ${metricsMaster.length}`], ['pb', `Playbook · ${playbooks.length}`]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
            className={`rounded-full py-1.5 font-display font-bold transition ${view === k ? 'bg-white text-brand-600 shadow-sm' : 'text-charcoal'}`}>{l}</button>
        ))}
      </div>
      {view === 'pb' ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 lg:px-4">
          <p className="px-2 pb-2 text-xs leading-snug text-muted">Tình huống thực chiến, mỗi bài nối với các khái niệm liên quan.</p>
          <PlaybookNav selected={selectedPb} onOpen={onOpenPlaybook} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 lg:px-4">
          {STAGES.map((d, di) => {
            const topics = d.topics.filter((t) => t.n > 0)
            if (!topics.length) return null
            const dOpen = openD.has(d.id)
            const n = topics.reduce((a, t) => a + t.n, 0)
            return (
              <div key={d.id} className="mt-1">
                <button onClick={() => toggle(openD, setOpenD, d.id)} aria-expanded={dOpen}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-stone-50">
                  <span className={`text-[10px] text-muted transition ${dOpen ? 'rotate-90' : ''}`} aria-hidden="true">▶</span>
                  <span className="min-w-0 flex-1 truncate font-display text-[13px] font-extrabold text-ink">{di + 1}. {d.label}</span>
                  <span className="text-[11px] text-muted">{n}</span>
                </button>
                {dOpen && (
                  <ul className="ml-2 border-l border-stone-100 pl-1">
                    {topics.map((t) => {
                      const tOpen = openT.has(t.id)
                      const items = conceptsByTopic[t.id] || []
                      const shown = tOpen ? (items.length > MAX_INLINE ? items.filter((m, i) => i < MAX_INLINE - 1 || m.metric_id === selected) : items) : []
                      return (
                        <li key={t.id}>
                          <div className={`flex items-center rounded-lg ${selectedTopic === t.id ? 'bg-brand-50' : ''}`}>
                            <button onClick={() => toggle(openT, setOpenT, t.id)} aria-expanded={tOpen} aria-label={`${tOpen ? 'Thu gọn' : 'Mở'} ${t.label}`} className="px-2 py-1.5 text-[10px] text-muted">
                              <span className={`inline-block transition ${tOpen ? 'rotate-90' : ''}`}>▶</span>
                            </button>
                            <button onClick={() => onOpenTopic(t.id)} className="min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-[13px] font-semibold text-ink hover:text-brand-700">{t.label}</button>
                            <span className="pr-2 text-[11px] text-muted">{t.n}</span>
                          </div>
                          {tOpen && (
                            <ul className="space-y-0.5 pb-1">
                              {shown.map((m) => <Item key={m.metric_id} m={m} active={m.metric_id === selected} onSelect={onSelect} />)}
                              {items.length > shown.length && (
                                <li><button onClick={() => onOpenTopic(t.id)} className="py-1 pl-5 text-xs font-semibold text-brand-700 hover:underline">Xem cả {items.length} bài →</button></li>
                              )}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </nav>
  )
}
