import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { api, fmtVnd } from '../lib/advisor.js'

// Quản trị máy chủ Cố vấn AI: số liệu, tri thức, cấp Pro, thanh toán cần xử lý tay
const fmt = (s) => (s ? new Date(s * 1000).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '–')
const RESULT = { paid: 'Đã kích hoạt', paid_overpaid: 'Kích hoạt (chuyển dư)', underpaid: 'Chuyển thiếu', unmatched: 'Không có mã đơn', unknown_order: 'Mã đơn lạ', already_paid: 'Trả lần hai cho đơn đã kích hoạt', ignored: 'Bỏ qua' }
const PLAN = { yearly: 'Pro năm', monthly: 'Pro tháng', trial: 'dùng thử' }
const JOB = { 'sync-site': 'Đồng bộ web', upload: 'Nạp tài liệu', 'sync-drive': 'Đồng bộ Drive' }
const STATUS = { running: 'đang chạy', done: 'xong', error: 'lỗi' }
const jobDetail = (d) => { try { const o = JSON.parse(d); return o.chunks != null ? `${o.chunks} đoạn, nhúng mới ${o.embedded ?? 0}, bỏ ${o.removed ?? 0}` : String(d) } catch { return String(d) } }
// cùng bộ với NEED_REVIEW trong server/advisor/app.py
const NEED = new Set(['underpaid', 'unmatched', 'unknown_order', 'already_paid', 'paid_overpaid'])
const Card = ({ label, value, warn }) => (
  <div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs font-semibold text-muted">{label}</p><p className={`mt-1 font-display text-2xl font-black ${warn ? 'text-coral' : 'text-ink'}`}>{value ?? '–'}</p></div>
)
const H = ({ children }) => <h3 className="mb-2 text-base font-extrabold text-brand-600">{children}</h3>
const btn = 'rounded-xl bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-stone-200 hover:ring-brand-500 disabled:opacity-50'

