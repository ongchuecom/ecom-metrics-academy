import { useEffect, useState } from 'react'
import { playbooks } from '../data/index.js'
import { GAM, RANK_LIST, rankFor, nextRank, loadQuiz, saveQuiz, totalOf, QUIZ_EVENT } from '../lib/quiz.js'
import { useAuth, authEnabled } from '../lib/auth.jsx'
import { fetchBoard, deleteMe } from '../lib/db.js'
const hasEndpoint = authEnabled // bảng chung chạy trên Firestore, cần đăng nhập Firebase
import { pbTitle } from './Playbooks.jsx'
import RankBadge from './RankBadge.jsx'

const num = (p) => (p.playbook_id.match(/pb_(\d+)/) || [])[1]

export default function Leaderboard({ onOpenPlaybook }) {
  const { user, ready, openLogin } = useAuth()
  const [me, setMe] = useState(loadQuiz)
  const [tick, setTick] = useState(0)
  const [del, setDel] = useState('idle')
  const [board, setBoard] = useState({ state: hasEndpoint ? 'loading' : 'off' })
  useEffect(() => {
    const f = () => { setMe(loadQuiz()); setTick((t) => t + 1) }
    window.addEventListener(QUIZ_EVENT, f); return () => window.removeEventListener(QUIZ_EVENT, f)
  }, [])
  const uid = user?.uid || null
  useEffect(() => {
    if (!hasEndpoint || !ready) return
    fetchBoard(uid, { fresh: tick > 0 })
      .then((j) => setBoard({ state: 'ok', ...j }))
      .catch(() => setBoard({ state: 'error' }))
  }, [uid, tick, ready])

  // Xóa điểm khỏi bảng xếp hạng (và khỏi máy này) theo yêu cầu người dùng
  const removeMe = async () => {
    if (!window.confirm('Xóa toàn bộ điểm của anh/chị khỏi bảng xếp hạng và khỏi máy này? Không hoàn tác được.')) return
    setDel('sending')
    try {
      await deleteMe(user.uid)
      saveQuiz({ player: '', name: '', first: {}, last: {}, synced: {} }); setMe(loadQuiz()); setTick((t) => t + 1); setDel('done')
    } catch { setDel('error') }
  }

  const total = totalOf(me)
  const rank = rankFor(total)
  const nr = nextRank(total)
  const todo = playbooks.filter((p) => p.quiz?.length && me.first[p.playbook_id] === undefined)

  return (
    <article className="space-y-10">
      <header>
        <p className="eyebrow text-muted">Trắc nghiệm thực chiến</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">Bảng xếp hạng</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-charcoal">
          Mỗi Playbook có 3 câu trắc nghiệm, mỗi câu {GAM.points_per_question} điểm, tổng {GAM.max_total_score} điểm cho {playbooks.length} Playbook.
          Chỉ lần nộp đầu tiên của mỗi Playbook được tính, làm lại chỉ để luyện tập.
        </p>
      </header>

      {/* Điểm của mình */}
      <section className="rounded-2xl bg-brand-50 p-4 sm:p-5" aria-label="Điểm của bạn">
        <p className="eyebrow text-muted">Điểm của bạn</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="font-display text-3xl font-bold text-ink">{total}<span className="text-lg text-muted">/{GAM.max_total_score}</span></p>
          <RankBadge rank={rank} />
          <span className="text-sm text-charcoal">{Object.keys(me.first).length}/{playbooks.length} Playbook đã làm</span>
          {board.state === 'ok' && board.me && <span className="text-sm font-semibold text-ink">Đang đứng thứ {board.me.pos}/{board.total}</span>}
        </div>
        {nr && <p className="mt-2 text-sm text-charcoal">Còn {nr.min_score - total} điểm nữa lên <b className="text-ink">{nr.title}</b>.</p>}
        {todo.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-ink">Playbook chưa làm trắc nghiệm:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {todo.map((p) => (
                <button key={p.playbook_id} onClick={() => onOpenPlaybook(p.playbook_id)} className="rounded-full bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-stone-200 hover:ring-brand-500">
                  <b className="mr-1 font-display text-brand-600">{num(p)}</b>{pbTitle(p).replace(/^Bài toán\s*/i, '').replace(/\s*\(.*\)\s*$/, '')}
                </button>
              ))}
            </div>
          </div>
        )}
        {hasEndpoint && authEnabled && !user && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={() => openLogin('Đăng nhập để lưu điểm vào tài khoản và lên bảng xếp hạng. Đổi máy vẫn giữ nguyên điểm.')} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">Đăng nhập để lên bảng</button>
            <span className="text-xs text-muted">Google hoặc Facebook. Điểm trên máy này được đưa lên tài khoản.</span>
          </div>
        )}
        {user && !me.name && total > 0 && <p className="mt-3 text-sm text-charcoal">Anh/chị chưa lên bảng. Làm xong trắc nghiệm một Playbook bất kỳ, chọn tên hiển thị là điểm được đưa lên.</p>}
        {hasEndpoint && user && (
          <p className="mt-3 text-xs text-muted">
            {del === 'done' ? 'Đã xóa điểm của anh/chị.' : del === 'error' ? <span className="text-coral">Chưa xóa được, thử lại sau.</span> : null}{' '}
            <button onClick={removeMe} disabled={del === 'sending'} className="underline hover:text-coral">Xóa điểm của tôi khỏi bảng xếp hạng</button>
          </p>
        )}
      </section>

      {/* Bảng chung */}
      <section aria-labelledby="top-h">
        <h2 id="top-h" className="mb-3 text-lg font-bold text-ink">Top 50</h2>
        {board.state === 'off' && <p className="rounded-2xl bg-stone-50 p-4 text-sm text-charcoal">Bảng xếp hạng chung sẽ mở khi web bật đăng nhập. Điểm của anh/chị vẫn được lưu trên máy này và sẽ đưa lên được sau.</p>}
        {board.state === 'loading' && <p className="text-sm text-muted">Đang tải bảng xếp hạng…</p>}
        {board.state === 'error' && <p className="text-sm text-coral">Chưa tải được bảng xếp hạng, thử tải lại trang sau ít phút.</p>}
        {board.state === 'ok' && (board.top.length === 0 ? <p className="text-sm text-charcoal">Chưa có ai trên bảng. Làm trắc nghiệm một Playbook để là người đầu tiên.</p> : (
          <ol className="divide-y divide-stone-100 rounded-2xl ring-1 ring-stone-200">
            {board.top.map((r) => {
              const mine = !!uid && r.uid === uid
              return (
                <li key={r.pos} className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] ${mine ? 'bg-brand-50' : ''}`}>
                  <span className={`text-center font-display font-bold ${r.pos <= 3 ? 'text-brand-600 text-lg' : 'text-muted'}`}>{r.pos}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{r.name}{mine && <span className="ml-1.5 text-xs font-bold text-brand-700">(bạn)</span>}</span>
                    <span className="mt-0.5 block sm:hidden"><RankBadge rank={rankFor(r.score)} small /></span>
                  </span>
                  <span className="hidden sm:block"><RankBadge rank={rankFor(r.score)} small /></span>
                  <span className="text-right"><b className="num font-display text-ink">{r.score}</b><span className="block text-[11px] text-muted">{r.done} Playbook</span></span>
                </li>
              )
            })}
          </ol>
        ))}
      </section>

      {/* Thang cấp bậc */}
      <section aria-labelledby="cap-bac-h">
        <h2 id="cap-bac-h" className="mb-3 text-lg font-bold text-ink">Cấp bậc</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {RANK_LIST.map((r) => (
            <li key={r.title} className={`rounded-2xl p-4 ${r.title === rank.title ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-stone-50'}`}>
              <RankBadge rank={r} />
              <p className="mt-2 font-display text-lg font-bold text-ink">{r.min_score}–{r.max_score} <span className="text-sm font-semibold text-muted">điểm</span></p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
