// Gọi máy chủ Cố vấn AI (server/): gắn phiên đăng nhập Firebase, đọc câu trả lời chạy từng chữ (SSE).
import site from '../data/site.json'
import { authEnabled } from './auth.jsx'

export const ADVISOR = (site.advisor?.endpoint || '').replace(/\/+$/, '')
export const advisorEnabled = !!ADVISOR && authEnabled

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

async function call(path, { getToken, method = 'GET', body, form } = {}) {
  const token = await getToken()
  if (!token) throw new ApiError(401, 'Đăng nhập để dùng Cố vấn AI.')
  const headers = { Authorization: `Bearer ${token}` }
  if (body) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(ADVISOR + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) })
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ Cố vấn AI, anh/chị thử lại sau ít phút.')
  }
  return res
}

const detail = async (res) => { try { const j = await res.json(); return typeof j.detail === 'string' ? j.detail : 'Có lỗi xảy ra.' } catch { return 'Có lỗi xảy ra.' } }

export async function api(path, opts) {
  const res = await call(path, opts)
  if (!res.ok) throw new ApiError(res.status, await detail(res))
  return res.json()
}

// Gửi câu hỏi, gọi onEvent cho từng sự kiện: meta, refs, delta, context_update, done, error
export async function streamChat(body, { getToken, onEvent, signal }) {
  const token = await getToken()
  if (!token) throw new ApiError(401, 'Đăng nhập để dùng Cố vấn AI.')
  let res
  try {
    res = await fetch(`${ADVISOR}/api/chat`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  } catch (e) {
    if (e.name === 'AbortError') return
    throw new ApiError(0, 'Không kết nối được máy chủ Cố vấn AI, anh/chị thử lại sau ít phút.')
  }
  if (!res.ok) throw new ApiError(res.status, await detail(res))
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 2)
      if (line.startsWith('data: ')) { try { onEvent(JSON.parse(line.slice(6))) } catch { /* bỏ dòng hỏng */ } }
    }
  }
}

export const fmtVnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'
