import { useEffect, useMemo, useState } from 'react'
import { metricsMaster, playbooks, STAGES, metricById, playbookById, TYPES, topicById } from '../data/index.js'
import cases from '../data/cases.json'
import site from '../data/site.json'
import { useAuth, authEnabled } from '../lib/auth.jsx'
import { fetchAllPlayers, deletePlayer } from '../lib/db.js'
import { isAdmin, ADMIN_UIDS, getGhToken, setGhToken, fetchFeedback, downloadCSV, FEEDBACK_REPO } from '../lib/admin.js'
import { GAM, RANK_LIST, rankFor } from '../lib/quiz.js'
import { href } from '../lib/route.js'
import RankBadge from './RankBadge.jsx'

// Trang quản trị (/quan-tri/): chạy hoàn toàn trên trình duyệt, đọc dữ liệu bằng quyền của người quản trị.
// Người chơi: Firestore (xóa được nhờ quy tắc isAdmin). Góp ý: repo riêng trên GitHub qua token chỉ-đọc lưu trên máy.

const REPO = 'https://github.com/ongchuecom/ecom-metrics-academy'
const TABS = [['tong-quan', 'Tổng quan', true], ['nguoi-choi', 'Người chơi', true], ['gop-y', 'Góp ý', true], ['noi-dung', 'Nội dung', false], ['cai-dat', 'Cài đặt', false]]
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '–')
const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null)
const pageName = (id) => metricById[id]?.code || (playbookById[id] ? `Playbook ${id.match(/pb_(\d+)/)?.[1]}` : id)
const pageHref = (id) => (metricById[id] ? href({ type: 'metric', id }) : playbookById[id] ? href({ type: 'pb', id }) : null)

