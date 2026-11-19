import { metricById, metricsMaster, playbooks, playbookById, LEARNING_PATH } from '../data/index.js'
import lessons from '../data/lessons.json'
import site from '../data/site.json'
import { pbTitle } from './Playbooks.jsx'
import LeadForm from './LeadForm.jsx'

const short = (p) => pbTitle(p).replace(/^Bài toán\s*/i, '').replace(/\s*\(.*\)\s*$/, '')
const num = (p) => (p.playbook_id.match(/pb_(\d+)/) || [])[1]
const H2 = ({ children, id }) => <h2 id={id} className="mb-3 flex scroll-mt-20 items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />{children}</h2>

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

// Minh họa trên trang chủ: một góc bảng giảng, giống video giải thích trong từng bài
function BoardPeek() {
  const bars = [['Giá vốn', 320, '#D6D3D1'], ['Phí sàn', 144, '#A8A29E'], ['Ship, đóng gói, hoàn', 60, '#A8A29E'], ['CM2 còn lại', 276, '#FFD200']]
  return (
    <figure className="board relative overflow-hidden rounded-2xl p-5 ring-1 ring-stone-200" aria-label="Ví dụ một bài: CM2 từ Net Sales 800tr">
      <p className="eyebrow text-muted">Ví dụ trong bài CM2</p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-2 font-display text-xl font-extrabold leading-tight">
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
      <p className="mt-4 text-sm leading-relaxed text-body">Net Sales 800tr mà chỉ còn <b className="board-mark">276tr</b> để chạy Ads. Mỗi bài đều bóc số kiểu này.</p>
    </figure>
  )
}

