import { useCallback, useEffect, useState } from 'react'
import { metricById, metricsMaster, DEFAULT_METRIC_ID } from './data/index.js'
import Sidebar from './components/Sidebar.jsx'
import MetricLesson from './components/MetricLesson.jsx'
import MetricSimulator from './components/MetricSimulator.jsx'
import DiagnosticHomework from './components/DiagnosticHomework.jsx'
import HealthCheck from './components/HealthCheck.jsx'
import PnLSimulator from './components/PnLSimulator.jsx'
import Templates from './components/Templates.jsx'

const TABS = [
  { id: 'sim', label: 'Giả lập chỉ số', desc: 'Kéo thanh trượt, xem ngưỡng cảnh báo' },
  { id: 'homework', label: 'Bài tập chẩn đoán', desc: 'Tính tay rồi ra quyết định' },
  { id: 'health', label: 'Khám sức khỏe shop', desc: 'Nhập số thật, nhận chẩn đoán' },
  { id: 'pnl', label: 'Mô phỏng tổng thể', desc: 'P&L một tháng của shop' },
  { id: 'templates', label: 'Bảng tính mẫu', desc: 'P&L, unit economics tải về' },
]
const TAB_IDS = TABS.map((t) => t.id)

// URL dạng #fin_roas hoặc #fin_roas/homework để chia sẻ đúng bài
function readHash() {
  const [id, tab] = decodeURIComponent(window.location.hash.slice(1)).split('/')
  return { id: metricById[id] ? id : DEFAULT_METRIC_ID, tab: TAB_IDS.includes(tab) ? tab : null }
}

export default function App() {
  const [selectedMetricId, setSelectedMetricId] = useState(() => readHash().id)
  const [tab, setTab] = useState(() => readHash().tab || 'sim')
  const metric = metricById[selectedMetricId]

  useEffect(() => {
    const onHash = () => {
      const h = readHash()
      setSelectedMetricId(h.id)
      if (h.tab) setTab(h.tab)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const next = `#${selectedMetricId}${tab !== 'sim' ? '/' + tab : ''}`
    if (window.location.hash !== next) window.history.replaceState(null, '', next)
    document.title = `${metric.code} · ${metric.vi_name} – Ecom Metrics Academy`
  }, [selectedMetricId, tab, metric])

  const select = useCallback((id) => {
    if (!metricById[id]) return
    setSelectedMetricId(id)
    window.history.pushState(null, '', `#${id}${tab !== 'sim' ? '/' + tab : ''}`)
    document.getElementById('lesson')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tab])

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="flex flex-col border-b border-stone-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-4 pb-3 pt-4 lg:px-5 lg:pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Ecom Metrics</p>
          <h1 className="text-xl font-extrabold leading-tight text-stone-900">Academy</h1>
          <p className="mt-1 text-xs text-stone-500">{metricsMaster.length} chỉ số · 7 khâu vận hành · Hiểu số trước khi đốt tiền.</p>
        </div>
        <Sidebar selected={selectedMetricId} onSelect={select} />
      </aside>

      <main id="lesson" className="min-w-0 flex-1 scroll-mt-4 space-y-4 p-4 lg:p-6">
        <MetricLesson metric={metric} onSelect={select} />

        <div role="tablist" aria-label="Chế độ học" className="flex gap-1 overflow-x-auto border-b border-stone-200">
          {TABS.map((t) => {
            const has = t.id === 'sim' ? !!metric.simulator : t.id === 'homework' ? !!metric.diagnostic_homework : true
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 border-b-2 px-3 py-2 text-left transition sm:px-4 ${
                  tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  {t.label}
                  {!has && <span className="rounded bg-stone-100 px-1 text-[10px] font-medium text-stone-400">chưa có</span>}
                </span>
                <span className="hidden text-xs sm:block">{t.desc}</span>
              </button>
            )
          })}
        </div>

        <section role="tabpanel">
          {tab === 'sim' && <MetricSimulator key={selectedMetricId} metric={metric} onSelect={select} />}
          {tab === 'homework' && <DiagnosticHomework key={selectedMetricId} metric={metric} onSelect={select} />}
          {tab === 'health' && <HealthCheck />}
          {tab === 'pnl' && <PnLSimulator selected={selectedMetricId} />}
          {tab === 'templates' && <Templates />}
        </section>

        <footer className="pt-4 text-xs text-stone-400">
          Số liệu trong ví dụ và bài tập là minh họa. Số tham khảo chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.
        </footer>
      </main>
    </div>
  )
}