const Card = ({ label, value, note, warn }) => (
  <div className="rounded-2xl bg-stone-50 p-4">
    <p className="text-xs font-semibold text-muted">{label}</p>
    <p className={`mt-1 font-display text-2xl font-black ${warn ? 'text-coral' : 'text-ink'}`}>{value ?? '–'}</p>
    {note && <p className="mt-0.5 text-xs text-charcoal">{note}</p>}
  </div>
)
const H2 = ({ children }) => <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />{children}</h2>
const Bar = ({ v, max, color = '#F05025' }) => <span className="block h-2.5 rounded-r" style={{ width: `${max ? Math.max(2, (v / max) * 100) : 0}%`, background: color }} />
const Status = ({ ok, label, note }) => (
  <li className="flex gap-3 py-2">
    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${ok ? 'bg-ok' : 'bg-stone-300'}`}>{ok ? '✓' : '!'}</span>
    <span className="min-w-0 text-sm"><b className="text-ink">{label}</b>{note && <span className="block text-charcoal">{note}</span>}</span>
  </li>
)

export default function Admin() {
  const { user, ready, openLogin } = useAuth()
  const admin = isAdmin(user)
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'tong-quan')
  const [players, setPlayers] = useState({ state: 'idle', rows: [] })
  const [fb, setFb] = useState({ state: 'idle', rows: [] })
  const [token, setToken] = useState(getGhToken)

  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.appendChild(m)
    return () => m.remove()
  }, [])
  useEffect(() => {
    const u = new URL(window.location.href); u.searchParams.set('tab', tab); window.history.replaceState(window.history.state, '', u)
  }, [tab])

  const loadPlayers = () => {
    setPlayers((p) => ({ ...p, state: 'loading' }))
    fetchAllPlayers().then((rows) => setPlayers({ state: 'ok', rows })).catch(() => setPlayers({ state: 'error', rows: [] }))
  }
  const loadFeedback = (t = token) => {
    if (!t) return
    setFb((f) => ({ ...f, state: 'loading' }))
    fetchFeedback(t).then((rows) => setFb({ state: 'ok', rows })).catch((e) => setFb({ state: e.message === 'token' ? 'token' : 'error', rows: [] }))
  }
  useEffect(() => { if (admin && players.state === 'idle') loadPlayers() }, [admin]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (admin && token && fb.state === 'idle') loadFeedback() }, [admin, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const needAdmin = TABS.find((t) => t[0] === tab)?.[2]
  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-brand-600">Ecom Metrics Academy</p>
          <h1 className="mt-1 font-display text-2xl font-black text-ink sm:text-3xl">Quản trị</h1>
        </div>
        {user && <p className="text-xs text-muted">Đăng nhập: {user.name || 'tài khoản'} · {admin ? 'quản trị viên' : 'chưa có quyền quản trị'}</p>}
      </header>

      <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0" aria-label="Mục quản trị">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${tab === id ? 'border-brand-600 text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{label}</button>
        ))}
      </nav>

      {needAdmin && !admin ? (
        <Gate user={user} ready={ready} openLogin={openLogin} />
      ) : tab === 'tong-quan' ? <Overview players={players} fb={fb} token={token} go={setTab} />
        : tab === 'nguoi-choi' ? <Players players={players} reload={loadPlayers} />
        : tab === 'gop-y' ? <Feedback fb={fb} token={token} setToken={(t) => { setGhToken(t); setToken(t); setFb({ state: 'idle', rows: [] }) }} reload={() => loadFeedback()} />
        : tab === 'noi-dung' ? <Content />
        : <Settings user={user} admin={admin} players={players} token={token} />}
    </article>
  )
}

function Gate({ user, ready, openLogin }) {
  if (!authEnabled) return (
    <div className="rounded-2xl bg-stone-50 p-5 text-sm leading-relaxed text-body">
      <p className="font-bold text-ink">Chưa bật đăng nhập.</p>
      <p className="mt-1">Phần này cần đăng nhập Firebase để biết ai là quản trị viên. Làm theo <a className="font-semibold text-brand-700 underline" href={`${REPO}/blob/main/integrations/SETUP-DANG-NHAP.md`} target="_blank" rel="noopener noreferrer">hướng dẫn bật đăng nhập</a>. Trong lúc chờ, mục Nội dung và Cài đặt vẫn xem được.</p>
    </div>
  )
  if (!ready) return <p className="text-sm text-muted">Đang kiểm tra đăng nhập…</p>
  if (!user) return (
    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="text-sm text-body">Đăng nhập bằng tài khoản quản trị để xem.</p>
      <button onClick={() => openLogin('Đăng nhập bằng tài khoản quản trị viên.')} className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">Đăng nhập</button>
    </div>
  )
  return (
    <div className="rounded-2xl bg-stone-50 p-5 text-sm leading-relaxed text-body">
      <p className="font-bold text-ink">Tài khoản này chưa có quyền quản trị.</p>
      <p className="mt-1">Mã tài khoản của anh/chị:</p>
      <p className="mt-1 flex flex-wrap items-center gap-2"><code className="rounded bg-white px-2 py-1 text-xs ring-1 ring-stone-200">{user.uid}</code>
        <button onClick={() => navigator.clipboard?.writeText(user.uid)} className="text-xs font-semibold text-brand-700 underline">Sao chép</button></p>
      <p className="mt-2">Gửi mã này cho Claude (hoặc thêm vào <code>admin.uids</code> trong <code>src/data/site.json</code>, chạy <code>npm run data:pack</code>, rồi dán lại <code>integrations/firestore.rules</code> vào Firebase).</p>
    </div>
  )
}

function Overview({ players, fb, token, go }) {
  const p = players.rows
  const week = Date.now() - 7 * 86400e3
  const fbWeek = fb.rows.filter((r) => new Date(r.t).getTime() > week)
  const stars = fb.rows.filter((r) => r.rating).map((r) => r.rating)
  const drafts = metricsMaster.filter((m) => m.review === 'draft')
  const lowPages = useMemo(() => byPage(fb.rows).filter((x) => x.warn), [fb.rows])
  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Người chơi trên bảng" value={players.state === 'ok' ? p.length : players.state === 'loading' ? '…' : '–'} note={players.state === 'ok' ? `${p.filter((x) => x.updatedAt > week).length} người hoạt động 7 ngày qua` : null} />
        <Card label="Điểm trung bình" value={avg(p.map((x) => x.total)) ?? '–'} note={`trên ${GAM.max_total_score} điểm`} />
        <Card label="Góp ý 7 ngày" value={token ? (fb.state === 'ok' ? fbWeek.length : '…') : '–'} note={token ? `${fbWeek.filter((r) => r.comment).length} có lời góp ý` : 'cần token GitHub (mục Góp ý)'} />
        <Card label="Sao trung bình 30 ngày" value={avg(stars) ?? '–'} note={`${stars.length} lượt chấm`} warn={avg(stars) != null && avg(stars) <= 3.5} />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <H2>Cần làm</H2>
          <ul className="space-y-2 text-sm">
            {drafts.length > 0 && <li><button onClick={() => go('noi-dung')} className="text-left font-semibold text-brand-700 hover:underline">{drafts.length} chỉ số đang chờ duyệt →</button></li>}
            {lowPages.map((x) => <li key={x.page}><button onClick={() => go('gop-y')} className="text-left text-body hover:underline">⚠ {pageName(x.page)} chỉ được {x.avg}★ ({x.n} lượt chấm)</button></li>)}
            {!token && <li><button onClick={() => go('gop-y')} className="text-left text-body hover:underline">Dán token GitHub để xem góp ý →</button></li>}
            {!drafts.length && !lowPages.length && token && <li className="text-charcoal">Không có việc gấp.</li>}
          </ul>
        </div>
        <div>
          <H2>Phân bố cấp bậc</H2>
          {p.length ? (
            <ul className="space-y-2 text-sm">
              {RANK_LIST.map((r) => { const n = p.filter((x) => rankFor(x.total).title === r.title).length; return (
                <li key={r.title} className="grid grid-cols-[minmax(0,12rem)_1fr_2.5rem] items-center gap-3"><RankBadge rank={r} small /><Bar v={n} max={p.length} /><span className="num text-right font-bold text-ink">{n}</span></li>
              ) })}
            </ul>
          ) : <p className="text-sm text-muted">Chưa có người chơi.</p>}
        </div>
      </section>
    </div>
  )
}

function Players({ players, reload }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const rows = players.rows
  const stats = playbooks.filter((pb) => pb.quiz?.length).map((pb) => {
    const sc = rows.map((r) => r.scores?.[pb.playbook_id]).filter((v) => v != null)
    const max = pb.quiz.reduce((a, x) => a + x.points, 0)
    return { pb, n: sc.length, avg: avg(sc), max, dist: Array.from({ length: max / 10 + 1 }, (_, i) => sc.filter((v) => v === i * 10).length) }
  })
  const list = rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.total - a.total || a.updatedAt - b.updatedAt)
  const remove = async (r) => {
    if (!window.confirm(`Xóa "${r.name}" (${r.total} điểm) khỏi bảng xếp hạng? Người này vẫn làm lại được.`)) return
    setBusy(r.uid)
    try { await deletePlayer(r.uid); reload() } catch { window.alert('Chưa xóa được. Kiểm tra mã quản trị đã có trong firestore.rules trên Firebase chưa.') } finally { setBusy('') }
  }
  if (players.state === 'loading' || players.state === 'idle') return <p className="text-sm text-muted">Đang tải người chơi…</p>
  if (players.state === 'error') return <p className="text-sm text-coral">Không đọc được Firestore. Kiểm tra đã tạo Firestore và dán quy tắc chưa (mục Cài đặt). <button onClick={reload} className="underline">Thử lại</button></p>
  return (
    <div className="space-y-8">
      <section>
        <H2>Trắc nghiệm theo Playbook</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-3">Playbook</th><th className="pr-3">Số người làm</th><th className="pr-3">Điểm TB</th><th>Phân bố điểm (0 → tối đa)</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {stats.map((s) => (
                <tr key={s.pb.playbook_id}>
                  <td className="py-2 pr-3"><a href={href({ type: 'pb', id: s.pb.playbook_id })} className="font-semibold text-ink hover:text-brand-700">{s.pb.title.replace(/^Playbook\s*/, '').replace(/:.*$/, '')}</a></td>
                  <td className="num pr-3">{s.n}</td>
                  <td className={`num pr-3 font-bold ${s.avg != null && s.avg < s.max / 2 ? 'text-coral' : 'text-ink'}`}>{s.avg ?? '–'}/{s.max}</td>
                  <td><span className="flex h-3 w-48 overflow-hidden rounded bg-stone-100">{s.dist.map((n, i) => <span key={i} title={`${i * 10} điểm: ${n} người`} style={{ width: `${s.n ? (n / s.n) * 100 : 0}%`, background: ['#B42318', '#F38714', '#FFD200', '#15803D'][Math.min(3, Math.round((i / (s.dist.length - 1)) * 3))] }} />)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Điểm TB thấp dưới một nửa (màu đỏ) là dấu hiệu câu hỏi khó hoặc bài Playbook chưa giải thích đủ.</p>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <H2>Người chơi · {rows.length}</H2>
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên" className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-500" />
            <button onClick={() => downloadCSV('nguoi-choi.csv', [['Tên', 'Tổng điểm', 'Số Playbook', 'Cấp bậc', 'Cập nhật', ...playbooks.map((p) => p.playbook_id)], ...list.map((r) => [r.name, r.total, r.done, rankFor(r.total).title, fmtDate(r.updatedAt), ...playbooks.map((p) => r.scores?.[p.playbook_id] ?? '')])])}
              className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-stone-200 hover:ring-brand-500">Tải CSV</button>
            <button onClick={reload} className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-stone-200 hover:ring-brand-500">Tải lại</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-3">#</th><th className="pr-3">Tên hiển thị</th><th className="pr-3">Điểm</th><th className="pr-3">Playbook</th><th className="pr-3">Cập nhật</th><th /></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {list.slice(0, 500).map((r, i) => (
                <tr key={r.uid}>
                  <td className="num py-2 pr-3 text-muted">{i + 1}</td>
                  <td className="pr-3 font-semibold text-ink">{r.name}</td>
                  <td className="num pr-3 font-bold">{r.total}</td>
                  <td className="num pr-3">{r.done}</td>
                  <td className="pr-3 text-xs text-charcoal">{fmtDate(r.updatedAt)}</td>
                  <td className="text-right"><button onClick={() => remove(r)} disabled={busy === r.uid} className="text-xs font-semibold text-coral hover:underline disabled:opacity-50">Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > 500 && <p className="mt-2 text-xs text-muted">Hiện 500 người đầu, tải CSV để xem hết.</p>}
        </div>
      </section>
    </div>
  )
}

function byPage(rows) {
  const m = {}
  for (const r of rows) {
    const x = (m[r.page] ||= { page: r.page, title: r.title, stars: [], comments: 0 })
    if (r.rating) x.stars.push(r.rating)
    if (r.comment) x.comments++
  }
  return Object.values(m).map((x) => ({ ...x, n: x.stars.length, avg: avg(x.stars), warn: x.stars.length >= 3 && avg(x.stars) <= 3.5 }))
    .sort((a, b) => (b.warn - a.warn) || ((a.avg ?? 9) - (b.avg ?? 9)))
}

function Feedback({ fb, token, setToken, reload }) {
  const [draft, setDraft] = useState('')
  const [page, setPage] = useState('')
  const [onlyText, setOnlyText] = useState(true)
  if (!token || fb.state === 'token') return (
    <div className="max-w-2xl space-y-3 rounded-2xl bg-stone-50 p-5 text-sm leading-relaxed text-body">
      {fb.state === 'token' && <p className="font-semibold text-coral">Token không đọc được repo góp ý (sai, hết hạn hoặc thiếu quyền).</p>}
      <p><b className="text-ink">Góp ý nằm trong repo riêng tư {FEEDBACK_REPO}.</b> Để xem ở đây, tạo một token chỉ-đọc:</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.</li>
        <li>Repository access: Only select repositories → <code>ecom-metrics-feedback</code>.</li>
        <li>Permissions → Contents: <b>Read-only</b>. Tạo rồi chép token.</li>
      </ol>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setToken(draft.trim()) }}>
        <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="github_pat_…" autoComplete="off" className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-500" />
        <button className="rounded-full bg-ink px-4 py-2 font-bold text-white">Lưu trên máy này</button>
      </form>
      <p className="text-xs text-muted">Token chỉ lưu trong trình duyệt của máy này, không gửi đi đâu ngoài GitHub. Đừng dùng token có quyền ghi.</p>
    </div>
  )
  if (fb.state !== 'ok') return <p className="text-sm text-muted">{fb.state === 'error' ? <span className="text-coral">Chưa tải được góp ý. <button onClick={reload} className="underline">Thử lại</button></span> : 'Đang tải góp ý 30 ngày gần nhất…'}</p>
  const pages = byPage(fb.rows)
  const list = fb.rows.filter((r) => (!page || r.page === page) && (!onlyText || r.comment))
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <H2>Sao theo bài · 30 ngày</H2>
          <div className="flex gap-2 text-sm">
            <button onClick={() => downloadCSV('gop-y-30-ngay.csv', [['Thời gian', 'Bài', 'Loại', 'Sao', 'Góp ý', 'Thiết bị'], ...fb.rows.map((r) => [r.t, pageName(r.page), r.kind, r.rating ?? r.rating_ref ?? '', r.comment ?? '', r.device])])} className="rounded-xl bg-white px-3 py-1.5 font-semibold ring-1 ring-stone-200 hover:ring-brand-500">Tải CSV</button>
            <button onClick={reload} className="rounded-xl bg-white px-3 py-1.5 font-semibold ring-1 ring-stone-200 hover:ring-brand-500">Tải lại</button>
            <button onClick={() => setToken('')} className="px-2 text-xs text-muted underline">Xóa token khỏi máy</button>
          </div>
        </div>
        {pages.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-3">Bài</th><th className="pr-3">Lượt chấm</th><th className="pr-3">Sao TB</th><th className="pr-3">Góp ý</th><th /></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {pages.map((x) => (
                  <tr key={x.page}>
                    <td className="py-2 pr-3 font-semibold text-ink">{x.warn && '⚠ '}{pageName(x.page)}</td>
                    <td className="num pr-3">{x.n}</td>
                    <td className={`num pr-3 font-bold ${x.warn ? 'text-coral' : ''}`}>{x.avg ?? '–'}</td>
                    <td className="num pr-3">{x.comments}</td>
                    <td className="text-right"><button onClick={() => { setPage(x.page); setOnlyText(false) }} className="text-xs font-semibold text-brand-700 hover:underline">Xem</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted">Chưa có góp ý trong 30 ngày.</p>}
        <p className="mt-2 text-xs text-muted">⚠: từ 3 lượt chấm trở lên mà trung bình ≤ 3,5 sao. AI rà góp ý tự động lúc 6:47 sáng, 2 ngày một lần, và gửi đề xuất sửa bài về app Claude.</p>
      </section>
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <H2>Góp ý mới nhất</H2>
          <select value={page} onChange={(e) => setPage(e.target.value)} className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-stone-200">
            <option value="">Tất cả bài</option>{pages.map((x) => <option key={x.page} value={x.page}>{pageName(x.page)}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-charcoal"><input type="checkbox" checked={onlyText} onChange={(e) => setOnlyText(e.target.checked)} className="accent-brand-600" />Chỉ góp ý có chữ</label>
        </div>
        <ul className="divide-y divide-stone-100 rounded-2xl ring-1 ring-stone-200">
          {list.slice(0, 200).map((r, i) => (
            <li key={i} className="px-4 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                <span>{fmtDate(new Date(r.t).getTime())}</span>
                {pageHref(r.page) ? <a href={pageHref(r.page)} className="font-semibold text-brand-700 hover:underline">{pageName(r.page)}</a> : <span>{pageName(r.page)}</span>}
                {(r.rating || r.rating_ref) && <span className="font-bold text-[#A16207]">{'★'.repeat(r.rating || r.rating_ref)}</span>}
                <span>{r.device}</span>
              </p>
              {r.comment && <p className="mt-1 whitespace-pre-line text-body">{r.comment}</p>}
            </li>
          ))}
          {!list.length && <li className="px-4 py-3 text-sm text-muted">Không có góp ý phù hợp.</li>}
        </ul>
      </section>
    </div>
  )
}

function Content() {
  const [filter, setFilter] = useState('all')
  const [dom, setDom] = useState('')
  const [typ, setTyp] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const PER = 100
  const fq = q.trim().toLowerCase()
  const list = metricsMaster.filter((m) => (filter === 'all' || (filter === 'draft' ? m.review === 'draft' : filter === 'high' ? m.risk === 'high' && m.review === 'draft' : filter === 'added' ? m.hasSources : !m.hasLesson))
    && (!dom || m.stage === dom) && (!typ || (m.type || 'metric') === typ) && (!fq || `${m.code} ${m.vi_name} ${m.metric_id}`.toLowerCase().includes(fq)))
  const pages = Math.max(1, Math.ceil(list.length / PER))
  const shown = list.slice(page * PER, page * PER + PER)
  useEffect(() => setPage(0), [filter, dom, typ, q])
  const stageNo = (id) => STAGES.findIndex((s) => s.id === id) + 1
  const counts = { all: metricsMaster.length, draft: metricsMaster.filter((m) => m.review === 'draft').length, high: metricsMaster.filter((m) => m.risk === 'high' && m.review === 'draft').length, added: metricsMaster.filter((m) => m.hasSources).length, missing: metricsMaster.filter((m) => !m.hasLesson).length }
  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Khái niệm" value={metricsMaster.length} note={Object.entries(TYPES).map(([k, t]) => `${metricsMaster.filter((m) => (m.type || 'metric') === k).length} ${t.label.toLowerCase()}`).join(' · ')} />
        <Card label="Chờ duyệt" value={counts.draft} warn={counts.draft > 0} note={`${counts.high} bài số liệu, thuế, pháp lý cần duyệt từng bài`} />
        <Card label="Playbook" value={playbooks.length} note={`${playbooks.reduce((a, p) => a + (p.quiz?.length || 0), 0)} câu trắc nghiệm`} />
        <Card label="Video tình huống thật" value={Object.keys(cases).filter((k) => !k.startsWith('_')).length} note="còn lại dùng video bảng giảng tự dựng" />
      </section>
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <H2>Khái niệm · {list.length}</H2>
          {[['all', 'Tất cả'], ['draft', 'Chờ duyệt'], ['high', 'Cần duyệt từng bài'], ['added', 'Có nguồn bài viết'], ['missing', 'Thiếu bài đọc']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? 'bg-ink text-white' : 'bg-stone-100 text-body'}`}>{l} · {counts[k]}</button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <select value={dom} onChange={(e) => setDom(e.target.value)} className="rounded-xl bg-white px-3 py-1.5 ring-1 ring-stone-200"><option value="">Mọi lĩnh vực</option>{STAGES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
          <select value={typ} onChange={(e) => setTyp(e.target.value)} className="rounded-xl bg-white px-3 py-1.5 ring-1 ring-stone-200"><option value="">Mọi loại</option>{Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, mã" className="rounded-xl bg-white px-3 py-1.5 ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-3">Chỉ số</th><th className="pr-3">Lĩnh vực · chủ đề</th><th className="pr-3">Loại</th><th className="pr-3">Trạng thái</th><th className="pr-3">Playbook</th><th className="pr-3">Có thêm</th><th className="pr-3">Nguồn</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {shown.map((m) => (
                <tr key={m.metric_id}>
                  <td className="py-2 pr-3"><a href={href({ type: 'metric', id: m.metric_id })} className="font-semibold text-ink hover:text-brand-700">{m.code}</a><span className="block text-xs text-muted">{m.metric_id}</span></td>
                  <td className="pr-3 text-xs text-charcoal">{stageNo(m.stage)}. {topicById[m.topic]?.label}</td>
                  <td className="pr-3 text-xs">{TYPES[m.type || 'metric']?.label}{m.risk === 'high' && <span className="ml-1 font-bold text-coral" title="Bài số liệu, thuế, pháp lý: duyệt từng bài">!</span>}</td>
                  <td className="pr-3">{m.review === 'draft' ? <span className="rounded-full bg-lemon px-2 py-0.5 text-[11px] font-bold text-navy-ink">Chờ duyệt</span> : <span className="text-xs text-ok">Đã duyệt</span>}{m.basis?.type === 'custom' && <span className="ml-1 text-[11px] text-muted">tự xây</span>}</td>
                  <td className="num pr-3">{m.playbook_refs?.length || 0}</td>
                  <td className="pr-3 text-xs text-charcoal">{[m.simulator && 'giả lập', m.diagnostic_homework && 'bài tập', m.hasCase && 'video thật'].filter(Boolean).join(', ') || '–'}</td>
                  <td className="pr-3 text-xs text-charcoal">{m.hasSources ? 'có' : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-full bg-stone-100 px-3 py-1 font-semibold disabled:opacity-40">← Trước</button>
            <span className="text-charcoal">Trang {page + 1}/{pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-full bg-stone-100 px-3 py-1 font-semibold disabled:opacity-40">Sau →</button>
          </div>
        )}
        <p className="mt-3 text-sm text-charcoal">Sửa nội dung: nhắn Claude (“duyệt …”, “sửa bài …”, dán bài viết để sinh chỉ số mới), hoặc sửa trực tiếp <a className="font-semibold text-brand-700 underline" href={`${REPO}/blob/main/src/data/lessons.json`} target="_blank" rel="noopener noreferrer">lessons.json</a>, <a className="font-semibold text-brand-700 underline" href={`${REPO}/blob/main/data-src/quizzes.json`} target="_blank" rel="noopener noreferrer">quizzes.json</a>, <a className="font-semibold text-brand-700 underline" href={`${REPO}/blob/main/src/data/site.json`} target="_blank" rel="noopener noreferrer">site.json</a> trên GitHub.</p>
      </section>
    </div>
  )
}

