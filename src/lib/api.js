import site from '../data/site.json'

const ENDPOINT = site.lead?.endpoint

// Gửi dạng text/plain (không cần preflight) và đọc câu trả lời của Apps Script; chỉ coi là đã lưu khi ok: true
export async function postJSON(body) {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
  const j = await res.json().catch(() => ({}))
  if (!j.ok) throw new Error(j.error || 'server')
  return j
}
