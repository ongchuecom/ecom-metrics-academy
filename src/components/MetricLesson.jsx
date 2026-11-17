import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { stageById, BENCHMARK_LABELS, STAGES } from '../data/index.js'
import { SectionTitle } from './ui.jsx'
import ExplainerVideo from './ExplainerVideo.jsx'
import MetricDependencyGraph from './MetricDependencyGraph.jsx'

function Latex({ src }) {
  const html = useMemo(() => {
    try { return katex.renderToString(src, { displayMode: true, throwOnError: false, strict: false }) } catch { return null }
  }, [src])
  if (!html) return null
  return <div className="text-ink" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function MetricLesson({ metric, onSelect, onHomework }) {
  const stage = stageById[metric.stage]
  const stageNo = STAGES.findIndex((s) => s.id === metric.stage) + 1
  const bench = Object.entries(metric.benchmarks || {}).filter(([, v]) => v)
  return (
    <div className="space-y-8">
      {/* Hero: nền vàng chanh, chữ xanh than, tên tiếng Việt trên mảng trắng chữ cam đỏ */}
      <header className="rounded-3xl bg-lemon px-5 py-6 text-navy-ink sm:px-8 sm:py-8">
        <p className="eyebrow">Bài học · Khâu {stageNo} · {stage?.label}</p>
        <h1 className="mt-2 font-display text-5xl font-black leading-[0.95] tracking-tight text-navy-ink sm:text-7xl">{metric.code}</h1>
        <p className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
          <span className="rounded-lg bg-white px-2 py-0.5 text-coral [box-decoration-break:clone]">{metric.vi_name}</span>
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed sm:text-lg">{metric.definition}</p>
        <p className="mt-3 text-sm font-semibold opacity-70">{metric.name} · {metric.sub_group}</p>
      </header>

      <ExplainerVideo key={metric.metric_id} metric={metric} onHomework={onHomework} />

      <section className="space-y-4">
        <SectionTitle eyebrow="Công thức" title={`Tính ${metric.code} thế nào?`} />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5">
            <Latex src={metric.formula.latex} />
            <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-medium leading-relaxed text-lime-ink sm:text-base">{metric.formula.readable}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/80 sm:p-5">
            <p className="eyebrow text-charcoal">Số tham khảo</p>
            {bench.length ? (
              <dl className="mt-2 divide-y divide-stone-100">
                {bench.map(([k, v]) => (
                  <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
                    <dt className="text-sm text-charcoal">{BENCHMARK_LABELS[k] || k}</dt>
                    <dd className="num font-extrabold text-ink"><span className="marker">{v}</span></dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-charcoal">Chưa có số tham khảo đáng tin cho chỉ số này. Mình khuyên anh em so với chính số liệu các tháng trước của shop.</p>
            )}
            <p className="mt-2 text-xs text-muted">Chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.</p>
          </div>
        </div>
      </section>

      <MetricDependencyGraph metric={metric} onSelect={onSelect} />
    </div>
  )
}
