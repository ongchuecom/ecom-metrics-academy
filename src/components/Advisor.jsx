import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { api, streamChat, ApiError, advisorEnabled, fmtVnd } from '../lib/advisor.js'
import { metricById, playbookById } from '../data/index.js'
import { href } from '../lib/route.js'
import { prefetchConcept } from '../lib/content.js'

// Trang Cố vấn AI (/hoi-dap/): hỏi đáp có dẫn bài, hồ sơ shop, dùng thử 7 ngày, nâng cấp Pro qua VietQR.
const SUGGEST = ['Shop em ROAS 3 mà vẫn lỗ, vì sao?', 'Tỷ lệ hoàn 20% thì nên làm gì trước?', 'Doanh thu 500tr/tháng, nên tuyển thêm người hay tự động hóa?', 'Làm sao biết sản phẩm nào đang bán lỗ?']
const KEY = (uid) => `ema-advisor-${uid}`
const load = (uid) => { try { return JSON.parse(localStorage.getItem(KEY(uid)) || 'null') || { messages: [], shop: {} } } catch { return { messages: [], shop: {} } } }
const save = (uid, v) => { try { localStorage.setItem(KEY(uid), JSON.stringify({ messages: v.messages.slice(-30), shop: v.shop })) } catch { /* bỏ qua */ } }

// Câu trả lời: **đậm** và gạch đầu dòng
function Answer({ text }) {
  const lines = text.split('\n')
  const out = []
  let list = []
  const flush = () => { if (list.length) { out.push(<ul key={out.length} className="my-1.5 list-disc space-y-1 pl-5">{list}</ul>); list = [] } }
  const rich = (s) => s.split('**').map((x, i) => (i % 2 ? <b key={i} className="text-ink">{x}</b> : x))
  lines.forEach((l, i) => {
    const m = l.match(/^\s*[-*•]\s+(.*)/)
    if (m) list.push(<li key={i}>{rich(m[1])}</li>)
    else { flush(); if (l.trim()) out.push(<p key={`p${i}`} className="my-1.5">{rich(l)}</p>) }
  })
  flush()
  return <div className="text-[15px] leading-relaxed text-body">{out}</div>
}

function Refs({ refs, onOpen }) {
  const list = (refs || []).filter((r) => metricById[r.id] || playbookById[r.id])
  if (!list.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="text-xs text-muted">Đọc thêm:</span>
      {list.map((r) => {
        const isPb = !!playbookById[r.id]
        return (
          <a key={r.id} href={href(isPb ? { type: 'pb', id: r.id } : { type: 'metric', id: r.id })} onMouseEnter={() => !isPb && prefetchConcept(r.id)}
            onClick={(e) => { e.preventDefault(); onOpen(r.id, isPb) }}
            className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-stone-200 hover:ring-brand-500">
            {isPb ? r.title.replace(/^Playbook\s*/, 'PB ') : metricById[r.id].code}
          </a>
        )
      })}
    </div>
  )
}

