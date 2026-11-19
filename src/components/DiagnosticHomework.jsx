import { useState } from 'react'
import { formatUnit } from '../lib/formula.js'
import { MissingNotice } from './MetricSimulator.jsx'

// "1.000.000", "1,000,000", "0,4", "4.17", "250k", "1,5tr" -> số
export function parseVnNumber(raw) {
  let s = String(raw).trim().toLowerCase().replace(/\s|đ|vnd|₫|%|x$/g, '')
  if (!s) return NaN
  let mul = 1
  const suf = s.match(/(k|tr|triệu|ty|tỷ)$/)
  if (suf) { mul = { k: 1e3, tr: 1e6, 'triệu': 1e6, ty: 1e9, 'tỷ': 1e9 }[suf[1]]; s = s.slice(0, -suf[1].length) }
  const hasDot = s.includes('.'), hasComma = s.includes(',')
  if (hasDot && hasComma) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  else if (hasComma) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n * mul : NaN
}

function LockedTask({ task, index }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-100/70 p-4">
      <p className="eyebrow text-muted">
        Bước {index} · {task.type === 'numeric_input' ? 'Tính toán' : 'Quyết định chiến lược'}
      </p>
      <p className="mt-1 text-stone-500">{task.question}</p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Giải đúng bước {index - 1} để mở khóa</p>
    </div>
  )
}

function NumericTask({ task, index, state, setState }) {
  const [text, setText] = useState('')
  const [showHint, setShowHint] = useState(false)
  const { result, attempts = 0 } = state
  const check = () => {
    const v = parseVnNumber(text)
    if (!Number.isFinite(v)) return setState({ ...state, result: { kind: 'invalid' } })
    const ok = Math.abs(v - task.correct_value) <= task.tolerance
    setState({ attempts: attempts + 1, result: { kind: ok ? 'ok' : 'wrong', value: v, diff: v - task.correct_value }, solved: ok })
  }
  const border = result?.kind === 'ok' ? 'border-brand-500 ring-2 ring-brand-500/30' : result?.kind === 'wrong' ? 'border-coral/50' : 'border-stone-200/80'
  return (
    <div className={`rounded-2xl border bg-white p-4 sm:p-5 ${border}`}>
      <p className="eyebrow text-brand-700">Bước {index} · Tính toán</p>
      <p className="mt-1 font-display text-lg font-extrabold leading-snug text-ink">{task.question}</p>
      <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); check() }}>
        <div className="flex min-w-0 flex-1 basis-full items-center rounded-xl border sm:basis-0 border-stone-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
          <input value={text} onChange={(e) => setText(e.target.value)} inputMode="decimal" placeholder="Nhập đáp án, ví dụ 250.000 hoặc 2,17"
            disabled={state.solved} aria-label={task.question}
            className="num w-full min-w-0 rounded-xl bg-transparent px-3 py-2.5 text-right text-lg font-bold tabular-nums outline-none" />
          <span className="pr-3 text-sm text-stone-500">{task.unit}</span>
        </div>
        <button type="submit" disabled={state.solved || !text.trim()} className="rounded-full bg-brand-600 px-5 py-2.5 font-display font-bold text-white hover:bg-brand-700 disabled:opacity-40">Kiểm tra</button>
        <button type="button" onClick={() => setShowHint((h) => !h)} className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold hover:bg-lemon">
          Gợi ý công thức
        </button>
      </form>
      {showHint && <p className="mt-3 rounded-xl bg-lemon/60 p-3 text-sm text-navy-ink">{task.hint}</p>}
      {result?.kind === 'invalid' && <p className="mt-2 text-sm text-coral">Chưa đọc được số. Thử nhập dạng 250000, 250.000 hoặc 2,17.</p>}
      {result?.kind === 'wrong' && (
        <div className="mt-3 rounded-xl bg-peach p-3 text-sm text-body">
          <p>
            Chưa đúng: bạn đang <b>{result.diff > 0 ? 'cao hơn' : 'thấp hơn'}</b> đáp án <b className="num">{formatUnit(Math.abs(result.diff), task.unit)}</b>
            {Math.abs(task.correct_value) > 0 && <> (lệch {formatUnit(Math.abs(result.diff / task.correct_value) * 100, '%')})</>}. Kiểm tra lại đơn vị % và thứ tự phép tính.
          </p>
          {attempts >= 3 && (
            <button onClick={() => setState({ ...state, solved: true, revealed: true, result: { kind: 'ok' } })} className="mt-2 text-sm font-semibold underline">
              Xem lời giải và mở bước tiếp
            </button>
          )}
        </div>
      )}
      {result?.kind === 'ok' && (
        <div className="fade-up mt-3 rounded-lg bg-brand-50 p-3 text-sm text-stone-800">
          <p className="font-semibold text-brand-800">
            {state.revealed ? 'Lời giải' : '✓ Chính xác!'} Đáp án: <span className="num">{formatUnit(task.correct_value, task.unit)}</span>
          </p>
          <p className="mt-1 leading-relaxed">{task.explanation}</p>
        </div>
      )}
    </div>
  )
}

