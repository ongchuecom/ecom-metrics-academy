import { useMemo, useState } from 'react'
import { vnd, pct, num } from '../lib/calc.js'
import { Card } from './ui.jsx'

// Mỗi bảng: dòng nhập (input) và dòng công thức (calc). Cột "Công thức Excel/Sheets"
// dùng tham chiếu ô B{dòng}, khớp đúng thứ tự dòng khi xuất ra CSV (dòng 1 là tiêu đề).
const TEMPLATES = [
  {
    id: 'pnl',
    title: 'P&L tháng',
    desc: 'Báo cáo lãi lỗ một tháng, mỗi tầng chi phí tính theo % doanh thu.',
    rows: [
      { k: 'rev', label: 'Doanh thu', input: 1000000000, fmt: 'vnd' },
      { k: 'cogsP', label: 'Giá vốn (% doanh thu)', input: 0.4, fmt: 'pct' },
      { k: 'cogs', label: 'Giá vốn', calc: (v) => v.rev * v.cogsP, excel: '=B2*B3', fmt: 'vnd' },
      { k: 'gp', label: 'Lợi nhuận gộp', calc: (v) => v.rev - v.cogs, excel: '=B2-B4', fmt: 'vnd' },
      { k: 'varP', label: 'Phí sàn, vận chuyển, hoàn (% doanh thu)', input: 0.18, fmt: 'pct' },
      { k: 'var', label: 'Chi phí biến đổi', calc: (v) => v.rev * v.varP, excel: '=B2*B6', fmt: 'vnd' },
      { k: 'cm', label: 'Biên đóng góp', calc: (v) => v.gp - v.var, excel: '=B5-B7', fmt: 'vnd' },
      { k: 'ads', label: 'Chi phí quảng cáo', input: 250000000, fmt: 'vnd' },
      { k: 'fixed', label: 'Chi phí cố định', input: 120000000, fmt: 'vnd' },
      { k: 'net', label: 'Lãi ròng', calc: (v) => v.cm - v.ads - v.fixed, excel: '=B8-B9-B10', fmt: 'vnd', strong: true },
      { k: 'netP', label: 'Biên ròng', calc: (v) => (v.rev ? v.net / v.rev : 0), excel: '=B11/B2', fmt: 'pct', strong: true },
    ],
  },
  {
    id: 'unit',
    title: 'Unit economics một đơn',
    desc: 'Lãi lỗ trên một đơn và trên vòng đời một khách.',
    rows: [
      { k: 'aov', label: 'Giá trị đơn trung bình (AOV)', input: 450000, fmt: 'vnd' },
      { k: 'cogsP', label: 'Giá vốn (% giá bán)', input: 0.4, fmt: 'pct' },
      { k: 'varP', label: 'Phí sàn, vận chuyển, hoàn (% giá bán)', input: 0.18, fmt: 'pct' },
      { k: 'cmo', label: 'Biên đóng góp mỗi đơn', calc: (v) => v.aov * (1 - v.cogsP - v.varP), excel: '=B2*(1-B3-B4)', fmt: 'vnd' },
      { k: 'cac', label: 'CAC (chi phí có một khách mới)', input: 150000, fmt: 'vnd' },
      { k: 'first', label: 'Lãi đơn đầu tiên', calc: (v) => v.cmo - v.cac, excel: '=B5-B6', fmt: 'vnd', strong: true },
      { k: 'life', label: 'Số đơn trong vòng đời', input: 2.5, fmt: 'num' },
      { k: 'clv', label: 'CLV', calc: (v) => v.cmo * v.life, excel: '=B5*B8', fmt: 'vnd', strong: true },
      { k: 'ratio', label: 'CLV / CAC', calc: (v) => (v.cac ? v.clv / v.cac : 0), excel: '=B9/B6', fmt: 'num', strong: true },
      { k: 'be', label: 'ROAS hòa vốn', calc: (v) => { const m = 1 - v.cogsP - v.varP; return m > 0 ? 1 / m : Infinity }, excel: '=1/(1-B3-B4)', fmt: 'num' },
    ],
  },
]

