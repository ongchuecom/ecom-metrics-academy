import site from '../data/site.json'

const ENDPOINT = site.lead?.endpoint

// Gửi dạng text/plain (không cần preflight) và đọc câu trả lời của Apps Script; chỉ coi là đã lưu khi ok: true
export async function postJSON(body) {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
  const j = await res.json().catch(() => ({}))
  if (!j.ok) throw new Error(j.error || 'server')
  return j
}

export const hasEndpoint = !!ENDPOINT

// Góp ý gửi lỗi (mạng chập chờn, máy chủ đang bận) được giữ trên máy rồi tự gửi lại ở lần mở trang sau
const QKEY = 'ema-outbox'
const readQ = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]') } catch { return [] } }
const writeQ = (q) => { try { q.length ? localStorage.setItem(QKEY, JSON.stringify(q.slice(-20))) : localStorage.removeItem(QKEY) } catch { /* bỏ qua */ } }

// Trả 'sent' khi máy chủ đã nhận, 'queued' khi tạm giữ trên máy để gửi lại; lỗi dữ liệu (không gửi lại được) thì ném lỗi
export async function sendOrQueue(body) {
  try { await postJSON(body); return 'sent' } catch (e) {
    if (e.message === 'empty') throw e
    writeQ([...readQ(), { body, at: Date.now() }]); return 'queued'
  }
}

let flushing = false
export async function flushOutbox() {
  if (!ENDPOINT || flushing) return
  flushing = true
  try {
    const q = readQ(), left = []
    for (const item of q) {
      if (Date.now() - item.at > 7 * 24 * 3600 * 1000) continue // quá 7 ngày thì bỏ
      try { await postJSON(item.body) } catch (e) { if (e.message !== 'empty') left.push(item) }
    }
    writeQ(left)
  } finally { flushing = false }
}
