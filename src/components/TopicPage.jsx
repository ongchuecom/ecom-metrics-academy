import { useMemo, useState } from 'react'
import { topicById, stageById, STAGES, conceptsByTopic, TYPES, playbookById } from '../data/index.js'
import { prefetchConcept } from '../lib/content.js'
import { pbTitle } from './Playbooks.jsx'

// Trang tổng của một chủ đề: mọi khái niệm trong chủ đề, lọc theo loại, các chủ đề cùng lĩnh vực, Playbook liên quan
export default function TopicPage({ id, onSelectMetric, onOpenTopic, onOpenPlaybook }) {
  const t = topicById[id]
  const d = stageById[t.domain]
  const items = conceptsByTopic[id] || []
  const [type, setType] = useState('all')
  const types = useMemo(() => [...new Set(items.map((m) => m.type || 'metric'))], [items])
  const list = items.filter((m) => type === 'all' || (m.type || 'metric') === type)
  const pbs = useMemo(() => [...new Set(items.flatMap((m) => m.playbook_refs || []))].map((x) => playbookById[x]).filter(Boolean), [items])
  const siblings = d.topics.filter((x) => x.id !== id && x.n > 0)
  return (
    <article className="space-y-8">
      <header>
        <p className="eyebrow text-muted">{STAGES.findIndex((s) => s.id === d.id) + 1}. {d.label} · Chủ đề</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">{t.label}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-charcoal">{t.desc || d.desc} {items.length} bài.</p>
      </header>

      {types.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[['all', 'Tất cả', items.length], ...types.map((k) => [k, TYPES[k]?.label || k, items.filter((m) => (m.type || 'metric') === k).length])].map(([k, l, n]) => (
            <button key={k} onClick={() => setType(k)} className={`rounded-full px-3 py-1 text-sm font-semibold ${type === k ? 'bg-brand-100 text-brand-800' : 'bg-stone-100 text-body hover:bg-stone-200'}`}>{l} · {n}</button>
          ))}
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((m) => (
          <li key={m.metric_id}>
            <button onClick={() => onSelectMetric(m.metric_id)} onMouseEnter={() => prefetchConcept(m.metric_id)}
              className="flex h-full w-full flex-col rounded-xl bg-stone-50 p-3.5 text-left transition hover:bg-brand-50">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-ink">{m.code}</span>
                {m.type && m.type !== 'metric' && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-charcoal ring-1 ring-stone-200">{TYPES[m.type]?.label}</span>}
                {m.review === 'draft' && <span className="rounded bg-lemon px-1.5 py-0.5 text-[10px] font-bold text-navy-ink">Mới · đang duyệt</span>}
              </span>
              <span className="mt-1 line-clamp-2 text-sm leading-snug text-body">{m.subtitle || m.definition}</span>
            </button>
          </li>
        ))}
      </ul>

      {pbs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Playbook tình huống liên quan</h2>
          <div className="flex flex-wrap gap-2">
            {pbs.map((p) => <button key={p.playbook_id} onClick={() => onOpenPlaybook(p.playbook_id)} className="rounded-full bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-stone-200 hover:ring-brand-500">{pbTitle(p).replace(/\s*\(.*\)\s*$/, '')}</button>)}
          </div>
        </section>
      )}

      {siblings.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Cùng lĩnh vực {d.label.toLowerCase()}</h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((x) => <button key={x.id} onClick={() => onOpenTopic(x.id)} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-body hover:bg-brand-50">{x.label} · {x.n}</button>)}
          </div>
        </section>
      )}
    </article>
  )
}
