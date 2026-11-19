# Đóng gói film đã dựng (writes.json) thành một trang HTML tự chạy để nhúng web.
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OD, OUT = sys.argv[1], sys.argv[2]; AUDIO = sys.argv[3] if len(sys.argv) > 3 else ''
W = json.load(open(os.path.join(OD, 'writes.json')))
doc = lambda k: json.load(open(next(w['file_path'] for w in W if w['collection'] + '/' + w['doc_id'] == k)))
sj = json.loads(doc('modules/scenes.json')['text']); spec = json.load(open(os.path.join(OD, 'spec.used.json')))
names = [s.get('name', '') for s in spec['scenes']]
scenes = [{'id': s['id'], 'dur': s['dur'], 'name': names[i] if i < len(names) else s['id']} for i, s in enumerate(sj['scenes'])]
dur = round(sum(s['dur'] for s in scenes), 3)
mods = [doc('modules/shared.js')['text']] + [doc(f"modules/scene-{s['id']}.js")['text'] for s in scenes]
J = lambda x: json.dumps(x, ensure_ascii=False).replace('</', '<\\/')
h = open(os.path.join(HERE, 'player_tpl.html')).read()
for k, v in {'__TITLE__': spec['title'], '__W__': str(sj.get('width', 1920)), '__H__': str(sj.get('height', 1080)), '__BG__': sj.get('background', '#fff'),
             '__SCENES__': J(scenes), '__DUR__': str(dur), '__CSS__': doc('modules/base.css')['text'], '__SYNTH__': open(os.path.join(HERE, 'synth.js')).read(),
             '__MODS__': J(mods), '__AUDIO__': J(AUDIO), '__SCORE__': J(doc('modules/score.js')['text'])}.items():
    h = h.replace(k, v)
open(OUT, 'w').write(h); print(OUT, len(h) // 1024, 'KB', dur, 's')