export default function Home({ onSelectMetric, onOpenPlaybook, onOpenHealth, onSearch }) {
  const pb1 = playbookById.pb_01_profit_reality, pb2 = playbookById.pb_02_cashflow_trap
  const nM = metricsMaster.length, nP = playbooks.length
  const c = site.contact || {}
  const hasForm = !!site.lead?.endpoint
  const channels = [
    c.zalo && { label: 'Nhắn Zalo', href: c.zalo },
    c.facebook && { label: 'Nhắn Facebook', href: c.facebook },
    c.website && { label: 'ongchuecom.com', href: c.website },
  ].filter(Boolean)

  return (
    <div className="space-y-14">
      {/* 1. Đây là gì */}
      <header className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <p className="eyebrow text-brand-600">Ecom Metrics Academy · Miễn phí</p>
          <h1 className="mt-2 font-display text-3xl font-black leading-tight text-ink sm:text-[2.6rem]">
            Học mọi khái niệm Ecom và khởi nghiệp, <span className="marker">có Ông chú Ecom tham vấn</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-body">
            Làm Ecom và khởi nghiệp có cả trăm khái niệm phải hiểu đúng: lãi thật, dòng tiền, tồn kho, quảng cáo, đội ngũ, vận hành…
            Ở đây mỗi khái niệm được giải thích bằng ví dụ số, biểu đồ và video bảng giảng, theo văn phong sách Ecom Truyền Kỳ: nói thẳng, có số, áp dụng được ngay.
            Chỗ nào chưa thông thì hỏi thẳng Ông chú Ecom.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={onOpenHealth} className="rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-700">Khám sức khỏe shop →</button>
            <button onClick={() => onSelectMetric(LEARNING_PATH[0])} className="rounded-full bg-white px-5 py-2.5 font-display text-sm font-bold text-ink ring-1 ring-stone-200 hover:ring-brand-500">Học từ bài 1</button>
            <a href="#ai-giai-dap" className="rounded-full px-3 py-2.5 text-sm font-semibold text-brand-700 hover:underline">Ai giải đáp cho mình?</a>
          </div>
          <button onClick={onSearch} className="mt-5 flex w-full max-w-xl items-center gap-2 rounded-xl bg-white px-4 py-3 text-left text-sm text-muted ring-1 ring-stone-200 hover:ring-brand-500">
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" strokeLinecap="round" /></svg>
            Tìm chỉ số, khái niệm, tình huống… (ví dụ: “hoàn hàng”, “dòng tiền”)
          </button>
        </div>
        <BoardPeek />
      </header>

      {/* Có gì bên trong */}
      <section aria-labelledby="ben-trong">
        <H2 id="ben-trong">Đang có gì để học</H2>
        <p className="-mt-1 mb-4 max-w-3xl text-sm leading-relaxed text-charcoal">Kho khái niệm được thêm dần, mảng đầu tiên là các chỉ số vận hành vì đó là chỗ nhiều shop mất tiền nhất. Các khái niệm mới được rút từ sách Ecom Truyền Kỳ và từ những bài viết hay, Ông chú Ecom duyệt rồi mới lên.</p>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [nM, 'khái niệm chỉ số', 'Từ giá vốn, phí sàn, CM1–CM3 tới ROAS hòa vốn, tồn kho, dòng tiền, đội ngũ. Đi theo 7 khâu của một doanh nghiệp Ecom.'],
            [nP, 'Playbook tình huống', 'Doanh thu cao mà không lãi, lãi trên giấy mà hết tiền, vít Ads khi nào… mỗi Playbook có case, sai lầm hay gặp và việc cần làm.'],
            ['1', 'bản khám sức khỏe shop', 'Điền P&L một tháng, nhận chẩn đoán từng tầng lãi và Playbook nên đọc trước.'],
            ['10', 'bài tập chẩn đoán', 'Bệnh án shop thật, tự tính và tự quyết, sai thì có gợi ý.'],
          ].map(([n, t, d]) => (
            <div key={t} className="border-t-2 border-brand-500 pt-3">
              <dt><span className="font-display text-3xl font-black text-ink">{n}</span> <span className="font-bold text-ink">{t}</span></dt>
              <dd className="mt-1 text-sm leading-relaxed text-charcoal">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Dành cho ai */}
      <section aria-labelledby="danh-cho-ai">
        <H2 id="danh-cho-ai">Dành cho ai</H2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ['Người đang khởi nghiệp', 'Mới bắt đầu hoặc sắp bắt đầu làm Ecom. Cần hiểu đúng khái niệm trước khi bỏ tiền, khỏi phải trả học phí bằng tiền thật.'],
            ['Chủ shop, founder đang vận hành', 'Doanh thu đều mà cuối tháng không thấy tiền, bộ máy phình ra, tiền kẹt. Cần biết vấn đề nằm ở đâu và sửa chỗ nào trước.'],
            ['Đội ngũ và người mới vào nghề', 'Team Ads, vận hành, kế toán cần chung một cách hiểu và cách tính. Người mới đi theo lộ trình, mỗi bài năm phút đọc.'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-2xl bg-stone-50 p-4">
              <p className="font-display font-extrabold text-ink">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-charcoal">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Ai giải đáp */}
      <section id="ai-giai-dap" aria-labelledby="ai-giai-dap-h" className="scroll-mt-20">
        <H2 id="ai-giai-dap-h">Ai giải đáp cho anh chị</H2>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl bg-brand-50 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="book-band flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-black text-white" aria-hidden="true">ÔC</span>
              <div>
                <p className="font-display text-xl font-black text-ink">Ông chú Ecom</p>
                <p className="text-sm text-charcoal">Tác giả sách Ecom Truyền Kỳ · A1demy</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-body">
              <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Làm online và digital marketing từ 2008, từng là co-founder một công ty digital hơn 100 người.</li>
              <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Ba năm gần đây làm việc cùng khoảng 50 công ty Ecom ở Hà Nội, Đà Nẵng, Sài Gòn, nói chuyện với hàng ngàn founder.</li>
              <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Cách hiểu và cách tính trên trang này đi theo sách Ecom Truyền Kỳ.</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-charcoal">Mỗi khái niệm trên trang đều qua tay Ông chú Ecom tham vấn. Đọc xong mà vẫn chưa chắc áp vào shop mình thế nào, cứ hỏi, Ông chú Ecom và đội A1demy trực tiếp trả lời.</p>
          </div>

          <div>
            <p className="font-display text-base font-extrabold text-ink">Hỏi thế nào</p>
            <ol className="mt-3 space-y-4">
              {[
                hasForm ? ['Nhắn riêng qua Zalo', 'Để lại tên và số Zalo ở form ngay dưới. Ông chú Ecom nhắn lại trong vài ngày, xem cùng số của shop.']
                  : ['Nhắn trực tiếp', 'Nhắn qua kênh bên dưới, kể ngắn shop đang bán ở đâu, doanh thu tháng và chỗ đang vướng.'],
                hasForm ? ['Khám sức khỏe shop rồi gửi kèm', 'Điền P&L một tháng ở trang Khám sức khỏe. Bản chẩn đoán được gửi kèm khi anh chị để lại Zalo, khỏi phải kể lại từ đầu.']
                  : ['Khám sức khỏe shop trước', 'Điền P&L một tháng ở trang Khám sức khỏe để biết tiền rò ở tầng nào, rồi hỏi đúng chỗ đó.'],
                hasForm && ['Góp ý ngay dưới mỗi bài', 'Chấm sao và ghi chỗ khó hiểu, ẩn danh. Cứ 2 ngày góp ý được đọc lại và bài được sửa cho dễ hiểu hơn.'],
              ].filter(Boolean).map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-black text-white">{i + 1}</span>
                  <div><p className="font-bold text-ink">{t}</p><p className="mt-0.5 text-sm leading-relaxed text-charcoal">{d}</p></div>
                </li>
              ))}
            </ol>
            {channels.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {channels.map((x) => (
                  <a key={x.href} href={x.href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-stone-200 hover:ring-brand-500">{x.label} →</a>
                ))}
              </div>
            )}
          </div>
        </div>
        {hasForm && <div className="mt-6"><LeadForm source="trang-chu" /></div>}
      </section>

      {/* Bắt đầu từ nỗi đau */}
      <section aria-labelledby="bat-dau">
        <H2 id="bat-dau">Shop anh đang gặp chuyện gì?</H2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Door strong eyebrow="Nhập số shop mình" title="Khám sức khỏe shop" text="Điền P&L một tháng, nhận chẩn đoán và Playbook nên đọc." onClick={onOpenHealth} />
          <Door eyebrow={`Playbook ${num(pb1)}`} title="Doanh thu cao mà không có lãi" text={pb1.summary} onClick={() => onOpenPlaybook(pb1.playbook_id)} />
          <Door eyebrow={`Playbook ${num(pb2)}`} title="Lãi trên giấy mà hết tiền" text={pb2.summary} onClick={() => onOpenPlaybook(pb2.playbook_id)} />
          <Door eyebrow="Lộ trình 10 bài" title="Học từ đầu" text="Đi từ tiền thật của 1 đơn hàng tới dòng tiền, mỗi bài 5 phút đọc." onClick={() => onSelectMetric(LEARNING_PATH[0])} />
        </div>
      </section>

      <section id="lo-trinh" aria-labelledby="lo-trinh-h">
        <H2 id="lo-trinh-h">Lộ trình học từ đầu</H2>
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

      <section aria-labelledby="playbooks-h">
        <H2 id="playbooks-h">{nP} Playbook tình huống</H2>
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

      {/* Hỏi nhanh */}
      <section aria-labelledby="hoi-nhanh">
        <H2 id="hoi-nhanh">Hỏi nhanh</H2>
        <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {[
            ['Có mất phí không?', 'Không. Toàn bộ bài đọc, video, Playbook và công cụ khám sức khỏe đều miễn phí.'],
            ['Số trong ví dụ lấy ở đâu?', 'Là số minh họa dựng theo shop Việt điển hình, phép tính đều khớp. Số tham khảo chỉ để định hướng, mỗi ngành hàng sẽ khác.'],
            ['Chỉ có chỉ số thôi à?', 'Chỉ số là mảng đầu tiên. Kho khái niệm Ecom và khởi nghiệp được thêm dần từ sách Ecom Truyền Kỳ và những bài viết hay, khái niệm nào cũng có ví dụ số.'],
            ['Bán kênh nào cũng dùng được?', 'Được. TikTok Shop, Shopee, Lazada hay website đều dùng chung cách hiểu; phần tính toán chỉ cần thay phí sàn, phí ship của kênh mình.'],
            ['Ai viết bài?', 'Ông chú Ecom biên soạn theo sách Ecom Truyền Kỳ, có AI hỗ trợ dựng ví dụ, biểu đồ và video. Bài mới chưa duyệt mang nhãn “Mới · đang duyệt”.'],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-bold text-ink">{q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-charcoal">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
