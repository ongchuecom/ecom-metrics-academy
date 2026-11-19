// Định tuyến bằng đường dẫn thật (mỗi bài một link riêng để Google đọc được).
// /                      → trang chủ
// /chi-so/<slug>         → bài chỉ số  (?tab=homework …)
// /playbook/<slug>       → Playbook
// /kham-suc-khoe         → công cụ khám sức khỏe shop
// Link cũ dạng #vn_fin_cm2 hoặc #pb_01_… vẫn mở được.
import { metricById, playbookById, metricBySlug, playbookBySlug } from '../data/index.js'

export const BASE = import.meta.env.BASE_URL || '/'

export function href(r) {
  if (r.type === 'metric') return `${BASE}chi-so/${metricById[r.id].slug}/${r.tab && r.tab !== 'sim' ? `?tab=${r.tab}` : ''}`
  if (r.type === 'pb') return `${BASE}playbook/${playbookById[r.id].slug}/`
  if (r.type === 'health') return `${BASE}kham-suc-khoe/`
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
  if (kind === 'chi-so' && metricBySlug[slug]) return { type: 'metric', id: metricBySlug[slug].metric_id, tab }
  if (kind === 'playbook' && playbookBySlug[slug]) return { type: 'pb', id: playbookBySlug[slug].playbook_id }
  if (kind === 'kham-suc-khoe') return { type: 'health' }
  return { type: 'home' }
}
