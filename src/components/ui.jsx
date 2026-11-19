// Các thành phần giao diện dùng chung, theo bộ nhận diện A1demy.

export function Card({ children, className = '', highlight = false }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 transition sm:p-5 ${highlight ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-stone-200/80'} ${className}`}>
      {children}
    </div>
  )
}

// Tiêu đề khu vực: thanh màu mảnh mép trái + nhãn chữ hoa nhỏ + tít Montserrat
// Tiêu đề khu vực: cùng kiểu với tiêu đề trong bài (thanh cam mảnh + chữ cam đỏ)
export function SectionTitle({ eyebrow, title, desc, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
        <h2 className="mt-1 flex items-center gap-2.5 text-xl font-extrabold leading-tight text-brand-600 sm:text-[22px]">
          <span className="h-5 w-1 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{title}
        </h2>
        {desc && <p className="mt-1.5 text-sm text-charcoal">{desc}</p>}
      </div>
      {right}
    </div>
  )
}

export function Slider({ label, hint, value, min, max, step, onChange, format }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-body">{label}</span>
        <span className="num shrink-0 text-sm font-extrabold text-brand-700">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full" />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </label>
  )
}

export function NumberField({ label, value, onChange, suffix, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-body">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-stone-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <input type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
          className="num w-full min-w-0 rounded-xl bg-transparent px-3 py-2.5 text-right font-semibold outline-none" />
        {suffix && <span className="pr-3 text-sm text-muted">{suffix}</span>}
      </div>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </label>
  )
}

const LEVEL_STYLE = {
  nang: { box: 'border-red-200 bg-red-50', badge: 'bg-red-500 text-white', text: 'Nặng' },
  'canh-bao': { box: 'border-orange-200 bg-peach', badge: 'bg-accent-500 text-white', text: 'Cảnh báo' },
  tot: { box: 'border-brand-100 bg-brand-50', badge: 'bg-brand-600 text-white', text: 'Tốt' },
}

export function LevelBadge({ level }) {
  const s = LEVEL_STYLE[level]
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.badge}`}>{s.text}</span>
}

export const levelBox = (level) => LEVEL_STYLE[level].box
