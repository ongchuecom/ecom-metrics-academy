// Các thành phần giao diện dùng chung.

export function Card({ children, className = '', highlight = false }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        highlight ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-stone-200'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function Slider({ label, hint, value, min, max, step, onChange, format }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <span className="font-mono text-sm font-semibold text-brand-700 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </label>
  )
}

export function NumberField({ label, value, onChange, suffix, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
          className="w-full rounded-lg bg-transparent px-3 py-2 text-right font-mono tabular-nums outline-none"
        />
        {suffix && <span className="pr-3 text-sm text-stone-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </label>
  )
}

const LEVEL_STYLE = {
  nang: { box: 'border-red-200 bg-red-50', badge: 'bg-red-600 text-white', text: 'Nặng' },
  'canh-bao': { box: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500 text-white', text: 'Cảnh báo' },
  tot: { box: 'border-brand-100 bg-brand-50', badge: 'bg-brand-600 text-white', text: 'Tốt' },
}

export function LevelBadge({ level }) {
  const s = LEVEL_STYLE[level]
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.badge}`}>{s.text}</span>
}

export const levelBox = (level) => LEVEL_STYLE[level].box
