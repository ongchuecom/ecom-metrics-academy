import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { stageById, BENCHMARK_LABELS, STAGES, topicById, TYPES } from '../data/index.js'
import ExplainerVideo from './ExplainerVideo.jsx'
import MetricDependencyGraph from './MetricDependencyGraph.jsx'
import { FormulaTree, Chart } from './LessonVisuals.jsx'
import { PlaybookLinks } from './Playbooks.jsx'

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
function Box({ title, children, className = '', id }) {
  return (
    <section id={id} className={`scroll-mt-20 rounded-2xl bg-stone-50 p-4 sm:p-5 ${className}`}>
      {title && <h3 className="mb-2.5 flex items-center gap-2 text-[15px] font-extrabold text-brand-600"><span className="h-3.5 w-1 rounded-full bg-brand-500" aria-hidden="true" />{title}</h3>}
      {children}
    </section>
  )
}

export default function MetricLesson({ metric, onSelect, onHomework, onOpenPlaybook }) {
  const stage = stageById[metric.stage]
  const stageNo = STAGES.findIndex((s) => s.id === metric.stage) + 1
  const topic = topicById[metric.topic]
  const L = metric.lesson
  const isMetric = metric.type === 'metric' || !metric.type
  const bench = Object.entries(metric.benchmarks || {}).filter(([, v]) => v)
  const [first, ...rest] = L?.sections || []
  return (
    <article className="space-y-4">
      <header className="pb-2">
        <p className="eyebrow text-brand-600">{stageNo}. {stage?.label}{topic ? ` · ${topic.label}` : ''}{!isMetric && TYPES[metric.type] ? ` · ${TYPES[metric.type].label}` : ''}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">{metric.code}</h1>
          <span className="text-sm text-muted">{metric.vi_name}</span>
          {metric.review === 'draft' && <span className="rounded-full bg-lemon px-2 py-0.5 text-[11px] font-bold text-navy-ink" title="Bài sinh thêm từ bài viết, Ông chú Ecom chưa duyệt">Mới · đang duyệt</span>}
        </div>
        {L?.subtitle && <p className="mt-1 text-base font-semibold text-charcoal">{L.subtitle}</p>}
        {metric.basis?.type === 'custom' && (
          <p className="mt-2 max-w-3xl rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-charcoal"><b className="text-ink">{isMetric ? 'Chỉ số tự xây.' : 'Khái niệm tự xây.'}</b> {metric.basis.note}</p>
        )}
        <div className="prose-lesson mt-3 max-w-3xl">
          {(L?.intro || [metric.definition]).map((p, i) => <p key={i}><Rich text={p} /></p>)}
        </div>
      </header>

      <PlaybookLinks metric={metric} onOpen={onOpenPlaybook} />

      {metric.formula?.readable && <Box id="cong-thuc" title="Công thức">
        {metric.formula.latex ? (
          <>
            <div className="rounded-xl bg-brand-50 px-3 py-2"><Latex src={metric.formula.latex} /></div>
            <p className="mt-2 text-sm leading-relaxed text-lime-ink">{metric.formula.readable}</p>
          </>
        ) : (
          <p className="rounded-xl bg-brand-50 px-4 py-3 text-[15px] font-semibold leading-relaxed text-lime-ink">{metric.code} = {metric.formula.readable}</p>
        )}
        {L?.tree && <div className="mt-5 border-t border-stone-100 pt-4"><FormulaTree tree={L.tree} onSelect={onSelect} /></div>}
      </Box>}
      {!metric.formula?.readable && L?.tree && <Box id="cong-thuc" title="Cấu trúc"><FormulaTree tree={L.tree} onSelect={onSelect} /></Box>}

      {(L?.breakdown || first) && (
        <div className="grid gap-4 md:grid-cols-2">
          {L?.breakdown && (
            <Box id="vi-du" title={L.breakdown.title}>
              <Chart c={L.breakdown.chart} />
              {L.breakdown.after && <p className="mt-3 text-sm leading-relaxed text-body"><Rich text={L.breakdown.after} /></p>}
            </Box>
          )}
          {first && (
            <Box id="nguong" title={first.title}>
              <Chart c={first.chart} />
              <div className="prose-lesson mt-2">{first.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
            </Box>
          )}
        </div>
      )}

      {rest.map((s) => (
        <Box key={s.title} title={s.title}>
          {s.chart && <div className="mb-3"><Chart c={s.chart} /></div>}
          <div className="prose-lesson">{s.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
        </Box>
      ))}

      {L?.mistakes && (
        <Box id="hay-hieu-sai" title="Hay hiểu sai">
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

      {bench.length > 0 && (
        <div className="text-sm">
          <p className="eyebrow text-muted">Số tham khảo</p>
          <dl className="mt-1 grid gap-x-8 sm:grid-cols-2">
            {bench.map(([k, v]) => <div key={k} className="flex flex-wrap justify-between gap-x-3 border-b border-dashed border-stone-200 py-1.5"><dt className="text-body">{BENCHMARK_LABELS[k] || k}</dt><dd className="num font-bold text-ink">{v}</dd></div>)}
          </dl>
          <p className="mt-1.5 text-xs text-muted">Chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.</p>
        </div>
      )}

      {metric.sources?.length > 0 && (
        <p className="text-xs leading-relaxed text-muted">
          {metric.basis?.type === 'standard' && <>{metric.basis.note} </>}Nguồn: {metric.sources.map((x, i) => (
            <span key={i}>{i > 0 && ' · '}{x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-700">{x.title}</a> : x.title}{x.author && ` (${x.author})`}</span>
          ))}
        </p>
      )}

      <section id="video" className="scroll-mt-20 pt-4">
        <H2>Xem nhanh 1 phút</H2>
        <div className="max-w-3xl"><ExplainerVideo key={metric.metric_id} metric={metric} onHomework={onHomework} /></div>
      </section>

      <div id="so-do" className="scroll-mt-20 pt-4"><MetricDependencyGraph metric={metric} onSelect={onSelect} /></div>
    </article>
  )
}
