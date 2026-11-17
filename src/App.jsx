import { useState } from 'react'
import { METRICS } from './data/metrics.js'
import Sidebar from './components/Sidebar.jsx'
import MetricLesson from './components/MetricLesson.jsx'
import Simulator from './components/Simulator.jsx'
import Practice from './components/Practice.jsx'
import Templates from './components/Templates.jsx'

const TABS = [
  { id: 'sim', label: 'Giả lập', desc: 'Kéo thanh trượt, xem chỉ số đổi ngay' },
  { id: 'practice', label: 'Bài tập thực chiến', desc: 'Tính tay và chẩn đoán bệnh án tài chính' },
  { id: 'templates', label: 'Bảng tính mẫu', desc: 'P&L và unit economics, tải về dùng ngay' },
]

export default function App() {
  const [selected, setSelected] = useState('aov')
  const [tab, setTab] = useState('sim')
  const metric = METRICS.find((m) => m.id === selected)

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="border-b border-stone-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-4 pt-4 lg:px-6 lg:pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Ecom Metrics</p>
          <h1 className="text-xl font-extrabold leading-tight text-stone-900">Academy</h1>
          <p className="mt-1 hidden text-xs text-stone-500 lg:block">Hiểu số trước khi đốt tiền.</p>
        </div>
        <Sidebar selected={selected} onSelect={setSelected} />
      </aside>

      <main className="min-w-0 flex-1 space-y-4 p-4 lg:p-6">
        <MetricLesson metric={metric} />

        <div role="tablist" aria-label="Chế độ học" className="flex gap-1 overflow-x-auto border-b border-stone-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-4 py-2 text-left transition ${
                tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <span className="block font-semibold">{t.label}</span>
              <span className="hidden text-xs sm:block">{t.desc}</span>
            </button>
          ))}
        </div>

        <section role="tabpanel">
          {tab === 'sim' && <Simulator selected={selected} />}
          {tab === 'practice' && <Practice />}
          {tab === 'templates' && <Templates />}
        </section>

        <footer className="pt-4 text-xs text-stone-400">
          Số liệu trong ví dụ là minh họa. Ngưỡng "tham khảo" chỉ để định hướng; mỗi ngành hàng và giai đoạn sẽ khác.
        </footer>
      </main>
    </div>
  )
}
