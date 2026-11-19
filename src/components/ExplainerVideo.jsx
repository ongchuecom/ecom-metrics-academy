import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import katex from 'katex'
import { metricById, stageById, STAGES } from '../data/index.js'
import { evaluateOutputs, isWarning, formatUnit } from '../lib/formula.js'

// Video giải thích dạng motion, dựng trực tiếp từ dữ liệu chỉ số (không cần file MP4).
// Mỗi chỉ số tự có 4–6 cảnh: Mở đầu → Nói gọn → Công thức → Ví dụ → Mạng lưới → Chốt.
// Nếu chỉ số có media.video_url (Drive/YouTube), người xem chuyển sang được video quay thật.

const fs = (n) => ({ fontSize: `${n}cqmin` })
const spoken = (s) => s.replace(/[×*]/g, ' nhân ').replace(/\//g, ' chia ').replace(/−/g, ' trừ ').replace(/[()]/g, ' ')

function durationFor(text, base = 3) {
  return Math.min(10, Math.max(4.5, base + (text || '').length / 20)) * 1000
}

function buildScenes(metric) {
  const stageNo = STAGES.findIndex((s) => s.id === metric.stage) + 1
  const up = metric.relationships?.upstream_drivers || []
  const down = metric.relationships?.downstream_impacts || []
  const trade = metric.relationships?.trade_offs?.[0]
  const scenes = []
  scenes.push({ id: 'hook', label: 'Mở đầu', say: `${metric.code}, ${metric.vi_name}. Hiểu nhanh trong vài cảnh.`, dur: 4200, stageNo })
  scenes.push({ id: 'def', label: 'Nói gọn', say: metric.definition, dur: durationFor(metric.definition, 2.5) })
  scenes.push({ id: 'formula', label: 'Công thức', say: 'Công thức: ' + spoken(metric.formula.readable), dur: durationFor(metric.formula.readable, 3.5) })
  if (metric.simulator) {
    const sim = metric.simulator
    const vals = Object.fromEntries(sim.controls.map((c) => [c.key, c.default]))
    const res = evaluateOutputs(sim.outputs, vals)
    const out = [...sim.outputs].reverse().find((o) => o.warning_threshold) || sim.outputs[sim.outputs.length - 1]
    const inputs = sim.controls.slice(0, 4).map((c) => ({ label: c.label, value: formatUnit(c.default, c.unit) }))
    const value = res[out.key]
    const warn = isWarning(value, out.warning_threshold)
    scenes.push({
      id: 'example', label: 'Ví dụ', inputs, out: { label: out.label, value: formatUnit(value, out.unit), warn, threshold: out.warning_threshold },
      say: `Ví dụ: ${inputs.map((i) => `${i.label} ${i.value}`).join(', ')}. Khi đó ${out.label} là ${formatUnit(value, out.unit)}${warn ? ', đã vượt ngưỡng cảnh báo' : ''}.`,
      dur: 2000 + inputs.length * 900 + 2600,
    })
  }
  if (up.length || down.length) {
    const name = (r) => metricById[r.metric_id]?.code || r.metric_id
    scenes.push({
      id: 'network', label: 'Mạng lưới', up: up.slice(0, 3), down: down.slice(0, 3),
      say: `${up.length ? `${metric.code} chịu tác động từ ${up.slice(0, 3).map(name).join(', ')}.` : ''} ${down.length ? `Nó kéo theo ${down.slice(0, 3).map(name).join(', ')}.` : ''}`,
      dur: 6000,
    })
  }
  const hw = metric.diagnostic_homework
  scenes.push({
    id: 'close', label: 'Chốt', trade, hw: hw?.title,
    say: `${trade ? 'Cẩn thận: ' + trade.note + '.' : ''} ${hw ? 'Thử sức với ' + hw.title.replace(/^Bệnh án:\s*/, '') + '.' : 'Kéo xuống để xem chỉ số này nối với những chỉ số nào.'}`,
    dur: durationFor(trade?.note, 4),
  })
  scenes[0].agenda = scenes.slice(1).map((x) => x.label)
  return scenes
}

function Frame({ bg, children, n, total, label, dark, sign = false }) {
  return (
    <div className={`absolute inset-0 flex flex-col ${bg}`} style={{ padding: '6cqmin 7cqmin' }}>
      <div className={`flex items-center justify-between ${dark ? 'text-white/85' : 'text-current opacity-70'}`}>
        <span className="eyebrow" style={fs(2.6)}>{label}</span>
        <span className="num font-bold" style={fs(2.6)}>{n}/{total}</span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col justify-center">{children}</div>
      {sign && <p className={`text-right font-display font-extrabold ${dark ? 'text-white/85' : 'opacity-70'}`} style={fs(2.6)}>Ông chú Ecom</p>}
    </div>
  )
}

function Scene({ s, metric, n, total, onHomework }) {
  const d = (ms) => ({ animationDelay: `${ms}ms` })
  const stage = stageById[metric.stage]
  switch (s.id) {
    case 'hook':
      return (
        <Frame bg="bg-brand-50 text-ink" n={n} total={total} label={`Khâu ${s.stageNo} · ${stage?.short || ''}`}>
          <p className="mv-up font-display font-extrabold text-brand-600" style={{ ...fs(4), ...d(100) }}>Hiểu nhanh</p>
          <p className="mv-pop font-display font-black leading-none" style={{ ...fs(metric.code.length > 10 ? 12 : 18), ...d(250) }}>{metric.code}</p>
          <p className="mv-up mt-[2cqmin] font-semibold leading-snug text-body" style={{ ...fs(4), ...d(800) }}>{metric.vi_name}</p>
          <div className="mt-[4cqmin] flex flex-wrap gap-[1.5cqmin]">
            {s.agenda.map((a, k) => (
              <span key={a} className="mv-up rounded-full bg-white font-semibold text-body ring-1 ring-brand-500/30" style={{ padding: '1cqmin 2.4cqmin', ...fs(2.8), ...d(1300 + k * 220) }}>
                {k + 1}. {a}
              </span>
            ))}
          </div>
        </Frame>
      )
    case 'def': {
      const [first, ...rest] = metric.definition.split(/(?<=\.)\s+/)
      return (
        <Frame bg="bg-white text-ink" n={n} total={total} label="Nói gọn">
          <div className="flex gap-[3cqmin]">
            <span className="mv-up w-[1.4cqmin] shrink-0 rounded-full bg-brand-500" style={d(0)} />
            <div>
              <p className="font-display font-extrabold leading-snug" style={fs(5.6)}>
                <span className="mv-wipe" style={d(400)}>{first}</span>
              </p>
              {rest.length > 0 && <p className="mv-up mt-[3cqmin] leading-relaxed text-body" style={{ ...fs(3.6), ...d(1600) }}>{rest.join(' ')}</p>}
            </div>
          </div>
        </Frame>
      )
    }
    case 'formula': {
      let html = ''
      try { html = metric.formula.latex ? katex.renderToString(metric.formula.latex, { displayMode: true, throwOnError: false, strict: false }) : '' } catch { html = '' }
      return (
        <Frame bg="bg-white text-ink" n={n} total={total} label="Công thức">
          <div className="mv-pop rounded-[3cqmin] bg-brand-50 text-ink" style={{ padding: '4cqmin', ...d(200) }}>
            {html ? <div style={fs(4.4)} dangerouslySetInnerHTML={{ __html: html }} /> : <p className="font-display font-extrabold leading-snug" style={fs(4.2)}>{metric.formula.readable}</p>}
          </div>
          {html && <p className="mv-up mt-[4cqmin] font-semibold leading-snug" style={{ ...fs(3.6), ...d(1200) }}>{metric.formula.readable}</p>}
        </Frame>
      )
    }
    case 'example':
      return (
        <Frame bg="bg-white text-ink" n={n} total={total} label="Ví dụ minh họa">
          <div className="grid items-center gap-[3cqmin] sm:grid-cols-[1fr_1fr]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(40cqmin, 1fr))' }}>
            <div className="space-y-[1.6cqmin]">
              {s.inputs.map((i, k) => (
                <div key={i.label} className="mv-left flex items-baseline justify-between gap-[2cqmin] rounded-[2cqmin] bg-stone-50" style={{ padding: '1.6cqmin 2.6cqmin', ...d(200 + k * 700) }}>
                  <span className="font-semibold leading-tight" style={fs(2.9)}>{i.label}</span>
                  <span className="num shrink-0 font-extrabold" style={fs(3.4)}>{i.value}</span>
                </div>
              ))}
            </div>
            <div className="mv-pop rounded-[3cqmin] bg-lemon text-center text-navy-ink" style={{ padding: '4cqmin', ...d(400 + s.inputs.length * 700) }}>
              <p className="font-semibold text-charcoal" style={fs(3)}>{s.out.label}</p>
              <p className={`num font-black leading-none ${s.out.warn ? 'text-coral' : 'text-ink'}`} style={fs(9)}>{s.out.value}</p>
              {s.out.threshold && (
                <p className={`mt-[1.5cqmin] font-bold ${s.out.warn ? 'text-coral' : 'text-navy-ink'}`} style={fs(2.8)}>
                  {s.out.warn ? 'Vượt ngưỡng cảnh báo ' : 'Trong ngưỡng an toàn · cảnh báo khi '}{s.out.threshold}
                </p>
              )}
            </div>
          </div>
        </Frame>
      )
    case 'network': {
      const chip = (r, k, side) => {
        const t = metricById[r.metric_id]
        return (
          <div key={r.metric_id} className={`${side === 'l' ? 'mv-left' : 'mv-right'} rounded-[2cqmin] border-l-[1.2cqmin] bg-white ${r.impact === 'inverse' ? 'border-coral' : 'border-stone-400'} ring-1 ring-stone-200`}
            style={{ padding: '1.4cqmin 2.2cqmin', ...d((side === 'l' ? 300 : 2200) + k * 350) }}>
            <p className="font-display font-extrabold leading-tight text-ink" style={fs(3.4)}>{t?.code || r.metric_id}</p>
            <p className={`font-bold ${r.impact === 'inverse' ? 'text-coral' : 'text-charcoal'}`} style={fs(2.4)}>{r.impact === 'inverse' ? 'Nghịch chiều' : 'Thuận chiều'}</p>
          </div>
        )
      }
      return (
        <Frame bg="bg-white text-ink" n={n} total={total} label="Mạng lưới">
          <div className="grid items-center gap-[2.5cqmin]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <div className="space-y-[1.5cqmin]">
              <p className="eyebrow text-charcoal" style={fs(2.2)}>Đầu vào</p>
              {s.up.length ? s.up.map((r, k) => chip(r, k, 'l')) : <p className="text-muted" style={fs(2.8)}>Chỉ số gốc</p>}
            </div>
            <div className="mv-pop rounded-[3cqmin] bg-forest text-center text-white" style={{ padding: '3cqmin', ...d(1400) }}>
              <p className="font-display font-black leading-none" style={fs(metric.code.length > 8 ? 4.4 : 6.5)}>{metric.code}</p>
            </div>
            <div className="space-y-[1.5cqmin]">
              <p className="eyebrow text-charcoal" style={fs(2.2)}>Đầu ra</p>
              {s.down.length ? s.down.map((r, k) => chip(r, k, 'r')) : <p className="text-muted" style={fs(2.8)}>Cuối chuỗi</p>}
            </div>
          </div>
        </Frame>
      )
    }
    case 'close':
      return (
        <Frame bg="bg-brand-50 text-ink" sign n={n} total={total} label="Chốt">
          {s.trade ? (
            <div className="mv-up rounded-[3cqmin] bg-white text-ink ring-1 ring-stone-200" style={{ padding: '3.5cqmin', ...d(200) }}>
              <p className="eyebrow text-brand-600" style={fs(2.6)}>Cẩn thận đánh đổi</p>
              <p className="mt-[1cqmin] font-display font-extrabold leading-snug" style={fs(4.2)}>{s.trade.note}</p>
            </div>
          ) : (
            <p className="mv-up font-display font-extrabold leading-snug" style={{ ...fs(5.4), ...d(200) }}>
              Hiểu {metric.code} là hiểu một mắt xích. Xem nó nối với những chỉ số nào ở sơ đồ bên dưới.
            </p>
          )}
          {s.hw && (
            <>
              <p className="mv-up text-center font-display font-black text-brand-600" style={{ ...fs(5), ...d(1100) }} aria-hidden="true">↓</p>
              <button onClick={onHomework} className="mv-up rounded-[3cqmin] bg-marker text-left text-navy-ink" style={{ padding: '3cqmin 3.5cqmin', ...d(1400) }}>
                <p className="eyebrow" style={fs(2.4)}>Thử sức · Bài tập chẩn đoán</p>
                <p className="font-display font-extrabold leading-snug" style={fs(4)}>{s.hw.replace(/^Bệnh án:\s*/, '')}</p>
              </button>
            </>
          )}
        </Frame>
      )
    default:
      return null
  }
}

function toEmbed(url) {
  if (!url) return null
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  return url
}

export default function ExplainerVideo({ metric, onHomework }) {
  const scenes = useMemo(() => buildScenes(metric), [metric])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [run, setRun] = useState(0) // tăng để khởi động lại animation cảnh
  const [voice, setVoice] = useState(false)
  const [mode, setMode] = useState('motion')
  const [ended, setEnded] = useState(false)
  const ref = useRef(null)
  const timer = useRef({ id: null, start: 0, remaining: 0 })
  const seen = useRef(false)
  const viVoice = useRef(null)
  const [canSpeak, setCanSpeak] = useState(false)
  const embed = toEmbed(metric.media?.video_url)

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const pick = () => {
      viVoice.current = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('vi')) || null
      setCanSpeak(!!viVoice.current)
    }
    pick()
    window.speechSynthesis.addEventListener?.('voiceschanged', pick)
    return () => { window.speechSynthesis.removeEventListener?.('voiceschanged', pick); window.speechSynthesis.cancel() }
  }, [])

  const s = scenes[i]
  const clear = () => { clearTimeout(timer.current.id); timer.current.id = null }

  const go = useCallback((k) => {
    clear()
    window.speechSynthesis?.cancel()
    setEnded(false)
    setI(k)
    setRun((r) => r + 1)
    timer.current.remaining = scenes[k].dur
  }, [scenes])

  // Hẹn giờ chuyển cảnh
  useEffect(() => {
    if (!playing || mode !== 'motion') return
    if (!timer.current.remaining) timer.current.remaining = s.dur
    timer.current.start = performance.now()
    timer.current.id = setTimeout(() => {
      timer.current.remaining = 0
      if (i < scenes.length - 1) go(i + 1)
      else { setPlaying(false); setEnded(true) }
    }, timer.current.remaining)
    return () => {
      if (timer.current.id) { clear(); timer.current.remaining = Math.max(0, timer.current.remaining - (performance.now() - timer.current.start)) }
    }
  }, [playing, i, run, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Giọng đọc (Web Speech API, chỉ bật khi trình duyệt có giọng tiếng Việt)
  useEffect(() => {
    if (!voice || !playing || !viVoice.current || mode !== 'motion') return
    const u = new SpeechSynthesisUtterance(s.say)
    u.voice = viVoice.current; u.lang = viVoice.current.lang; u.rate = 1.05
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
    return () => window.speechSynthesis.cancel()
  }, [voice, i, run, playing, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tự phát khi cuộn tới, tạm dừng khi cuộn qua
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.5) { if (!seen.current && !reduce) { seen.current = true; setPlaying(true) } }
      else if (!e.isIntersecting) setPlaying(false)
    }, { threshold: [0, 0.5] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const toggle = () => {
    if (ended) { go(0); setPlaying(true); return }
    setPlaying((p) => !p)
  }

  return (
    <section aria-label={`Video giải thích ${metric.code}`} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {embed ? <div className="flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
          <button onClick={() => setMode('motion')} className={`rounded-full px-3 py-1 font-semibold ${mode === 'motion' ? 'bg-white text-ink shadow-sm' : 'text-charcoal'}`}>Video motion</button>
          <button onClick={() => { setMode('video'); setPlaying(false) }} disabled={!embed}
            className={`rounded-full px-3 py-1 font-semibold disabled:opacity-40 ${mode === 'video' ? 'bg-white text-ink shadow-sm' : 'text-charcoal'}`}
            title={embed ? '' : 'Chưa có video quay cho chỉ số này'}>
            Video bài giảng
          </button>
        </div> : <span />}
        {canSpeak && mode === 'motion' && (
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Giọng đọc
          </label>
        )}
      </div>

      {mode === 'video' && embed ? (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe src={embed} title={metric.media?.video_title || `Video ${metric.code}`} className="h-full w-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
        </div>
      ) : (
        <div ref={ref} className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/70">
          <div className={`relative aspect-[4/5] w-full select-none sm:aspect-video ${playing ? '' : 'mv-paused'}`} style={{ containerType: 'size' }}>
            <div key={`${metric.metric_id}-${i}-${run}`} className={`absolute inset-0 ${!playing && !seen.current && i === 0 ? 'mv-static' : ''}`}>
              <Scene s={s} metric={metric} n={i + 1} total={scenes.length} onHomework={onHomework} />
            </div>
            {!playing && (
              <button onClick={toggle} className="absolute inset-0 z-10 flex items-center justify-center bg-ink/10" aria-label={ended ? 'Xem lại' : 'Phát video'}>
                <span className="flex items-center gap-2 rounded-full bg-white px-5 py-3 font-display font-extrabold text-ink shadow-lg">
                  <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">{ended ? <path d="M10 3a7 7 0 1 0 7 7h-2a5 5 0 1 1-1.46-3.54L11 9h6V3l-2.05 2.05A7 7 0 0 0 10 3Z" /> : <path d="M6 4l11 6-11 6z" />}</svg>
                  {ended ? 'Xem lại' : i === 0 && !seen.current ? 'Xem video giải thích' : 'Tiếp tục'}
                </span>
              </button>
            )}
          </div>
          {/* Thanh điều khiển */}
          <div className="flex items-center gap-3 border-t border-stone-100 px-3 py-2">
            <button onClick={toggle} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white" aria-label={playing ? 'Tạm dừng' : 'Phát'}>
              <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">{playing ? <path d="M5 4h3v12H5zM12 4h3v12h-3z" /> : <path d="M6 4l11 6-11 6z" />}</svg>
            </button>
            <div className="flex min-w-0 flex-1 gap-1">
              {scenes.map((sc, k) => (
                <button key={sc.id} onClick={() => { go(k); setPlaying(true) }} className="group min-w-0 flex-1 py-2" aria-label={`Cảnh ${k + 1}: ${sc.label}`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                    {k < i && <div className="h-full w-full bg-brand-500" />}
                    {k === i && (
                      <div key={`${i}-${run}`} className={`mv-bar h-full w-full bg-brand-500 ${playing ? '' : 'mv-paused'}`} style={{ animationDuration: `${sc.dur}ms` }} />
                    )}
                  </div>
                  <span className={`mt-1 hidden truncate text-[11px] font-semibold sm:block ${k === i ? 'text-ink' : 'text-muted group-hover:text-body'}`}>{sc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