function Upgrade({ getToken, onClose, onPaid, plans }) {
  const [plan, setPlan] = useState('yearly')
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')
  const [paid, setPaid] = useState(false)
  useEffect(() => {
    if (!order || paid) return
    const started = Date.now()
    const t = setInterval(async () => {
      if (Date.now() - started > 20 * 60 * 1000) { clearInterval(t); return }
      try { const s = await api(`/api/billing/order-status/${order.order_code}`, { getToken }); if (s.status === 'paid') { setPaid(true); clearInterval(t); onPaid() } } catch { /* thử lại lần sau */ }
    }, 3000)
    return () => clearInterval(t)
  }, [order, paid, getToken, onPaid])
  const create = async () => {
    setErr('')
    try { setOrder(await api('/api/billing/create-order', { getToken, method: 'POST', body: { plan } })) } catch (e) { setErr(e.message) }
  }
  const P = plans || {}
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="up-h">
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label="Đóng" tabIndex={-1} />
      <div className="fade-up relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-body">Đóng</button>
        {paid ? (
          <div className="py-6 text-center">
            <p className="font-display text-2xl font-bold text-ink">Đã kích hoạt gói Pro</p>
            <p className="mt-2 text-sm text-charcoal">Cảm ơn anh/chị. Hỏi tiếp ngay được rồi.</p>
            <button onClick={onClose} className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 font-display text-sm font-bold text-white">Tiếp tục hỏi</button>
          </div>
        ) : !order ? (
          <>
            <h2 id="up-h" className="font-display text-xl font-bold text-ink">Nâng cấp Cố vấn AI Pro</h2>
            <p className="mt-1.5 text-sm text-charcoal">Hỏi đáp mỗi ngày với Cố vấn AI, câu trả lời bám đúng các khái niệm và Playbook trên web.</p>
            <div className="mt-4 grid gap-2">
              {['yearly', 'monthly'].map((k) => P[k] && (
                <label key={k} className={`flex cursor-pointer items-center justify-between rounded-2xl p-4 ring-2 ${plan === k ? 'bg-brand-50 ring-brand-500' : 'ring-stone-200'}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="plan" checked={plan === k} onChange={() => setPlan(k)} className="accent-brand-600" />
                    <span><span className="block font-bold text-ink">{P[k].name}</span><span className="text-xs text-charcoal">{P[k].daily_quota} câu mỗi ngày · {P[k].days} ngày{k === 'yearly' ? ' · rẻ hơn 600.000đ so với trả tháng' : ''}</span></span>
                  </span>
                  <span className="font-display font-bold text-ink">{fmtVnd(P[k].amount)}</span>
                </label>
              ))}
            </div>
            {err && <p className="mt-3 text-sm text-coral">{err}</p>}
            <button onClick={create} className="mt-5 w-full rounded-lg bg-brand-600 px-5 py-3 font-display font-bold text-white hover:bg-brand-700">Thanh toán bằng chuyển khoản QR →</button>
          </>
        ) : (
          <>
            <h2 id="up-h" className="font-display text-xl font-bold text-ink">Quét mã để thanh toán</h2>
            <p className="mt-1 text-sm text-charcoal">{order.plan_name} · <b className="text-ink">{fmtVnd(order.amount)}</b></p>
            <img src={order.qr_url} alt={`Mã VietQR thanh toán ${fmtVnd(order.amount)}, nội dung ${order.transfer_content}`} className="mx-auto mt-4 w-64 rounded-xl ring-1 ring-stone-200" />
            <dl className="mt-4 space-y-1.5 rounded-2xl bg-stone-50 p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-charcoal">Số tài khoản</dt><dd className="font-bold text-ink">{order.bank_account}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-charcoal">Chủ tài khoản</dt><dd className="font-bold text-ink">{order.bank_account_name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-charcoal">Nội dung chuyển khoản</dt><dd className="font-mono font-bold text-brand-700">{order.transfer_content}</dd></div>
            </dl>
            <p className="mt-3 flex items-center gap-2 text-sm text-charcoal"><span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />Đang chờ ngân hàng báo tiền về, thường 5–30 giây. Giữ nguyên nội dung chuyển khoản.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function Advisor({ initialConceptId, onSelectMetric, onOpenPlaybook }) {
  const { user, ready, getToken, openLogin } = useAuth()
  const [me, setMe] = useState(null)
  const [state, setState] = useState({ messages: [], shop: {} })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const [editShop, setEditShop] = useState(false)
  const [conceptId, setConceptId] = useState(initialConceptId || '')
  const abort = useRef(null)
  const endRef = useRef(null)

  const refreshMe = useCallback(() => api('/api/me', { getToken }).then(setMe).catch((e) => setErr(e.message)), [getToken])
  useEffect(() => { if (user) { setState(load(user.uid)); refreshMe() } }, [user, refreshMe])
  useEffect(() => { if (user) save(user.uid, state) }, [user, state])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [state.messages.length, busy])
  useEffect(() => { if (initialConceptId && metricById[initialConceptId] && !input) setInput(`Giải thích ${metricById[initialConceptId].code} áp vào shop của em: `) }, [initialConceptId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!advisorEnabled) return (
    <article className="max-w-2xl space-y-3">
      <h1 className="font-display text-3xl font-bold text-ink">Cố vấn AI</h1>
      <p className="text-[15px] text-charcoal">Cố vấn AI đang được chuẩn bị. Trong lúc chờ, anh/chị dùng ô tìm kiếm hoặc Khám sức khỏe shop.</p>
    </article>
  )

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || busy) return
    setErr(''); setInput(''); setBusy(true)
    const history = state.messages.slice(-4).map((m) => ({ role: m.role, content: m.text.slice(0, 1500) }))
    setState((s) => ({ ...s, messages: [...s.messages, { role: 'user', text: msg }, { role: 'assistant', text: '', refs: [] }] }))
    const patchLast = (fn) => setState((s) => { const ms = [...s.messages]; ms[ms.length - 1] = fn(ms[ms.length - 1]); return { ...s, messages: ms } })
    abort.current = new AbortController()
    try {
      const end = await streamChat({ message: msg, history, shop_context: state.shop || {}, concept_id: conceptId }, {
        getToken, signal: abort.current.signal,
        onEvent: (e) => {
          if (e.type === 'meta') setMe((m) => (m ? { ...m, remaining_today: e.remaining_today, daily_limit: e.daily_limit } : m))
          else if (e.type === 'refs') patchLast((m) => ({ ...m, refs: e.refs }))
          else if (e.type === 'delta') patchLast((m) => ({ ...m, text: m.text + e.text }))
          else if (e.type === 'context_update') setState((s) => ({ ...s, shop: e.shop_context }))
          else if (e.type === 'error') { patchLast((m) => ({ ...m, error: e.message })); refreshMe() }
        },
      })
      // Bấm Dừng hoặc mạng đứt: giữ câu hỏi và phần đã trả lời, ghi chú rõ thay vì để "Đang nghĩ…" mãi
      if (end === 'stopped') patchLast((m) => ({ ...m, note: m.text ? 'Đã dừng.' : 'Đã dừng trước khi Cố vấn trả lời. Lượt hỏi này không bị tính.' }))
      else if (end === 'cut') patchLast((m) => (m.error ? m : { ...m, error: 'Kết nối bị ngắt giữa chừng, anh/chị hỏi lại giúp.' }))
      else if (end === 'done') patchLast((m) => (m.text || m.error ? m : { ...m, error: 'Cố vấn chưa trả lời được câu này, anh/chị diễn đạt lại giúp.' }))
      setConceptId('')
    } catch (e) {
      setState((s) => ({ ...s, messages: s.messages.slice(0, -2) }))
      setInput(msg)
      if (e instanceof ApiError && e.status === 402) { setUpgrade(true); refreshMe() } else if (e instanceof ApiError && e.status === 401) openLogin('Đăng nhập để hỏi Cố vấn AI. Tài khoản mới được dùng thử 7 ngày.')
      else setErr(e.message)
    } finally { setBusy(false) }
  }

  const shop = state.shop || {}
  const shopText = [shop.sp, shop.kenh, shop.dt].filter(Boolean).join(' · ')
  const openRef = (id, isPb) => (isPb ? onOpenPlaybook(id) : onSelectMetric(id))

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <p className="eyebrow text-muted">Hỏi đáp thực chiến</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">Cố vấn AI</h1>
          <p className="mt-1 text-sm text-charcoal">Trả lời theo các khái niệm và Playbook trên web, văn phong sách Ecom Truyền Kỳ. Không thay cho kế toán hay luật sư.</p>
        </div>
        {me && (
          <div className="shrink-0 rounded-2xl bg-stone-50 px-4 py-2.5 text-xs sm:text-right">
            <p className={`font-bold ${me.is_active ? 'text-ink' : 'text-coral'}`}>{me.is_pro ? me.plan_name : me.is_trial ? `Dùng thử · còn ${me.days_left} ngày` : me.was_paid ? 'Gói Pro đã hết hạn' : 'Đã hết hạn dùng thử'}</p>
            {me.is_active && <p className="text-charcoal">Hôm nay còn {me.remaining_today}/{me.daily_limit} câu</p>}
            {!me.is_pro && <button onClick={() => setUpgrade(true)} className="mt-1 font-semibold text-brand-700 hover:underline">Nâng cấp Pro →</button>}
          </div>
        )}
      </header>

      {!ready ? <p className="text-sm text-muted">Đang kiểm tra đăng nhập…</p> : !user ? (
        <div className="rounded-2xl bg-brand-50 p-5">
          <p className="font-display text-lg font-bold text-ink">Đăng nhập để dùng thử 7 ngày miễn phí</p>
          <p className="mt-1 text-sm text-charcoal">Mỗi ngày 15 câu hỏi. Hết hạn thì nâng cấp Pro {fmtVnd(200000)}/tháng hoặc {fmtVnd(1800000)}/năm.</p>
          <button onClick={() => openLogin('Đăng nhập để hỏi Cố vấn AI. Tài khoản mới được dùng thử 7 ngày.')} className="mt-3 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Đăng nhập Google / Facebook</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm">
            <span className="text-muted">Hồ sơ shop:</span>
            {editShop ? (
              <form className="flex flex-1 flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setEditShop(false) }}>
                {[['sp', 'Sản phẩm'], ['kenh', 'Kênh bán'], ['dt', 'Doanh thu tháng']].map(([k, l]) => (
                  <input key={k} value={shop[k] || ''} maxLength={80} placeholder={l} onChange={(e) => setState((s) => ({ ...s, shop: { ...s.shop, [k]: e.target.value } }))}
                    className="min-w-0 flex-1 rounded-lg bg-white px-2 py-1 ring-1 ring-stone-200" />
                ))}
                <button className="rounded-lg bg-brand-600 px-3 py-1 text-white hover:bg-brand-700">Lưu</button>
              </form>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{shopText || 'chưa có, Cố vấn tự ghi nhớ khi anh/chị kể về shop'}</span>
                <button onClick={() => setEditShop(true)} className="text-xs font-semibold text-brand-700">Sửa</button>
                {state.messages.length > 0 && <button onClick={() => setState({ messages: [], shop })} className="text-xs font-semibold text-muted hover:text-coral">Cuộc trò chuyện mới</button>}
              </>
            )}
          </div>

          <div className="min-h-[40vh] space-y-4" aria-live="polite">
            {state.messages.length === 0 && (
              <div className="rounded-2xl bg-stone-50 p-5">
                <p className="font-semibold text-ink">Hỏi gì cũng được, càng có số càng sát. Ví dụ:</p>
                <div className="mt-3 flex flex-wrap gap-2">{SUGGEST.map((q) => <button key={q} onClick={() => send(q)} className="rounded-full bg-white px-3 py-1.5 text-left text-sm text-ink ring-1 ring-stone-200 hover:ring-brand-500">{q}</button>)}</div>
              </div>
            )}
            {state.messages.map((m, i) => m.role === 'user' ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[15px] text-white">{m.text}</div>
            ) : (
              <div key={i} className="max-w-[95%] rounded-2xl rounded-bl-md bg-stone-50 px-4 py-3">
                {m.text ? <Answer text={m.text} /> : !m.error && !m.note && <p className="text-sm text-muted">{busy && i === state.messages.length - 1 ? 'Đang nghĩ…' : 'Chưa có câu trả lời.'}</p>}
                {m.note && <p className="mt-1 text-xs text-muted">{m.note}</p>}
                {m.error && <p className="text-sm text-coral">{m.error}</p>}
                <Refs refs={m.refs} onOpen={openRef} />
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {err && <p className="text-sm text-coral" role="alert">{err}</p>}
          {me && !me.is_active ? (
            <div className="rounded-2xl bg-brand-50 p-4 text-sm">
              <p className="font-bold text-ink">{me.was_paid ? 'Gói Pro đã hết hạn.' : 'Hết thời gian dùng thử.'}</p>
              <button onClick={() => setUpgrade(true)} className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-bold text-white">Nâng cấp Pro</button>
            </div>
          ) : (
            <form className="sticky bottom-3 flex items-end gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-stone-200" onSubmit={(e) => { e.preventDefault(); send() }}>
              <textarea value={input} onChange={(e) => setInput(e.target.value.slice(0, 1200))} rows={2} placeholder="Kể tình huống của shop, có số càng tốt…"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink outline-none" aria-label="Câu hỏi" />
              {busy ? <button type="button" onClick={() => abort.current?.abort()} className="rounded-full bg-stone-200 px-4 py-2 text-sm font-bold text-ink">Dừng</button>
                : <button disabled={!input.trim()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Gửi</button>}
            </form>
          )}
        </>
      )}
      {upgrade && <Upgrade getToken={getToken} plans={me?.plans} onClose={() => setUpgrade(false)} onPaid={refreshMe} />}
    </article>
  )
}
