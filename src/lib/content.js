// Tải nội dung đầy đủ của một khái niệm (public/data/c/<id>.json) khi người đọc mở bài; nhớ trong phiên.
import { useEffect, useState } from 'react'
import { metricById, CATALOG_VERSION } from '../data/index.js'

const BASE = import.meta.env.BASE_URL || '/'
const cache = new Map() // id → Promise

export function loadConcept(id) {
  if (!cache.has(id)) {
    const p = fetch(`${BASE}data/c/${id}.json?v=${CATALOG_VERSION}`).then((r) => { if (!r.ok) throw new Error('http-' + r.status); return r.json() })
      .then((full) => ({ ...metricById[id], ...full, lesson: full.lesson || null }))
    p.catch(() => cache.delete(id)) // lỗi mạng: lần sau tải lại
    cache.set(id, p)
  }
  return cache.get(id)
}

// Tải trước khi rê chuột / sắp bấm vào bài (không chờ kết quả)
export const prefetchConcept = (id) => { if (metricById[id]) loadConcept(id).catch(() => {}) }

export function useConcept(id) {
  const [state, setState] = useState({ id: null, data: null, error: null })
  useEffect(() => {
    if (!id) return
    let alive = true
    setState((s) => (s.id === id ? s : { id, data: null, error: null }))
    loadConcept(id).then((data) => alive && setState({ id, data, error: null })).catch((error) => alive && setState({ id, data: null, error }))
    return () => { alive = false }
  }, [id])
  return state.id === id ? state : { id, data: null, error: null }
}
