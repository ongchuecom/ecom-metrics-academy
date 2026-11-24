import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { metricById, metricsMaster, playbookById, PATHS, pathById, topicById } from './data/index.js'
import { href, parse } from './lib/route.js'
import { PlaybookPage } from './components/Playbooks.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Privacy from './components/Privacy.jsx'
import TopicPage from './components/TopicPage.jsx'
// trang quản trị chỉ tải khi có người mở /quan-tri/
const Admin = lazy(() => import('./components/Admin.jsx'))
const Advisor = lazy(() => import('./components/Advisor.jsx'))
import { advisorEnabled } from './lib/advisor.js'
import { LoginDialog, AccountButton } from './components/Login.jsx'
import { useAuth } from './lib/auth.jsx'
import { syncAccount } from './lib/sync.js'
import { flushOutbox } from './lib/api.js'
import Sidebar from './components/Sidebar.jsx'
import MetricLesson, { H2 } from './components/MetricLesson.jsx'
import MetricSimulator from './components/MetricSimulator.jsx'
import DiagnosticHomework from './components/DiagnosticHomework.jsx'
import ShopCheck from './components/ShopCheck.jsx'
import Templates from './components/Templates.jsx'
import Promos from './components/Promos.jsx'
import CaseStudy from './components/CaseStudy.jsx'
import Home from './components/Home.jsx'
import SearchDialog, { SearchButton } from './components/SearchDialog.jsx'
import LeadForm from './components/LeadForm.jsx'
import PageFeedback from './components/PageFeedback.jsx'
import { useConcept, prefetchConcept } from './lib/content.js'
import cases from './data/cases.json'

// Mục lục trong bài (máy tính): nhảy tới từng phần mà không phải rời trang
function Toc({ metric, hasPractice }) {
  const L = metric.lesson || {}
  const items = [
    (metric.formula?.readable || L.tree) && ['cong-thuc', metric.formula?.readable ? 'Công thức' : 'Cấu trúc'],
    L.breakdown && ['vi-du', 'Ví dụ có số'],
    L.sections?.[0] && ['nguong', L.sections[0].title],
    L.mistakes && ['hay-hieu-sai', 'Hay hiểu sai'],
    ['video', 'Xem nhanh 1 phút'],
    (metric.relationships?.upstream_drivers?.length || metric.relationships?.downstream_impacts?.length || metric.relationships?.related?.length) && ['so-do', 'Nối với khái niệm nào'],
    cases[metric.metric_id] && ['tinh-huong', 'Tình huống thực tế'],
    hasPractice && ['thuc-hanh', 'Tự tay tính'],
  ].filter(Boolean)
  return (
    <nav aria-label="Trong bài này" className="hidden xl:block">
      <div className="sticky top-10 space-y-1 border-l border-stone-200 pl-4 text-sm">
        <p className="eyebrow mb-2 text-muted">Trong bài này</p>
        {items.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            className="block py-0.5 leading-snug text-charcoal hover:text-brand-700">{label}</a>
        ))}
      </div>
    </nav>
  )
}

const TABS = [
  { id: 'sim', label: 'Giả lập', desc: 'Kéo thanh trượt, xem ngưỡng cảnh báo', need: 'simulator' },
  { id: 'homework', label: 'Bài tập chẩn đoán', desc: 'Tính tay rồi ra quyết định', need: 'diagnostic_homework' },
]
const tabsFor = (m) => TABS.filter((t) => !t.need || m?.[t.need])

function Brand({ compact = false, onHome }) {
  return (
    <a href={href({ type: 'home' })} onClick={(e) => { e.preventDefault(); onHome() }} className="block leading-tight text-white">
      <p className="font-display text-[15px] font-black">Ecom Metrics Academy</p>
      {!compact && <p className="text-xs text-white/85">Khái niệm Ecom &amp; khởi nghiệp</p>}
    </a>
  )
}

const TITLE = 'Ecom Metrics Academy'

