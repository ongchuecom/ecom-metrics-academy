import { useState } from 'react'
import { metricById, metricsMaster, playbooks, playbookById, PATHS } from '../data/index.js'
import site from '../data/site.json'
import { pbTitle } from './Playbooks.jsx'
import LeadForm from './LeadForm.jsx'
import { ProductCards } from './Promos.jsx'

// Thuật ngữ gợi ý ở phần mở đầu: trộn tài chính, Ads, vận hành, khởi nghiệp
const TERMS = ['vn_fin_cm2', 'vn_fin_breakeven_roas', 'vn_fin_ccc', 'vn_ops_rto_rate', 'vn_fin_opex_ratio', 'vn_ret_clv', 'vn_fin_cash_runway', 'vn_fin_payback_period', 'vn_ops_dead_stock', 'vn_mkt_hook_rate']
const short = (p) => pbTitle(p).replace(/^Bài toán\s*/i, '').replace(/\s*\(.*\)\s*$/, '')
const num = (p) => (p.playbook_id.match(/pb_(\d+)/) || [])[1]
const H2 = ({ children, id }) => <h2 id={id} className="mb-3 scroll-mt-20 text-lg font-bold text-ink">{children}</h2>

function Door({ eyebrow, title, onClick, strong }) {
  return (
    <button onClick={onClick} className={`group flex h-full flex-col rounded-2xl p-4 text-left transition sm:p-5 ${strong ? 'bg-ink' : 'bg-white ring-1 ring-stone-200 hover:ring-stone-300'}`}>
      <span className={`eyebrow ${strong ? 'text-white/70' : 'text-muted'}`}>{eyebrow}</span>
      <span className={`mt-1.5 font-display text-lg font-bold leading-snug ${strong ? 'text-white' : 'text-ink'}`}>{title}</span>
      <span className="flex-1" />
      <span className={`mt-3 text-sm font-bold ${strong ? 'text-white' : 'text-ink'}`}>Bắt đầu →</span>
    </button>
  )
}