function DecisionTask({ task, index, state, setState }) {
  const picked = state.picked
  return (
    <div className={`rounded-2xl border bg-white p-4 sm:p-5 ${state.solved ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-stone-200/80'}`}>
      <p className="eyebrow text-brand-700">Bước {index} · Quyết định chiến lược</p>
      <p className="mt-1 font-display text-lg font-extrabold leading-snug text-ink">{task.question}</p>
      <div className="mt-3 space-y-2">
        {task.options.map((o) => {
          const chosen = picked?.includes(o.id)
          const tone = !chosen ? 'border-stone-200 hover:border-brand-500 hover:bg-brand-50' : o.is_correct ? 'border-brand-500 bg-brand-50' : 'border-coral/50 bg-peach'
          return (
            <div key={o.id}>
              <button disabled={state.solved || chosen}
                onClick={() => setState({ picked: [...(picked || []), o.id], solved: o.is_correct })}
                className={`flex w-full gap-3 rounded-xl border p-3 text-left text-sm transition disabled:cursor-default ${tone}`}>
                <span className="num font-bold uppercase text-stone-400">{o.id}</span>
                <span className="text-stone-800">{o.text}</span>
              </button>
              {chosen && (
                <p className={`fade-up mt-1 px-3 text-sm ${o.is_correct ? 'text-brand-800' : 'text-coral'}`}>
                  {o.is_correct ? '✓ ' : '✗ '}{o.reason}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DiagnosticHomework({ metric, onSelect }) {
  const hw = metric.diagnostic_homework
  const [states, setStates] = useState({})
  if (!hw) return <MissingNotice what="bài tập chẩn đoán" field="diagnostic_homework" onSelect={onSelect} />
  const done = hw.tasks.filter((t) => states[t.task_id]?.solved).length

  return (
    <div className="space-y-4">
      <article className="rounded-3xl bg-stone-50 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3 text-charcoal">
          <span className="eyebrow">Hồ sơ bệnh án · {metric.code}</span>
          <span className="num text-sm font-extrabold">{done}/{hw.tasks.length} bước</span>
        </div>
        <div className="rounded-2xl bg-white p-4 sm:p-5">
          <h3 className="text-xl font-black leading-snug text-ink">{hw.title}</h3>
          <p className="mt-2 leading-relaxed text-body">{hw.scenario}</p>
        </div>
      </article>

      {hw.tasks.map((t, i) => {
        const unlocked = hw.tasks.slice(0, i).every((p) => states[p.task_id]?.solved)
        const st = states[t.task_id] || {}
        const set = (s) => setStates((all) => ({ ...all, [t.task_id]: s }))
        const node = t.type === 'numeric_input'
          ? <NumericTask task={t} index={i + 1} state={st} setState={set} />
          : <DecisionTask task={t} index={i + 1} state={st} setState={set} />
        return <div key={t.task_id}>{unlocked ? node : <LockedTask task={t} index={i + 1} />}</div>
      })}

      {done === hw.tasks.length && (
        <div className="fade-up flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-brand-50 p-4 text-ink">
          <div>
          <p className="font-display font-extrabold">Đã chẩn đoán xong ca này.</p><p className="text-sm"> Học tiếp chỉ số liên quan ở sơ đồ phụ thuộc để hiểu cả chuỗi.</p>
          </div>
          <button onClick={() => setStates({})} className="rounded-full bg-brand-600 px-4 py-2 font-display text-sm font-bold text-white">Làm lại</button>
        </div>
      )}
    </div>
  )
}
