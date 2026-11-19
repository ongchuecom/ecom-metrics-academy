// Dữ liệu cho trang quản trị. Góp ý nằm trong repo riêng tư trên GitHub, đọc bằng token chỉ-đọc mà quản trị viên
// tự dán vào trang (lưu trên máy của họ, không nằm trong code hay repo).
import site from '../data/site.json'

export const FEEDBACK_REPO = 'ongchuecom/ecom-metrics-feedback'
export const ADMIN_UIDS = site.admin?.uids || []
export const isAdmin = (user) => !!user && ADMIN_UIDS.includes(user.uid)

const TKEY = 'ema-admin-gh'
export const getGhToken = () => { try { return localStorage.getItem(TKEY) || '' } catch { return '' } }
export const setGhToken = (t) => { try { t ? localStorage.setItem(TKEY, t.trim()) : localStorage.removeItem(TKEY) } catch { /* bỏ qua */ } }

async function gh(path, token, raw = false) {
  const res = await fetch(`https://api.github.com/repos/${FEEDBACK_REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (res.status === 404) return null
  if (res.status === 401 || res.status === 403) throw new Error('token')
  if (!res.ok) throw new Error('github-' + res.status)
  return raw ? res.text() : res.json()
}

// Góp ý trong `days` ngày gần nhất (mỗi ngày một file feedback/YYYY-MM-DD.jsonl)
export async function fetchFeedback(token, days = 30) {
  const list = await gh('feedback', token)
  if (!list) return []
  const since = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10)
  const files = list.filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f.name) && f.name.slice(0, 10) >= since).sort((a, b) => b.name.localeCompare(a.name))
  const texts = await Promise.all(files.map((f) => gh(f.path, token, true)))
  return texts.flatMap((t) => (t || '').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } })).filter(Boolean)
    .sort((a, b) => b.t.localeCompare(a.t))
}

// Tải xuống CSV (mở bằng Excel / Google Sheets)
export function downloadCSV(name, rows) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s }
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
