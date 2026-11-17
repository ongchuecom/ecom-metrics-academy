import { useState } from 'react'
import { Card } from './ui.jsx'

export default function MetricLesson({ metric }) {
  const [open, setOpen] = useState(true)
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">{metric.en}</p>
          <h2 className="text-2xl font-extrabold text-stone-900">
            {metric.code} <span className="font-semibold text-stone-500">· {metric.name}</span>
          </h2>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-sm font-medium text-brand-700 hover:underline">
          {open ? 'Thu gọn' : 'Xem bài học'}
        </button>
      </div>
      <p className="mt-3 inline-block rounded-lg bg-stone-900 px-3 py-2 font-mono text-sm text-brand-100">{metric.formula}</p>
      {open && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-sm leading-relaxed">
            <p><span className="font-semibold">Vì sao quan trọng: </span>{metric.why}</p>
            <p><span className="font-semibold">Ví dụ: </span>{metric.example}</p>
            <p className="text-stone-600"><span className="font-semibold text-stone-800">Ngưỡng tham khảo: </span>{metric.benchmark}</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-sm">
            <p className="font-semibold text-brand-800">Đòn bẩy cải thiện</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-stone-700">
              {metric.levers.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        </div>
      )}
    </Card>
  )
}
