import { useEffect, useState } from 'react'
import { playbooks } from '../data/index.js'
import { GAM, rankFor, nextRank, loadQuiz, saveQuiz, totalOf, QUIZ_EVENT } from '../lib/quiz.js'
import { useAuth, authEnabled } from '../lib/auth.jsx'
import { saveScores, cleanName, dropBoardCache } from '../lib/db.js'
import RankBadge from './RankBadge.jsx'

// Trắc nghiệm thực chiến cuối mỗi Playbook: chấm ngay khi nộp, hiện giải thích từng câu.
// Lần nộp đầu tiên là điểm chính thức (tính vào tổng và bảng xếp hạng); làm lại chỉ để luyện tập.
export default function PlaybookQuiz({ playbook: p, onOpenLeaderboard }) {
  const quiz = p.quiz || []
  const max = quiz.reduce((a, q) => a + (q.points || 0), 0)
  const [store, setStore] = useState(loadQuiz)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null) // { score, official }
  const [name, setName] = useState(store.name)
  const [sync, setSync] = useState('idle') // idle | sending | done | error
  const { user, openLogin } = useAuth()
  // điểm vừa được đồng bộ với tài khoản ở nơi khác → đọc lại
  useEffect(() => {
    const f = () => { const s = loadQuiz(); setStore(s); setName((n) => n || s.name) }
    window.addEventListener(QUIZ_EVENT, f); return () => window.removeEventListener(QUIZ_EVENT, f)
  }, [])
  useEffect(() => { if (user && !name) setName(user.name.slice(0, 24)) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!quiz.length) return null
  // Bảng xếp hạng chỉ nhận điểm gắn với tài khoản đăng nhập
  const needLogin = !user

  const first = store.first[p.playbook_id]
  const done = !!result
  const allAnswered = quiz.every((q) => answers[q.question_id])

  const publish = async (s, nm) => {
    if (!authEnabled || !user || !cleanName(nm)) return
    setSync('sending')
    try {
      const r = await saveScores(user.uid, nm, s.first)
      const next = { ...s, uid: user.uid, name: r.name, first: r.scores, synced: Object.fromEntries(Object.keys(r.scores).map((k) => [k, true])), syncedAt: Date.now() }
      saveQuiz(next); setStore(next); dropBoardCache(); setSync('done')
    } catch { setSync('error') }
  }

  const submit = () => {
    const score = quiz.reduce((a, q) => a + (answers[q.question_id] === q.correct_option ? q.points : 0), 0)
    const official = first === undefined
    let s = { ...store }
    s = { ...s, last: { ...s.last, [p.playbook_id]: { score, at: new Date().toISOString() } }, ...(official ? { first: { ...s.first, [p.playbook_id]: score } } : {}) }
    saveQuiz(s); setStore(s); setResult({ score, official })
    if (official && s.name) publish(s, s.name)
  }
  const retry = () => { setAnswers({}); setResult(null); setSync('idle') }

  const total = totalOf(store)
  const rank = rankFor(total)
  const nr = nextRank(total)
  const doneCount = Object.keys(store.first).length

  return (
    <section id="trac-nghiem" aria-labelledby="trac-nghiem-h" className="scroll-mt-20">
      <h2 id="trac-nghiem-h" className="mb-1 flex items-center gap-2 text-lg font-extrabold text-brand-600"><span className="h-4 w-1 rounded-full bg-brand-500" />Trắc nghiệm thực chiến</h2>
      <p className="mb-4 text-sm text-charcoal">
        {quiz.length} câu · {max} điểm. Chấm ngay khi nộp, có giải thích từng câu.
        {first !== undefined && !done && <> Lần đầu anh/chị được <b className="text-ink">{first}/{max}</b>, điểm này đã tính vào bảng xếp hạng; làm lại để luyện tập.</>}
      </p>

      <ol className="space-y-4">
        {quiz.map((q, i) => {
          const picked = answers[q.question_id]
          const right = picked === q.correct_option
          return (
            <li key={q.question_id} className="rounded-2xl bg-stone-50 p-4 sm:p-5">
              <p className="text-[15px] font-semibold leading-relaxed text-ink"><span className="mr-1.5 font-display font-black text-brand-600">Câu {i + 1}.</span>{q.question}</p>
              <div role="radiogroup" aria-label={`Câu ${i + 1}`} className="mt-3 grid gap-2">
                {q.options.map((o) => {
                  const chosen = picked === o.id
                  const isCorrect = o.id === q.correct_option
                  const tone = !done ? (chosen ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-1 ring-stone-200 hover:ring-brand-500')
                    : isCorrect ? 'bg-green-50 ring-2 ring-ok' : chosen ? 'bg-red-50 ring-2 ring-coral' : 'bg-white ring-1 ring-stone-200 opacity-70'
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={chosen} disabled={done}
                      onClick={() => setAnswers((a) => ({ ...a, [q.question_id]: o.id }))}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm leading-relaxed text-body transition ${tone}`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-black ${done && isCorrect ? 'bg-ok text-white' : done && chosen ? 'bg-coral text-white' : chosen ? 'bg-brand-600 text-white' : 'bg-stone-100 text-ink'}`}>{o.id}</span>
                      <span className="pt-0.5">{o.text}</span>
                    </button>
                  )
                })}
              </div>
              {done && (
                <div className={`mt-3 rounded-xl px-3.5 py-3 text-sm leading-relaxed ${right ? 'bg-green-50 text-ink' : 'bg-red-50 text-ink'}`}>
                  <p className={`font-bold ${right ? 'text-ok' : 'text-coral'}`}>{right ? `Đúng · +${q.points} điểm` : `Chưa đúng · đáp án ${q.correct_option}`}</p>
                  <p className="mt-1 text-body">{q.explanation}</p>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {!done ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={submit} disabled={!allAnswered}
            className="rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">Nộp bài</button>
          {!allAnswered && <span className="text-sm text-muted">Trả lời đủ {quiz.length} câu để nộp.</span>}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-brand-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="font-display text-3xl font-black text-ink">{result.score}<span className="text-lg text-muted">/{max}</span></p>
            <p className="text-sm font-semibold text-charcoal">{result.official ? 'Điểm chính thức của Playbook này.' : `Lần luyện tập. Điểm chính thức vẫn là lần đầu: ${first}/${max}.`}</p>
          </div>
          <div className="mt-3 border-t border-brand-100 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-body">
              <span>Tổng điểm: <b className="text-ink">{total}/{GAM.max_total_score}</b> · {doneCount}/{playbooks.length} Playbook</span>
              <RankBadge rank={rank} />
            </div>
            {nr && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (total / nr.min_score) * 100)}%` }} /></div>
                <p className="mt-1 text-xs text-charcoal">Còn {nr.min_score - total} điểm nữa lên <b>{nr.title}</b>.</p>
              </div>
            )}
          </div>

          {authEnabled && result.official && needLogin && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => openLogin('Đăng nhập để lưu điểm này vào tài khoản và lên bảng xếp hạng. Đổi máy vẫn giữ nguyên điểm.')}
                className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">Đăng nhập để lên bảng xếp hạng</button>
              <span className="text-xs text-muted">Điểm vẫn được giữ trên máy này, đăng nhập lúc nào cũng đưa lên được.</span>
            </div>
          )}
          {authEnabled && result.official && !needLogin && (
            store.name ? (
              <p className="mt-3 text-sm text-charcoal">
                {sync === 'sending' ? 'Đang cập nhật bảng xếp hạng…' : sync === 'error' ? <span className="text-coral">Chưa cập nhật được bảng xếp hạng. <button type="button" onClick={() => publish(store, store.name)} className="font-semibold underline">Thử lại</button></span> : <>Đã cập nhật bảng xếp hạng với tên <b className="text-ink">{store.name}</b>.</>}
              </p>
            ) : (
              <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (cleanName(name)) publish(store, name) }}>
                <label htmlFor={`ten-${p.playbook_id}`} className="w-full text-sm font-semibold text-ink">Lên bảng xếp hạng với tên:</label>
                <input id={`ten-${p.playbook_id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Ví dụ: Hùng Shop Giày"
                  className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm text-ink ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-500 sm:max-w-xs" />
                <button type="submit" disabled={!cleanName(name) || sync === 'sending'} className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{sync === 'sending' ? 'Đang gửi…' : 'Lên bảng'}</button>
                <span className="w-full text-xs text-muted">Chỉ hiện tên này và điểm. Không ghi số điện thoại hay đường link vào tên.{sync === 'error' && <span className="text-coral"> Chưa gửi được, thử lại giúp.</span>}</span>
              </form>
            )
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={retry} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-stone-200 hover:ring-brand-500">Làm lại để luyện tập</button>
            <button type="button" onClick={onOpenLeaderboard} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-stone-200 hover:ring-brand-500">Xem bảng xếp hạng →</button>
          </div>
        </div>
      )}
    </section>
  )
}
