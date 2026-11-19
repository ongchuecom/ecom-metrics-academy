// Điểm trắc nghiệm và bảng xếp hạng trên Firestore (bản lite, tải khi cần).
// Mỗi người một bản ghi players/{uid}; quy tắc bảo mật ở integrations/firestore.rules giữ nguyên điểm lần đầu và chặn khai gian.
import { getFirebase } from './auth.jsx'

let fs = null
async function store() {
  if (fs) return fs
  const [{ app }, f] = await Promise.all([getFirebase(), import('firebase/firestore/lite')])
  const db = f.getFirestore(app)
  if (import.meta.env.VITE_FB_EMULATOR) f.connectFirestoreEmulator(db, '127.0.0.1', 8085) // chỉ khi kiểm thử
  fs = { db, f }
  return fs
}

const total = (s) => Object.values(s).reduce((a, b) => a + b, 0)

// Bỏ số điện thoại, link khỏi tên hiển thị (quy tắc Firestore cũng chặn các thứ này)
export const cleanName = (s) => String(s || '').normalize('NFC').replace(/[\u0000-\u001f<>]/g, '')
  .replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/\d[\d .-]{5,}\d/g, '').replace(/\s+/g, ' ').trim().slice(0, 24)

export async function loadProgress(uid) {
  const { db, f } = await store()
  const snap = await f.getDoc(f.doc(db, 'players', uid))
  return snap.exists() ? snap.data() : null
}

// Gộp điểm trên máy vào tài khoản: điểm đã có trên máy chủ thắng (lần nộp đầu). Trả về điểm sau khi gộp.
export async function saveScores(uid, name, localFirst) {
  const { db, f } = await store()
  const ref = f.doc(db, 'players', uid)
  return f.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const cur = snap.exists() ? snap.data() : null
    const scores = { ...localFirst, ...(cur?.scores || {}) }
    const nm = cleanName(name) || cur?.name || 'Ẩn danh'
    const changed = !cur || nm !== cur.name || Object.keys(scores).length !== Object.keys(cur.scores).length
    if (changed) tx.set(ref, { name: nm, scores, total: total(scores), done: Object.keys(scores).length, updatedAt: f.serverTimestamp() })
    return { scores, name: nm }
  })
}

export async function deleteMe(uid) {
  const { db, f } = await store()
  await f.deleteDoc(f.doc(db, 'players', uid))
  dropBoardCache()
}

// Bảng xếp hạng: top 50 + tổng số người + vị trí của mình. Giữ trên máy 90 giây để đỡ tốn lượt đọc khi đông người.
const BOARD_KEY = 'ema-board'
const TTL = 90 * 1000
export const dropBoardCache = () => { try { localStorage.removeItem(BOARD_KEY) } catch { /* bỏ qua */ } }
export async function fetchBoard(uid, { fresh = false } = {}) {
  try {
    const c = JSON.parse(localStorage.getItem(BOARD_KEY) || 'null')
    if (!fresh && c && c.uid === (uid || null) && Date.now() - c.at < TTL) return c.data
  } catch { /* bỏ qua */ }
  const { db, f } = await store()
  const col = f.collection(db, 'players')
  const [top, count, mine] = await Promise.all([
    f.getDocs(f.query(col, f.orderBy('total', 'desc'), f.limit(50))),
    f.getCount(col),
    uid ? f.getDoc(f.doc(db, 'players', uid)) : null,
  ])
  const rows = top.docs.map((d) => ({ uid: d.id, ...d.data(), t: d.data().updatedAt?.toMillis?.() || 0 }))
    .sort((a, b) => b.total - a.total || a.t - b.t)
    .map((r, i) => ({ pos: i + 1, uid: r.uid, name: r.name, score: r.total, done: r.done }))
  let me = null
  if (mine?.exists()) {
    const m = mine.data()
    const ahead = await f.getCount(f.query(col, f.where('total', '>', m.total)))
    me = { pos: ahead.data().count + 1, name: m.name, score: m.total, done: m.done }
  }
  const data = { total: count.data().count, top: rows, me }
  try { localStorage.setItem(BOARD_KEY, JSON.stringify({ uid: uid || null, at: Date.now(), data })) } catch { /* bỏ qua */ }
  return data
}

// ===== Quản trị =====
export async function fetchAllPlayers() {
  const { db, f } = await store()
  const snap = await f.getDocs(f.collection(db, 'players'))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data(), updatedAt: d.data().updatedAt?.toMillis?.() || 0 }))
}

// Quy tắc Firestore chỉ cho quản trị viên (site.json → admin.uids) xóa bản ghi của người khác
export async function deletePlayer(uid) {
  const { db, f } = await store()
  await f.deleteDoc(f.doc(db, 'players', uid))
  dropBoardCache()
}
