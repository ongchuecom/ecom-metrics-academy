import { useMemo, useState } from 'react'
import { metricById, playbookById } from '../data/index.js'
import { pbTitle } from './Playbooks.jsx'
import LeadForm from './LeadForm.jsx'

// Khám sức khỏe shop theo chuỗi Net Sales → CM1 → CM2 → CM3 → lãi ròng (cùng quy ước với 60 chỉ số và 10 Playbook).
// Số mẫu là tình huống Playbook 01 (shop gia dụng 1 tỷ/tháng, ROAS 5 mà lỗ 25 triệu).

const nf = (x, d = 1) => (Number.isFinite(x) ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(x) : '—')
const tr = (x) => `${nf(x, 1)}tr`

const FIELDS = [
  { group: 'Doanh thu & đơn hàng', items: [
    ['revenue', 'Doanh thu hiển thị trên sàn', 'tr/tháng'],
    ['orders', 'Số đơn đặt', 'đơn'],
    ['cancel', 'Huỷ trước khi giao', '% đơn đặt'],
    ['rto', 'Hoàn hàng (RTO)', '% đơn đã gửi'],
    ['voucher', 'Voucher shop tự giảm', '% doanh thu'],
  ] },
  { group: 'Chi phí theo đơn', items: [
    ['cogs', 'Giá vốn mỗi đơn (Landed Cost)', 'k/đơn'],
    ['fee', 'Tổng phí sàn', '% Net Sales'],
    ['ship', 'Ship shop bù + đóng gói', 'k/đơn giao'],
    ['returnCost', 'Chi phí 1 đơn hoàn', 'k/đơn hoàn'],
  ] },
  { group: 'Marketing & bộ máy', items: [
    ['ads', 'Tiền chạy Ads', 'tr/tháng'],
    ['koc', 'Booking KOC, affiliate', 'tr/tháng'],
    ['fixed', 'Định phí (lương cứng, kho, văn phòng)', 'tr/tháng'],
    ['tax', 'Dự phòng thuế', '% Net Sales'],
  ] },
  { group: 'Dòng tiền (không bắt buộc)', items: [
    ['cash', 'Tiền mặt hiện có', 'tr'],
    ['dio', 'Số ngày hàng nằm kho (DIO)', 'ngày'],
    ['dso', 'Số ngày chờ tiền về (DSO)', 'ngày'],
    ['dpo', 'Số ngày được nợ xưởng (DPO)', 'ngày'],
  ] },
]
const SAMPLE = { revenue: 1000, orders: 4000, cancel: 4, rto: 12.5, voucher: 5, cogs: 85, fee: 16, ship: 32.5, returnCost: 32, ads: 200, koc: 0, fixed: 85, tax: 0, cash: '', dio: '', dso: '', dpo: '' }
const EMPTY = Object.fromEntries(Object.keys(SAMPLE).map((k) => [k, '']))
const n = (v) => (v === '' || v == null ? NaN : Number(v))

export function compute(v) {
  const x = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, n(val)]))
  const z = (a) => (Number.isFinite(a) ? a : 0)
  const aov = (x.revenue * 1000) / x.orders // k
  const sent = x.orders * (1 - z(x.cancel) / 100)
  const returned = sent * (z(x.rto) / 100)
  const delivered = sent - returned
  const deliveredRev = (delivered * aov) / 1000 // tr
  const net = deliveredRev * (1 - z(x.voucher) / 100)
  const cogs = (delivered * x.cogs) / 1000
  const cm1 = net - cogs
  const fee = net * (z(x.fee) / 100)
  const ship = (delivered * z(x.ship)) / 1000
  const retCost = (returned * z(x.returnCost)) / 1000
  const cm2 = cm1 - fee - ship - retCost
  const cm3 = cm2 - z(x.ads) - z(x.koc)
  const tax = net * (z(x.tax) / 100)
  const profit = cm3 - z(x.fixed) - tax
  const roas = x.ads > 0 ? x.revenue / x.ads : NaN
  const beVar = cm2 > 0 ? x.revenue / cm2 : Infinity
  const room = cm2 - z(x.fixed) - tax - z(x.koc)
  const beFull = room > 0 ? x.revenue / room : Infinity
  const ccc = [x.dio, x.dso, x.dpo].every(Number.isFinite) ? x.dio + x.dso - x.dpo : NaN
  const runway = Number.isFinite(x.cash) && profit < 0 ? x.cash / -profit : NaN
  return {
    x, aov, sent, returned, delivered, deliveredRev, net, cogs, cm1, fee, ship, retCost, cm2, cm3, tax, profit,
    roas, beVar, beFull, cpa: x.ads > 0 ? (x.ads * 1000) / x.orders : NaN,
    cm2Pct: net > 0 ? (cm2 / net) * 100 : NaN, cm3Pct: net > 0 ? (cm3 / net) * 100 : NaN,
    opexPct: net > 0 ? (z(x.fixed) / net) * 100 : NaN, netPct: net > 0 ? (profit / net) * 100 : NaN, ccc, runway,
  }
}