export default function AdminAdvisor() {
  const { getToken } = useAuth()
  const [ov, setOv] = useState(null)
  const [pay, setPay] = useState(null)
  const [msg, setMsg] = useState('')
  const [grant, setGrant] = useState({ email: '', plan: 'yearly', days: 365 })
  const [folder, setFolder] = useState('')
  const [file, setFile] = useState(null)
  const load = useCallback(async () => {
    try { setOv(await api('/api/admin/overview', { getToken })); setPay(await api('/api/admin/payments', { getToken })) } catch (e) { setMsg(e.message) }
  }, [getToken])
  useEffect(() => { load() }, [load])
  const act = async (fn, ok) => { setMsg(''); try { const r = await fn(); setMsg(ok(r)); setTimeout(load, 1500) } catch (e) { setMsg(e.message) } }

  if (!ov) return <p className="text-sm text-muted">{msg || 'Đang tải số liệu Cố vấn AI…'}</p>
  const review = (pay?.payments || []).filter((p) => NEED.has(p.result))
  return (
    <div className="space-y-8">
      {msg && <p className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-ink" role="status">{msg}</p>}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Người dùng" value={ov.users} />
        <Card label="Đang dùng thử / Pro" value={`${ov.trial_active} / ${ov.pro_active}`} />
        <Card label="Câu hỏi hôm nay · 7 ngày" value={`${ov.questions_today} · ${ov.questions_7d}`} />
        <Card label="Doanh thu 30 ngày" value={fmtVnd(ov.revenue_30d)} />
      </section>

      <section>
        <H>Thanh toán cần xử lý tay · {review.length}</H>
        {review.length ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1.5 pr-3">Lúc</th><th className="pr-3">Kết quả</th><th className="pr-3">Mã đơn</th><th className="pr-3">Số tiền</th><th>Nội dung chuyển khoản</th></tr></thead>
            <tbody className="divide-y divide-stone-100">{review.map((p) => (
              <tr key={p.sepay_id}><td className="py-1.5 pr-3 text-xs">{fmt(p.received_at)}</td><td className="pr-3 font-semibold text-coral">{RESULT[p.result] || p.result}</td><td className="pr-3 font-mono text-xs">{p.code || '–'}</td><td className="pr-3">{fmtVnd(p.amount)}</td><td className="text-xs text-charcoal">{p.content}</td></tr>
            ))}</tbody></table></div>
        ) : <p className="text-sm text-charcoal">Không có khoản nào cần xử lý.</p>}
        <p className="mt-1 text-xs text-muted">Chuyển thiếu hoặc ghi sai nội dung: liên hệ khách, rồi cấp Pro thủ công ở dưới nếu đã đủ tiền.</p>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <H>Cấp Pro thủ công</H>
          <form className="flex flex-wrap gap-2 text-sm" onSubmit={(e) => { e.preventDefault(); act(() => api('/api/admin/grant', { getToken, method: 'POST', body: { email: grant.email.trim(), plan: grant.plan, days: Number(grant.days) } }), (r) => `Đã cấp ${PLAN[r.plan] || r.plan} tới ${fmt(r.expires_at)}.`) }}>
            <input value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} placeholder="Email người dùng (đã đăng nhập ít nhất một lần)" className="min-w-0 flex-1 rounded-xl px-3 py-1.5 ring-1 ring-stone-200" />
            <select value={grant.plan} onChange={(e) => setGrant({ ...grant, plan: e.target.value })} className="rounded-xl px-2 ring-1 ring-stone-200"><option value="yearly">Pro năm</option><option value="monthly">Pro tháng</option><option value="trial">Gia hạn dùng thử</option></select>
            <input type="number" min={1} max={3660} value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} className="w-20 rounded-xl px-2 ring-1 ring-stone-200" aria-label="Số ngày" />
            <button className={btn} disabled={!grant.email.trim()}>Cấp</button>
          </form>
        </div>
        <div>
          <H>Tri thức · {ov.chunks} đoạn</H>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => act(() => api('/api/admin/knowledge/sync-site', { getToken, method: 'POST' }), () => 'Đang đồng bộ tri thức từ web, xem tiến độ ở danh sách việc.')}>Đồng bộ từ web</button>
            <label className={`${btn} cursor-pointer`}>Chọn tài liệu<input type="file" accept=".pdf,.docx,.txt,.md,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
            {file && <button className={btn} onClick={() => { const f = new FormData(); f.append('file', file); act(() => api('/api/admin/knowledge/upload', { getToken, method: 'POST', form: f }), () => `Đang nạp ${file.name}.`); setFile(null) }}>Nạp “{file.name.slice(0, 24)}”</button>}
          </div>
          <form className="mt-2 flex gap-2 text-sm" onSubmit={(e) => { e.preventDefault(); act(() => api('/api/admin/knowledge/sync-drive', { getToken, method: 'POST', body: { folder_id: folder.trim() } }), () => 'Đang đồng bộ thư mục Drive.') }}>
            <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="ID thư mục Google Drive" className="min-w-0 flex-1 rounded-xl px-3 py-1.5 ring-1 ring-stone-200" />
            <button className={btn} disabled={!folder.trim()}>Đồng bộ Drive</button>
          </form>
          <ul className="mt-3 divide-y divide-stone-100 text-sm">{ov.sources.map((s) => (
            <li key={s.source} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate">{s.source === 'site' ? 'Nội dung web (khái niệm + Playbook)' : s.source}</span>
              <span className="text-xs text-muted">{s.chunks} đoạn · {fmt(s.updated_at)}</span>
              {s.source !== 'site' && <button className="text-xs text-coral hover:underline" onClick={() => window.confirm(`Xóa nguồn ${s.source}?`) && act(() => api(`/api/admin/knowledge/source?source=${encodeURIComponent(s.source)}`, { getToken, method: 'DELETE' }), (r) => `Đã xóa ${r.deleted_chunks} đoạn.`)}>Xóa</button>}
            </li>
          ))}</ul>
          {ov.jobs.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-charcoal">{ov.jobs.slice(0, 5).map((j) => <li key={j.id}>{fmt(j.created_at)} · {JOB[j.kind] || j.kind} · <b className={j.status === 'error' ? 'text-coral' : ''}>{STATUS[j.status] || j.status}</b> {j.detail && j.status !== 'running' ? `· ${jobDetail(j.detail).slice(0, 160)}` : ''}</li>)}</ul>}
          <button onClick={load} className="mt-2 text-xs font-semibold text-brand-700 hover:underline">Tải lại</button>
        </div>
      </section>
    </div>
  )
}
