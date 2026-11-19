import { useCallback, useEffect, useState } from 'react'
import { metricById, metricsMaster, playbookById, LEARNING_PATH } from './data/index.js'
import { href, parse } from './lib/route.js'
import { PlaybookPage } from './components/Playbooks.jsx'
import Sidebar from './components/Sidebar.jsx'
import MetricLesson, { H2 } from './components/MetricLesson.jsx'
import MetricSimulator from './components/MetricSimulator.jsx'
import DiagnosticHomework from './components/DiagnosticHomework.jsx'
import ShopCheck from './components/ShopCheck.jsx'
import Templates from './components/Templates.jsx'
import Resources from './components/Resources.jsx'
import Promos from './components/Promos.jsx'
import CaseStudy from './components/CaseStudy.jsx'
import Home from './components/Home.jsx'
import SearchDialog, { SearchButton } from './components/SearchDialog.jsx'

const TABS = [
  { id: 'sim', label: 'Giả lập', desc: 'Kéo thanh trượt, xem ngưỡng cảnh báo', need: 'simulator' },
  { id: 'homework', label: 'Bài tập chẩn đoán', desc: 'Tính tay rồi ra quyết định', need: 'diagnostic_homework' },
  { id: 'health', label: 'Khám sức khỏe shop', desc: 'Nhập P&L tháng, nhận chẩn đoán' },
  { id: 'templates', label: 'Bảng tính mẫu', desc: 'P&L, unit economics tải về' },
]
const tabsFor = (m) => TABS.filter((t) => !t.need || m?.[t.need])

function Brand({ compact = false, onHome }) {
  return (
    <a href={href({ type: 'home' })} onClick={(e) => { e.preventDefault(); onHome() }} className="block leading-tight text-white">
      <p className="font-display text-[15px] font-black">Ecom Metrics Academy</p>
      {!compact && <p className="text-xs text-white/85">Hiểu số trước khi đốt tiền</p>}
    </a>
  )
}

const TITLE = 'Ecom Metrics Academy'

export default function App() {
  const [route, setRoute] = useState(() => parse())
  const [drawer, setDrawer] = useState(false)
  const [searching, setSearching] = useState(false)
  const metric = route.type === 'metric' ? metricById[route.id] : null
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
      : route.type === 'health' ? `Khám sức khỏe shop · ${TITLE}` : `${TITLE} · Ông chú Ecom`
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
  const pathIdx = metric ? LEARNING_PATH.indexOf(metric.metric_id) : -1
  const order = pathIdx >= 0 ? LEARNING_PATH : metricsMaster.map((m) => m.metric_id)
  const at = metric ? order.indexOf(metric.metric_id) : -1
  const prev = metricById[order[at - 1]], next = metricById[order[at + 1]]

  const side = (
    <Sidebar selected={metric?.metric_id ?? null} onSelect={select} selectedPb={route.type === 'pb' ? route.id : null} onOpenPlaybook={openPlaybook} />
  )

  return (
    <div className="min-h-full lg:flex">
      <SearchDialog open={searching} onClose={() => setSearching(false)} onSelectMetric={select} onOpenPlaybook={openPlaybook} />

      {/* Thanh trên cùng trên mobile */}
      <header className="book-band sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 lg:hidden">
        <Brand compact onHome={openHome} />
        <div className="flex shrink-0 items-center gap-2">
          <SearchButton variant="icon" onClick={() => setSearching(true)} />
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
              <button onClick={openHome} className="font-display text-lg font-black text-ink">Trang chủ</button>
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
        </div>
        {side}
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl space-y-10 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {route.type === 'home' && <Home onSelectMetric={select} onOpenPlaybook={openPlaybook} onOpenHealth={openHealth} onSearch={() => setSearching(true)} />}

          {route.type === 'health' && (
            <div className="space-y-4">
              <header>
                <p className="eyebrow text-brand-600">Công cụ</p>
                <h1 className="mt-1.5 font-display text-3xl font-black text-ink">Khám sức khỏe shop</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-charcoal">Điền P&L một tháng. Web tính Net Sales, CM1, CM2, CM3, lãi ròng, ROAS hòa vốn, rồi chỉ ra chỗ đang rò tiền và Playbook nên đọc.</p>
              </header>
              <ShopCheck onSelectMetric={select} onOpenPlaybook={openPlaybook} />
            </div>
          )}

          {route.type === 'pb' && <PlaybookPage playbook={playbookById[route.id]} onSelectMetric={select} onOpen={openPlaybook} />}

          {metric && (<>
            {pathIdx >= 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-brand-50 px-4 py-2 text-sm">
                <span className="font-display font-extrabold text-brand-700">Lộ trình học · Bài {pathIdx + 1}/{LEARNING_PATH.length}</span>
                <span className="flex gap-1" aria-hidden="true">{LEARNING_PATH.map((id, i) => <i key={id} className={`h-1.5 w-4 rounded-full ${i <= pathIdx ? 'bg-brand-500' : 'bg-brand-100'}`} />)}</span>
                {next && <button onClick={() => select(next.metric_id)} className="ml-auto font-semibold text-brand-700 hover:underline">Tiếp: {next.code} →</button>}
              </div>
            )}

            <MetricLesson metric={metric} onSelect={select} onHomework={openHomework} onOpenPlaybook={openPlaybook} />

            <CaseStudy key={`case-${metric.metric_id}`} metric={metric} onSelect={select} />

            <section id="thuc-hanh" className="scroll-mt-20 space-y-4">
              <H2>Tự tay tính, tự ra quyết định</H2>
              <div role="tablist" aria-label="Chế độ thực hành" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                {tabs.map((t) => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} title={t.desc}
                    className={`shrink-0 rounded-full px-4 py-2 font-display text-sm font-bold transition ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-brand-700 ring-1 ring-brand-500/60 hover:bg-brand-50'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div role="tabpanel">
                {tab === 'sim' && <MetricSimulator key={metric.metric_id} metric={metric} onSelect={select} />}
                {tab === 'homework' && <DiagnosticHomework key={metric.metric_id} metric={metric} onSelect={select} />}
                {tab === 'health' && <ShopCheck onSelectMetric={select} onOpenPlaybook={openPlaybook} />}
                {tab === 'templates' && <Templates />}
              </div>
            </section>

            <nav aria-label="Chuyển bài" className="grid grid-cols-2 gap-3">
              {[prev, next].map((m, k) => m ? (
                <a key={m.metric_id} href={href({ type: 'metric', id: m.metric_id })} onClick={(e) => { e.preventDefault(); select(m.metric_id) }}
                  className={`rounded-xl p-2 transition hover:bg-brand-50 ${k ? 'text-right' : 'text-left'}`}>
                  <p className="eyebrow text-muted">{k ? (pathIdx >= 0 ? 'Bài tiếp trong lộ trình →' : 'Bài tiếp →') : '← Bài trước'}</p>
                  <p className="mt-1 font-display font-extrabold text-brand-600">{m.code}</p>
                  <p className="truncate text-xs text-charcoal">{m.vi_name}</p>
                </a>
              ) : <span key={k} />)}
            </nav>

            <Resources metric={metric} />
          </>)}

          <Promos />

          <footer className="border-t border-stone-200 pt-5 text-xs leading-relaxed text-muted">
            Số liệu trong ví dụ, video và bài tập là minh họa. Số tham khảo chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.
            <br /><span className="font-display font-extrabold text-charcoal">Ông chú Ecom</span>
          </footer>
        </div>
      </main>
    </div>
  )
}
