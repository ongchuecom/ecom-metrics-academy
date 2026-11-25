// Dựng các cảnh của video bảng giảng từ bài đọc. Dùng chung cho trình duyệt (ExplainerVideo.jsx)
// và script tạo giọng đọc (scripts/voice-manifest.mjs), nên lời đọc và tên file âm thanh luôn khớp nhau.
export const plain = (t = '') => t.replace(/\*\*/g, '')
const spoken = (s) => s.replace(/[×*]/g, ' nhân ').replace(/\//g, ' chia ').replace(/−/g, ' trừ ').replace(/[()]/g, ' ')
export const durationFor = (text, base = 3) => Math.round(Math.min(11, Math.max(5, base + (text || '').length / 22)) * 1000)

export function buildScenes(metric, stageNo) {
  const L = metric.lesson || {}
  const scenes = []
  scenes.push({ id: 'title', label: 'Đề bài', stageNo, say: `${metric.code}. ${L.subtitle || metric.vi_name}.`, dur: 5000 })
  if (metric.formula?.readable || L.tree) scenes.push({
    id: 'formula', label: 'Công thức', tree: L.tree,
    say: (metric.formula?.readable ? 'Công thức: ' + spoken(metric.formula.readable) : '') + (L.tree?.note ? '. ' + L.tree.note : ''),
    dur: durationFor((metric.formula?.readable || '') + (L.tree?.note || ''), 4),
  })
  if (L.breakdown?.chart) {
    const b = L.breakdown
    scenes.push({ id: 'chart', label: 'Ví dụ số', title: b.title, chart: b.chart, text: b.after, say: `${b.title}. ${plain(b.after)}`, dur: durationFor(b.title + plain(b.after), 5) })
  }
  ;(L.sections || []).filter((x) => x.chart).slice(0, 2).forEach((x, k) => {
    scenes.push({ id: 'chart', label: k ? 'Áp dụng' : 'Ngưỡng', title: x.title, chart: x.chart, text: x.body?.[0], say: `${x.title}. ${plain(x.body?.[0] || '')}`, dur: durationFor(x.title + plain(x.body?.[0] || ''), 5) })
  })
  const hw = metric.diagnostic_homework
  const remember = L.remember || metric.definition
  scenes.push({ id: 'close', label: 'Ghi nhớ', remember, hw: hw?.title, say: `Ghi nhớ: ${plain(remember)}${hw ? ' Thử sức với ' + hw.title.replace(/^Bệnh án:\s*/, '') + '.' : ''}`, dur: durationFor(remember, 4.5) })
  scenes[0].agenda = scenes.slice(1).map((x) => x.label)
  return scenes
}

// Tên file âm thanh = băm (giọng + lời đọc). Lời đổi thì tên đổi, file cũ không bị dùng nhầm.
// FNV-1a 32 bit hai lần với hai hạt khác nhau → 16 ký tự hex, chạy giống hệt ở Node và trình duyệt.
function fnv(s, seed) {
  let h = seed >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h.toString(16).padStart(8, '0')
}
export const audioKey = (voice, say) => fnv(`${voice}|${say}`, 2166136261) + fnv(`${say}|${voice}`, 0x9747b28c)
