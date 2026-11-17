import { useMemo, useState } from 'react'
import { diagnose } from '../lib/diagnose.js'
import { aov, cac, roas, breakevenRoas, contributionMarginPct, clv, vnd, pct, num } from '../lib/calc.js'
import { Card, NumberField, LevelBadge, levelBox } from './ui.jsx'

// ---------- Bài tập có đáp án ----------
const CASES = [
  {
    id: 'my-pham',
    title: 'Shop mỹ phẩm: một tháng trên sàn',
    story: 'Tháng 10 shop bán 1.200 đơn, doanh thu 540 triệu. Chi 60 triệu quảng cáo, mang về 400 khách mới và 216 triệu doanh thu từ quảng cáo.',
    questions: [
      { q: 'AOV là bao nhiêu (₫)?', answer: aov(540e6, 1200), unit: '₫', solution: 'AOV = 540.000.000 ÷ 1.200 = 450.000 ₫' },
      { q: 'CAC là bao nhiêu (₫)?', answer: cac(60e6, 400), unit: '₫', solution: 'CAC = 60.000.000 ÷ 400 = 150.000 ₫' },
      { q: 'ROAS là bao nhiêu?', answer: roas(216e6, 60e6), unit: '', solution: 'ROAS = 216.000.000 ÷ 60.000.000 = 3,6' },
    ],
  },
  {
    id: 'thoi-trang',
    title: 'Shop thời trang: ROAS 2,5 là tốt hay xấu?',
    story: 'Giá vốn chiếm 45% doanh thu, phí sàn + vận chuyển + hoàn chiếm 20%. Chiến dịch tháng này: chi 60 triệu, ra 150 triệu doanh thu.',
    questions: [
      { q: 'Biên đóng góp trước quảng cáo (%)?', answer: contributionMarginPct(0.45, 0.2) * 100, unit: '%', solution: 'Biên = 100% − 45% − 20% = 35%' },
      { q: 'ROAS hòa vốn?', answer: breakevenRoas(0.35), unit: '', solution: 'ROAS hòa vốn = 1 ÷ 0,35 ≈ 2,86' },
      { q: 'Chiến dịch đang lãi hay lỗ trên đơn đầu tiên?', choices: ['Lãi', 'Lỗ'], answer: 'Lỗ',
        solution: 'ROAS thực tế = 150 ÷ 60 = 2,5 < 2,86 → lỗ. Chỉ đáng chạy tiếp nếu khách mua lại đủ nhiều.' },
    ],
  },
  {
    id: 'thuc-pham',
    title: 'Shop thực phẩm sạch: khách mua lại có cứu được không?',
    story: 'AOV 300.000 ₫, biên đóng góp 30%. Khách mua trung bình 5 lần trong vòng đời. Để có một khách mới tốn 200.000 ₫.',
    questions: [
      { q: 'CLV (₫)?', answer: clv(300000, 5, 0.3), unit: '₫', solution: 'CLV = 300.000 × 5 × 30% = 450.000 ₫' },
      { q: 'Tỉ lệ CLV / CAC?', answer: clv(300000, 5, 0.3) / 200000, unit: '', solution: 'CLV/CAC = 450.000 ÷ 200.000 = 2,25' },
      { q: 'Sức khỏe theo mốc tham khảo?', choices: ['Lỗ trên từng khách', 'Có lãi nhưng cần cải thiện', 'Lành mạnh'], answer: 'Có lãi nhưng cần cải thiện',
        solution: '1 ≤ 2,25 < 3: có lãi trên vòng đời nhưng mỏng. Đẩy tỉ lệ mua lại hoặc giảm CAC.' },
    ],
  },
]

function isCorrect(q, input) {
  if (q.choices) return input === q.answer
  const v = Number(input)
  if (!Number.isFinite(v)) return false
  return Math.abs(v - q.answer) <= Math.max(Math.abs(q.answer) * 0.02, 0.01)
}

function Exercise({ c }) {
  const [inputs, setInputs] = useState({})
  const [checked, setChecked] = useState(false)
  const score = c.questions.filter((q, i) => isCorrect(q, inputs[i])).length
  return (
    <Card>
      <h4 className="font-bold">{c.title}</h4>
      <p className="mt-1 text-sm text-stone-600">{c.story}</p>
      <div className="mt-3 space-y-3">
        {c.questions.map((q, i) => {
          const ok = isCorrect(q, inputs[i])
          return (
            <div key={i} className={`rounded-xl border p-3 ${checked ? (ok ? 'border-brand-500 bg-brand-50' : 'border-red-200 bg-red-50') : 'border-stone-200'}`}>
              <p className="text-sm font-medium">{i + 1}. {q.q}</p>
              {q.choices ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.choices.map((ch) => (
                    <button key={ch} onClick={() => setInputs((s) => ({ ...s, [i]: ch }))}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${inputs[i] === ch ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 bg-white hover:bg-stone-50'}`}>
                      {ch}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" inputMode="decimal" value={inputs[i] ?? ''} onChange={(e) => setInputs((s) => ({ ...s, [i]: e.target.value }))}
                    className="w-44 rounded-lg border border-stone-300 px-3 py-1.5 text-right font-mono outline-none focus:border-brand-500" placeholder="Nhập số" />
                  <span className="text-sm text-stone-500">{q.unit}</span>
                </div>
              )}
              {checked && <p className="mt-2 text-xs text-stone-700">{ok ? '✓ Đúng. ' : '✗ Chưa đúng. '}{q.solution}</p>}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => setChecked(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Chấm điểm</button>
        <button onClick={() => { setInputs({}); setChecked(false) }} className="text-sm text-stone-600 hover:underline">Làm lại</button>
        {checked && <span className="text-sm font-semibold">{score}/{c.questions.length} câu đúng</span>}
      </div>
    </Card>
  )
}

// ---------- Chẩn đoán bệnh án tài chính ----------
const SAMPLE = {
  revenue: 800e6, orders: 2000, cogs: 360e6, variableCost: 176e6, adSpend: 200e6,
  adRevenue: 480e6, newCustomers: 1700, lifetimeOrders: 1.6, fixedCost: 150e6,
}
const FIELDS = [
  ['revenue', 'Doanh thu tháng', '₫'], ['orders', 'Tổng số đơn', 'đơn'], ['cogs', 'Giá vốn hàng bán', '₫'],
  ['variableCost', 'Phí sàn, vận chuyển, hoàn hàng', '₫'], ['adSpend', 'Chi phí quảng cáo', '₫'], ['adRevenue', 'Doanh thu từ quảng cáo', '₫'],
  ['newCustomers', 'Số khách mới', 'khách'], ['lifetimeOrders', 'Số đơn trung bình trong vòng đời khách', 'lần'], ['fixedCost', 'Chi phí cố định (lương, mặt bằng…)', '₫'],
]

function Diagnosis() {
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

export default function Practice() {
  const [mode, setMode] = useState('bai-tap')
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl bg-stone-200 p-1 text-sm">
        {[['bai-tap', 'Bài tập có đáp án'], ['chan-doan', 'Chẩn đoán số liệu của bạn']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-lg px-3 py-1.5 font-medium ${mode === k ? 'bg-white shadow' : 'text-stone-600'}`}>{l}</button>
        ))}
      </div>
      {mode === 'bai-tap' ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{CASES.map((c) => <Exercise key={c.id} c={c} />)}</div>
      ) : (
        <Diagnosis />
      )}
    </div>
  )
}
