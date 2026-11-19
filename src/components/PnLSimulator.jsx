import { useMemo, useState } from 'react'
import { SIM_DEFAULTS } from '../data/simDefaults.js'
import { simulate, vnd, pct, num } from '../lib/calc.js'
import { Card, Slider } from './ui.jsx'

const SLIDERS = [
  { key: 'aov', label: 'Giá trị đơn trung bình (AOV)', min: 50000, max: 2000000, step: 10000, fmt: (v) => vnd(v) },
  { key: 'cogsPct', label: 'Giá vốn (% doanh thu)', min: 0.05, max: 0.85, step: 0.01, fmt: (v) => pct(v, 0) },
  { key: 'variablePct', label: 'Phí sàn, vận chuyển, hoàn (% doanh thu)', min: 0, max: 0.5, step: 0.01, fmt: (v) => pct(v, 0) },
  { key: 'adSpend', label: 'Ngân sách quảng cáo / tháng', min: 0, max: 500000000, step: 1000000, fmt: (v) => vnd(v, true) },
  { key: 'cpc', label: 'Giá mỗi lượt nhấp (CPC)', min: 500, max: 20000, step: 100, fmt: (v) => vnd(v) },
  { key: 'conversionRate', label: 'Tỉ lệ chuyển đổi (nhấp → mua)', min: 0.002, max: 0.1, step: 0.001, fmt: (v) => pct(v) },
  { key: 'returningOrders', label: 'Đơn từ khách cũ / tháng', min: 0, max: 5000, step: 10, fmt: (v) => num(v, 0) + ' đơn' },
  { key: 'lifetimeOrders', label: 'Số đơn trung bình trong vòng đời khách', min: 1, max: 15, step: 0.1, fmt: (v) => num(v, 1) + ' lần' },
  { key: 'fixedCost', label: 'Chi phí cố định / tháng', min: 0, max: 500000000, step: 1000000, fmt: (v) => vnd(v, true) },
]

function Stat({ ids, selected, label, value, sub, tone = 'neutral' }) {
  const toneCls = { good: 'text-brand-700', bad: 'text-coral', warn: 'text-accent-600', neutral: 'text-ink' }[tone]
  return (
    <Card highlight={ids.includes(selected)} className="p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`num mt-1 text-xl font-black ${toneCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </Card>
  )
}

