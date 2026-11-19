import site from '../data/site.json'
import { SectionTitle } from './ui.jsx'

// Bìa dựng sẵn theo màu thương hiệu khi chưa có ảnh: sách dùng dải cam của sách Ecom Truyền Kỳ (ngoại lệ gradient được phép cho bìa).
function Cover({ item, i }) {
  if (item.image) return <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
  const styles = [
    { background: 'linear-gradient(160deg,#ED3830 0%,#F05025 35%,#F38714 70%,#F3DC0F 100%)', color: '#fff' },
    { background: '#FFF7ED', color: '#ED3420' },
    { background: '#FFF7ED', color: '#ED3420' },
  ]
  const st = styles[i % styles.length]
  return (
    <div className="flex h-full w-full flex-col justify-between p-4" style={st}>
      <span className="eyebrow opacity-90">{item.kind}</span>
      <span className="font-display text-2xl font-black uppercase leading-[1.05]">{item.title}</span>
    </div>
  )
}

// Trang chủ: thẻ sản phẩm có mô tả và nút đăng ký
export function ProductCards() {
  const { items } = site.promos
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <article key={it.title} className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          {it.image ? (
            <>
              <div className="aspect-[16/9] overflow-hidden"><img src={it.image} alt={it.title} loading="lazy" className="h-full w-full object-cover" /></div>
              <div className="px-4 pt-4">
                <p className="eyebrow text-brand-600">{it.kind}</p>
                <h3 className="mt-1 font-display text-lg font-extrabold leading-snug text-ink">{it.title}</h3>
              </div>
            </>
          ) : (
            // chưa có ảnh: dải màu gọn mang tên sản phẩm, không lặp lại tên bên dưới
            <div className={`px-4 py-4 ${i === 0 ? 'book-band text-white' : 'bg-brand-50 text-brand-700'}`}>
              <p className={`eyebrow ${i === 0 ? 'text-white/85' : ''}`}>{it.kind}</p>
              <h3 className={`mt-1 font-display text-xl font-black uppercase leading-tight ${i === 0 ? "text-white" : "text-ink"}`}>{it.title}</h3>
            </div>
          )}
          <div className="flex flex-1 flex-col p-4 pt-3">
            {it.desc && <p className="flex-1 text-sm leading-relaxed text-charcoal">{it.desc}</p>}
            <a href={it.url} target="_blank" rel="noopener noreferrer"
              className="mt-4 self-start rounded-full bg-brand-600 px-4 py-2 font-display text-sm font-bold text-white hover:bg-brand-700">
              {it.cta || 'Xem chi tiết'} →
            </a>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function Promos({ compact = false }) {
  const { title, items } = site.promos
  // Trang bài học, Playbook: một dòng chữ gọn thay cho 3 bìa lớn
  if (compact) return (
    <p className="border-t border-stone-100 pt-4 text-sm text-charcoal">
      <span className="text-muted">Học sâu hơn cùng Ông chú Ecom: </span>
      {items.map((it, i) => (
        <span key={it.title}>{i > 0 && <span className="text-muted"> · </span>}<a href={it.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{it.title}</a></span>
      ))}
    </p>
  )
  return (
    <section aria-label={title} className="space-y-4">
      <SectionTitle eyebrow="Sách & khóa học" title={title} tone="orange" />
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {items.map((it, i) => (
          <a key={it.title} href={it.url} target="_blank" rel="noopener noreferrer"
            className="group w-[68%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/70 transition hover:ring-brand-500 sm:w-auto">
            <div className="aspect-[4/3] overflow-hidden sm:aspect-[16/9]"><Cover item={it} i={i} /></div>
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <span className="font-display font-extrabold leading-snug text-ink">{it.title}</span>
              <span className="shrink-0 font-bold text-brand-600 transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
