// Định tuyến bằng đường dẫn thật (mỗi bài một link riêng để Google đọc được).
// /                      → trang chủ
// /chi-so/<slug>         → bài chỉ số  (?tab=homework …)
// /khai-niem/<slug>      → bài khái niệm, khung làm việc, thuật ngữ (không phải chỉ số)
// /chu-de/<id>           → trang chủ đề
// /playbook/<slug>       → Playbook
// /kham-suc-khoe         → công cụ khám sức khỏe shop
// /bang-xep-hang         → bảng xếp hạng trắc nghiệm Playbook
// /chinh-sach-rieng-tu   → chính sách riêng tư (cần cho đăng nhập Facebook)
// /quan-tri              → trang quản trị (không có trong sitemap)
// Link cũ dạng #vn_fin_cm2 hoặc #pb_01_… vẫn mở được.
import { metricById, playbookById, metricBySlug, playbookBySlug, topicById } from '../data/index.js'

export const BASE = import.meta.env.BASE_URL || '/'

export function href(r) {
  if (r.type === 'metric') { const m = metricById[r.id]; return `${BASE}${m.type && m.type !== 'metric' ? 'khai-niem' : 'chi-so'}/${m.slug}/${r.tab && r.tab !== 'sim' ? `?tab=${r.tab}` : ''}` }
  if (r.type === 'topic') return `${BASE}chu-de/${r.id}/`
  if (r.type === 'pb') return `${BASE}playbook/${playbookById[r.id].slug}/`
  if (r.type === 'health') return `${BASE}kham-suc-khoe/`
  if (r.type === 'leaderboard') return `${BASE}bang-xep-hang/`
  if (r.type === 'privacy') return `${BASE}chinh-sach-rieng-tu/`
  if (r.type === 'admin') return `${BASE}quan-tri/`
  return BASE
}

export function parse(loc = window.location) {
  const h = decodeURIComponent(loc.hash.slice(1))
  if (h) {
    const [id, tab] = h.split('/')
    if (playbookById[id]) return { type: 'pb', id }
    if (metricById[id]) return { type: 'metric', id, tab: tab || null }
  }
  let path = decodeURIComponent(loc.pathname)
  if (path.startsWith(BASE)) path = path.slice(BASE.length)
  const [kind, slug] = path.replace(/^\/+|\/+$/g, '').split('/')
  const tab = new URLSearchParams(loc.search).get('tab')
  if ((kind === 'chi-so' || kind === 'khai-niem') && metricBySlug[slug]) return { type: 'metric', id: metricBySlug[slug].metric_id, tab }
  if (kind === 'chu-de' && topicById[slug]) return { type: 'topic', id: slug }
  if (kind === 'playbook' && playbookBySlug[slug]) return { type: 'pb', id: playbookBySlug[slug].playbook_id }
  if (kind === 'kham-suc-khoe') return { type: 'health' }
  if (kind === 'bang-xep-hang') return { type: 'leaderboard' }
  if (kind === 'chinh-sach-rieng-tu') return { type: 'privacy' }
  if (kind === 'quan-tri') return { type: 'admin' }
  return { type: 'home' }
}
