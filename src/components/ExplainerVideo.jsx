import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { stageById, STAGES } from '../data/index.js'
import { Chart } from './LessonVisuals.jsx'
import { buildScenes, plain, audioKey } from '../lib/scenes.js'
import site from '../data/site.json'

// Video giải thích kiểu bảng giảng: nền trắng kẻ ô mờ, công thức, con số và biểu đồ viết dần lên bảng.
// Mọi cảnh lấy từ bài đọc của chỉ số (lessons.json), nên video và bài đọc luôn khớp số.
// Nếu chỉ số có media.video_url (Drive/YouTube), người xem chuyển sang được video quay thật.

// Giọng đọc đọc sẵn (tools/voice/generate.py): public/audio/<key>.mp3 + index.json (key → thời lượng ms)
const VOICE_ID = site.voice ? `${site.voice.engine}:${site.voice.name}:${site.voice.version}` : ''
let audioIndex = null
const loadAudioIndex = () => (audioIndex ||= fetch(`${import.meta.env.BASE_URL}audio/index.json`).then((r) => (r.ok ? r.json() : { files: {} })).then((j) => j.files || {}).catch(() => ({})))
const readSound = () => { try { return localStorage.getItem('ema-sound') === '1' } catch { return false } }

const rich = (t = '') => t.split('**').map((x, i) => (i % 2 ? <b key={i} className="board-mark">{x}</b> : x))

// Khổ thiết kế cố định, cả khung được co giãn theo bề rộng thật để biểu đồ luôn vừa
const WIDE = { w: 960, h: 540 }
const TALL = { w: 520, h: 650 }

// Phóng hoặc co biểu đồ cho vừa ô còn trống trên bảng (tối đa 1,6 lần)
function Fit({ children, className = '', max = 1.6 }) {
  const outer = useRef(null), inner = useRef(null)
  useLayoutEffect(() => {
    const o = outer.current, n = inner.current
    if (!o || !n) return
    const W = o.clientWidth, H = o.clientHeight
    let k = max
    for (let t = 0; t < 4; t++) {
      n.style.width = `${W / k}px`
      const next = Math.min(max, H / Math.max(1, n.scrollHeight))
      if (Math.abs(next - k) < 0.01) break
      k = next
    }
    n.style.transform = `scale(${k})`
  }, [children, max])
  return (
    <div ref={outer} className={`relative min-h-0 flex-1 overflow-hidden ${className}`}>
      <div ref={inner} style={{ transformOrigin: 'top left' }}>{children}</div>
    </div>
  )
}

function Board({ children, n, total, label, sign = false }) {
  return (
    <div className="board absolute inset-0 flex flex-col text-ink" style={{ padding: '26px 34px 22px' }}>
      <div className="flex items-center justify-between text-[13px] font-bold text-muted">
        <span className="eyebrow">{label}</span>
        <span className="num">{n}/{total}</span>
      </div>
      <div className="relative mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
      {sign && <p className="text-right font-display text-[14px] font-extrabold text-muted">Ông chú Ecom</p>}
    </div>
  )
}

const d = (ms) => ({ animationDelay: `${ms}ms` })

// Một vế của công thức viết lên bảng: tên biến kèm mũi tên chiều muốn đi
function Term({ n, delay, big }) {
  if (typeof n === 'string') return <span className="mv-up px-1 font-display font-bold text-muted" style={d(delay)}>{n}</span>
  const arrow = n.dir === 'up' ? '↑' : n.dir === 'down' ? '↓' : ''
  return (
    <span className={`mv-up inline-flex items-baseline gap-1 border-b-2 border-ink/80 px-1 font-display font-extrabold ${big ? '' : ''}`} style={d(delay)}>
      {n.label}{arrow && <span className="text-brand-600">{arrow}</span>}
    </span>
  )
}

function Equation({ expr, size, start = 300 }) {
  const items = expr.eq || []
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-3 leading-tight" style={{ fontSize: size }}>
      <span className="mv-up font-display font-black text-brand-600" style={d(start)}>{expr.label}</span>
      <span className="mv-up font-display font-bold text-muted" style={d(start + 250)}>=</span>
      {items.map((x, k) => <Term key={k} n={x} delay={start + 500 + k * 380} />)}
    </p>
  )
}

