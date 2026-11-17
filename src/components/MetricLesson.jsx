import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { stageById, BENCHMARK_LABELS, STAGES } from '../data/index.js'
import { Card } from './ui.jsx'
import MetricDependencyGraph from './MetricDependencyGraph.jsx'

function Latex({ src }) {
  const html = useMemo(() => {
    try { return katex.renderToString(src, { displayMode: true, throwOnError: false, strict: false }) } catch { return null }
  }, [src])
  if (!html) return null
  return <div className="text-stone-900" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function MetricLesson({ metric, onSelect }) {
  const stage = stageById[metric.stage]
  const stageNo = STAGES.findIndex((s) => s.id === metric.stage) + 1
  const bench = Object.entries(metric.benchmarks || {}).filter(([, v]) => v)
  return (
    <Card className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 font-semibold text-accent-600">Khâu {stageNo} · {stage?.label}</span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">{metric.sub_group}</span>
        </div>
        <h2 className="mt-2 text-2xl font-extrabold text-stone-900 sm:text-3xl">
          {metric.code} <span className="text-lg font-semibold text-stone-500 sm:text-xl">· {metric.vi_name}</span>
        </h2>
        <p className="text-sm text-stone-500">{metric.name}</p>
        <p className="mt-2 max-w-3xl leading-relaxed text-stone-700">{metric.definition}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Công thức</p>
          <div className="mt-1"><Latex src={metric.formula.latex} /></div>
          <p className="mt-2 rounded-lg bg-stone-900 px-3 py-2 font-mono text-xs leading-relaxed text-brand-100 sm:text-sm">{metric.formula.readable}</p>
        </div>
        <div className="rounded-xl bg-brand-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-800">Số tham khảo</p>
          {bench.length ? (
            <dl className="mt-2 space-y-1.5 text-sm">
              {bench.map(([k, v]) => (
                <div key={k} className="flex flex-wrap justify-between gap-x-3">
                  <dt className="text-stone-600">{BENCHMARK_LABELS[k] || k}</dt>
                  <dd className="font-mono font-semibold text-stone-900">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-stone-600">Chưa có số tham khảo đáng tin cho chỉ số này. Hãy so với chính số liệu các tháng trước của shop.</p>
          )}
          <p className="mt-2 text-[11px] text-stone-500">Chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.</p>
        </div>
      </div>

      <MetricDependencyGraph metric={metric} onSelect={onSelect} />
    </Card>
  )
}
