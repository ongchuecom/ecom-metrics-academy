// Dữ liệu chung của web, đọc từ CHỈ MỤC NHẸ src/data/catalog.json (sinh bởi scripts/build-content.mjs).
// Nội dung đầy đủ từng khái niệm (bài đọc, công thức, quan hệ, giả lập) nằm ở public/data/c/<id>.json và
// chỉ được tải khi người đọc mở bài: xem useConcept trong src/lib/content.js.
import catalog from './catalog.json'
import pbData from './playbooks.json'

export const CATALOG_VERSION = catalog.version
export const TYPES = catalog.types
// Lĩnh vực (giữ tên STAGES để các phần cũ vẫn chạy) và chủ đề
export const STAGES = catalog.domains.map((d) => ({ id: d.id, short: d.short, label: d.label, desc: d.desc, slug: d.slug, topics: d.topics }))
export const stageById = Object.fromEntries(STAGES.map((s) => [s.id, s]))
export const TOPICS = STAGES.flatMap((d) => d.topics.map((t) => ({ ...t, domain: d.id })))
export const topicById = Object.fromEntries(TOPICS.map((t) => [t.id, t]))

// Mỗi mục chỉ mục được trải ra theo tên trường cũ (metric_id, vi_name, stage…) để các phần giao diện cũ dùng tiếp.
// Lưu ý: simulator / diagnostic_homework ở đây chỉ là cờ true/false; dữ liệu thật nằm trong nội dung đầy đủ.
export const metricsMaster = catalog.items.map((c) => ({
  metric_id: c.id, slug: c.slug, type: c.type, code: c.code, vi_name: c.name, stage: c.domain, topic: c.topic,
  sub_group: topicById[c.topic]?.label || '', subtitle: c.sub, definition: c.def, review: c.review,
  basis: c.custom ? { type: 'custom' } : undefined, risk: c.risk, playbook_refs: c.pb || [],
  simulator: c.has?.includes('sim') || undefined, diagnostic_homework: c.has?.includes('hw') || undefined,
  hasCase: !!c.has?.includes('case'), hasLesson: !!c.has?.includes('lesson'), hasSources: !!c.has?.includes('src'),
}))
export const metricById = Object.fromEntries(metricsMaster.map((m) => [m.metric_id, m]))
export const conceptsByTopic = Object.fromEntries(TOPICS.map((t) => [t.id, metricsMaster.filter((m) => m.topic === t.id)]))
export const DEFAULT_METRIC_ID = 'vn_fin_breakeven_roas'

export const BENCHMARK_LABELS = {
  tiktok_vn: 'TikTok Shop VN',
  meta_vn: 'Meta Ads VN',
  d2c_us: 'D2C Mỹ',
  tham_khao: 'Mốc tham khảo',
}

// Playbook tình huống, liên kết hai chiều với chỉ số (đã hợp nhất khi nạp dữ liệu)
export const playbooks = pbData.playbooks
export const playbookById = Object.fromEntries(playbooks.map((p) => [p.playbook_id, p]))
export const PACK_VERSION = pbData.version

export const metricBySlug = Object.fromEntries(metricsMaster.map((m) => [m.slug, m]))
// link cũ sau khi đổi tên chỉ số vẫn mở đúng bài
for (const [old, now] of Object.entries({ 'tien-lech-so': 'chenh-lech-doi-soat' })) if (metricBySlug[now]) metricBySlug[old] = metricBySlug[now]
export const playbookBySlug = Object.fromEntries(playbooks.map((p) => [p.slug, p]))
export const topicBySlug = topicById // id chủ đề đã là slug

// Lộ trình theo vai trò (src/data/paths.json); lộ trình đầu tiên là mặc định
import pathsData from './paths.json'
export const PATHS = pathsData.paths
export const pathById = Object.fromEntries(PATHS.map((p) => [p.id, p]))
export const LEARNING_PATH = PATHS[0].items
