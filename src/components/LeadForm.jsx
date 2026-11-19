import { useState } from 'react'
import site from '../data/site.json'

// Form để lại Zalo: gửi thẳng vào Google Sheet riêng tư qua Apps Script (integrations/sheet-receiver.gs).
// Chưa cấu hình endpoint thì form không hiện.
const ENDPOINT = site.lead?.endpoint
const CHANNELS = ['TikTok Shop', 'Shopee', 'Lazada', 'Website / Facebook', 'Bán cả nhiều kênh', 'Chưa bán, đang tìm hiểu']
const REVENUES = ['Dưới 100tr', '100–500tr', '500tr–2 tỷ', '2–10 tỷ', 'Trên 10 tỷ']
export const normPhone = (s) => String(s || '').replace(/[^\d+]/g, '').replace(/^\+?84/, '0')
export const validPhone = (s) => /^0(3|5|7|8|9)\d{8}$/.test(normPhone(s))

export default function LeadForm({ source, summary, title, text, compact = false }) {
  const [f, setF] = useState({ name: '', zalo: '', channel: '', revenue: '', need: '', website: '' })
  const [consent, setConsent] = useState(false)
  const [attach, setAttach] = useState(true)
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [err, setErr] = useState('')
  if (!ENDPOINT) return null
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return setErr('Anh/chị cho mình xin tên gọi nhé.')
    if (!validPhone(f.zalo)) return setErr('Số Zalo chưa đúng. Ví dụ: 0912 345 678.')
    if (!consent) return setErr('Cần đánh dấu đồng ý để mình liên hệ qua Zalo.')
    setErr(''); setState('sending')
    try {
      await fetch(ENDPOINT, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...f, zalo: normPhone(f.zalo), consent: true, source, page: window.location.pathname, summary: summary && attach ? summary : '' }),
      })
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') return (
    <section className="rounded-2xl bg-brand-50 p-5">
      <p className="font-display text-lg font-extrabold text-ink">Đã nhận, cảm ơn {f.name.trim()}!</p>
      <p className="mt-1 text-sm text-body">Ông chú Ecom sẽ nhắn Zalo số {normPhone(f.zalo)} trong vài ngày tới.</p>
    </section>
  )

  const input = 'w-full rounded-xl bg-white px-3 py-2.5 text-sm text-ink ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-500'
  return (
    <section className={`rounded-2xl bg-stone-50 ${compact ? 'p-4' : 'p-4 sm:p-6'}`} aria-label="Để lại Zalo">
      <p className="eyebrow text-brand-600">Tư vấn 1-1 qua Zalo</p>
      <h2 className="mt-1 font-display text-lg font-extrabold leading-snug text-ink sm:text-xl">{title || 'Muốn Ông chú Ecom xem giúp số của shop?'}</h2>
      <p className="mt-1 text-sm leading-relaxed text-charcoal">{text || 'Để lại tên và số Zalo. Mình nhắn riêng, gửi kèm bảng tính P&L và gợi ý chỗ nên sửa trước.'}</p>
      <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-2" noValidate>
        <input className={input} placeholder="Tên gọi" value={f.name} onChange={set('name')} autoComplete="name" aria-label="Tên gọi" maxLength={80} />
        <input className={input} placeholder="Số Zalo" value={f.zalo} onChange={set('zalo')} inputMode="tel" autoComplete="tel" aria-label="Số Zalo" maxLength={20} />
        {!compact && (<>
          <select className={input} value={f.channel} onChange={set('channel')} aria-label="Đang bán ở đâu">
            <option value="">Đang bán ở đâu?</option>{CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={input} value={f.revenue} onChange={set('revenue')} aria-label="Doanh thu mỗi tháng">
            <option value="">Doanh thu mỗi tháng?</option>{REVENUES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <textarea className={`${input} sm:col-span-2`} rows={2} placeholder="Đang vướng chỗ nào? (không bắt buộc)" value={f.need} onChange={set('need')} maxLength={500} aria-label="Đang vướng chỗ nào" />
        </>)}
        <input className="hidden" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" />
        {summary && (
          <label className="flex gap-2 text-xs leading-snug text-body sm:col-span-2">
            <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
            Gửi kèm kết quả khám sức khỏe vừa tính để được xem nhanh hơn.
          </label>
        )}
        <label className="flex gap-2 text-xs leading-snug text-body sm:col-span-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
          Tôi đồng ý để A1demy / Ông chú Ecom lưu tên và số Zalo này để liên hệ tư vấn. Thông tin không chia sẻ cho bên thứ ba; muốn xoá chỉ cần nhắn lại.
        </label>
        {err && <p className="text-sm font-semibold text-coral sm:col-span-2">{err}</p>}
        {state === 'error' && <p className="text-sm font-semibold text-coral sm:col-span-2">Chưa gửi được, anh/chị thử lại sau ít phút.</p>}
        <button type="submit" disabled={state === 'sending'} className="rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
          {state === 'sending' ? 'Đang gửi…' : 'Gửi số Zalo'}
        </button>
      </form>
    </section>
  )
}