// Luật chẩn đoán: mỗi phát hiện chỉ ra chỉ số cần học và Playbook nên đọc
function diagnose(r) {
  const f = []
  const add = (level, title, text, metrics, pbs) => f.push({ level, title, text, metrics, pbs })
  if (Number.isFinite(r.roas)) {
    if (r.roas < r.beVar) add('nang', 'Ads đang lỗ ngay trên từng đơn', `ROAS ${nf(r.roas, 2)} thấp hơn ROAS hòa vốn biến phí ${nf(r.beVar, 2)}. Chạy càng nhiều càng lỗ, chưa kể định phí.`, ['vn_fin_breakeven_roas', 'vn_mkt_cpa'], ['pb_07_ads_scaling', 'pb_01_profit_reality'])
    else if (r.roas < r.beFull) add('canh-bao', 'ROAS chưa đủ nuôi bộ máy', `ROAS ${nf(r.roas, 2)} qua được hòa vốn từng đơn (${nf(r.beVar, 2)}) nhưng muốn trả đủ định phí và thuế thì cần khoảng ${nf(r.beFull, 2)}.`, ['vn_fin_breakeven_roas', 'vn_fin_cm3'], ['pb_01_profit_reality', 'pb_03_tax_and_opex'])
  }
  if (r.x.rto > 15) add('nang', 'Hoàn hàng quá cao', `${nf(r.x.rto)}% đơn đã gửi quay đầu: ${nf(r.returned, 0)} đơn, mất ${tr(r.retCost)} tiền hoàn và cả doanh thu của các đơn đó.`, ['vn_ops_rto_rate', 'vn_ops_cost_per_return'], ['pb_01_profit_reality'])
  else if (r.x.rto > 8) add('canh-bao', 'Hoàn hàng đáng lo', `${nf(r.x.rto)}% đơn đã gửi quay đầu (${nf(r.returned, 0)} đơn, ${tr(r.retCost)} chi phí hoàn). Gọi xác nhận, lọc số bom hàng để kéo xuống dưới 6%.`, ['vn_ops_rto_rate'], ['pb_01_profit_reality'])
  if (r.x.cancel > 5) add('canh-bao', 'Huỷ đơn trước khi giao nhiều', `${nf(r.x.cancel)}% đơn bị huỷ trước khi gửi: tiền Ads đã chi cho các đơn này mất trắng.`, ['vn_ops_cancel_rate', 'vn_team_frt'], ['pb_04_ops_efficiency'])
  if (Number.isFinite(r.cm2Pct) && r.cm2Pct < 30) add(r.cm2Pct < 20 ? 'nang' : 'canh-bao', 'CM2 mỏng, ít tiền để chạy Ads', `Sau giá vốn, phí sàn, ship, hoàn chỉ còn ${nf(r.cm2Pct)}% Net Sales. Đây là toàn bộ phần để trả Ads, KOC và bộ máy.`, ['vn_fin_cm2', 'vn_prod_landed_cost'], ['pb_01_profit_reality', 'pb_05_sourcing_and_deadstock'])
  if (r.x.fee > 20) add('canh-bao', 'Phí sàn ăn quá nhiều', `Phí sàn ${nf(r.x.fee)}% Net Sales. Soát lại các gói Freeship Xtra, Voucher Xtra có thực sự kéo đơn không.`, ['vn_fin_platform_fee'], ['pb_01_profit_reality'])
  if (Number.isFinite(r.opexPct) && r.opexPct > 15) add('canh-bao', 'Bộ máy đang nặng', `Định phí bằng ${nf(r.opexPct)}% Net Sales. Trước khi tuyển thêm, xem việc nào làm được bằng SOP hoặc công cụ.`, ['vn_fin_opex_ratio', 'vn_team_gp_per_staff'], ['pb_10_team_vs_automation', 'pb_03_tax_and_opex'])
  if (!(r.x.tax > 0)) add('canh-bao', 'Chưa trích dự phòng thuế', 'Lãi đang tính khi chưa trừ thuế. Trích đều mỗi tháng từ Net Sales thì nhẹ, dồn cuối năm dễ đứt vốn (kiểm lại quy định hiện hành với kế toán).', ['vn_fin_tax_reserve', 'vn_fin_vat_input_ratio'], ['pb_03_tax_and_opex'])
  if (Number.isFinite(r.ccc) && r.ccc > 45) add(r.ccc > 75 ? 'nang' : 'canh-bao', 'Tiền bị giam lâu', `Vòng quay tiền mặt ${nf(r.ccc, 0)} ngày: 1 đồng nhập hàng phải chờ chừng đó ngày mới quay về túi. Bán càng mạnh càng phải ứng tiền.`, ['vn_fin_ccc', 'vn_ops_dio', 'vn_fin_dpo'], ['pb_02_cashflow_trap'])
  if (Number.isFinite(r.runway) && r.runway < 6) add('nang', 'Đường băng tiền mặt ngắn', `Với mức lỗ hiện tại, tiền mặt chỉ đủ khoảng ${nf(r.runway)} tháng.`, ['vn_fin_cash_runway'], ['pb_02_cashflow_trap'])
  if (r.profit >= 0 && !f.some((x) => x.level === 'nang')) add('tot', 'Shop đang có lãi thật', `Lãi ròng ${tr(r.profit)} (${nf(r.netPct)}% Net Sales). Giữ nhịp và theo dõi các mục cảnh báo nếu có.`, ['vn_fin_net_profit'], ['pb_08_retention_clv'])
  const order = { nang: 0, 'canh-bao': 1, tot: 2 }
  return f.sort((a, b) => order[a.level] - order[b.level])
}

