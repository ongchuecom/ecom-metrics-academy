import { useEffect, useMemo, useRef, useState } from 'react'
import { metricsMaster, playbooks, stageById, TOPICS, TYPES, CATALOG_VERSION } from '../data/index.js'
import { pbTitle } from './Playbooks.jsx'

// Bỏ dấu để gõ "dong tien" vẫn ra "dòng tiền"
const fold = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

// Chỉ mục phụ (tên gọi khác, mã pack, công thức, câu cần nhớ) chỉ tải khi mở ô tìm lần đầu
const BASE = import.meta.env.BASE_URL || '/'
let extraP = null
const loadExtra = () => (extraP ||= fetch(`${BASE}data/search.json?v=${CATALOG_VERSION}`).then((r) => r.json()).catch(() => { extraP = null; return {} }))

function buildIndex(extra = {}) {
  return [
    ...TOPICS.filter((t) => t.n > 0).map((t) => ({
      kind: 'topic', id: t.id, title: t.label, sub: `${stageById[t.domain]?.label} · ${t.n} bài`, meta: 'Chủ đề',
      head: fold(t.label), body: fold([t.desc, stageById[t.domain]?.label].join(' ')),
    })),
    ...metricsMaster.map((m) => ({
      kind: 'metric', id: m.metric_id, title: m.code, sub: m.vi_name, meta: m.type && m.type !== 'metric' ? TYPES[m.type]?.label : stageById[m.stage]?.short,
      head: fold([m.code, m.vi_name, extra[m.metric_id]?.split(' ¦ ')[1]].join(' ')),
      body: fold([m.definition, m.sub_group, m.subtitle, extra[m.metric_id]].join(' ')),
    })),
    ...playbooks.map((p) => ({
      kind: 'pb', id: p.playbook_id, title: pbTitle(p), sub: p.summary, meta: 'Playbook',
      head: fold(p.title),
      body: fold([p.summary, p.core_correlation, p.case_study?.title, p.case_study?.context].join(' ')),
    })),
  ]
}

// Mỗi từ khớp tên được nhiều điểm hơn khớp nội dung; câu từ 3 từ trở lên cho phép thiếu 1 từ
function search(index, q) {
  const words = fold(q).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const allowMiss = words.length >= 3 ? 1 : 0
  return index.map((it) => {
    let score = 0, miss = 0
    for (const w of words) {
      if (it.head.startsWith(w)) score += 6
      else if (new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(it.head)) score += 5
      else if (it.head.includes(w)) score += 3
      else if (it.body.includes(w)) score += 1
      else if (++miss > allowMiss) return null
    }
    if (fold(q).trim() === it.head.trim()) score += 10
    return { it, score: score + (it.kind === 'topic' ? 1 : it.kind === 'metric' ? 0.5 : 0) }
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 15).map((x) => x.it)
}

export function SearchButton({ onClick, variant = 'side' }) {
  if (variant === 'icon') {
    return (
      <button onClick={onClick} aria-label="Tìm kiếm" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink ring-1 ring-stone-200 hover:bg-stone-50">
        <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" strokeLinecap="round" /></svg>
      </button>
    )
  }
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm text-muted ring-1 ring-stone-200 transition hover:ring-stone-300">
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" strokeLinecap="round" /></svg>
      <span className="flex-1 truncate">Tìm khái niệm…</span>
      <kbd className="rounded bg-stone-100 px-1.5 py-0.5 font-sans text-[11px] text-charcoal">Ctrl K</kbd>
    </button>
  )
}

export default function SearchDialog({ open, onClose, onSelectMetric, onOpenPlaybook, onOpenTopic }) {
  const [q, setQ] = useState('')
  const [extra, setExtra] = useState(null)
  useEffect(() => { if (open && !extra) loadExtra().then(setExtra) }, [open, extra])
  const index = useMemo(() => buildIndex(extra || {}), [extra])
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const results = useMemo(() => search(index, q), [index, q])
  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => input.current?.focus(), 0) } }, [open])
  useEffect(() => setActive(0), [q])
  if (!open) return null
  const go = (it) => { onClose(); it.kind === 'pb' ? onOpenPlaybook(it.id) : it.kind === 'topic' ? onOpenTopic?.(it.id) : onSelectMetric(it.id) }
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
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Gõ khái niệm, chủ đề, tình huống…"
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
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${it.kind === 'pb' ? 'bg-brand-600 text-white' : it.kind === 'topic' ? 'bg-brand-100 text-brand-800' : 'bg-stone-100 text-charcoal'}`}>{it.meta}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-bold text-ink">{it.title}</span>
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
