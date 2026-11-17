import { useMemo, useState } from 'react'
import { diagnose } from '../lib/diagnose.js'
import { vnd, pct, num } from '../lib/calc.js'
import { Card, NumberField, LevelBadge, levelBox } from './ui.jsx'

// Khám sức khỏe shop: nhập số liệu một tháng, nhận chẩn đoán theo từng chỉ số.
const SAMPLE = {
  revenue: 800e6, orders: 2000, cogs: 360e6, variableCost: 176e6, adSpend: 200e6,
  adRevenue: 480e6, newCustomers: 1700, lifetimeOrders: 1.6, fixedCost: 150e6,
}
const FIELDS = [
  ['revenue', 'Doanh thu tháng', '₫'], ['orders', 'Tổng số đơn', 'đơn'], ['cogs', 'Giá vốn hàng bán', '₫'],
  ['variableCost', 'Phí sàn, vận chuyển, hoàn hàng', '₫'], ['adSpend', 'Chi phí quảng cáo', '₫'], ['adRevenue', 'Doanh thu từ quảng cáo', '₫'],
  ['newCustomers', 'Số khách mới', 'khách'], ['lifetimeOrders', 'Số đơn trung bình trong vòng đời khách', 'lần'], ['fixedCost', 'Chi phí cố định (lương, mặt bằng…)', '₫'],
]

export default function HealthCheck() {
  const [d, setD] = useState(SAMPLE)
  const valid = FIELDS.every(([k]) => Number.isFinite(d[k]) && d[k] >= 0) && d.revenue > 0 && d.orders > 0
  const res = useMemo(() => (valid ? diagnose(d) : null), [d, valid])
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Số liệu một tháng của shop</h4>
          <button onClick={() => setD(SAMPLE)} className="text-sm text-brand-700 hover:underline">Bệnh án mẫu</button>
        </div>
        {FIELDS.map(([k, label, suffix]) => (
          <NumberField key={k} label={label} suffix={suffix} value={d[k]} onChange={(v) => setD((s) => ({ ...s, [k]: v }))} />
        ))}
      </Card>
      <div className="space-y-3">
        {!res && <Card><p className="text-sm text-stone-600">Nhập đủ số liệu (doanh thu và số đơn phải lớn hơn 0) để xem chẩn đoán.</p></Card>}
        {res && (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold">Bệnh án tài chính</h4>
                <span className="text-sm text-stone-500">Điểm sức khỏe: <b className="text-stone-900">{Math.round(res.score * 100)}/100</b></span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[['AOV', vnd(res.metrics.aov)], ['CAC', vnd(res.metrics.cac)], ['ROAS / hòa vốn', `${num(res.metrics.roas)} / ${num(res.metrics.beRoas)}`],
                  ['CLV / CAC', num(res.metrics.ltvCac)], ['Biên đóng góp', pct(res.metrics.margin)], ['Lãi ròng', vnd(res.metrics.net, true)],
                  ['Cố định / DT', pct(res.metrics.fixedPct)], ['Khách cũ / đơn', pct(res.metrics.returningShare)]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-stone-50 p-2"><p className="text-xs text-stone-500">{k}</p><p className="font-mono font-semibold tabular-nums">{v}</p></div>
                ))}
              </div>
            </Card>
            {res.findings.map((f, i) => (
              <div key={i} className={`rounded-2xl border p-4 ${levelBox(f.level)}`}>
                <div className="flex items-center gap-2"><LevelBadge level={f.level} /><h5 className="font-bold">{f.title}</h5></div>
                <p className="mt-2 text-sm"><b>Triệu chứng:</b> {f.symptom}</p>
                <p className="text-sm"><b>Chẩn đoán:</b> {f.cause}</p>
                <p className="text-sm"><b>Đơn thuốc:</b> {f.cure}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
