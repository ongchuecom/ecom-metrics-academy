# Dựng film ROAS bằng bộ khung a1demy-social-video + bộ công cụ Màn hình thật
import json, os, shutil, subprocess, sys
B = '/root/.claude/skills/synced/051b3d6c-fe60-47ca-b2bd-e77f74792d4e_e8b6957a-ebb3-4f67-b69d-dab16fc8777b'
KH = B + '/a1demy-social-video/scripts'; MH = B + '/a1demy-kho-phong-cach/references/mau/man-hinh-that'
HERE = os.path.dirname(os.path.abspath(__file__)); spec_path, OD = sys.argv[1], os.path.abspath(sys.argv[2])
os.makedirs(OD, exist_ok=True); K = os.path.join(HERE, '_khung'); shutil.rmtree(K, ignore_errors=True); shutil.copytree(KH, K)
cf = os.path.join(K, 'check_film.py'); c = open(cf).read().replace("b = p.chromium.launch();", "b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome');"); open(cf, 'w').write(c)
subprocess.run([sys.executable, os.path.join(K, 'build_film.py'), spec_path, OD], check=True)
W = json.load(open(os.path.join(OD, 'writes.json')))
fp = lambda k: next(w['file_path'] for w in W if w['collection'] + '/' + w['doc_id'] == k)
spec = json.load(open(spec_path))
for s in spec['scenes']:
    json.dump({'kind': 'js', 'text': open(os.path.join(HERE, 'scenes', s['type'] + '.js')).read()}, open(fp(f"modules/scene-{s['type']}.js"), 'w'), ensure_ascii=False)
d = json.load(open(fp('modules/base.css'))); d['text'] += '\n' + open(MH + '/sh.css').read() + '\n' + open(os.path.join(HERE, 'scenes', 'extra.css')).read()
json.dump(d, open(fp('modules/base.css'), 'w'), ensure_ascii=False)
d = json.load(open(fp('modules/shared.js'))); d['text'] += '\n' + open(MH + '/sh.js').read()
json.dump(d, open(fp('modules/shared.js'), 'w'), ensure_ascii=False)
print('ok', OD)