const fmtValue = (f, v) => (f === 'vnd' ? vnd(v) : f === 'pct' ? pct(v) : num(v))

function compute(t, inputs) {
  const v = {}
  for (const r of t.rows) v[r.k] = 'input' in r ? inputs[r.k] : r.calc(v)
  return v
}

function toCsv(t, inputs) {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`
  const lines = [['Chỉ tiêu', 'Giá trị', 'Ghi chú'].map(esc).join(',')]
  for (const r of t.rows) lines.push([esc(r.label), 'input' in r ? inputs[r.k] : r.excel, esc('input' in r ? 'Ô nhập' : 'Công thức')].join(','))
  return '﻿' + lines.join('\n')
}

function Sheet({ t }) {
  const init = Object.fromEntries(t.rows.filter((r) => 'input' in r).map((r) => [r.k, r.input]))
  const [inputs, setInputs] = useState(init)
  const v = useMemo(() => compute(t, inputs), [t, inputs])
  const [copied, setCopied] = useState(false)

  const download = () => {
    const blob = new Blob([toCsv(t, inputs)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ecom-metrics-${t.id}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const copy = async () => {
    const tsv = t.rows.map((r) => [r.label, 'input' in r ? inputs[r.k] : r.excel].join('\t')).join('\n')
    try { await navigator.clipboard.writeText('Chỉ tiêu\tGiá trị\n' + tsv); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* trình duyệt chặn clipboard */ }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-bold">{t.title}</h4>
          <p className="text-sm text-stone-600">{t.desc}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">{copied ? 'Đã chép' : 'Chép sang Sheets/Excel'}</button>
          <button onClick={download} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">Tải CSV</button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="w-10 border border-stone-200 px-2 py-1.5 text-center">#</th>
              <th className="border border-stone-200 px-2 py-1.5">A · Chỉ tiêu</th>
              <th className="border border-stone-200 px-2 py-1.5 text-right">B · Giá trị</th>
              <th className="border border-stone-200 px-2 py-1.5">Công thức</th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => {
              const isInput = 'input' in r
              const bad = !isInput && Number.isFinite(v[r.k]) && v[r.k] < 0
              return (
                <tr key={r.k} className={r.strong ? 'font-semibold' : ''}>
                  <td className="border border-stone-200 px-2 py-1 text-center text-xs text-stone-400">{i + 2}</td>
                  <td className="border border-stone-200 px-2 py-1">{r.label}</td>
                  <td className={`border border-stone-200 px-1 py-0.5 text-right ${isInput ? 'bg-amber-50' : 'bg-white'}`}>
                    {isInput ? (
                      <input type="number" inputMode="decimal" step={r.fmt === 'pct' ? 0.01 : 'any'} value={inputs[r.k]}
                        onChange={(e) => setInputs((s) => ({ ...s, [r.k]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full bg-transparent px-1 py-0.5 text-right font-mono outline-none" aria-label={r.label} />
                    ) : (
                      <span className={`font-mono tabular-nums ${bad ? 'text-red-600' : ''}`}>{fmtValue(r.fmt, v[r.k])}</span>
                    )}
                  </td>
                  <td className="border border-stone-200 px-2 py-1 font-mono text-xs text-stone-500">{isInput ? (r.fmt === 'pct' ? 'nhập dạng 0,4 = 40%' : 'ô nhập') : r.excel}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">Ô vàng là ô nhập. CSV xuất ra giữ nguyên công thức, mở bằng Google Sheets hoặc Excel là chạy được.</p>
    </Card>
  )
}

export default function Templates() {
  return <div className="grid gap-4 2xl:grid-cols-2">{TEMPLATES.map((t) => <Sheet key={t.id} t={t} />)}</div>
}
