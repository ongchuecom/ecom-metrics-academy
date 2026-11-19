// Đăng nhập xong: gộp điểm trên máy này với điểm đã lưu theo tài khoản (máy chủ thắng — lần nộp đầu đã ghi trước đó),
// rồi đưa các điểm mới làm trên máy này lên tài khoản.
import { loadQuiz, saveQuiz, notifyQuiz, accountPlayer } from './quiz.js'
import { postJSON, hasEndpoint } from './api.js'

export async function syncAccount(user, getToken) {
  let s = loadQuiz()
  const player = accountPlayer(user.uid)
  if (!hasEndpoint) { saveQuiz({ ...s, player }); notifyQuiz(); return }
  const idToken = await getToken()
  const r = await postJSON({ type: 'progress', player, idToken })
  const server = r.scores || {}
  const first = { ...s.first, ...server }
  const name = r.name || s.name || ''
  s = { ...s, player, name, first, synced: Object.fromEntries(Object.keys(server).map((k) => [k, true])) }
  const pending = Object.fromEntries(Object.entries(first).filter(([k]) => !(k in server)))
  if (name && Object.keys(pending).length) {
    await postJSON({ type: 'score', player, name, scores: pending, idToken })
    s.synced = Object.fromEntries(Object.keys(first).map((k) => [k, true]))
  }
  saveQuiz(s); notifyQuiz()
}