// Minh họa trên trang chủ: một góc bảng giảng, giống video giải thích trong từng bài
function BoardPeek() {
  const bars = [['Giá vốn', 320, '#D6D3D1'], ['Phí sàn', 144, '#A8A29E'], ['Ship, đóng gói, hoàn', 60, '#A8A29E'], ['CM2 còn lại', 276, '#FFD200']]
  return (
    <figure className="board relative overflow-hidden rounded-2xl p-5 ring-1 ring-stone-200" aria-label="Ví dụ một bài: CM2 từ Net Sales 800tr">
      <p className="eyebrow text-muted">Ví dụ trong bài CM2</p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-2 font-display text-xl font-bold leading-tight">
        <span className="text-brand-600">CM2</span><span className="text-muted">=</span>
        {['CM1↑', 'Phí sàn↓', 'Ship↓', 'Hoàn↓'].map((t, i) => (
          <span key={t} className="flex items-baseline gap-2">{i > 0 && <span className="text-muted">−</span>}<span className="border-b-2 border-ink/80 px-0.5">{t.slice(0, -1)}<span className="text-brand-600">{t.slice(-1)}</span></span></span>
        ))}
      </p>
      <ul className="mt-5 space-y-2 text-[13px]">
        {bars.map(([l, v, c]) => (
          <li key={l} className="grid grid-cols-[8.5rem_1fr] items-center gap-3">
            <span className={l.startsWith('CM2') ? 'font-bold text-ink' : 'text-body'}>{l}</span>
            <span className="flex items-center gap-2"><span className="h-3 rounded-r" style={{ width: `${(v / 320) * 80}%`, background: c }} /><span className="num font-bold text-ink">{v}tr</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-body">Net Sales 800tr, chỉ còn <b className="board-mark">276tr</b> để chạy Ads.</p>
    </figure>
  )
}

export default function Home({ onSelectMetric, onOpenPlaybook, onOpenHealth, onSearch }) {
  const pb1 = playbookById.pb_01_profit_reality, pb2 = playbookById.pb_02_cashflow_trap
  // lộ trình đang xem trên trang chủ; bấm vào bài thì ghi nhớ lộ trình để thanh tiến độ trong bài đi theo
  const [pathId, setPathId] = useState(() => { try { return localStorage.getItem('ema-path') || PATHS[0].id } catch { return PATHS[0].id } })
  const path = PATHS.find((p) => p.id === pathId) || PATHS[0]
  const startPath = (id) => { try { localStorage.setItem('ema-path', path.id) } catch { /* bỏ qua */ } onSelectMetric(id) }
  const nM = metricsMaster.length, nP = playbooks.length
  const c = site.contact || {}
  const hasForm = !!site.lead?.endpoint
  const channels = [
    c.zalo && { label: 'Nhắn Zalo', href: c.zalo },
    c.facebook && { label: 'Nhắn Facebook', href: c.facebook },
    c.website && { label: 'ongchuecom.com', href: c.website },
  ].filter(Boolean)

  return (
    <div className="space-y-16">
      {/* 1. Đây là gì: một câu, vài khái niệm để bấm thử, một nút */}
      <header className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-[2.6rem]">
            Học mọi khái niệm Ecom và khởi nghiệp, <span className="text-brand-600">có Ông chú Ecom tham vấn</span>
          </h1>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-charcoal">Mỗi khái niệm một bài ngắn: ví dụ số, biểu đồ, video bảng giảng. Miễn phí.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {TERMS.filter((id) => metricById[id]).slice(0, 8).map((id) => (
              <button key={id} onClick={() => onSelectMetric(id)} title={metricById[id].subtitle || metricById[id].vi_name}
                className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-ink ring-1 ring-stone-200 transition hover:bg-brand-50 hover:ring-brand-500">
                {metricById[id].code}
              </button>
            ))}
            <button onClick={onSearch} className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-700 hover:underline">Tìm khái niệm khác →</button>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button onClick={onOpenHealth} className="rounded-lg bg-brand-600 px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-700">Khám sức khỏe shop →</button>
            <span className="text-sm text-muted">{nM} khái niệm · {nP} Playbook</span>
          </div>
        </div>
        <BoardPeek />
      </header>

      {/* Sản phẩm của Ông chú Ecom */}
      <section aria-labelledby="san-pham">
        <H2 id="san-pham">Học sâu hơn cùng Ông chú Ecom</H2>
        <ProductCards />
      </section>

      {/* Bắt đầu từ nỗi đau: chỉ tên, không mô tả */}
      <section aria-labelledby="bat-dau">
        <H2 id="bat-dau">Shop anh đang gặp chuyện gì?</H2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Door strong eyebrow="Nhập số shop mình" title="Khám sức khỏe shop" onClick={onOpenHealth} />
          <Door eyebrow={`Playbook ${num(pb1)}`} title="Doanh thu cao mà không có lãi" onClick={() => onOpenPlaybook(pb1.playbook_id)} />
          <Door eyebrow={`Playbook ${num(pb2)}`} title="Lãi trên giấy mà hết tiền" onClick={() => onOpenPlaybook(pb2.playbook_id)} />
        </div>
      </section>

      <section id="lo-trinh" aria-labelledby="lo-trinh-h">
        <H2 id="lo-trinh-h">Lộ trình theo vai trò</H2>
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Chọn lộ trình">
          {PATHS.map((p) => (
            <button key={p.id} role="tab" aria-selected={path.id === p.id} onClick={() => setPathId(p.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${path.id === p.id ? 'bg-ink text-white' : 'bg-stone-100 text-body hover:bg-stone-200'}`}>{p.title}</button>
          ))}
        </div>
        {/* chỉ hiện tên ngắn từng bài; câu giải thích nằm trong bài */}
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {path.items.map((id, i) => (
            <li key={id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-stone-300" aria-hidden="true">→</span>}
              <button onClick={() => startPath(id)} title={metricById[id].subtitle || metricById[id].vi_name}
                className="rounded-lg px-2.5 py-1 text-sm font-semibold text-ink ring-1 ring-stone-200 hover:bg-stone-50">{metricById[id].code}</button>
            </li>
          ))}
        </ol>
        <button onClick={() => startPath(path.items[0])} className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-700">Bắt đầu · {path.items.length} bài →</button>
      </section>

      <section aria-labelledby="playbooks-h">
        <H2 id="playbooks-h">{nP} Playbook tình huống</H2>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {playbooks.map((p) => (
            <li key={p.playbook_id}>
              <button onClick={() => onOpenPlaybook(p.playbook_id)} className="flex w-full items-baseline gap-3 border-b border-stone-100 py-3 text-left hover:text-brand-700">
                <span className="w-6 shrink-0 text-sm font-semibold text-muted">{num(p)}</span>
                <span className="min-w-0 text-[15px] font-semibold leading-snug text-ink">{short(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Ai giải đáp: một dòng giới thiệu + cách liên hệ */}
      <section id="ai-giai-dap" aria-labelledby="ai-giai-dap-h" className="scroll-mt-20">
        <H2 id="ai-giai-dap-h">Ai giải đáp cho anh chị</H2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-1 basis-80 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-100 text-base font-semibold text-ink" aria-hidden="true">ÔC</span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-ink">Ông chú Ecom</p>
              <p className="text-sm text-charcoal">Tác giả sách Ecom Truyền Kỳ · làm Ecom từ 2008, đồng hành cùng khoảng 50 công ty Ecom</p>
            </div>
          </div>
          {channels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {channels.map((x) => (
                <a key={x.href} href={x.href} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-stone-200 hover:ring-brand-500">{x.label} →</a>
              ))}
            </div>
          )}
        </div>
        {hasForm && <div className="mt-6"><LeadForm source="trang-chu" /></div>}
      </section>

      {/* Hỏi nhanh: gập lại, bấm mới mở */}
      <section aria-labelledby="hoi-nhanh">
        <H2 id="hoi-nhanh">Hỏi nhanh</H2>
        <div className="divide-y divide-stone-100 border-y border-stone-100">
          {[
            ['Có mất phí không?', 'Không. Toàn bộ bài đọc, video, Playbook và công cụ khám sức khỏe đều miễn phí.'],
            ['Số trong ví dụ lấy ở đâu?', 'Là số minh họa dựng theo shop Việt điển hình, phép tính đều khớp. Số tham khảo chỉ để định hướng, mỗi ngành hàng sẽ khác.'],
            ['Bán kênh nào cũng dùng được?', 'Được. TikTok Shop, Shopee, Lazada hay website đều dùng chung cách hiểu; phần tính toán chỉ cần thay phí sàn, phí ship của kênh mình.'],
            ['Ai viết bài?', 'Ông chú Ecom biên soạn theo sách Ecom Truyền Kỳ, có AI hỗ trợ dựng ví dụ, biểu đồ và video. Bài mới chưa duyệt mang nhãn “mới”.'],
          ].map(([q, a]) => (
            <details key={q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">{q}<span className="text-muted transition group-open:rotate-45" aria-hidden="true">+</span></summary>
              <p className="mt-2 text-sm leading-relaxed text-charcoal">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
