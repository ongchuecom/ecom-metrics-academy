import { useState } from 'react'
import { playbooks, playbookById, metricById, STAGES } from '../data/index.js'
import LeadForm from './LeadForm.jsx'
import PageFeedback from './PageFeedback.jsx'

const num = (p) => (p.playbook_id.match(/pb_(\d+)/) || [])[1] || ''
// "Playbook 01: Bài toán …" → "Bài toán …"
export const pbTitle = (p) => p.title.replace(/^Playbook\s*\d+\s*:\s*/i, '')

// Trên trang chỉ số: các Playbook có nhắc tới chỉ số này
export function PlaybookLinks({ metric, onOpen }) {
  const list = (metric.playbook_refs || []).map((id) => playbookById[id]).filter(Boolean)
  if (!list.length) return (
    <p className="text-sm text-muted">Chỉ số này chưa nằm trong Playbook tình huống nào.</p>
  )
  return (
    <div>
      <p className="eyebrow text-muted">Playbook tình huống có chỉ số này · {list.length}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {list.map((p) => (
          <li key={p.playbook_id}>
            <button onClick={() => onOpen(p.playbook_id)} className="group flex h-full w-full gap-3 rounded-xl bg-stone-50 p-3 text-left transition hover:bg-brand-50">
              <span className="font-display text-lg font-black leading-none text-brand-600">{num(p)}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-snug text-ink group-hover:text-brand-700">{pbTitle(p)}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-charcoal">{p.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Trang một Playbook
export function PlaybookPage({ playbook: p, onSelectMetric, onOpen }) {
  const [done, setDone] = useState({})
  const idx = playbooks.findIndex((x) => x.playbook_id === p.playbook_id)
  const prev = playbooks[idx - 1], next = playbooks[idx + 1]
  const metrics = p.linked_metrics.map((id) => metricById[id]).filter(Boolean)
  const byStage = STAGES.map((s) => ({ ...s, items: metrics.filter((m) => m.stage === s.id) })).filter((g) => g.items.length)
  const c = p.case_study
  return (
    <article className="space-y-8">
      <header>
        <p className="eyebrow text-brand-600">Playbook {num(p)} · Tình huống thực chiến</p>
        <h1 className="mt-1.5 font-display text-2xl font-black leading-tight text-ink sm:text-3xl">{pbTitle(p)}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-charcoal">{p.summary}</p>
      </header>

      <section className="rounded-2xl border-l-4 border-brand-500 bg-brand-50 p-4 sm:p-5">
        <p className="eyebrow text-brand-700">Mối liên hệ cốt lõi</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{p.core_correlation}</p>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />Chỉ số trong Playbook này · {metrics.length}</h2>
        <div className="space-y-3">
          {byStage.map((g) => (
            <div key={g.id}>
              <p className="eyebrow mb-1.5 text-muted">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((m) => (
                  <button key={m.metric_id} onClick={() => onSelectMetric(m.metric_id)} title={m.definition}
                    className="rounded-lg bg-stone-50 px-3 py-1.5 text-left transition hover:bg-brand-50">
                    <span className="block font-display text-sm font-extrabold text-ink">{m.code}</span>
                    <span className="block text-[11px] text-charcoal">{m.vi_name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />Tình huống</h2>
        <div className="rounded-2xl bg-stone-50 p-4 sm:p-5">
          <h3 className="font-display text-base font-extrabold leading-snug text-ink">{c.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-body">{c.context}</p>
          <ul className="mt-3 space-y-1.5">
            {c.breakdown.map((b) => <li key={b} className="flex gap-2 text-sm leading-relaxed text-body"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{b}</li>)}
          </ul>
          <div className="mt-4 rounded-xl bg-lemon px-4 py-3 text-navy-ink">
            <p className="eyebrow">Kết quả</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed">{c.result}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />Ngộ nhận và sai lầm</h2>
          <ul className="space-y-3">
            {p.myths_and_mistakes.map((x) => (
              <li key={x.detail} className="text-sm leading-relaxed text-body">
                <span className="mr-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-bold text-coral">{x.type}</span>{x.detail}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />Việc cần làm</h2>
          <ul className="space-y-2">
            {p.action_checklist.map((a, i) => (
              <li key={a}>
                <label className="flex cursor-pointer gap-2.5 text-sm leading-relaxed text-body">
                  <input type="checkbox" checked={!!done[i]} onChange={() => setDone((s) => ({ ...s, [i]: !s[i] }))} className="mt-1 h-4 w-4 shrink-0 accent-brand-600" />
                  <span className={done[i] ? 'text-muted line-through' : ''}>{a}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <PageFeedback key={p.playbook_id} page={p.playbook_id} title={`Playbook ${num(p)}: ${pbTitle(p)}`} shareText={p.summary} />

      <LeadForm source={p.playbook_id} title="Shop anh đang gặp đúng tình huống này?" text="Để lại tên và số Zalo, Ông chú Ecom nhắn riêng để cùng bóc số của shop." />

      <nav aria-label="Chuyển Playbook" className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4">
        {[prev, next].map((x, k) => x ? (
          <button key={x.playbook_id} onClick={() => onOpen(x.playbook_id)} className={`rounded-xl p-2 transition hover:bg-brand-50 ${k ? 'text-right' : 'text-left'}`}>
            <p className="eyebrow text-muted">{k ? 'Playbook tiếp →' : '← Playbook trước'}</p>
            <p className="mt-1 text-sm font-bold text-brand-600">{num(x)} · {pbTitle(x)}</p>
          </button>
        ) : <span key={k} />)}
      </nav>
    </article>
  )
}

// Danh sách Playbook trên thanh bên
export function PlaybookNav({ selected, onOpen }) {
  return (
    <ul className="space-y-0.5">
      {playbooks.map((p) => {
        const on = selected === p.playbook_id
        return (
          <li key={p.playbook_id}>
            <button onClick={() => onOpen(p.playbook_id)} aria-current={on ? 'page' : undefined}
              className={`relative flex w-full items-baseline gap-2 rounded-lg px-3 py-1.5 text-left transition ${on ? 'bg-brand-50 text-ink' : 'text-body hover:bg-stone-50'}`}>
              {on && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand-600" aria-hidden="true" />}
              <span className="shrink-0 font-display text-xs font-black text-brand-600">{num(p)}</span>
              <span className="min-w-0 text-[13px] leading-snug">{pbTitle(p).replace(/^Bài toán\s*/i, '').replace(/\s*\(.*\)\s*$/, '')}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
