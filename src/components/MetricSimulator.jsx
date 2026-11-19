import { useMemo, useState } from 'react'
import { evaluateOutputs, isWarning, formatUnit } from '../lib/formula.js'
import { Card, Slider } from './ui.jsx'
import { metricsMaster } from '../data/index.js'

const defaultsOf = (sim) => Object.fromEntries(sim.controls.map((c) => [c.key, c.default]))

export function MissingNotice({ what, field, onSelect }) {
  const list = metricsMaster.filter((m) => m[field])
  return (
    <Card>
      <p className="text-sm text-charcoal">Chỉ số này chưa có {what}. Chọn một chỉ số đã có:</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {list.map((m) => (
          <button key={m.metric_id} onClick={() => onSelect(m.metric_id)} className="rounded-full bg-brand-100 px-3 py-1.5 font-display text-sm font-bold text-brand-800 hover:bg-lime">
            {m.code}
          </button>
        ))}
      </div>
    </Card>
  )
}

export default function MetricSimulator({ metric, onSelect }) {
  const sim = metric.simulator
  const [vals, setVals] = useState(() => (sim ? defaultsOf(sim) : {}))
  const res = useMemo(() => (sim ? evaluateOutputs(sim.outputs, vals) : {}), [sim, vals])
  if (!sim) return <MissingNotice what="bộ giả lập" field="simulator" onSelect={onSelect} />

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-extrabold leading-snug">{sim.title}</h3>
          <button onClick={() => setVals(defaultsOf(sim))} className="shrink-0 text-sm text-brand-700 hover:underline">Đặt lại</button>
        </div>
        {sim.controls.map((c) => (
          <Slider key={c.key} label={c.label} value={vals[c.key]} min={c.min} max={c.max} step={c.step}
            format={(v) => formatUnit(v, c.unit)} onChange={(v) => setVals((s) => ({ ...s, [c.key]: v }))} />
        ))}
      </Card>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {sim.outputs.map((o) => {
            const v = res[o.key]
            const warn = isWarning(v, o.warning_threshold)
            return (
              <div key={o.key} aria-live="polite"
                className={`rounded-2xl p-4 transition ${warn ? 'bg-red-50' : 'bg-stone-50'}`}>
                <p className="eyebrow text-charcoal">{o.label}</p>
                <p className={`num mt-1 text-3xl font-black ${warn ? 'text-coral' : 'text-ink'}`}>{formatUnit(v, o.unit)}</p>
                {o.warning_threshold && (
                  <p className={`mt-1 text-xs ${warn ? 'font-bold text-coral' : 'text-muted'}`}>
                    {warn ? 'Vượt ngưỡng cảnh báo ' : 'Ngưỡng cảnh báo: '}{o.warning_threshold}{o.unit && o.unit !== '%' ? ` ${o.unit}` : ''}
                  </p>
                )}
                <p className="mt-2 break-words font-mono text-[11px] text-muted">= {o.formula_eval}</p>
              </div>
            )
          })}
        </div>
        <div className="px-1 text-sm leading-relaxed text-charcoal">
          <span className="font-display font-extrabold text-ink">Thử ngay: </span>
          kéo từng thanh một và để ý ô nào chuyển đỏ trước. Chỉ số nào làm ô đỏ nhanh nhất chính là đòn bẩy nhạy nhất của bạn.
        </div>
      </div>
    </div>
  )
}
