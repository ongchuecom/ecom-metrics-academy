import { useState } from 'react'
import site from '../data/site.json'
import { postJSON } from '../lib/api.js'

// Cuối mỗi bài: chấm sao + góp ý ẩn danh và nút chia sẻ. Góp ý đi qua integrations/sheet-receiver.gs,
// được nối thành file JSONL trong repo riêng ongchuecom/ecom-metrics-feedback (không dùng Drive).
// Chưa có endpoint thì phần chấm sao ẩn, nút chia sẻ vẫn hiện.
const ENDPOINT = site.lead?.endpoint
const KEY = 'ema-rated'
const readRated = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
const saveRated = (page, v) => { try { localStorage.setItem(KEY, JSON.stringify({ ...readRated(), [page]: v })) } catch { /* trình duyệt chặn lưu thì thôi */ } }
const LABELS = ['', 'Khó hiểu', 'Còn rối', 'Tạm được', 'Dễ hiểu', 'Rất hữu ích']

const send = (body) => postJSON({ type: 'feedback', device: window.matchMedia?.('(max-width: 640px)').matches ? 'điện thoại' : 'máy tính', ...body })

function Stars({ value, hover, onHover, onPick, disabled }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Chấm điểm bài này" onMouseLeave={() => onHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= (hover || value)
        return (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sao: ${LABELS[n]}`} disabled={disabled}
            onMouseEnter={() => onHover(n)} onFocus={() => onHover(n)} onBlur={() => onHover(0)} onClick={() => onPick(n)}
            className="rounded p-0.5 transition disabled:cursor-default">
            <svg viewBox="0 0 24 24" className={`h-7 w-7 ${on ? 'fill-marker stroke-[#C9A300]' : 'fill-none stroke-stone-300'}`} strokeWidth="1.5" aria-hidden="true">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" strokeLinejoin="round" />
            </svg>
          </button>
        )
      })}
      <span className="ml-2 text-sm font-semibold text-charcoal">{LABELS[hover || value] || ''}</span>
    </div>
  )
}

export function ShareBar({ title, text }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''
  const native = typeof navigator !== 'undefined' && !!navigator.share
  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {
      const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }
  const btn = 'inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink ring-1 ring-stone-200 transition hover:ring-brand-500'
  return (
    <div className="flex flex-wrap items-center gap-2">
      {native && (
        <button type="button" className={btn} onClick={() => navigator.share({ title, text, url }).catch(() => {})}>
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true"><path d="M10 3v10M6 7l4-4 4 4M4 12v4h12v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Chia sẻ (Zalo, Messenger…)
        </button>
      )}
      <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#1877F2]" aria-hidden="true"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12" /></svg>
        Facebook
      </a>
      <button type="button" className={btn} onClick={copy} aria-live="polite">
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true"><path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.8-2.8a3 3 0 0 0-4.2-4.2l-.8.8M11.5 8.5a3 3 0 0 0-4.2 0l-2.8 2.8a3 3 0 0 0 4.2 4.2l.8-.8" strokeLinecap="round" /></svg>
        {copied ? 'Đã sao chép link' : native ? 'Sao chép link' : 'Sao chép link (dán vào Zalo)'}
      </button>
    </div>
  )
}

export default function PageFeedback({ page, title, shareText }) {
  const prev = readRated()[page]
  const [rating, setRating] = useState(prev || 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [trap, setTrap] = useState('')
  const [state, setState] = useState(prev ? 'rated' : 'idle') // idle | rated | sending | done | error

  // Mỗi trình duyệt chỉ gửi điểm sao của một bài một lần; đổi ý chấm lại thì chỉ đổi trên máy, không gửi thêm dòng
  const pick = async (n) => {
    const first = !readRated()[page]
    setRating(n); setState('rated')
    if (!first) { saveRated(page, n); return }
    // chỉ ghi nhớ "đã chấm" khi máy chủ xác nhận đã lưu; lỗi thì lần chấm sau sẽ gửi lại
    try { await send({ page, title, rating: n, website: trap }); saveRated(page, n) } catch { /* không làm phiền người đọc */ }
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setState('sending')
    // điểm sao đã gửi riêng, ở đây chỉ đính kèm để đọc góp ý cho đúng ngữ cảnh (không tính lại vào điểm trung bình)
    try { await send({ page, title, rating_ref: rating || '', comment: comment.trim(), website: trap }); setState('done') } catch { setState('error') }
  }

  return (
    <section aria-label="Đánh giá và chia sẻ bài" className="rounded-2xl bg-stone-50 p-4 sm:p-5">
      {ENDPOINT && (
        <div className="mb-5">
          <p className="font-display text-base font-extrabold text-ink">Bài này có dễ hiểu không?</p>
          <div className="mt-2"><Stars value={rating} hover={hover} onHover={setHover} onPick={pick} disabled={state === 'sending'} /></div>
          {state === 'done' ? (
            <p className="mt-3 text-sm font-semibold text-ok">Đã nhận góp ý, cảm ơn anh/chị. Mỗi 2 ngày bài được rà lại theo góp ý.</p>
          ) : (rating > 0 || comment) && (
            <form onSubmit={submit} className="mt-3 max-w-2xl">
              <label className="text-sm text-charcoal" htmlFor={`gy-${page}`}>
                {rating && rating <= 3 ? 'Chỗ nào khó hiểu hay chưa đúng? ' : 'Muốn bài có thêm gì? '}
                <span className="text-muted">(ẩn danh, không bắt buộc)</span>
              </label>
              <textarea id={`gy-${page}`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3}
                placeholder="Ví dụ: ví dụ số ở phần 2 chưa khớp, hoặc muốn thêm ví dụ cho shop TikTok…"
                className="mt-1.5 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-ink ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-500" />
              <input value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={!comment.trim() || state === 'sending'} className="rounded-full bg-brand-600 px-4 py-2 font-display text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                  {state === 'sending' ? 'Đang gửi…' : 'Gửi góp ý'}
                </button>
                <span className="text-xs text-muted">Không cần tên hay số điện thoại. Đừng ghi thông tin cá nhân vào đây.</span>
              </div>
              {state === 'error' && <p className="mt-2 text-sm text-coral">Chưa gửi được, anh/chị thử lại giúp.</p>}
            </form>
          )}
        </div>
      )}
      <p className="eyebrow text-muted">Thấy hay thì gửi cho người cần</p>
      <div className="mt-2"><ShareBar title={title} text={shareText} /></div>
    </section>
  )
}
