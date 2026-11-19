// Điểm trắc nghiệm Playbook lưu trên máy người dùng; lần nộp ĐẦU TIÊN mỗi Playbook là điểm chính thức cho bảng xếp hạng.
import pbData from '../data/playbooks.json'

export const GAM = pbData.gamification || { max_total_score: 0, ranks: [] }
const RANKS = [...(GAM.ranks || [])].sort((a, b) => a.min_score - b.min_score)
export const BADGE = {
  bronze: { label: 'Đồng', color: '#B4652A', bg: '#FBEFE6' },
  silver: { label: 'Bạc', color: '#6B7280', bg: '#F1F2F4' },
  gold: { label: 'Vàng', color: '#A16207', bg: '#FEF6D8' },
  diamond: { label: 'Kim cương', color: '#0E7490', bg: '#E3F6FA' },
}

export const rankFor = (score) => [...RANKS].reverse().find((r) => score >= r.min_score) || RANKS[0]
export const nextRank = (score) => RANKS.find((r) => r.min_score > score) || null
export const RANK_LIST = RANKS

const KEY = 'ema-quiz'
const empty = () => ({ player: '', name: '', first: {}, last: {}, synced: {} })
export function loadQuiz() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return empty() }
}
export function saveQuiz(s) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* trình duyệt chặn lưu thì thôi */ } }
export const totalOf = (s) => Object.values(s.first).reduce((a, b) => a + b, 0)
export function ensurePlayer(s) {
  if (s.player) return s
  const id = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 36)
  return { ...s, player: id }
}

// Báo cho các khối trắc nghiệm / bảng xếp hạng đang mở đọc lại điểm sau khi đồng bộ
export const QUIZ_EVENT = 'ema-quiz-changed'
export const notifyQuiz = () => window.dispatchEvent(new Event(QUIZ_EVENT))
export const accountPlayer = (uid) => 'fb-' + uid
