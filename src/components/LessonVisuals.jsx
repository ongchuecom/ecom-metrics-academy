import { useState } from 'react'
import { metricById } from '../data/index.js'

const nf = (x, d = 2) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(x)
// đơn vị chữ (ngày, đơn, người…) cách số một khoảng; đơn vị ký hiệu (k, tr, %, x) viết liền
const un = (u) => (!u ? '' : /^(k|tr|%|x|đ|tỷ)$/.test(u) ? u : ' ' + u)

// Cây công thức: mỗi biến là một nút bấm được, mũi tên cho biết muốn chỉ số gốc tốt lên thì biến này phải đi hướng nào
function Node({ n, onSelect, depth }) {
  if (typeof n === 'string') return <span className="px-0.5 font-display text-sm font-bold text-muted">{n}</span>
  const m = n.id && metricById[n.id]
  const arrow = n.dir === 'up' ? '↑' : n.dir === 'down' ? '↓' : ''
  const chip = (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-display text-sm font-bold ${depth === 0 ? 'bg-brand-600 text-white' : 'bg-white text-ink ring-1 ring-stone-200'} ${m ? 'transition hover:ring-brand-500' : ''}`}>
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
  const max = Math.max(...bars.items.map((x) => Math.abs(x[1])), 1e-9)
  // chỉ tô cam khi đúng 1 mục là trọng tâm; nhiều mục thì để xám cho đỡ rối mắt
  const oneFocus = bars.items.filter((x) => x[2] === 'focus').length === 1
  return (
    <figure>
      {bars.title && <figcaption className="text-sm font-bold text-ink">{bars.title}</figcaption>}
      <ul className="space-y-2">
        {bars.items.map(([label, v, kind], i) => (
          <li key={label} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-3 text-[13px]" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className={`truncate ${kind ? 'font-bold text-ink' : 'text-body'}`}>{label}</span>
            <span className="flex items-center gap-2">
              <span className="h-3 rounded-r-[4px] transition-opacity" style={{
                width: `${Math.max(1.5, (Math.abs(v) / max) * 100)}%`,
                background: kind === 'focus' ? (oneFocus ? '#F05025' : '#A8A29E') : kind === 'keep' ? '#FFD200' : kind === 'loss' ? '#B42318' : '#D6D3D1',
                opacity: hover == null || hover === i ? 1 : 0.45,
              }} />
              <span className={`num shrink-0 font-bold ${v < 0 ? 'text-coral' : 'text-ink'}`}>{nf(v)}{un(bars.unit)}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

// Đường tổng quát: points [[x,y]], tùy chọn threshold (vạch dọc), now (điểm đang đứng), lossBelowZero (tô vùng âm)
export function LineChart({ c }) {
  const [hx, setHx] = useState(null)
  const W = 520, H = 240, P = { l: 44, r: 16, t: 18, b: 36 }
  const pts = c.points
  const x0 = pts[0][0], x1 = pts[pts.length - 1][0]
  const yv = pts.map((p) => p[1])
  let y0 = Math.min(...yv, c.lossBelowZero ? 0 : Infinity), y1 = Math.max(...yv)
  if (!(y1 > y0)) y1 = y0 + 1
  const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad
  const step = (() => { const r = (y1 - y0) / 4, m = Math.pow(10, Math.floor(Math.log10(r))); return [1, 2, 2.5, 5, 10].map((k) => k * m).find((k) => k >= r) })()
  const X = (x) => P.l + ((x - x0) / (x1 - x0)) * (W - P.l - P.r)
  const Y = (y) => P.t + ((y1 - y) / (y1 - y0)) * (H - P.t - P.b)
  const at = (x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, b] = [pts[i - 1], pts[i]]; return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]) } return pts[pts.length - 1][1] }
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ')
  const ticksY = []; for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticksY.push(+v.toFixed(6))
  const nx = 5, ticksX = Array.from({ length: nx }, (_, i) => x0 + ((x1 - x0) * i) / (nx - 1))
  const neg = c.lossBelowZero && y0 < 0
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; const x = x0 + ((px - P.l) / (W - P.l - P.r)) * (x1 - x0); setHx(x < x0 || x > x1 ? null : x) }
  const u = c.unit || ''
  return (
    <figure>
      {c.title && <figcaption className="text-sm font-bold text-ink">{c.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full touch-none select-none" onPointerMove={move} onPointerLeave={() => setHx(null)} role="img" aria-label={c.title || c.xLabel}>
        {neg && <rect x={P.l} y={Y(0)} width={W - P.l - P.r} height={Y(y0) - Y(0)} fill="#B42318" opacity="0.06" />}
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? '#78716C' : '#EEECEA'} strokeWidth={v === 0 ? 1.2 : 1} />
            <text x={P.l - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#888">{nf(v, 1)}</text>
          </g>
        ))}
        {ticksX.map((v, i) => <text key={i} x={X(v)} y={H - 16} textAnchor="middle" fontSize="11" fill="#888">{nf(v, 1)}</text>)}
        {c.xLabel && <text x={W - P.r} y={H - 2} textAnchor="end" fontSize="11" fill="#888">{c.xLabel}</text>}
        {neg && <text x={P.l + 6} y={Y(y0) - 6} fontSize="11" fontWeight="700" fill="#B42318">Vùng lỗ</text>}
        <path d={d} fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" />
        {c.threshold && (
          <g>
            <line x1={X(c.threshold.x)} x2={X(c.threshold.x)} y1={P.t} y2={H - P.b} stroke="#ED3420" strokeDasharray="4 4" />
            <text x={X(c.threshold.x) + (X(c.threshold.x) > W * 0.6 ? -6 : 6)} y={P.t + 10} textAnchor={X(c.threshold.x) > W * 0.6 ? 'end' : 'start'} fontSize="11" fontWeight="700" fill="#ED3420">{c.threshold.label}</text>
          </g>
        )}
        {c.now && (() => { const nx2 = X(c.now.x), ny = Y(at(c.now.x)), right = nx2 < W * 0.6; return (
          <g>
            <circle cx={nx2} cy={ny} r="5" fill="#FFD200" stroke="#1A1A1A" strokeWidth="1.5" />
            <text x={nx2 + (right ? 8 : -8)} y={ny + 16} textAnchor={right ? 'start' : 'end'} fontSize="11" fontWeight="700" fill="#1A1A1A">{c.now.label}</text>
          </g>) })()}
        {hx != null && (() => { const yy = at(hx), tx = Math.min(W - 150, Math.max(P.l, X(hx) + 8)); return (
          <g>
            <line x1={X(hx)} x2={X(hx)} y1={P.t} y2={H - P.b} stroke="#A8A29E" />
            <circle cx={X(hx)} cy={Y(yy)} r="4" fill="#fff" stroke="#1A1A1A" strokeWidth="1.5" />
            <g transform={`translate(${tx},${P.t + 18})`}>
              <rect width="140" height="34" rx="6" fill="#fff" stroke="#E7E5E4" />
              <text x="8" y="14" fontSize="11" fill="#57534E">{c.xLabel || 'x'} {nf(hx, 2)}</text>
              <text x="8" y="28" fontSize="12" fontWeight="700" fill={yy < 0 ? '#B42318' : '#1A1A1A'}>{nf(yy, 2)}{un(u)}</text>
            </g>
          </g>) })()}
      </svg>
    </figure>
  )
}

// Phễu: số giảm dần, app tự tính % từng bước
export function Funnel({ c }) {
  const max = c.items[0][1] || 1
  return (
    <figure>
      {c.title && <figcaption className="mb-3 text-sm font-bold text-ink">{c.title}</figcaption>}
      <ul className="space-y-1.5">
        {c.items.map(([label, v], i) => {
          const prev = i ? c.items[i - 1][1] : null
          return (
            <li key={label}>
              {prev != null && <p className="pl-1 text-[11px] font-semibold text-muted">↓ {nf((v / prev) * 100, 1)}% đi tiếp</p>}
              <div className="flex items-center gap-2">
                <div className="flex h-8 items-center rounded-md px-2.5 text-[13px] font-bold" style={{ width: `${Math.max(28, (v / max) * 100)}%`, background: i === c.items.length - 1 ? '#F05025' : i === 0 ? '#E7E5E4' : '#D6D3D1', color: i === c.items.length - 1 ? '#fff' : '#1A1A1A' }}>
                  <span className="truncate">{label}</span>
                </div>
                <span className="num shrink-0 text-[13px] font-bold text-ink">{nf(v, 0)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}

// So sánh 2 cột (trước/sau, A/B) cho từng chỉ tiêu
export function Compare({ c }) {
  const max = Math.max(...c.items.flatMap((r) => [Math.abs(r[1]), Math.abs(r[2])]), 1e-9)
  const [la, lb] = c.labels || ['Trước', 'Sau']
  return (
    <figure>
      {c.title && <figcaption className="mb-2 text-sm font-bold text-ink">{c.title}</figcaption>}
      <div className="mb-2 flex gap-4 text-[11px] font-semibold text-charcoal">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-stone-300" />{la}</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#F05025' }} />{lb}</span>
      </div>
      <ul className="space-y-3">
        {c.items.map(([label, a, b]) => (
          <li key={label} className="text-[13px]">
            <p className="mb-1 font-semibold text-ink">{label}</p>
            {[[a, '#D6D3D1'], [b, '#F05025']].map(([v, col], k) => (
              <div key={k} className="mb-0.5 flex items-center gap-2">
                <span className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.max(1.5, (Math.abs(v) / max) * 85)}%`, background: col }} />
                <span className={`num shrink-0 font-bold ${v < 0 ? 'text-coral' : 'text-ink'}`}>{nf(v)}{un(c.unit)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </figure>
  )
}