function Scene({ s, metric, n, total, onHomework, wide }) {
  const stage = stageById[metric.stage]
  switch (s.id) {
    case 'title': {
      const L = metric.lesson || {}
      return (
        <Board n={n} total={total} label={`Khâu ${s.stageNo} · ${stage?.short || ''}`}>
          <div className="flex flex-1 flex-col justify-center">
            <p className="mv-up font-display font-black leading-none" style={{ fontSize: metric.code.length > 10 ? (wide ? 72 : 52) : (wide ? 104 : 76), ...d(150) }}>{metric.code}</p>
            <p className="mv-up mt-3 font-semibold text-charcoal" style={{ fontSize: wide ? 22 : 19, ...d(500) }}>{metric.vi_name}</p>
            {L.subtitle && (
              <p className="mt-5 font-display font-extrabold leading-snug" style={{ fontSize: wide ? 30 : 25 }}>
                <span className="mv-wipe" style={d(1000)}>{L.subtitle}</span>
              </p>
            )}
            <ol className={`mt-7 flex flex-wrap gap-x-5 gap-y-1.5 font-semibold text-body`} style={{ fontSize: wide ? 16 : 15 }}>
              {s.agenda.map((a, k) => <li key={k} className="mv-up" style={d(1700 + k * 200)}><span className="num mr-1 text-brand-600">{k + 1}.</span>{a}</li>)}
            </ol>
          </div>
        </Board>
      )
    }
    case 'formula': {
      const t = s.tree
      const nested = (t?.expr?.eq || []).filter((x) => typeof x === 'object' && x.eq)
      return (
        <Board n={n} total={total} label="Công thức">
          {t?.title && <h3 className="mv-up font-display font-extrabold" style={{ fontSize: wide ? 24 : 21, ...d(100) }}>{t.title}</h3>}
          <div className="flex flex-1 flex-col justify-center gap-5">
            {t?.expr?.eq ? <Equation expr={t.expr} size={wide ? 34 : 26} /> : (
              <p className="mv-up font-display font-extrabold leading-snug" style={{ fontSize: wide ? 32 : 25, ...d(300) }}>{metric.formula?.readable || s.tree?.title}</p>
            )}
            {nested.map((x, k) => (
              <div key={k} className="flex flex-wrap items-baseline gap-2" style={{ fontSize: wide ? 22 : 18 }}>
                <span className="mv-up text-muted" style={d(2200 + k * 900)}>với</span>
                <Equation expr={x} size={wide ? 22 : 18} start={2300 + k * 900} />
              </div>
            ))}
            {t?.note && <p className="mv-up max-w-[46rem] leading-relaxed text-body" style={{ fontSize: wide ? 18 : 16, ...d(2600 + nested.length * 900) }}>{t.note.replace(/\s*Bấm vào từng chỉ số để học sâu\.?/, '')}</p>}
          </div>
        </Board>
      )
    }
    case 'chart':
      return (
        <Board n={n} total={total} label={s.label}>
          <h3 className="mv-up font-display font-extrabold leading-snug" style={{ fontSize: wide ? 26 : 21, ...d(100) }}>{s.title}</h3>
          <div className={`mt-4 flex min-h-0 flex-1 gap-7 ${wide ? 'flex-row' : 'flex-col'}`}>
            <Fit className={`board-draw ${wide ? 'basis-[60%]' : ''}`} max={wide ? 1.6 : 1.3}>
              <div className="mv-up" style={{ ...d(500), fontSize: 15 }}><Chart c={s.chart} /></div>
            </Fit>
            {s.text && (
              <p className={`mv-up leading-relaxed text-body ${wide ? 'basis-[40%] self-start pt-2' : 'shrink-0'}`} style={{ fontSize: wide ? 18 : 15.5, ...d(2400) }}>{rich(s.text)}</p>
            )}
          </div>
        </Board>
      )
    case 'close':
      return (
        <Board sign n={n} total={total} label="Ghi nhớ">
          <div className="flex flex-1 flex-col justify-center">
            <p className="font-display font-extrabold leading-snug" style={{ fontSize: wide ? 38 : 28 }}>
              <span className="mv-wipe" style={d(400)}>{plain(s.remember)}</span>
            </p>
            {s.hw && (
              <button onClick={onHomework} className="mv-up mt-8 self-start rounded-xl border-2 border-ink px-5 py-3 text-left hover:bg-brand-50" style={d(1600)}>
                <span className="eyebrow block text-brand-600" style={{ fontSize: 12 }}>Thử sức · Bài tập chẩn đoán</span>
                <span className="font-display font-extrabold leading-snug" style={{ fontSize: wide ? 20 : 17 }}>{s.hw.replace(/^Bệnh án:\s*/, '')} →</span>
              </button>
            )}
          </div>
        </Board>
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
  const scenes = useMemo(() => buildScenes(metric, STAGES.findIndex((x) => x.id === metric.stage) + 1), [metric])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [run, setRun] = useState(0) // tăng để khởi động lại animation cảnh
  const [sound, setSound] = useState(readSound)
  const [files, setFiles] = useState(null) // key → thời lượng ms của file đọc sẵn
  const audio = useRef(null)
  const [mode, setMode] = useState('motion')
  const [ended, setEnded] = useState(false)
  const ref = useRef(null)
  const timer = useRef({ id: null, start: 0, remaining: 0 })
  const seen = useRef(false)
  const embed = toEmbed(metric.media?.video_url)
  const stage = useRef(null)
  const [box, setBox] = useState({ w: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth })
    measure()
    if (!('ResizeObserver' in window)) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])
  const wide = box.w === 0 ? true : box.w >= 560
  const dim = wide ? WIDE : TALL
  const scale = box.w ? box.w / dim.w : 1

  useEffect(() => { loadAudioIndex().then(setFiles) }, [])
  const keys = useMemo(() => scenes.map((x) => audioKey(VOICE_ID, x.say)), [scenes])
  const hasVoice = !!files && keys.some((k) => files[k])
  // Thời lượng cảnh: đủ cho câu đọc (cộng 0,7 giây nghỉ) khi bật giọng
  const durOf = useCallback((k) => (sound && files?.[keys[k]] ? Math.max(scenes[k].dur, files[keys[k]] + 700) : scenes[k].dur), [sound, files, keys, scenes])

  const s = scenes[i]
  const clear = () => { clearTimeout(timer.current.id); timer.current.id = null }

  const go = useCallback((k) => {
    clear()
    audio.current?.pause()
    setEnded(false)
    setI(k)
    setRun((r) => r + 1)
    timer.current.remaining = durOf(k)
  }, [durOf])

  // Hẹn giờ chuyển cảnh
  useEffect(() => {
    if (!playing || mode !== 'motion') return
    if (!timer.current.remaining) timer.current.remaining = durOf(i)
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

  // Giọng đọc: mỗi cảnh một file mp3 đọc sẵn. Cảnh mới thì phát từ đầu; tạm dừng thì dừng tiếng.
  useEffect(() => {
    const f = files?.[keys[i]]
    if (!sound || !f || mode !== 'motion') { audio.current?.pause(); return }
    const a = audio.current || (audio.current = new Audio())
    const src = `${import.meta.env.BASE_URL}audio/${keys[i]}.mp3`
    if (!a.src.endsWith(src)) { a.src = src; a.currentTime = 0 }
    if (playing) a.play().catch(() => setSound(false)) // trình duyệt chặn phát tiếng: tắt giọng, video vẫn chạy
    else a.pause()
  }, [sound, files, keys, i, playing, mode])
  useEffect(() => () => audio.current?.pause(), [])
  // cảnh mới: đọc lại từ đầu
  useEffect(() => { if (audio.current) audio.current.currentTime = 0 }, [i, run])
  const toggleSound = () => {
    const on = !sound
    setSound(on)
    try { localStorage.setItem('ema-sound', on ? '1' : '0') } catch { /* bỏ qua */ }
    if (on) { go(i); setPlaying(true) } // bật giọng: đọc lại cảnh đang xem
  }

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
        {hasVoice && mode === 'motion' && (
          <button onClick={toggleSound} aria-pressed={sound}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 transition ${sound ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'text-charcoal ring-stone-200 hover:bg-stone-50'}`}>
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 8v4h3l4 3V5L6 8H3z" />{sound ? <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10" /> : <path d="M14 8l4 4m0-4l-4 4" />}
            </svg>
            {sound ? 'Đang bật giọng đọc' : 'Bật giọng đọc'}
          </button>
        )}
      </div>

      {mode === 'video' && embed ? (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe src={embed} title={metric.media?.video_title || `Video ${metric.code}`} className="h-full w-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
        </div>
      ) : (
        <div ref={ref} className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          <div ref={stage} className={`relative w-full select-none overflow-hidden ${playing ? '' : 'mv-paused'}`} style={{ aspectRatio: `${dim.w} / ${dim.h}` }}>
            <div key={`${metric.metric_id}-${i}-${run}-${wide}`} className={`absolute left-0 top-0 ${!playing && !seen.current && i === 0 ? 'mv-static' : ''}`}
              style={{ width: dim.w, height: dim.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <Scene s={s} metric={metric} n={i + 1} total={scenes.length} onHomework={onHomework} wide={wide} />
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
            <button onClick={toggle} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white" aria-label={playing ? 'Tạm dừng' : 'Phát'}>
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