const LV = {
  nang: ['Nặng', 'bg-red-50', 'text-coral'],
  'canh-bao': ['Cảnh báo', 'bg-stone-50', 'text-brand-700'],
  tot: ['Tốt', 'bg-stone-50', 'text-ok'],
}

export default function ShopCheck({ onSelectMetric, onOpenPlaybook }) {
  const [v, setV] = useState(SAMPLE)
  const ready = ['revenue', 'orders', 'cogs'].every((k) => n(v[k]) > 0)
  const r = useMemo(() => (ready ? compute(v) : null), [v, ready])
  const findings = useMemo(() => (r ? diagnose(r) : []), [r])
  const rows = r && [
    ['Doanh thu hiển thị', r.x.revenue, 'head'],
    [`Mất do huỷ và hoàn (${nf(r.x.orders - r.delivered, 0)} đơn)`, -(r.x.revenue - r.deliveredRev)],
    ['Voucher shop', -(r.deliveredRev - r.net)],
    ['Net Sales (thực thu)', r.net, 'sub', 'vn_fin_net_sales'],
    [`Giá vốn ${nf(r.delivered, 0)} đơn giao`, -r.cogs],
    ['CM1', r.cm1, 'sub', 'vn_fin_cm1'],
    ['Phí sàn', -r.fee], ['Ship bù + đóng gói', -r.ship], ['Chi phí đơn hoàn', -r.retCost],
    ['CM2', r.cm2, 'sub', 'vn_fin_cm2'],
    ['Ads + KOC', -(n(v.ads) || 0) - (n(v.koc) || 0)],
    ['CM3', r.cm3, 'sub', 'vn_fin_cm3'],
    ['Định phí', -(n(v.fixed) || 0)], ['Dự phòng thuế', -r.tax],
  ]
  const kpis = r && [
    ['ROAS', nf(r.roas, 2), 'vn_fin_breakeven_roas'],
    ['ROAS hòa vốn biến phí', nf(r.beVar, 2), 'vn_fin_breakeven_roas'],
    ['ROAS nuôi bộ máy', Number.isFinite(r.beFull) ? nf(r.beFull, 2) : 'không đạt', 'vn_fin_breakeven_roas'],
    ['CPA', `${nf(r.cpa, 0)}k`, 'vn_mkt_cpa'],
    ['AOV niêm yết', `${nf(r.aov, 0)}k`, 'vn_sales_aov'],
    ['CM2 / Net Sales', `${nf(r.cm2Pct)}%`, 'vn_fin_cm2'],
    ['Định phí / Net Sales', `${nf(r.opexPct)}%`, 'vn_fin_opex_ratio'],
    ['Vòng quay tiền mặt', Number.isFinite(r.ccc) ? `${nf(r.ccc, 0)} ngày` : '—', 'vn_fin_ccc'],
  ]
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-charcoal">Điền số một tháng của shop. Số mẫu là tình huống Playbook 01.</p>
        <div className="flex gap-2">
          <button onClick={() => setV(SAMPLE)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Dùng số mẫu</button>
          <button onClick={() => setV(EMPTY)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-charcoal hover:bg-stone-100">Xoá trắng</button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {FIELDS.map((g) => (
            <fieldset key={g.group}>
              <legend className="eyebrow mb-2 text-muted">{g.group}</legend>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map(([k, label, unit]) => (
                  <label key={k} className="block rounded-xl bg-stone-50 px-3 py-2">
                    <span className="block text-[11px] font-semibold leading-tight text-charcoal">{label}</span>
                    <span className="flex items-baseline gap-1">
                      <input type="number" inputMode="decimal" step="any" value={v[k]} aria-label={label}
                        onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))}
                        className="num w-full min-w-0 bg-transparent py-0.5 text-base font-bold text-ink outline-none" />
                      <span className="shrink-0 text-[10px] text-muted">{unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </form>

        <div className="space-y-6">
          {!r && <p className="rounded-xl bg-stone-50 p-4 text-sm text-charcoal">Cần ít nhất doanh thu, số đơn và giá vốn mỗi đơn để tính.</p>}
          {r && (
            <>
              <section className="rounded-2xl bg-stone-50 p-4 sm:p-5">
                <p className="eyebrow text-muted">Hóa đơn lãi lỗ 1 tháng</p>
                <div className="mt-3 rotate-[-0.6deg] rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(31,42,68,0.10)]">
                  <ul className="divide-y divide-dashed divide-stone-200 text-sm">
                    {rows.map(([label, val, kind, id]) => (
                      <li key={label} className={`flex items-baseline justify-between gap-3 py-1.5 ${kind ? 'font-display font-extrabold text-ink' : 'text-body'}`}>
                        {id ? <button onClick={() => onSelectMetric(id)} className="text-left hover:text-brand-700 hover:underline">{label}</button> : <span>{label}</span>}
                        <span className={`num shrink-0 ${val < 0 && !kind ? 'text-coral' : ''}`}>{val < 0 ? '−' : ''}{tr(Math.abs(val))}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 flex items-end justify-between border-t-2 border-dashed border-stone-300 pt-2">
                    <button onClick={() => onSelectMetric('vn_fin_net_profit')} className="font-display text-base font-black uppercase text-ink hover:text-brand-700">Lãi ròng</button>
                    <span className={`num text-3xl font-black ${r.profit >= 0 ? 'text-ok' : 'text-coral'}`}>{r.profit < 0 ? '−' : ''}{tr(Math.abs(r.profit))}</span>
                  </div>
                  <p className="text-right text-xs text-muted">{nf(r.netPct)}% Net Sales</p>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {kpis.map(([k, val, id]) => (
                  <button key={k} onClick={() => onSelectMetric(id)} className="rounded-xl bg-stone-50 p-3 text-left hover:bg-brand-50">
                    <span className="block text-[11px] font-semibold text-charcoal">{k}</span>
                    <span className="num block text-lg font-black text-ink">{val}</span>
                  </button>
                ))}
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />Chẩn đoán · {findings.length} điểm</h3>
                <ul className="space-y-3">
                  {findings.map((x) => (
                    <li key={x.title} className={`rounded-2xl p-4 ${LV[x.level][1]}`}>
                      <p className="flex items-center gap-2">
                        <span className={`rounded bg-white px-1.5 py-0.5 text-[11px] font-bold ${LV[x.level][2]}`}>{LV[x.level][0]}</span>
                        <span className="font-display font-extrabold text-ink">{x.title}</span>
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-body">{x.text}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {x.pbs.map((p) => playbookById[p] && (
                          <button key={p} onClick={() => onOpenPlaybook(p)} className="text-xs font-bold text-brand-700 hover:underline">Đọc Playbook {p.match(/pb_(\d+)/)[1]} →</button>
                        ))}
                        {x.metrics.map((m) => metricById[m] && (
                          <button key={m} onClick={() => onSelectMetric(m)} className="text-xs font-semibold text-charcoal hover:text-brand-700 hover:underline">Học {metricById[m].code}</button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
      {r && <LeadForm source="kham-suc-khoe" title="Muốn Ông chú Ecom xem giúp kết quả này?"
        text="Để lại tên và số Zalo, mình nhắn riêng và gợi ý chỗ nên sửa trước."
        summary={`DT hiển thị ${tr(r.x.revenue)} · Net Sales ${tr(r.net)} · CM2 ${tr(r.cm2)} (${nf(r.cm2Pct)}%) · CM3 ${tr(r.cm3)} · Lãi ròng ${tr(r.profit)} · ROAS ${nf(r.roas, 2)} / hòa vốn ${nf(r.beVar, 2)} / nuôi bộ máy ${nf(r.beFull, 2)} · RTO ${nf(r.x.rto)}% · Chẩn đoán: ${findings.map((x) => x.title).join('; ')}`} />}
      <p className="text-xs text-muted">Công cụ tính trên số anh nhập. Số chỉ được gửi đi khi anh bấm "Gửi số Zalo" và chọn gửi kèm kết quả. Kết quả chỉ để định hướng.</p>
    </div>
  )
}
