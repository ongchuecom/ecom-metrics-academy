import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { stageById, BENCHMARK_LABELS, STAGES } from '../data/index.js'
import lessons from '../data/lessons.json'
import ExplainerVideo from './ExplainerVideo.jsx'
import MetricDependencyGraph from './MetricDependencyGraph.jsx'
import { FormulaTree, SpendBars, RoasCurve } from './LessonVisuals.jsx'

// **đậm** → <b>
export function Rich({ text }) {
  return text.split('**').map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s))
}

function Latex({ src }) {
  const html = useMemo(() => {
    try { return katex.renderToString(src, { displayMode: true, throwOnError: false, strict: false }) } catch { return null }
  }, [src])
  if (!html) return null
  return <div className="text-[13px] text-ink sm:text-sm" dangerouslySetInnerHTML={{ __html: html }} />
}

// Tiêu đề khu vực lớn (dùng ngoài bài đọc)
export function H2({ children, id }) {
  return (
    <h2 id={id} className="mb-3 flex scroll-mt-20 items-center gap-2 text-lg font-extrabold text-brand-600">
      <span className="h-4 w-1 rounded-full bg-brand-500" aria-hidden="true" />{children}
    </h2>
  )
}

// Thẻ nội dung trong bài
function Box({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-4 ring-1 ring-stone-200/70 sm:p-5 ${className}`}>
      {title && <h3 className="mb-2.5 flex items-center gap-2 text-[15px] font-extrabold text-brand-600"><span className="h-3.5 w-1 rounded-full bg-brand-500" aria-hidden="true" />{title}</h3>}
      {children}
    </section>
  )
}

export default function MetricLesson({ metric, onSelect, onHomework }) {
  const stage = stageById[metric.stage]
  const stageNo = STAGES.findIndex((s) => s.id === metric.stage) + 1
  const L = lessons[metric.metric_id]
  const bench = Object.entries(metric.benchmarks || {}).filter(([, v]) => v)
  const V = L?.visuals
  const [first, ...rest] = L?.sections || []
  return (
    <article className="space-y-4">
      <header className="pb-2">
        <p className="eyebrow text-brand-600">Khâu {stageNo} · {stage?.label}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">{metric.code}</h1>
          <span className="text-sm text-muted">{metric.vi_name} · {metric.name}</span>
        </div>
        {L?.subtitle && <p className="mt-1 text-base font-semibold text-charcoal">{L.subtitle}</p>}
        <div className="prose-lesson mt-3 max-w-3xl">
          {(L?.intro || [metric.definition]).map((p, i) => <p key={i}><Rich text={p} /></p>)}
        </div>
      </header>

      <Box title="Công thức">
        <div className="rounded-xl bg-brand-50 px-3 py-2"><Latex src={metric.formula.latex} /></div>
        <p className="mt-2 text-sm leading-relaxed text-lime-ink">{metric.formula.readable}</p>
        {V?.tree && <div className="mt-5 border-t border-stone-100 pt-4"><FormulaTree tree={V.tree} onSelect={onSelect} /></div>}
      </Box>

      {(L?.breakdown || first) && (
        <div className="grid gap-4 md:grid-cols-2">
          {L?.breakdown && (
            <Box title={L.breakdown.title}>
              {V?.bars ? <SpendBars bars={{ ...V.bars, title: '' }} /> : (
                <table className="w-full text-sm"><tbody>
                  {L.breakdown.rows.map(([k, v]) => (
                    <tr key={k} className="border-b border-dashed border-stone-200">
                      <td className="py-1.5 text-body">{k}</td>
                      <td className={`num py-1.5 text-right font-bold ${v.startsWith('−') ? 'text-coral' : 'text-ink'}`}>{v}</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
              {L.breakdown.after && <p className="mt-3 text-sm leading-relaxed text-body"><Rich text={L.breakdown.after} /></p>}
            </Box>
          )}
          {first && (
            <Box title={first.title}>
              {V?.curve && <RoasCurve c={{ ...V.curve, title: '' }} />}
              <div className="prose-lesson mt-2">{first.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
            </Box>
          )}
        </div>
      )}

      {rest.map((s) => (
        <Box key={s.title} title={s.title}>
          <div className="prose-lesson">{s.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
        </Box>
      ))}

      {L?.mistakes && (
        <Box title="Hay hiểu sai">
          <ul className="space-y-1.5">
            {L.mistakes.map((m) => <li key={m} className="flex gap-2 text-sm leading-relaxed text-body"><span className="font-black text-brand-600">×</span><span>{m}</span></li>)}
          </ul>
        </Box>
      )}

      {(L?.remember || L?.quote) && (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {L?.remember && (
            <div className="rounded-2xl bg-lemon p-4 text-navy-ink sm:p-5">
              <p className="eyebrow">Nhớ một câu</p>
              <p className="mt-1 font-display text-base font-extrabold leading-snug">{L.remember}</p>
            </div>
          )}
          {L?.quote && (
            <blockquote className="border-l-2 border-brand-500 py-1 pl-4">
              <p className="text-sm italic leading-relaxed text-ink">“{L.quote.text}”</p>
              <footer className="mt-1.5 text-xs text-muted">{L.quote.source}</footer>
            </blockquote>
          )}
        </div>
      )}

      <div className="text-sm">
        <p className="eyebrow text-muted">Số tham khảo</p>
        {bench.length ? (
          <dl className="mt-1 grid gap-x-8 sm:grid-cols-2">
            {bench.map(([k, v]) => <div key={k} className="flex flex-wrap justify-between gap-x-3 border-b border-dashed border-stone-200 py-1.5"><dt className="text-body">{BENCHMARK_LABELS[k] || k}</dt><dd className="num font-bold text-ink">{v}</dd></div>)}
          </dl>
        ) : <p className="mt-1 text-charcoal">Chưa có số tham khảo đáng tin. So với chính số liệu các tháng trước của shop mình.</p>}
        <p className="mt-1.5 text-xs text-muted">Chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.</p>
      </div>

      <div className="pt-6">
        <H2 id="video">Xem nhanh bằng video</H2>
        <ExplainerVideo key={metric.metric_id} metric={metric} onHomework={onHomework} />
      </div>

      <div className="pt-6"><MetricDependencyGraph metric={metric} onSelect={onSelect} /></div>
    </article>
  )
}
