import { useState } from 'react'
import { metricById } from '../data/index.js'

const nf = (x, d = 2) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(x)

// Cây công thức: mỗi biến là một nút bấm được, mũi tên cho biết muốn chỉ số gốc tốt lên thì biến này phải đi hướng nào
function Node({ n, onSelect, depth }) {
  if (typeof n === 'string') return <span className="px-0.5 font-display text-sm font-bold text-muted">{n}</span>
  const m = n.id && metricById[n.id]
  const arrow = n.dir === 'up' ? '↑' : n.dir === 'down' ? '↓' : ''
  const chip = (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-display text-sm font-extrabold ${depth === 0 ? 'bg-brand-600 text-white' : 'bg-white text-ink ring-1 ring-stone-200'} ${m ? 'transition hover:ring-brand-500' : ''}`}>
      {n.label}{arrow && <span className="text-brand-600">{arrow}</span>}
    </span>
  )
  return (
    <span className="inline-flex flex-col items-center gap-2">
      {m ? <button onClick={() => onSelect(n.id)} title={`Học ${m.code}: ${m.vi_name}`}>{chip}</button> : chip}
      {n.eq && (
        <span className="relative flex flex-wrap items-center justify-center gap-1.5 border-t border-stone-300 pt-2">
          <span className="absolute -top-2 left-1/2 h-2 w-px bg-stone-300" aria-hidden="true" />
          {n.eq.map((c, i) => <Node key={i} n={c} onSelect={onSelect} depth={depth + 1} />)}
        </span>
      )}
    </span>
  )
}

export function FormulaTree({ tree, onSelect }) {
  return (
    <figure>
      <figcaption className="text-sm font-bold text-ink">{tree.title}</figcaption>
      <div className="no-scrollbar mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max justify-center"><Node n={tree.expr} onSelect={onSelect} depth={0} /></div>
      </div>
      {tree.note && <p className="mt-3 text-sm leading-relaxed text-charcoal">{tree.note}</p>}
    </figure>
  )
}

// 100k đi đâu: thanh ngang một màu xám; Ads (thứ đang học) màu cam; phần còn lại vàng
export function SpendBars({ bars }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(...bars.items.map((x) => x[1]))
  return (
    <figure>
      {bars.title && <figcaption className="text-sm font-bold text-ink">{bars.title}</figcaption>}
      <ul className="space-y-2">
        {bars.items.map(([label, v, kind], i) => (
          <li key={label} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-3 text-[13px]" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className={`truncate ${kind ? 'font-bold text-ink' : 'text-body'}`}>{label}</span>
            <span className="flex items-center gap-2">
              <span className="h-3 rounded-r-[4px] transition-opacity" style={{
                width: `${Math.max(1.5, (v / max) * 100)}%`,
                background: kind === 'focus' ? '#F05025' : kind === 'keep' ? '#FFD200' : '#D6D3D1',
                opacity: hover == null || hover === i ? 1 : 0.45,
              }} />
              <span className="num shrink-0 font-bold text-ink">{nf(v)}{bars.unit}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

// Đường cong: còn lại / 100k = 100 − chi phí khác − 100/ROAS. Cắt trục 0 tại ROAS không lỗ.
export function RoasCurve({ c }) {
  const [hx, setHx] = useState(null)
  const W = 520, H = 240, P = { l: 40, r: 14, t: 16, b: 34 }
  const [x0, x1] = c.range
  const f = (x) => 100 - c.cost - 100 / x
  const be = 100 / (100 - c.cost)
  const ys = [f(x0), f(x1)], y0 = Math.min(-20, Math.floor(ys[0] / 10) * 10), y1 = Math.max(15, Math.ceil(ys[1] / 5) * 5)
  const X = (x) => P.l + ((x - x0) / (x1 - x0)) * (W - P.l - P.r)
  const Y = (y) => P.t + ((y1 - y) / (y1 - y0)) * (H - P.t - P.b)
  const pts = Array.from({ length: 80 }, (_, i) => x0 + ((x1 - x0) * i) / 79)
  const d = pts.map((x, i) => (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(f(x)).toFixed(1)).join(' ')
  const loss = `M${X(x0)} ${Y(0)} ` + pts.filter((x) => x <= be).map((x) => `L${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`).join(' ') + ` L${X(be)} ${Y(0)} Z`
  const ticksY = []; for (let v = y0; v <= y1; v += 10) ticksY.push(v)
  const ticksX = []; for (let v = Math.ceil(x0); v <= x1; v += 1) ticksX.push(v)
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W
    const x = x0 + ((px - P.l) / (W - P.l - P.r)) * (x1 - x0); setHx(x < x0 || x > x1 ? null : x)
  }
  return (
    <figure>
      {c.title && <figcaption className="text-sm font-bold text-ink">{c.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full touch-none select-none" onPointerMove={move} onPointerLeave={() => setHx(null)} role="img"
        aria-label={`Dưới ROAS ${nf(be)} là lỗ; ở ROAS ${nf(c.now)} còn lại ${nf(f(c.now))}k mỗi 100k`}>
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? '#57534E' : '#EEECEA'} strokeWidth={v === 0 ? 1.2 : 1} />
            <text x={P.l - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#888">{v}</text>
          </g>
        ))}
        {ticksX.map((v) => <text key={v} x={X(v)} y={H - 12} textAnchor="middle" fontSize="11" fill="#888">{v}</text>)}
        <text x={W - P.r} y={H - 0} textAnchor="end" fontSize="11" fill="#888">ROAS</text>
        <path d={loss} fill="#B42318" opacity="0.08" />
        <path d={d} fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" />
        <line x1={X(be)} x2={X(be)} y1={P.t} y2={H - P.b} stroke="#ED3420" strokeDasharray="4 4" />
        <text x={X(be) - 6} y={P.t + 10} textAnchor="end" fontSize="11" fontWeight="700" fill="#ED3420">Không lỗ từ {nf(be)}</text>
        <circle cx={X(c.now)} cy={Y(f(c.now))} r="5" fill="#FFD200" stroke="#1A1A1A" strokeWidth="1.5" />
        <text x={X(c.now) + 8} y={Y(f(c.now)) - 8} fontSize="11" fontWeight="700" fill="#1A1A1A">Đang chạy {nf(c.now)}: còn {nf(f(c.now))}k</text>
        <text x={X(x0) + 6} y={Y(y0 / 2)} fontSize="11" fontWeight="700" fill="#B42318">Vùng lỗ</text>
        {hx != null && (
          <g>
            <line x1={X(hx)} x2={X(hx)} y1={P.t} y2={H - P.b} stroke="#A8A29E" />
            <circle cx={X(hx)} cy={Y(f(hx))} r="4" fill="#fff" stroke="#1A1A1A" strokeWidth="1.5" />
            <g transform={`translate(${Math.min(W - 150, X(hx) + 8)},${Math.max(P.t, Y(f(hx)) - 40)})`}>
              <rect width="140" height="34" rx="6" fill="#fff" stroke="#E7E5E4" />
              <text x="8" y="14" fontSize="11" fill="#57534E">ROAS {nf(hx, 1)}</text>
              <text x="8" y="28" fontSize="12" fontWeight="700" fill={f(hx) < 0 ? '#B42318' : '#1A1A1A'}>Còn lại {nf(f(hx), 1)}k / 100k</text>
            </g>
          </g>
        )}
      </svg>
    </figure>
  )
}
