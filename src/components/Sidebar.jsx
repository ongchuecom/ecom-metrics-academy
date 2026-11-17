import { METRICS } from '../data/metrics.js'

export default function Sidebar({ selected, onSelect }) {
  return (
    <nav aria-label="Danh sách chỉ số" className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible lg:p-4">
      <p className="hidden px-2 pb-1 text-xs font-semibold uppercase tracking-widest text-stone-500 lg:block">Chỉ số</p>
      {METRICS.map((m) => {
        const active = m.id === selected
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded-xl px-3 py-2 text-left transition lg:w-full ${
              active ? 'bg-brand-600 text-white shadow' : 'bg-white text-stone-700 hover:bg-brand-50 lg:bg-transparent'
            }`}
          >
            <span className="block font-bold">{m.code}</span>
            <span className={`block text-xs ${active ? 'text-brand-100' : 'text-stone-500'}`}>{m.name}</span>
          </button>
        )
      })}
    </nav>
  )
}
