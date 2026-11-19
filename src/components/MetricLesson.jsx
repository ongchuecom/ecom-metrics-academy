import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { stageById, BENCHMARK_LABELS, STAGES } from '../data/index.js'
import lessons from '../data/lessons.json'
import ExplainerVideo from './ExplainerVideo.jsx'
import MetricDependencyGraph from './MetricDependencyGraph.jsx'

// **đậm** → <b>
export function Rich({ text }) {
  return text.split('**').map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s))
}

function Latex({ src }) {
  const html = useMemo(() => {
    try { return katex.renderToString(src, { displayMode: true, throwOnError: false, strict: false }) } catch { return null }
  }, [src])
  if (!html) return null
  return <div className="text-ink" dangerouslySetInnerHTML={{ __html: html }} />
}

export function H2({ children, id }) {
  return (
    <h2 id={id} className="mt-10 mb-3 flex scroll-mt-20 items-center gap-2.5 text-xl font-extrabold text-brand-600 sm:text-[22px]">
      <span className="h-5 w-1 rounded-full bg-brand-500" aria-hidden="true" />{children}
    </h2>
  )
}

export default function MetricLesson({ metric, onSelect, onHomework }) {
  const stage = stageById[metric.stage]
  const stageNo = STAGES.findIndex((s) => s.id === metric.stage) + 1
  const L = lessons[metric.metric_id]
  const bench = Object.entries(metric.benchmarks || {}).filter(([, v]) => v)
  return (
    <article>
      <p className="eyebrow text-brand-600">Khâu {stageNo} · {stage?.label}</p>
      <h1 className="mt-2 font-display text-4xl font-black leading-none tracking-tight text-ink sm:text-5xl">{metric.code}</h1>
      <p className="mt-2 text-lg font-semibold text-charcoal sm:text-xl">{L?.subtitle || metric.vi_name}</p>
      {L?.subtitle && <p className="mt-1 text-sm text-muted">{metric.vi_name} · {metric.name}</p>}

      <div className="prose-lesson mt-6">
        {(L?.intro || [metric.definition]).map((p, i) => <p key={i}><Rich text={p} /></p>)}
      </div>

      <H2>Công thức</H2>
      <div className="rounded-xl border-l-4 border-brand-500 bg-brand-50 px-4 py-3">
        <Latex src={metric.formula.latex} />
        <p className="mt-1 text-[15px] font-semibold leading-relaxed text-lime-ink">{metric.formula.readable}</p>
      </div>

      {L?.breakdown && (
        <>
          <H2>{L.breakdown.title}</H2>
          <table className="w-full text-[15px]">
            <tbody>
              {L.breakdown.rows.map(([k, v]) => (
                <tr key={k} className="border-b border-dashed border-stone-200">
                  <td className="py-2 text-body">{k}</td>
                  <td className={`num py-2 text-right font-bold ${v.startsWith('−') ? 'text-coral' : 'text-ink'}`}>{v}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 font-display font-extrabold text-ink">{L.breakdown.total[0]}</td>
                <td className="num py-2.5 text-right text-lg font-black"><span className="marker">{L.breakdown.total[1]}</span></td>
              </tr>
            </tbody>
          </table>
          {L.breakdown.after && <div className="prose-lesson mt-4"><p><Rich text={L.breakdown.after} /></p></div>}
        </>
      )}

      {L?.sections?.map((s) => (
        <section key={s.title}>
          <H2>{s.title}</H2>
          <div className="prose-lesson">{s.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
        </section>
      ))}

      {L?.mistakes && (
        <>
          <H2>Hay hiểu sai</H2>
          <ul className="space-y-2">
            {L.mistakes.map((m) => <li key={m} className="flex gap-2.5 text-[16px] leading-relaxed text-body"><span className="font-black text-brand-600">×</span><span>{m}</span></li>)}
          </ul>
        </>
      )}

      {L?.quote && (
        <blockquote className="mt-8 border-l-4 border-brand-500 pl-4">
          <p className="text-[17px] font-semibold italic leading-relaxed text-ink">“{L.quote.text}”</p>
          <footer className="mt-1 text-sm text-muted">{L.quote.source}</footer>
        </blockquote>
      )}

      {L?.remember && (
        <div className="mt-8 rounded-2xl bg-lemon px-5 py-4 text-navy-ink">
          <p className="eyebrow">Nhớ một câu</p>
          <p className="mt-1 font-display text-lg font-extrabold leading-snug">{L.remember}</p>
        </div>
      )}

      <H2>Số tham khảo</H2>
      {bench.length ? (
        <dl className="divide-y divide-dashed divide-stone-200 text-[15px]">
          {bench.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-3 py-2">
              <dt className="text-body">{BENCHMARK_LABELS[k] || k}</dt><dd className="num font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      ) : <p className="text-[15px] text-charcoal">Chưa có số tham khảo đáng tin. So với chính số liệu các tháng trước của shop mình.</p>}
      <p className="mt-1 text-xs text-muted">Chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.</p>

      <H2 id="video">Xem nhanh bằng video</H2>
      <ExplainerVideo key={metric.metric_id} metric={metric} onHomework={onHomework} />

      <div className="mt-10"><MetricDependencyGraph metric={metric} onSelect={onSelect} /></div>
    </article>
  )
}
