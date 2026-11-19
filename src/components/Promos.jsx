import site from '../data/site.json'
import { SectionTitle } from './ui.jsx'

// Bìa dựng sẵn theo màu thương hiệu khi chưa có ảnh: sách dùng dải cam của sách Ecom Truyền Kỳ (ngoại lệ gradient được phép cho bìa).
function Cover({ item, i }) {
  if (item.image) return <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
  const styles = [
    { background: 'linear-gradient(160deg,#ED3830 0%,#F05025 35%,#F38714 70%,#F3DC0F 100%)', color: '#fff' },
    { background: '#0E9447', color: '#fff' },
    { background: '#FFDF38', color: '#1F2A44' },
  ]
  const st = styles[i % styles.length]
  return (
    <div className="flex h-full w-full flex-col justify-between p-4" style={st}>
      <span className="eyebrow opacity-90">{item.kind}</span>
      <span className="font-display text-2xl font-black uppercase leading-[1.05]">{item.title}</span>
    </div>
  )
}

export default function Promos() {
  const { title, items } = site.promos
  return (
    <section aria-label={title} className="space-y-4">
      <SectionTitle eyebrow="Sách & khóa học" title={title} tone="orange" />
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {items.map((it, i) => (
          <a key={it.title} href={it.url} target="_blank" rel="noopener noreferrer"
            className="group w-[68%] shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition hover:-translate-y-0.5 hover:border-coral sm:w-auto">
            <div className="aspect-[4/5] overflow-hidden"><Cover item={it} i={i} /></div>
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <span className="font-display font-extrabold leading-snug text-ink">{it.title}</span>
              <span className="shrink-0 font-bold text-coral transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
