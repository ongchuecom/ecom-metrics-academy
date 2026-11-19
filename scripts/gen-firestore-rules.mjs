// Sinh integrations/firestore.rules từ src/data/playbooks.json (danh sách Playbook có trắc nghiệm và thang điểm).
// Quy tắc bảo đảm: chỉ chủ tài khoản ghi điểm của mình; điểm lần đầu mỗi Playbook không sửa, không xóa từng phần được;
// mỗi điểm thuộc thang 0..max theo bước points_per_question; total và done phải khớp đúng với các điểm.
// Dùng: node scripts/gen-firestore-rules.mjs [--check]  (--check: báo lỗi nếu file đang có khác bản sinh ra)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const OUT = 'integrations/firestore.rules'
const { playbooks, gamification } = JSON.parse(readFileSync('src/data/playbooks.json', 'utf8'))
const step = gamification?.points_per_question || 10
const pbs = playbooks.filter((p) => p.quiz?.length).map((p) => ({ id: p.playbook_id, max: p.quiz.reduce((a, q) => a + q.points, 0) }))
const allowed = (max) => Array.from({ length: max / step + 1 }, (_, i) => i * step)
const sum = pbs.map((p) => `s.get('${p.id}', 0)`).join(' + ')
const done = pbs.map((p) => `(s.keys().hasAny(['${p.id}']) ? 1 : 0)`).join(' + ')
const valid = pbs.map((p) => `(!s.keys().hasAny(['${p.id}']) || s['${p.id}'] in [${allowed(p.max).join(', ')}])`).join('\n        && ')

const rules = `rules_version = '2';
// SINH TỰ ĐỘNG bởi scripts/gen-firestore-rules.mjs từ src/data/playbooks.json. Đừng sửa tay.
// Dán toàn bộ file này vào Firebase console → Firestore Database → Rules → Publish.
service cloud.firestore {
  match /databases/{database}/documents {
    // Bảng xếp hạng: mỗi người chơi một bản ghi, mã bản ghi = uid đăng nhập Firebase
    match /players/{uid} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == uid && validPlayer(request.resource.data);
      allow update: if request.auth != null && request.auth.uid == uid && validPlayer(request.resource.data)
        && firstAttemptKept(resource.data.scores, request.resource.data.scores);
      allow delete: if request.auth != null && request.auth.uid == uid;
    }

    function validPlayer(d) {
      return d.keys().hasOnly(['name', 'scores', 'total', 'done', 'updatedAt'])
        && d.name is string && d.name.size() >= 1 && d.name.size() <= 24
        && !d.name.matches('.*[0-9][0-9 .-]{5,}[0-9].*') && !d.name.matches('(?i).*(https?://|www[.]).*')
        && d.scores is map && d.scores.keys().hasOnly([${pbs.map((p) => `'${p.id}'`).join(', ')}])
        && validScores(d.scores)
        && d.total == totalOf(d.scores)
        && d.done == doneOf(d.scores)
        && d.updatedAt == request.time;
    }

    function validScores(s) {
      return ${valid};
    }

    function totalOf(s) {
      return ${sum};
    }

    function doneOf(s) {
      return ${done};
    }

    // Điểm đã ghi thì giữ nguyên: không bớt Playbook nào, không đổi điểm nào
    function firstAttemptKept(before, after) {
      return after.diff(before).removedKeys().size() == 0 && after.diff(before).changedKeys().size() == 0;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`
if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== rules) { console.error(`${OUT} chưa khớp dữ liệu Playbook. Chạy: npm run data:pack`); process.exit(1) }
} else {
  writeFileSync(OUT, rules)
  console.log(`Đã sinh ${OUT} cho ${pbs.length} Playbook.`)
}
