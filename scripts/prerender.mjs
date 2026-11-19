// Sau khi build: tạo trang tĩnh riêng cho từng chỉ số, Playbook và công cụ, kèm tiêu đề, mô tả,
// nội dung chữ cơ bản để Google đọc được; sinh sitemap.xml, robots.txt và 404.html (để link sâu vẫn mở được app).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SITE = 'https://ongchuecom.github.io/ecom-metrics-academy/'
const DIST = 'dist'
const tpl = readFileSync(join(DIST, 'index.html'), 'utf8')
const stages = readdirSync('src/data/stages').sort().flatMap((f) => JSON.parse(readFileSync(join('src/data/stages', f), 'utf8')))
const byId = Object.fromEntries(stages.map((m) => [m.metric_id, m]))
const { playbooks } = JSON.parse(readFileSync('src/data/playbooks.json', 'utf8'))
const lessons = JSON.parse(readFileSync('src/data/lessons.json', 'utf8'))
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const plain = (s) => String(s ?? '').replace(/\*\*/g, '')
const cut = (s, n = 158) => { s = plain(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s }
const mUrl = (m) => `chi-so/${m.slug}/`, pUrl = (p) => `playbook/${p.slug}/`

function page(path, title, desc, body) {
  const url = SITE + path
  const head = `<title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" /><meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" /><meta property="og:url" content="${url}" /><meta property="og:locale" content="vi_VN" />
    <meta property="og:image" content="${SITE}og.png" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta name="twitter:card" content="summary_large_image" />`
  let html = tpl.replace(/<title>[\s\S]*?<\/title>/, head).replace(/<meta name="description"[^>]*>\s*/, '')
  html = html.replace('<div id="root"></div>', `<div id="root"><main style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.6">${body}</main></div>`)
  mkdirSync(join(DIST, path), { recursive: true })
  writeFileSync(join(DIST, path, 'index.html'), html)
  return url
}

const urls = []
// Trang chủ: giữ index.html gốc nhưng thêm nội dung chữ và link tới mọi bài
const homeBody = `<h1>Ecom Metrics Academy: học mọi khái niệm Ecom và khởi nghiệp, có Ông chú Ecom tham vấn</h1>
<p>Nơi học miễn phí các khái niệm Ecom và khởi nghiệp: lãi thật, dòng tiền, tồn kho, quảng cáo, đội ngũ, vận hành… Mỗi khái niệm có ví dụ số, biểu đồ và video bảng giảng, theo văn phong sách Ecom Truyền Kỳ. Hiện có ${stages.length} khái niệm chỉ số và ${playbooks.length} Playbook tình huống, được thêm dần.</p>
<h2>Ai giải đáp</h2><p>Ông chú Ecom, tác giả sách Ecom Truyền Kỳ, cùng đội A1demy trực tiếp trả lời qua Zalo. Người đọc cũng có thể góp ý ẩn danh dưới mỗi bài.</p>
<h2>Playbook tình huống</h2><ul>${playbooks.map((p) => `<li><a href="${SITE + pUrl(p)}">${esc(p.title)}</a></li>`).join('')}</ul>
<h2>Chỉ số</h2><ul>${stages.map((m) => `<li><a href="${SITE + mUrl(m)}">${esc(m.code)}: ${esc(m.vi_name)}</a></li>`).join('')}</ul>`
writeFileSync(join(DIST, 'index.html'), tpl.replace('<div id="root"></div>', `<div id="root"><main style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">${homeBody}</main></div>`).replace('</title>', `</title>
    <link rel="canonical" href="${SITE}" />
    <meta property="og:type" content="website" /><meta property="og:title" content="Ecom Metrics Academy · Ông chú Ecom" />
    <meta property="og:description" content="Học mọi khái niệm Ecom và khởi nghiệp bằng ví dụ số, biểu đồ, video bảng giảng. Có Ông chú Ecom tham vấn và giải đáp." /><meta property="og:url" content="${SITE}" /><meta property="og:locale" content="vi_VN" />
    <meta property="og:image" content="${SITE}og.png" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta name="twitter:card" content="summary_large_image" />`))
urls.push(SITE)

for (const m of stages) {
  const L = lessons[m.metric_id] || {}
  const title = `${m.code} là gì? ${m.vi_name}: công thức, ví dụ · Ecom Metrics Academy`
  const pbs = (m.playbook_refs || []).map((id) => playbooks.find((p) => p.playbook_id === id)).filter(Boolean)
  const rel = [...(m.relationships?.upstream_drivers || []), ...(m.relationships?.downstream_impacts || [])].map((r) => byId[r.metric_id]).filter(Boolean)
  const body = `<p><a href="${SITE}">Ecom Metrics Academy</a></p>
<h1>${esc(m.code)}: ${esc(m.vi_name)}</h1>
${L.subtitle ? `<p><strong>${esc(L.subtitle)}</strong></p>` : ''}
${(L.intro || [m.definition]).map((p) => `<p>${esc(plain(p))}</p>`).join('\n')}
<h2>Công thức</h2><p>${esc(m.code)} = ${esc(m.formula.readable)}</p>
${(L.sections || []).map((s) => `<h2>${esc(s.title)}</h2>${s.body.map((p) => `<p>${esc(plain(p))}</p>`).join('')}`).join('\n')}
${L.mistakes ? `<h2>Hay hiểu sai</h2><ul>${L.mistakes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${L.remember ? `<p><strong>Nhớ một câu:</strong> ${esc(L.remember)}</p>` : ''}
${pbs.length ? `<h2>Playbook có chỉ số này</h2><ul>${pbs.map((p) => `<li><a href="${SITE + pUrl(p)}">${esc(p.title)}</a></li>`).join('')}</ul>` : ''}
${rel.length ? `<h2>Chỉ số liên quan</h2><ul>${rel.map((r) => `<li><a href="${SITE + mUrl(r)}">${esc(r.code)}: ${esc(r.vi_name)}</a></li>`).join('')}</ul>` : ''}`
  urls.push(page(mUrl(m), title, cut(L.intro?.[0] || m.definition), body))
}
for (const p of playbooks) {
  const c = p.case_study
  const body = `<p><a href="${SITE}">Ecom Metrics Academy</a></p><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p>
<h2>Mối liên hệ cốt lõi</h2><p>${esc(p.core_correlation)}</p>
<h2>Tình huống: ${esc(c.title)}</h2><p>${esc(c.context)}</p><ul>${c.breakdown.map((b) => `<li>${esc(b)}</li>`).join('')}</ul><p><strong>Kết quả:</strong> ${esc(c.result)}</p>
<h2>Ngộ nhận và sai lầm</h2><ul>${p.myths_and_mistakes.map((x) => `<li>${esc(x.type)}: ${esc(x.detail)}</li>`).join('')}</ul>
<h2>Việc cần làm</h2><ul>${p.action_checklist.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>Chỉ số trong Playbook</h2><ul>${p.linked_metrics.map((id) => byId[id]).filter(Boolean).map((m) => `<li><a href="${SITE + mUrl(m)}">${esc(m.code)}: ${esc(m.vi_name)}</a></li>`).join('')}</ul>`
  urls.push(page(pUrl(p), `${p.title} · Ecom Metrics Academy`, cut(p.summary), body))
}
urls.push(page('kham-suc-khoe/', 'Khám sức khỏe shop: tính CM1, CM2, CM3, ROAS hòa vốn · Ecom Metrics Academy',
  'Nhập P&L một tháng của shop, tính Net Sales, CM1, CM2, CM3, lãi ròng, ROAS hòa vốn và nhận gợi ý Playbook nên đọc.',
  '<h1>Khám sức khỏe shop</h1><p>Nhập P&L một tháng của shop để tính Net Sales, CM1, CM2, CM3, lãi ròng, ROAS hòa vốn và nhận chẩn đoán.</p>'))

writeFileSync(join(DIST, '404.html'), tpl) // link sâu chưa có trang tĩnh vẫn mở app
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`)
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`)
console.log(`Prerender: ${urls.length} trang, sitemap.xml, robots.txt, 404.html`)