// Khung chờ khi nội dung bài đang tải (chỉ mục đã có sẵn tên, định nghĩa)
function LessonSkeleton({ metric, error }) {
  return (
    <article className="space-y-4" aria-busy={!error}>
      <header>
        <h1 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">{metric.code}</h1>
        <p className="mt-1 text-sm text-muted">{metric.vi_name}</p>
        {metric.subtitle && <p className="mt-1 text-base font-semibold text-charcoal">{metric.subtitle}</p>}
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-body">{metric.definition}</p>
      </header>
      {error ? <p className="text-sm text-coral">Chưa tải được nội dung bài. <button onClick={() => window.location.reload()} className="underline">Tải lại trang</button></p>
        : <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-100" />)}</div>}
    </article>
  )
}

export default function App() {
  const [route, setRoute] = useState(() => parse())
  const [drawer, setDrawer] = useState(false)
  const [searching, setSearching] = useState(false)
  const metric = route.type === 'metric' ? metricById[route.id] : null
  const { data: full, error: fullErr } = useConcept(metric?.metric_id)
  const tabs = tabsFor(metric)
  const tab = metric && tabs.some((t) => t.id === route.tab) ? route.tab : tabs[0]?.id

  // Điều hướng: đổi URL thật, giữ nút Back của trình duyệt
  const go = useCallback((r, { replace = false, scroll = true } = {}) => {
    const url = href(r)
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    setRoute(r)
    setDrawer(false)
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const select = useCallback((id) => metricById[id] && go({ type: 'metric', id }), [go])
  const openPlaybook = useCallback((id) => playbookById[id] && go({ type: 'pb', id }), [go])
  const openHome = useCallback(() => go({ type: 'home' }), [go])
  const openHealth = useCallback(() => go({ type: 'health' }), [go])
  const openLeaderboard = useCallback(() => go({ type: 'leaderboard' }), [go])
  const openTopic = useCallback((id) => go({ type: 'topic', id }), [go])
  const openAdvisor = useCallback((about) => go({ type: 'advisor', about: about || '' }), [go])
  // Đăng nhập xong thì gộp điểm trắc nghiệm trên máy với điểm theo tài khoản
  const { user } = useAuth()
  useEffect(() => { if (user) syncAccount(user).catch(() => {}) }, [user?.uid]) // eslint-disable-line react-hooks/exhaustive-deps
  // góp ý gửi lỗi lần trước: gửi lại khi trang đã tải xong
  useEffect(() => { const t = setTimeout(() => flushOutbox(), 4000); return () => clearTimeout(t) }, [])
  const setTab = useCallback((t) => go({ type: 'metric', id: route.id, tab: t }, { replace: true, scroll: false }), [go, route.id])

  // Link cũ dạng #id → đường dẫn mới; nút Back/Forward
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', href(route))
    const onPop = () => setRoute(parse())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = route.type === 'metric' ? `${metric.code}: ${metric.vi_name} · ${TITLE}`
      : route.type === 'pb' ? `${playbookById[route.id].title} · ${TITLE}`
      : route.type === 'health' ? `Khám sức khỏe shop · ${TITLE}`
      : route.type === 'leaderboard' ? `Bảng xếp hạng trắc nghiệm · ${TITLE}`
      : route.type === 'privacy' ? `Chính sách riêng tư · ${TITLE}`
      : route.type === 'admin' ? `Quản trị · ${TITLE}`
      : route.type === 'topic' ? `${topicById[route.id]?.label} · ${TITLE}`
      : route.type === 'advisor' ? `Cố vấn AI · ${TITLE}` : `${TITLE} · Ông chú Ecom`
  }, [route, metric])

  // Phím tắt tìm kiếm: Ctrl/⌘ + K hoặc "/"
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !/input|textarea/i.test(e.target.tagName))) { e.preventDefault(); setSearching(true) }
      if (e.key === 'Escape') setDrawer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { document.body.style.overflow = drawer || searching ? 'hidden' : '' }, [drawer, searching])

  const openHomework = useCallback(() => {
    setTab('homework')
    requestAnimationFrame(() => document.getElementById('thuc-hanh')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [setTab])

  // Bài trước / tiếp: theo lộ trình nếu bài nằm trong lộ trình, còn lại theo thứ tự khâu
  // Lộ trình đang theo: lộ trình người đọc chọn (lưu trên máy) nếu có bài này, không thì lộ trình đầu tiên chứa bài này
  const chosen = (() => { try { return pathById[localStorage.getItem('ema-path')] } catch { return null } })()
  const path = metric ? (chosen?.items.includes(metric.metric_id) ? chosen : PATHS.find((p) => p.items.includes(metric.metric_id))) : null
  const LEARNING_PATH = path?.items || []
  const pathIdx = metric && path ? LEARNING_PATH.indexOf(metric.metric_id) : -1
  // ngoài lộ trình: bài trước/tiếp theo thứ tự trong cùng chủ đề rồi tới chủ đề sau
  const order = pathIdx >= 0 ? LEARNING_PATH : metricsMaster.map((m) => m.metric_id)
  const at = metric ? order.indexOf(metric.metric_id) : -1
  const prev = metricById[order[at - 1]], next = metricById[order[at + 1]]

  const side = (
    <Sidebar selected={metric?.metric_id ?? null} onSelect={select} selectedPb={route.type === 'pb' ? route.id : null} onOpenPlaybook={openPlaybook} selectedTopic={route.type === 'topic' ? route.id : null} onOpenTopic={openTopic} />
  )

  return (
    <div className="min-h-full lg:flex">
      <LoginDialog />
      <SearchDialog open={searching} onClose={() => setSearching(false)} onSelectMetric={select} onOpenPlaybook={openPlaybook} onOpenTopic={openTopic} />

      {/* Thanh trên cùng trên mobile */}
      <header className="book-band sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 lg:hidden">
        <Brand compact onHome={openHome} />
        <div className="flex shrink-0 items-center gap-2">
          <SearchButton variant="icon" onClick={() => setSearching(true)} />
          <AccountButton variant="icon" />
          <button onClick={() => setDrawer(true)} className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-display text-sm font-bold text-brand-600" aria-expanded={drawer}>
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M3 5h14v2H3zM3 9h14v2H3zM3 13h14v2H3z" /></svg>
            Mục lục
          </button>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Mục lục">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} aria-label="Đóng" />
          <div className="fade-up absolute inset-x-0 bottom-0 flex h-[88dvh] flex-col rounded-t-3xl bg-white pt-3">
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="flex items-baseline gap-4">
                <button onClick={openHome} className="font-display text-lg font-black text-ink">Trang chủ</button>
                <button onClick={openLeaderboard} className="text-sm font-semibold text-brand-700">Bảng xếp hạng</button>
                {advisorEnabled && <button onClick={() => openAdvisor()} className="text-sm font-semibold text-brand-700">Cố vấn AI</button>}
              </span>
              <button onClick={() => setDrawer(false)} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-body">Đóng</button>
            </div>
            {side}
          </div>
        </div>
      )}

      <aside className="hidden border-r border-stone-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col">
        <div className="book-band mb-3 space-y-3 px-5 pb-4 pt-5">
          <Brand onHome={openHome} />
          <SearchButton onClick={() => setSearching(true)} />
          <button onClick={openHealth} className="w-full rounded-xl bg-white/15 px-3 py-2 text-left text-sm font-bold text-white hover:bg-white/25">Khám sức khỏe shop →</button>
          {advisorEnabled && <button onClick={() => openAdvisor()} className="w-full rounded-xl bg-white/15 px-3 py-2 text-left text-sm font-bold text-white hover:bg-white/25">Hỏi Cố vấn AI →</button>}
          <button onClick={openLeaderboard} className="w-full rounded-xl px-3 py-1 text-left text-sm font-semibold text-white/90 hover:text-white">Bảng xếp hạng trắc nghiệm →</button>
          <AccountButton />
        </div>
        {side}
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {route.type === 'home' && <Home onSelectMetric={select} onOpenPlaybook={openPlaybook} onOpenHealth={openHealth} onSearch={() => setSearching(true)} />}

          {route.type === 'health' && (
            <div className="space-y-4">
              <header>
                <p className="eyebrow text-brand-600">Công cụ</p>
                <h1 className="mt-1.5 font-display text-3xl font-black text-ink">Khám sức khỏe shop</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-charcoal">Điền P&L một tháng. Web tính Net Sales, CM1, CM2, CM3, lãi ròng, ROAS hòa vốn, rồi chỉ ra chỗ đang rò tiền và Playbook nên đọc.</p>
              </header>
              <ShopCheck onSelectMetric={select} onOpenPlaybook={openPlaybook} />
              <details className="group pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700 hover:underline">Tải bảng tính mẫu P&L và unit economics</summary>
                <div className="mt-4"><Templates /></div>
              </details>
            </div>
          )}

          {route.type === 'pb' && <PlaybookPage playbook={playbookById[route.id]} onSelectMetric={select} onOpen={openPlaybook} onOpenLeaderboard={openLeaderboard} />}
          {route.type === 'leaderboard' && <Leaderboard onOpenPlaybook={openPlaybook} />}
          {route.type === 'privacy' && <Privacy />}
          {route.type === 'topic' && <TopicPage key={route.id} id={route.id} onSelectMetric={select} onOpenTopic={openTopic} onOpenPlaybook={openPlaybook} />}
          {route.type === 'advisor' && <Suspense fallback={<p className="text-sm text-muted">Đang tải Cố vấn AI…</p>}><Advisor key={route.about} initialConceptId={route.about} onSelectMetric={select} onOpenPlaybook={openPlaybook} /></Suspense>}
          {route.type === 'admin' && <Suspense fallback={<p className="text-sm text-muted">Đang tải trang quản trị…</p>}><Admin /></Suspense>}

          {metric && (<div className="xl:grid xl:grid-cols-[minmax(0,1fr)_180px] xl:gap-10"><div className="min-w-0 space-y-10">
            {pathIdx >= 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-brand-50 px-4 py-2 text-sm">
                <span className="font-display font-extrabold text-brand-700">{path.title} · Bài {pathIdx + 1}/{LEARNING_PATH.length}</span>
                <span className="flex gap-1" aria-hidden="true">{LEARNING_PATH.map((id, i) => <i key={id} className={`h-1.5 w-4 rounded-full ${i <= pathIdx ? 'bg-brand-500' : 'bg-brand-100'}`} />)}</span>
                {next && <button onClick={() => select(next.metric_id)} className="ml-auto font-semibold text-brand-700 hover:underline">Tiếp: {next.code} →</button>}
              </div>
            )}

            {full ? <>
            <MetricLesson metric={full} onSelect={select} onHomework={openHomework} onOpenPlaybook={openPlaybook} />

            <CaseStudy key={`case-${metric.metric_id}`} metric={full} onSelect={select} />
            </> : <LessonSkeleton metric={metric} error={fullErr} />}

            {tabs.length > 0 && (
              <section id="thuc-hanh" className="scroll-mt-20 space-y-4">
                <H2>Tự tay tính</H2>
                {tabs.length > 1 && (
                  <div role="tablist" aria-label="Chế độ thực hành" className="flex gap-5 border-b border-stone-200 text-sm">
                    {tabs.map((t) => (
                      <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} title={t.desc}
                        className={`-mb-px border-b-2 pb-2 font-display font-bold transition ${tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-charcoal hover:text-ink'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                <div role="tabpanel">
                  {full && tab === 'sim' && <MetricSimulator key={metric.metric_id} metric={full} onSelect={select} />}
                  {full && tab === 'homework' && <DiagnosticHomework key={metric.metric_id} metric={full} onSelect={select} />}
                </div>
              </section>
            )}

            <p className="text-sm text-charcoal">Muốn tính {metric.code} bằng số của shop mình? <button onClick={openHealth} className="font-semibold text-brand-700 hover:underline">Khám sức khỏe shop →</button>
              {advisorEnabled && <> hoặc <button onClick={() => openAdvisor(metric.metric_id)} className="font-semibold text-brand-700 hover:underline">hỏi Cố vấn AI về {metric.code} →</button></>}</p>

            <PageFeedback key={metric.metric_id} page={metric.metric_id} title={`${metric.code}: ${metric.subtitle || metric.vi_name}`} shareText={metric.definition} />

            <nav aria-label="Chuyển bài" className="grid grid-cols-2 gap-3">
              {[prev, next].map((m, k) => m ? (
                <a key={m.metric_id} href={href({ type: 'metric', id: m.metric_id })} onClick={(e) => { e.preventDefault(); select(m.metric_id) }} onMouseEnter={() => prefetchConcept(m.metric_id)}
                  className={`rounded-xl p-2 transition hover:bg-brand-50 ${k ? 'text-right' : 'text-left'}`}>
                  <p className="eyebrow text-muted">{k ? (pathIdx >= 0 ? 'Bài tiếp trong lộ trình →' : 'Bài tiếp →') : '← Bài trước'}</p>
                  <p className="mt-1 font-display font-extrabold text-brand-600">{m.code}</p>
                  <p className="truncate text-xs text-charcoal">{m.vi_name}</p>
                </a>
              ) : <span key={k} />)}
            </nav>

            <LeadForm compact source={metric.metric_id} title={`Muốn biết ${metric.code} của shop mình đang ổn chưa?`} text="Để lại tên và số Zalo, Ông chú Ecom nhắn riêng để xem cùng anh." />
          </div>{full && <Toc metric={full} hasPractice={tabs.length > 0} />}</div>)}

          {route.type !== 'home' && route.type !== 'admin' && route.type !== 'advisor' && <Promos compact />}

          <footer className="border-t border-stone-200 pt-5 text-xs leading-relaxed text-muted">
            Số liệu trong ví dụ, video và bài tập là minh họa. Số tham khảo chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.
            <br /><span className="font-display font-extrabold text-charcoal">Ông chú Ecom</span>
            {' · '}<a href={href({ type: 'privacy' })} onClick={(e) => { e.preventDefault(); go({ type: 'privacy' }) }} className="underline hover:text-brand-700">Chính sách riêng tư</a>
          </footer>
        </div>
      </main>
    </div>
  )
}
