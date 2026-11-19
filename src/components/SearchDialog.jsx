import { useEffect, useMemo, useRef, useState } from 'react'
import { metricsMaster, playbooks, stageById } from '../data/index.js'
import lessons from '../data/lessons.json'
import { pbTitle } from './Playbooks.jsx'

// Bỏ dấu để gõ "dong tien" vẫn ra "dòng tiền"
const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const txt = (a) => (Array.isArray(a) ? a.join(' ') : a || '').replace(/\*\*/g, '')

const INDEX = [
  ...metricsMaster.map((m) => {
    const L = lessons[m.metric_id]
    return {
      kind: 'metric', id: m.metric_id, title: m.code, sub: m.vi_name, meta: stageById[m.stage]?.short,
      head: fold([m.code, m.vi_name, m.pack_code].join(' ')),
      body: fold([m.definition, m.sub_group, m.formula?.readable, L?.subtitle, txt(L?.intro), L?.remember].join(' ')),
    }
  }),
  ...playbooks.map((p) => ({
    kind: 'pb', id: p.playbook_id, title: pbTitle(p), sub: p.summary, meta: 'Playbook',
    head: fold(p.title),
    body: fold([p.summary, p.core_correlation, p.case_study?.title, p.case_study?.context].join(' ')),
  })),
]

function search(q) {
  const words = fold(q).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return INDEX.map((it) => {
    let score = 0
    for (const w of words) {
      if (it.head.startsWith(w)) score += 6
      else if (it.head.includes(w)) score += 4
      else if (it.body.includes(w)) score += 1
      else return null // mọi từ đều phải có
    }
    return { it, score: score + (it.kind === 'metric' ? 0.5 : 0) }
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 12).map((x) => x.it)
}

export function SearchButton({ onClick, variant = 'side' }) {
  if (variant === 'icon') {
    return (
      <button onClick={onClick} aria-label="Tìm kiếm" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">
        <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" strokeLinecap="round" /></svg>
      </button>
    )
  }
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-left text-sm text-muted shadow-sm hover:bg-white">
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" strokeLinecap="round" /></svg>
      <span className="flex-1">Tìm chỉ số, Playbook…</span>
      <kbd className="rounded bg-stone-100 px-1.5 py-0.5 font-sans text-[11px] text-charcoal">Ctrl K</kbd>
    </button>
  )
}

export default function SearchDialog({ open, onClose, onSelectMetric, onOpenPlaybook }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const results = useMemo(() => search(q), [q])
  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => input.current?.focus(), 0) } }, [open])
  useEffect(() => setActive(0), [q])
  if (!open) return null
  const go = (it) => { onClose(); it.kind === 'pb' ? onOpenPlaybook(it.id) : onSelectMetric(it.id) }
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]) }
    else if (e.key === 'Escape') onClose()
  }
  const suggestions = ['ROAS hòa vốn', 'dòng tiền', 'hoàn hàng', 'tồn kho', 'livestream', 'thuế']
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tìm kiếm">
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label="Đóng" />
      <div className="fade-up relative mx-auto mt-0 flex max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl sm:mt-[10vh] sm:max-h-[75vh] sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
          <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 fill-none stroke-brand-600" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" strokeLinecap="round" /></svg>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Gõ tên chỉ số, khái niệm, tình huống…"
            className="min-w-0 flex-1 bg-transparent py-1 text-base text-ink outline-none placeholder:text-muted" aria-label="Từ khóa tìm kiếm" />
          <button onClick={onClose} className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-body">Đóng</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!q.trim() && (
            <div className="p-2">
              <p className="eyebrow text-muted">Gợi ý</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((s) => <button key={s} onClick={() => setQ(s)} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100">{s}</button>)}
              </div>
            </div>
          )}
          {q.trim() && !results.length && <p className="p-4 text-sm text-muted">Không thấy kết quả cho “{q}”. Thử từ khác, ví dụ “lãi”, “kho”, “Ads”.</p>}
          <ul>
            {results.map((it, i) => (
              <li key={it.kind + it.id}>
                <button onClick={() => go(it)} onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? 'bg-brand-50' : ''}`}>
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${it.kind === 'pb' ? 'bg-brand-600 text-white' : 'bg-stone-100 text-charcoal'}`}>{it.meta}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-extrabold text-ink">{it.title}</span>
                    <span className="line-clamp-1 block text-xs text-charcoal">{it.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden border-t border-stone-100 px-4 py-2 text-[11px] text-muted sm:block">↑ ↓ để chọn · Enter để mở · Esc để đóng</p>
      </div>
    </div>
  )
}
