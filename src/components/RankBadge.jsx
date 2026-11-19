import { BADGE } from '../lib/quiz.js'

export default function RankBadge({ rank, small = false }) {
  if (!rank) return null
  const b = BADGE[rank.badge] || BADGE.bronze
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`} style={{ color: b.color, background: b.bg }}>
      <svg viewBox="0 0 20 20" className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} fill="currentColor" aria-hidden="true"><path d="M10 1.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 13.9l-4.8 2.5.9-5.4L2.2 7.2l5.4-.8z" /></svg>
      {rank.title}
    </span>
  )
}