// Ma trận 2×2: y[0] là hàng trên
export function Matrix({ c }) {
  const tone = { good: 'bg-brand-50 text-ink', bad: 'bg-red-50 text-ink', mid: 'bg-stone-50 text-ink' }
  return (
    <figure>
      {c.title && <figcaption className="mb-2 text-sm font-bold text-ink">{c.title}</figcaption>}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-[13px]">
        <span />
        {c.x.map((x) => <span key={x} className="pb-1 text-center text-[11px] font-bold text-muted">{x}</span>)}
        {c.cells.map((row, r) => [
          <span key={'y' + r} className="flex items-center pr-1 text-[11px] font-bold text-muted [writing-mode:vertical-rl] rotate-180">{c.y[r]}</span>,
          ...row.map((cell, k) => (
            <div key={r + '-' + k} className={`rounded-xl p-2.5 ${tone[cell.tone] || tone.mid}`}>
              <p className={`font-display text-[13px] font-bold ${cell.tone === 'good' ? 'text-brand-600' : cell.tone === 'bad' ? 'text-coral' : 'text-ink'}`}>{cell.title}</p>
              <p className="mt-0.5 leading-snug text-body">{cell.text}</p>
            </div>
          )),
        ])}
      </div>
    </figure>
  )
}

// Các bước làm
export function Steps({ c }) {
  return (
    <figure>
      {c.title && <figcaption className="mb-2 text-sm font-bold text-ink">{c.title}</figcaption>}
      <ol className="space-y-2">
        {c.items.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-xs font-bold text-brand-600">{i + 1}</span>
            <p className="text-[13px] leading-snug text-body"><b className="text-ink">{t}.</b> {d}</p>
          </li>
        ))}
      </ol>
    </figure>
  )
}

export function Chart({ c }) {
  if (!c) return null
  switch (c.type) {
    case 'bars': return <SpendBars bars={c} />
    case 'line': return <LineChart c={c} />
    case 'funnel': return <Funnel c={c} />
    case 'compare': return <Compare c={c} />
    case 'matrix': return <Matrix c={c} />
    case 'steps': return <Steps c={c} />
    default: return null
  }
}
