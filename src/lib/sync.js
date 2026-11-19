// Đăng nhập xong: gộp điểm trên máy với điểm theo tài khoản (máy chủ thắng — lần nộp đầu đã ghi trước đó).
// Mỗi máy chỉ đồng bộ tối đa một lần mỗi ngày, trừ khi trên máy có điểm mới chưa đưa lên.
import { loadQuiz, saveQuiz, notifyQuiz } from './quiz.js'
import { loadProgress, saveScores } from './db.js'
import { authEnabled } from './auth.jsx'

const DAY = 24 * 3600 * 1000

export async function syncAccount(user) {
  if (!authEnabled) return
  let s = loadQuiz()
  const pending = Object.keys(s.first).some((k) => !s.synced[k])
  if (s.uid === user.uid && !pending && Date.now() - (s.syncedAt || 0) < DAY) return
  if (s.uid && s.uid !== user.uid) s = { ...s, first: {}, last: {}, synced: {}, name: '' } // máy dùng chung: không trộn điểm hai tài khoản
  const cur = await loadProgress(user.uid)
  let first = { ...s.first, ...(cur?.scores || {}) }
  let name = cur?.name || s.name || ''
  // trên máy có điểm mới mà tài khoản đã có tên hiển thị → đưa lên luôn
  if (cur && Object.keys(first).length > Object.keys(cur.scores).length) ({ scores: first, name } = await saveScores(user.uid, name, first))
  const synced = cur ? Object.fromEntries(Object.keys(first).map((k) => [k, true])) : {}
  saveQuiz({ ...s, uid: user.uid, player: 'fb-' + user.uid, name, first, synced, syncedAt: Date.now() })
  notifyQuiz()
}
