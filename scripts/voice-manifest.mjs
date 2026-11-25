// Liệt kê lời đọc của mọi cảnh video (từ public/data/c/*.json do build-content sinh ra) cho tools/voice/generate.py.
// Ghi .cache/voice-manifest.json: [{ key, id, scene, say }]. key = băm(giọng + lời), trùng với tên file public/audio/<key>.mp3.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { buildScenes, audioKey } from '../src/lib/scenes.js'
const site = JSON.parse(readFileSync('src/data/site.json', 'utf8'))
const v = site.voice
const voiceId = `${v.engine}:${v.name}:${v.version}`
if (!existsSync('public/data/c')) { console.error('Chưa có public/data/c, chạy npm run content trước.'); process.exit(1) }
const out = []
for (const f of readdirSync('public/data/c').sort()) {
  const m = JSON.parse(readFileSync(`public/data/c/${f}`, 'utf8'))
  if (!m.lesson) continue
  buildScenes(m, 0).forEach((s, i) => { if (s.say?.trim()) out.push({ key: audioKey(voiceId, s.say), id: m.metric_id, scene: i, say: s.say }) })
}
mkdirSync('.cache', { recursive: true })
writeFileSync('.cache/voice-manifest.json', JSON.stringify({ voice: v.name, voiceId, items: out }, null, 1))
const have = existsSync('public/audio') ? new Set(readdirSync('public/audio').filter((x) => x.endsWith('.mp3')).map((x) => x.slice(0, -4))) : new Set()
const missing = out.filter((x) => !have.has(x.key))
console.log(`✓ Giọng đọc: ${out.length} cảnh, đã có ${out.length - missing.length}, thiếu ${missing.length}${missing.length ? ' (chạy npm run voice)' : ''}`)
