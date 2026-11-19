import { useCallback, useEffect, useState } from 'react'
import { metricById, metricsMaster, DEFAULT_METRIC_ID, playbookById } from './data/index.js'
import { PlaybookPage } from './components/Playbooks.jsx'
import Sidebar from './components/Sidebar.jsx'
import MetricLesson from './components/MetricLesson.jsx'
import MetricSimulator from './components/MetricSimulator.jsx'
import DiagnosticHomework from './components/DiagnosticHomework.jsx'
import HealthCheck from './components/HealthCheck.jsx'
import PnLSimulator from './components/PnLSimulator.jsx'
import Templates from './components/Templates.jsx'
import Resources from './components/Resources.jsx'
import Promos from './components/Promos.jsx'
import CaseStudy from './components/CaseStudy.jsx'
import { H2 } from './components/MetricLesson.jsx'

const TABS = [
  { id: 'sim', label: 'Giả lập', desc: 'Kéo thanh trượt, xem ngưỡng cảnh báo' },
  { id: 'homework', label: 'Bài tập chẩn đoán', desc: 'Tính tay rồi ra quyết định' },
  { id: 'health', label: 'Khám sức khỏe shop', desc: 'Nhập số thật, nhận chẩn đoán' },
  { id: 'pnl', label: 'P&L tổng thể', desc: 'Mô phỏng lãi lỗ một tháng' },
  { id: 'templates', label: 'Bảng tính mẫu', desc: 'P&L, unit economics tải về' },
]
const TAB_IDS = TABS.map((t) => t.id)

// URL dạng #vn_fin_cm2, #vn_fin_cm2/homework, hoặc #pb_01_profit_reality cho Playbook
function readHash() {
  const [id, tab] = decodeURIComponent(window.location.hash.slice(1)).split('/')
  if (playbookById[id]) return { pb: id, id: null, tab: null }
  return { pb: null, id: metricById[id] ? id : DEFAULT_METRIC_ID, tab: TAB_IDS.includes(tab) ? tab : null }
}

function Brand({ compact = false }) {
  return (
    <div className="leading-tight text-white">
      <p className="font-display text-[15px] font-black">Ecom Metrics Academy</p>
      {!compact && <p className="text-xs text-white/85">Hiểu số trước khi đốt tiền</p>}
    </div>
  )
}

