import site from '../data/site.json'
import { SectionTitle } from './ui.jsx'

const TYPE = {
  video: { label: 'Video', cls: 'bg-brand-50 text-brand-700' },
  pdf: { label: 'PDF', cls: 'bg-stone-100 text-body' },
  sheet: { label: 'Sheet', cls: 'bg-stone-100 text-body' },
  doc: { label: 'Doc', cls: 'bg-stone-100 text-body' },
  slide: { label: 'Slide', cls: 'bg-stone-100 text-body' },
  folder: { label: 'Thư mục', cls: 'bg-stone-100 text-body' },
  link: { label: 'Link', cls: 'bg-stone-100 text-body' },
}

// Tài liệu gắn với chỉ số đang học (theo metric_ids hoặc media của chỉ số) xếp trước, tài liệu chung xếp sau.
export default function Resources({ metric }) {
  const own = []
  if (metric.media?.video_url) own.push({ title: metric.media.video_title || `Video bài giảng ${metric.code}`, type: 'video', url: metric.media.video_url })
  for (const r of metric.media?.files || []) own.push(r)
  const related = site.resources.filter((r) => r.metric_ids?.includes(metric.metric_id))
  const general = site.resources.filter((r) => !r.metric_ids?.length)
  const list = [...own, ...related, ...general]
  const folder = site.drive_folder

  return (
    <section id="tai-lieu" className="scroll-mt-20 space-y-4">
      <SectionTitle eyebrow="Tài liệu" title="File, video, bảng tính đi kèm" desc="Lưu trên Google Drive, mở được trên điện thoại." />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
        <ul className="divide-y divide-stone-100">
          {list.map((r) => {
            const t = TYPE[r.type] || TYPE.link
            return (
              <li key={r.url + r.title}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50">
                  <span className={`w-16 shrink-0 rounded-md py-1 text-center text-[11px] font-bold ${t.cls}`}>{t.label}</span>
                  <span className="min-w-0 flex-1 font-medium text-ink">{r.title}</span>
                  <span className="shrink-0 text-brand-700" aria-hidden="true">↗</span>
                </a>
              </li>
            )
          })}
          {!own.length && !related.length && (
            <li className="px-4 py-3 text-sm text-muted">Video và tài liệu riêng cho {metric.code} đang được biên soạn.</li>
          )}
        </ul>
        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-stone-50 p-4">
          <div>
            <p className="eyebrow text-muted">Google Drive</p>
            <p className="mt-1 font-display text-base font-extrabold leading-snug text-ink">{folder.title}</p>
            <p className="mt-1 text-sm text-charcoal">Toàn bộ video, slide, bảng tính của khóa ở một chỗ.</p>
          </div>
          {folder.url ? (
            <a href={folder.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-brand-700 px-4 py-2.5 text-center font-display font-bold text-white hover:bg-brand-800">Mở thư mục Drive</a>
          ) : (
            <span className="rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-muted">Đang cập nhật</span>
          )}
        </div>
      </div>
    </section>
  )
}