function Settings({ user, admin, players, token }) {
  const fbc = site.auth?.firebase || {}
  const promosTemp = (site.promos?.items || []).filter((x) => /^https:\/\/ongchuecom\.com\/?$/.test(x.url)).length
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <H2>Tình trạng cài đặt</H2>
        <ul className="divide-y divide-stone-100">
          <Status ok={authEnabled} label="Đăng nhập Google/Facebook (Firebase)" note={authEnabled ? `Dự án ${fbc.projectId}` : 'Chưa có firebaseConfig trong site.json → auth.firebase'} />
          <Status ok={ADMIN_UIDS.length > 0} label="Quản trị viên" note={ADMIN_UIDS.length ? `${ADMIN_UIDS.length} tài khoản` : 'Chưa có mã quản trị trong site.json → admin.uids'} />
          <Status ok={players.state === 'ok'} label="Firestore (bảng xếp hạng)" note={players.state === 'ok' ? 'Đọc được' : 'Chưa kiểm tra được: cần tạo Firestore và dán firestore.rules'} />
          <Status ok={!!site.lead?.endpoint} label="Apps Script (form Zalo, góp ý)" note={site.lead?.endpoint ? 'Đã có URL ứng dụng web' : 'Chưa có lead.endpoint trong site.json'} />
          <Status ok={!!token} label="Token đọc góp ý trên máy này" note={token ? 'Đã lưu' : 'Dán ở mục Góp ý'} />
          <Status ok={!!site.contact?.zalo || !!site.contact?.facebook} label="Kênh nhắn trực tiếp ở trang chủ" note="site.json → contact.zalo / contact.facebook" />
          <Status ok={promosTemp === 0} label="Link đăng ký sách, khóa học, VCCA" note={promosTemp ? `${promosTemp} link còn trỏ tạm về ongchuecom.com` : 'Đã có link thật'} />
          <Status ok={!!site.drive_folder?.url} label="Thư mục tài liệu Drive" note="site.json → drive_folder.url" />
        </ul>
        {user && !admin && <p className="mt-3 text-xs text-muted">Mã tài khoản của anh/chị: <code>{user.uid}</code></p>}
      </section>
      <section>
        <H2>Liên kết nhanh</H2>
        <ul className="space-y-2 text-sm">
          {[
            [`${REPO}/blob/main/integrations/SETUP-DANG-NHAP.md`, 'Hướng dẫn bật đăng nhập và Firestore'],
            [`${REPO}/blob/main/integrations/sheet-receiver.gs`, 'Apps Script nhận form Zalo và góp ý'],
            [`${REPO}/blob/main/integrations/firestore.rules`, 'Quy tắc bảo mật Firestore'],
            fbc.projectId && [`https://console.firebase.google.com/project/${fbc.projectId}/overview`, 'Firebase console'],
            [`https://github.com/${FEEDBACK_REPO}`, 'Repo góp ý (riêng tư)'],
            [`${REPO}/actions`, 'Lượt dựng web (GitHub Actions)'],
            ['https://search.google.com/search-console', 'Google Search Console (gửi sitemap)'],
            ['https://sheets.google.com', 'Google Sheets (form Zalo)'],
          ].filter(Boolean).map(([u, l]) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{l} →</a></li>)}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">Trang quản trị không có trong sitemap và được đánh dấu không lập chỉ mục. Dữ liệu chỉ đọc được bằng quyền của người đăng nhập: người chơi qua quy tắc Firestore, góp ý qua token trên máy.</p>
      </section>
    </div>
  )
}