export default function App() {
  const [selectedMetricId, setSelectedMetricId] = useState(() => readHash().id || DEFAULT_METRIC_ID)
  const [pbId, setPbId] = useState(() => readHash().pb)
  const [tab, setTab] = useState(() => readHash().tab || 'sim')
  const [drawer, setDrawer] = useState(false)
  const metric = metricById[selectedMetricId]
  const idx = metricsMaster.findIndex((m) => m.metric_id === selectedMetricId)
  const prev = metricsMaster[idx - 1]
  const next = metricsMaster[idx + 1]

  useEffect(() => {
    const onHash = () => {
      const h = readHash()
      setPbId(h.pb)
      if (h.id) setSelectedMetricId(h.id)
      if (h.tab) setTab(h.tab)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const nextHash = pbId ? `#${pbId}` : `#${selectedMetricId}${tab !== 'sim' ? '/' + tab : ''}`
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash)
    document.title = pbId ? `${playbookById[pbId].title} – Ecom Metrics Academy` : `${metric.code} · ${metric.vi_name} – Ecom Metrics Academy`
  }, [selectedMetricId, tab, metric, pbId])

  // Khóa cuộn trang khi mở ngăn kéo trên mobile
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  const select = useCallback((id) => {
    if (!metricById[id]) return
    setSelectedMetricId(id)
    setPbId(null)
    setDrawer(false)
    window.history.pushState(null, '', `#${id}${tab !== 'sim' ? '/' + tab : ''}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  const openPlaybook = useCallback((id) => {
    if (!playbookById[id]) return
    setPbId(id)
    setDrawer(false)
    window.history.pushState(null, '', `#${id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const openHomework = useCallback(() => {
    setTab('homework')
    requestAnimationFrame(() => document.getElementById('thuc-hanh')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [])

  return (
    <div className="min-h-full lg:flex">
      {/* Thanh trên cùng trên mobile */}
      <header className="book-band sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 lg:hidden">
        <Brand compact />
        <button onClick={() => setDrawer(true)} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2 font-display text-sm font-bold text-brand-600" aria-expanded={drawer}>
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M3 5h14v2H3zM3 9h14v2H3zM3 13h14v2H3z" /></svg>
          Chỉ số · Playbook
        </button>
      </header>

      {/* Ngăn kéo chọn chỉ số trên mobile */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Chọn chỉ số">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} aria-label="Đóng" />
          <div className="fade-up absolute inset-x-0 bottom-0 flex h-[88dvh] flex-col rounded-t-3xl bg-white pt-3">
            <div className="flex items-center justify-between px-4 pb-3">
              <p className="font-display text-lg font-black text-ink">Chỉ số & Playbook</p>
              <button onClick={() => setDrawer(false)} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-body">Đóng</button>
            </div>
            <Sidebar selected={pbId ? null : selectedMetricId} onSelect={select} selectedPb={pbId} onOpenPlaybook={openPlaybook} />
          </div>
        </div>
      )}

      {/* Thanh bên trên desktop */}
      <aside className="hidden border-r border-stone-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col">
        <div className="book-band mb-3 px-5 pb-4 pt-5">
          <Brand />
          <p className="mt-2 text-xs text-white/85">{metricsMaster.length} chỉ số · 10 Playbook · 7 khâu</p>
        </div>
        <Sidebar selected={pbId ? null : selectedMetricId} onSelect={select} selectedPb={pbId} onOpenPlaybook={openPlaybook} />
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl space-y-10 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {pbId ? (
            <PlaybookPage playbook={playbookById[pbId]} onSelectMetric={select} onOpen={openPlaybook} />
          ) : (<>
          <MetricLesson metric={metric} onSelect={select} onHomework={openHomework} onOpenPlaybook={openPlaybook} />

          <CaseStudy key={`case-${selectedMetricId}`} metric={metric} onSelect={select} />

          <section id="thuc-hanh" className="scroll-mt-20 space-y-4">
            <H2>Tự tay tính, tự ra quyết định</H2>
            <div role="tablist" aria-label="Chế độ thực hành" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {TABS.map((t) => {
                const has = t.id === 'sim' ? !!metric.simulator : t.id === 'homework' ? !!metric.diagnostic_homework : true
                const on = tab === t.id
                return (
                  <button key={t.id} role="tab" aria-selected={on} onClick={() => setTab(t.id)} title={t.desc}
                    className={`shrink-0 rounded-full px-4 py-2 font-display text-sm font-bold transition ${
                      on ? 'bg-brand-600 text-white' : 'bg-white text-brand-700 ring-1 ring-brand-500/60 hover:bg-brand-50'
                    }`}>
                    {t.label}
                    {!has && <span className={`ml-1.5 text-[11px] font-semibold ${on ? 'text-white/60' : 'text-muted'}`}>· chưa có</span>}
                  </button>
                )
              })}
            </div>
            <div role="tabpanel">
              {tab === 'sim' && <MetricSimulator key={selectedMetricId} metric={metric} onSelect={select} />}
              {tab === 'homework' && <DiagnosticHomework key={selectedMetricId} metric={metric} onSelect={select} />}
              {tab === 'health' && <HealthCheck />}
              {tab === 'pnl' && <PnLSimulator selected={selectedMetricId} />}
              {tab === 'templates' && <Templates />}
            </div>
          </section>

          {/* Chuyển bài */}
          <nav aria-label="Chuyển bài" className="grid grid-cols-2 gap-3">
            {[prev, next].map((m, k) => m ? (
              <button key={m.metric_id} onClick={() => select(m.metric_id)}
                className={`rounded-xl p-2 transition hover:bg-brand-50 ${k ? 'text-right' : 'text-left'}`}>
                <p className="eyebrow text-muted">{k ? 'Bài tiếp →' : '← Bài trước'}</p>
                <p className="mt-1 font-display font-extrabold text-brand-600">{m.code}</p>
                <p className="truncate text-xs text-charcoal">{m.vi_name}</p>
              </button>
            ) : <span key={k} />)}
          </nav>

          </>)}

          {!pbId && <Resources metric={metric} />}
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
