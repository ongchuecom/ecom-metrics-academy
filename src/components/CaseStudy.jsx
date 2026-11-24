import { useMemo, useState } from 'react'
import cases from '../data/cases.json'
import { metricById } from '../data/index.js'
import { SectionTitle } from './ui.jsx'

const BASE = import.meta.env.BASE_URL || './'
const nf = (x, d = 2) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(x)

// Ô "tự soi": tính ROAS hòa vốn thật từ số của shop mình
function SelfCheck({ cfg }) {
  const [v, setV] = useState(cfg.defaults)
  const fixedPct = v.revenue > 0 ? (v.fixed / v.revenue) * 100 : 0
  const varPct = v.cogs + v.fees + v.returns
  const beVar = varPct < 100 ? 100 / (100 - varPct) : Infinity
  const beTrue = varPct + fixedPct < 100 ? 100 / (100 - varPct - fixedPct) : Infinity
  const left = 100 - varPct - fixedPct - (v.roas > 0 ? 100 / v.roas : 0)
  const F = [
    ['cogs', 'Giá vốn', '% doanh thu'], ['fees', 'Phí sàn + thanh toán', '% doanh thu'], ['returns', 'Thiệt hại hoàn hàng', '% doanh thu'],
    ['fixed', 'Chi phí cố định (lương, kho…)', 'triệu/tháng'], ['revenue', 'Doanh thu', 'triệu/tháng'], ['roas', 'ROAS hiện tại', 'x'],
  ]
  const ok = Number.isFinite(beTrue) && v.roas >= beTrue
  return (
    <div className="rounded-2xl bg-stone-50 p-4 text-ink sm:p-5">
      <p className="text-sm font-bold text-brand-600">{cfg.title}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {F.map(([k, label, unit]) => (
          <label key={k} className="block rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200">
            <span className="text-xs font-semibold text-charcoal">{label}</span>
            <div className="flex items-baseline gap-1">
              <input type="number" inputMode="decimal" step="any" value={v[k]} aria-label={label}
                onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                className="num w-full min-w-0 bg-transparent py-0.5 text-base font-bold text-ink outline-none" />
              <span className="shrink-0 text-xs text-muted">{unit}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-charcoal">Hòa vốn chưa tính cố định</p>
          <p className="num text-xl font-bold">{Number.isFinite(beVar) ? nf(beVar) : 'không thể'}</p>
        </div>
        <div className="rounded-xl bg-lemon px-3 py-2 text-navy-ink">
          <p className="text-xs font-semibold text-charcoal">ROAS hòa vốn thật</p>
          <p className="num text-2xl font-bold">{Number.isFinite(beTrue) ? nf(beTrue) : 'không thể'}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-charcoal">Còn lại mỗi 100 nghìn doanh thu</p>
          <p className={`num text-xl font-bold ${left >= 0 ? 'text-ok' : 'text-coral'}`}>{nf(left)} nghìn</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold">
        {!Number.isFinite(beTrue) ? 'Chi phí đã vượt 100% doanh thu: không ROAS nào cứu được, phải sửa giá vốn hoặc chi phí trước.'
          : ok ? `ROAS ${nf(v.roas)} đang trên vạch ${nf(beTrue)}: cách bờ vực ${nf(v.roas - beTrue)}.`
          : `ROAS ${nf(v.roas)} đang dưới vạch ${nf(beTrue)}: chạy thêm là lỗ thêm.`}
      </p>
    </div>
  )
}

export default function CaseStudy({ metric, onSelect }) {
  const c = cases[metric.metric_id]
  const [play, setPlay] = useState(false)
  const others = useMemo(() => Object.keys(cases).filter((k) => !k.startsWith('_') && k !== metric.metric_id && metricById[k]), [metric.metric_id])
  if (!c) return null
  const pb = c.playbook
  return (
    <section id="tinh-huong" className="scroll-mt-20 space-y-5">
      <SectionTitle eyebrow="Tình huống thực tế" title={c.title} tone="orange" desc={`Video ${c.duration} · ${c.note}`} />

      <div className="overflow-hidden rounded-2xl bg-ink">
        <div className="relative aspect-video">
          {play ? (
            <iframe src={BASE + c.video} title={c.title} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
          ) : (
            <button onClick={() => setPlay(true)} className="group absolute inset-0" aria-label={`Phát video: ${c.title}`}>
              <img src={BASE + c.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/10 transition group-hover:bg-ink/20">
                <span className="flex items-center gap-2 rounded-full bg-white px-5 py-3 font-display font-bold text-ink shadow-lg">
                  <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M6 4l11 6-11 6z" /></svg>
                  Xem tình huống · {c.duration}
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <a href={BASE + c.video} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-50">Mở video toàn màn hình ↗</a>
        {c.srt && <a href={BASE + c.srt} download className="rounded-full px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-50">Tải lời đọc (.srt)</a>}
      </div>

      {/* Playbook xử lý tình huống */}
      <article className="space-y-6 pt-2">
        <div>
          <p className="eyebrow text-muted">Playbook</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-ink">{pb.title}</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-display font-bold text-ink">Dấu hiệu</p>
            <ul className="mt-2 space-y-1.5 text-body">
              {pb.signs.map((s) => <li key={s} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{s}</li>)}
            </ul>
          </div>
          <div>
            <p className="font-display font-bold text-ink">Vì sao</p>
            <p className="mt-2 leading-relaxed text-body">{pb.why}</p>
          </div>
        </div>

        <SelfCheck cfg={pb.check} />

        <div>
          <p className="font-display font-bold text-ink">Ba việc làm ngay</p>
          <ol className="mt-2 space-y-2">
            {pb.actions.map((a, i) => (
              <li key={a.title} className="flex gap-3 border-b border-stone-100 py-3 last:border-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-sm font-bold text-brand-600">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-display font-bold text-ink">{a.title}</p>
                    <p className="num font-bold text-ok">{a.money}</p>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-body">{a.how}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="font-display font-bold text-ink">Lỗi hay gặp</p>
          <ul className="mt-1.5 space-y-1 text-sm text-body">
            {pb.mistakes.map((s) => <li key={s} className="flex gap-2"><span className="font-bold text-brand-600">×</span>{s}</li>)}
          </ul>
        </div>
      </article>
    </section>
  )
}
