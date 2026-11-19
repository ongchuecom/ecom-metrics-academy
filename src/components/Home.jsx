import { metricById, metricsMaster, playbooks, playbookById, STAGES, LEARNING_PATH } from '../data/index.js'
import lessons from '../data/lessons.json'
import { pbTitle } from './Playbooks.jsx'

const short = (p) => pbTitle(p).replace(/^Bài toán\s*/i, '').replace(/\s*\(.*\)\s*$/, '')
const num = (p) => (p.playbook_id.match(/pb_(\d+)/) || [])[1]

function Door({ eyebrow, title, text, onClick, strong }) {
  return (
    <button onClick={onClick} className={`group flex h-full flex-col rounded-2xl p-4 text-left transition sm:p-5 ${strong ? 'book-band' : 'bg-stone-50 hover:bg-brand-50'}`}>
      <span className={`eyebrow ${strong ? 'text-white/85' : 'text-brand-600'}`}>{eyebrow}</span>
      <span className={`mt-1.5 font-display text-lg font-extrabold leading-snug ${strong ? 'text-white' : 'text-ink'}`}>{title}</span>
      <span className={`mt-1 flex-1 text-sm leading-relaxed ${strong ? 'text-white/90' : 'text-charcoal'}`}>{text}</span>
      <span className={`mt-3 text-sm font-bold ${strong ? 'text-white' : 'text-brand-600'}`}>Bắt đầu →</span>
    </button>
  )
}

export default function Home({ onSelectMetric, onOpenPlaybook, onOpenHealth, onSearch }) {
  const pb1 = playbookById.pb_01_profit_reality, pb2 = playbookById.pb_02_cashflow_trap
  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow text-brand-600">Ecom Metrics Academy · Ông chú Ecom</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-black leading-tight text-ink sm:text-4xl">Shop anh đang gặp chuyện gì?</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-charcoal">
          {metricsMaster.length} chỉ số vận hành và 10 Playbook tình huống thực chiến, viết theo văn phong sách Ecom Truyền Kỳ. Chọn đúng nỗi đau, đi thẳng vào con số cần sửa.
        </p>
        <button onClick={onSearch} className="mt-4 flex w-full max-w-xl items-center gap-2 rounded-xl bg-white px-4 py-3 text-left text-sm text-muted ring-1 ring-stone-200 hover:ring-brand-500">
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" strokeLinecap="round" /></svg>
          Tìm chỉ số, khái niệm, tình huống… (ví dụ: “hoàn hàng”, “dòng tiền”)
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Door strong eyebrow="Nhập số shop mình" title="Khám sức khỏe shop" text="Điền P&L một tháng, nhận chẩn đoán và Playbook nên đọc." onClick={onOpenHealth} />
        <Door eyebrow={`Playbook ${num(pb1)}`} title="Doanh thu cao mà không có lãi" text={pb1.summary} onClick={() => onOpenPlaybook(pb1.playbook_id)} />
        <Door eyebrow={`Playbook ${num(pb2)}`} title="Lãi trên giấy mà hết tiền" text={pb2.summary} onClick={() => onOpenPlaybook(pb2.playbook_id)} />
        <Door eyebrow="Lộ trình 10 bài" title="Học từ đầu" text="Đi từ tiền thật của 1 đơn hàng tới dòng tiền, mỗi bài 5 phút đọc." onClick={() => onSelectMetric(LEARNING_PATH[0])} />
      </section>

      <section id="lo-trinh">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />Lộ trình học từ đầu</h2>
        <ol className="grid gap-x-6 sm:grid-cols-2">
          {LEARNING_PATH.map((id, i) => {
            const m = metricById[id]
            return (
              <li key={id}>
                <button onClick={() => onSelectMetric(id)} className="flex w-full items-baseline gap-3 border-b border-stone-100 py-2.5 text-left hover:bg-brand-50">
                  <span className="w-6 shrink-0 text-right font-display text-sm font-black text-brand-600">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="font-display font-extrabold text-ink">{m.code}</span>
                    <span className="ml-2 text-sm text-charcoal">{lessons[id]?.subtitle || m.vi_name}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />10 Playbook tình huống</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {playbooks.map((p) => (
            <li key={p.playbook_id}>
              <button onClick={() => onOpenPlaybook(p.playbook_id)} className="flex h-full w-full gap-3 rounded-xl bg-stone-50 p-3 text-left hover:bg-brand-50">
                <span className="font-display text-lg font-black leading-none text-brand-600">{num(p)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-snug text-ink">{short(p)}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-charcoal">{p.case_study.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />{metricsMaster.length} chỉ số theo 7 khâu</h2>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s, i) => {
            const items = metricsMaster.filter((m) => m.stage === s.id)
            return (
              <div key={s.id}>
                <p className="eyebrow text-muted">{i + 1} · {s.label} · {items.length}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((m) => (
                    <button key={m.metric_id} onClick={() => onSelectMetric(m.metric_id)} title={m.vi_name}
                      className="rounded-lg bg-stone-50 px-2 py-1 font-display text-xs font-bold text-ink hover:bg-brand-50 hover:text-brand-700">{m.code}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
