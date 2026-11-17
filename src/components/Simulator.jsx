import { useMemo, useState } from 'react'
import { SIM_DEFAULTS } from '../data/metrics.js'
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
  const toneCls = { good: 'text-brand-700', bad: 'text-red-600', warn: 'text-amber-600', neutral: 'text-stone-900' }[tone]
  return (
    <Card highlight={ids.includes(selected)} className="p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold tabular-nums ${toneCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </Card>
  )
}

export default function Simulator({ selected }) {
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
  const maxAbs = Math.max(...pnl.map((x) => Math.abs(x.v)), 1)
  const roasTone = r.roas >= r.breakevenRoas * 1.3 ? 'good' : r.roas >= r.breakevenRoas ? 'warn' : 'bad'
  const ltvTone = r.ltvCac >= 3 ? 'good' : r.ltvCac >= 1 ? 'warn' : 'bad'

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Giả định của shop</h3>
          <button onClick={() => setP(SIM_DEFAULTS)} className="text-sm text-brand-700 hover:underline">Đặt lại</button>
        </div>
        {SLIDERS.map((s) => (
          <Slider key={s.key} label={s.label} value={p[s.key]} min={s.min} max={s.max} step={s.step} format={s.fmt} onChange={set(s.key)} />
        ))}
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat ids={['aov']} selected={selected} label="AOV" value={vnd(r.aov)} sub={`${num(r.totalOrders, 0)} đơn / tháng`} />
          <Stat ids={['cac']} selected={selected} label="CAC" value={vnd(r.cac)} sub={`${num(r.newCustomers, 0)} khách mới từ ${num(r.clicks, 0)} lượt nhấp`} />
          <Stat ids={['roas']} selected={selected} label="ROAS" value={num(r.roas)} tone={roasTone}
            sub={`Hòa vốn: ${Number.isFinite(r.breakevenRoas) ? num(r.breakevenRoas) : 'không thể (biên ≤ 0)'}`} />
          <Stat ids={['clv']} selected={selected} label="CLV" value={vnd(r.clv)} sub={`Biên đóng góp ${pct(r.marginPct)}`} />
          <Stat ids={['clv', 'cac']} selected={selected} label="CLV / CAC" value={num(r.ltvCac)} tone={ltvTone} sub="Mốc tham khảo: ≥ 3" />
          <Stat ids={['pnl']} selected={selected} label="Lãi ròng / tháng" value={vnd(r.netProfit, true)} tone={r.netProfit >= 0 ? 'good' : 'bad'} sub={`Biên ròng ${pct(r.netMarginPct)}`} />
        </div>

        <Card highlight={selected === 'pnl'}>
          <h3 className="font-bold">P&L tháng (giả lập)</h3>
          <div className="mt-3 space-y-2">
            {pnl.map((x) => (
              <div key={x.label} className="grid grid-cols-[150px_1fr_110px] items-center gap-2 text-sm sm:grid-cols-[200px_1fr_120px]">
                <span className={x.total ? 'font-semibold' : 'text-stone-600'}>{x.label}</span>
                <div className="h-4 rounded bg-stone-100">
                  <div
                    className={`h-4 rounded ${x.total ? (x.v >= 0 ? 'bg-brand-600' : 'bg-red-500') : 'bg-accent-500/70'}`}
                    style={{ width: `${(Math.abs(x.v) / maxAbs) * 100}%` }}
                  />
                </div>
                <span className={`text-right font-mono tabular-nums ${x.v < 0 ? 'text-red-600' : ''}`}>{vnd(x.v, true)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-stone-600">
            Lãi trên mỗi đơn của khách mới (đơn đầu tiên):{' '}
            <span className={`font-mono font-semibold ${r.profitPerNewOrder >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{vnd(r.profitPerNewOrder)}</span>
            {r.profitPerNewOrder < 0 && r.ltvCac >= 1 && ' — lỗ đơn đầu nhưng có thể gỡ lại nếu khách mua lại đủ vòng đời.'}
          </p>
        </Card>

        <div className="rounded-2xl bg-stone-900 p-4 text-stone-100 shadow-sm">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-brand-500">Thử ngay: </span>
            kéo <b>giá vốn</b> lên vài điểm và xem ROAS hòa vốn nhảy lên thế nào; tăng <b>số đơn vòng đời</b> để thấy CLV/CAC đổi màu;
            tăng <b>ngân sách quảng cáo</b> khi ROAS đang dưới hòa vốn để thấy lỗ phình ra.
          </p>
        </div>
      </div>
    </div>
  )
}