export default function PnLSimulator({ selected }) {
  const [p, setP] = useState(SIM_DEFAULTS)
  const r = useMemo(() => simulate(p), [p])
  const set = (k) => (v) => setP((s) => ({ ...s, [k]: v }))

  const pnl = [
    { label: 'Doanh thu', v: r.revenue, total: true },
    { label: 'Giá vốn', v: -r.cogs },
    { label: 'Phí sàn, vận chuyển, hoàn', v: -r.variable },
    { label: 'Biên đóng góp', v: r.contribution, total: true },
    { label: 'Quảng cáo', v: -p.adSpend },
    { label: 'Chi phí cố định', v: -p.fixedCost },
    { label: 'Lãi ròng', v: r.netProfit, total: true },
  ]
  const roasTone = r.roas >= r.breakevenRoas * 1.3 ? 'good' : r.roas >= r.breakevenRoas ? 'warn' : 'bad'
  const ltvTone = r.ltvCac >= 3 ? 'good' : r.ltvCac >= 1 ? 'warn' : 'bad'

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold">Giả định của shop</h3>
          <button onClick={() => setP(SIM_DEFAULTS)} className="text-sm text-brand-700 hover:underline">Đặt lại</button>
        </div>
        {SLIDERS.map((s) => (
          <Slider key={s.key} label={s.label} value={p[s.key]} min={s.min} max={s.max} step={s.step} format={s.fmt} onChange={set(s.key)} />
        ))}
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat ids={['sales_aov']} selected={selected} label="AOV" value={vnd(r.aov)} sub={`${num(r.totalOrders, 0)} đơn / tháng`} />
          <Stat ids={['fin_cac', 'fin_paid_cac']} selected={selected} label="CAC" value={vnd(r.cac)} sub={`${num(r.newCustomers, 0)} khách mới từ ${num(r.clicks, 0)} lượt nhấp`} />
          <Stat ids={['fin_roas', 'fin_breakeven_roas']} selected={selected} label="ROAS" value={num(r.roas)} tone={roasTone}
            sub={`Hòa vốn: ${Number.isFinite(r.breakevenRoas) ? num(r.breakevenRoas) : 'không thể (biên ≤ 0)'}`} />
          <Stat ids={['ret_clv']} selected={selected} label="CLV" value={vnd(r.clv)} sub={`Biên đóng góp ${pct(r.marginPct)}`} />
          <Stat ids={['fin_ltv_cac']} selected={selected} label="CLV / CAC" value={num(r.ltvCac)} tone={ltvTone} sub="Mốc tham khảo: ≥ 3" />
          <Stat ids={['fin_net_margin', 'fin_ebitda']} selected={selected} label="Lãi ròng / tháng" value={vnd(r.netProfit, true)} tone={r.netProfit >= 0 ? 'good' : 'bad'} sub={`Biên ròng ${pct(r.netMarginPct)}`} />
        </div>

        {/* Bố cục Hóa đơn (đã duyệt): thẻ trắng hơi nghiêng trên nền vàng chanh, dòng tổng to */}
        <div className={`rounded-3xl bg-stone-50 p-4 sm:p-6 ${['fin_net_margin', 'fin_ebitda', 'fin_cm1', 'fin_cm2', 'fin_cm3'].includes(selected) ? 'ring-4 ring-brand-500/40' : ''}`}>
          <p className="eyebrow px-1 text-muted">Hóa đơn lãi lỗ · 1 tháng (giả lập)</p>
          <div className="mt-3 rotate-[-1deg] rounded-2xl bg-white px-4 py-4 shadow-[0_10px_30px_rgba(31,42,68,0.12)] sm:px-6">
            <div className="flex justify-between border-b border-dashed border-stone-300 pb-2 text-xs font-bold uppercase tracking-widest text-muted">
              <span>Khoản</span><span>Số tiền</span>
            </div>
            <ul className="divide-y divide-dashed divide-stone-200">
              {pnl.map((x) => (
                <li key={x.label} className={`flex items-baseline justify-between gap-3 py-2 ${x.total ? 'font-display font-extrabold text-ink' : 'text-body'}`}>
                  <span>{x.label}</span>
                  <span className={`num shrink-0 ${x.total ? '' : 'font-semibold'} ${x.v < 0 && !x.total ? 'text-coral' : ''}`}>{x.v < 0 ? '−' : ''}{vnd(Math.abs(x.v), true)}</span>
                </li>
              )).slice(0, -1)}
            </ul>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t-2 border-dashed border-stone-300 pt-3">
              <span className="font-display text-lg font-black uppercase text-ink">Lãi ròng</span>
              <span className={`num text-4xl font-black leading-none sm:text-5xl ${r.netProfit >= 0 ? 'text-ok' : 'text-coral'}`}>
                {r.netProfit < 0 ? '−' : ''}{vnd(Math.abs(r.netProfit), true)}
              </span>
            </div>
            <p className="mt-1 text-right text-xs text-muted">Biên ròng {pct(r.netMarginPct)} · Ví dụ minh họa</p>
          </div>
          <p className="mt-4 px-1 text-sm text-body">
            Lãi đơn đầu của khách mới:{' '}
            <span className={`num font-extrabold ${r.profitPerNewOrder >= 0 ? 'text-ok' : 'text-coral'}`}>{vnd(r.profitPerNewOrder)}</span>
            {r.profitPerNewOrder < 0 && r.ltvCac >= 1 && '. Lỗ đơn đầu nhưng có thể gỡ lại nếu khách mua lại đủ vòng đời.'}
          </p>
        </div>

        <div className="px-1 text-body">
          <p className="text-sm leading-relaxed">
            <span className="font-display font-extrabold text-brand-700">Thử ngay: </span>
            kéo <b>giá vốn</b> lên vài điểm và xem ROAS hòa vốn nhảy lên thế nào; tăng <b>số đơn vòng đời</b> để thấy CLV/CAC đổi màu;
            tăng <b>ngân sách quảng cáo</b> khi ROAS đang dưới hòa vốn để thấy lỗ phình ra.
          </p>
        </div>
      </div>
    </div>
  )
}
