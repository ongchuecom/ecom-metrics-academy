"""Đọc sẵn lời video bảng giảng thành mp3 bằng VieNeu-TTS (Apache 2.0, chạy được trên CPU).

Chạy qua: npm run voice   (tự dựng nội dung, liệt kê lời đọc rồi gọi file này)
Cần: python3 có gói trong tools/voice/requirements.txt, và ffmpeg.

- Chỉ đọc cảnh chưa có file (tên file = băm giọng + lời), nên sửa một bài chỉ đọc lại cảnh bị đổi.
- Ghi public/audio/<key>.mp3 và public/audio/index.json (key → thời lượng ms) cho trình phát.
- File không còn dùng thì xóa (--keep để giữ lại).
"""
import json, os, subprocess, sys, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from norm import normalize  # noqa: E402

OUT = ROOT / 'public' / 'audio'


def duration_ms(mp3: Path) -> int:
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)], capture_output=True, text=True, check=True)
    return round(float(r.stdout.strip()) * 1000)


def main():
    man = json.loads((ROOT / '.cache' / 'voice-manifest.json').read_text())
    items, voice = man['items'], man['voice']
    OUT.mkdir(parents=True, exist_ok=True)
    todo = [x for x in items if not (OUT / f"{x['key']}.mp3").exists()]
    limit = next((int(a.split('=')[1]) for a in sys.argv if a.startswith('--limit=')), None)
    if limit: todo = todo[:limit]
    print(f'Giọng {voice}: {len(items)} cảnh, cần đọc {len(todo)}')
    if todo:
        from vieneu import Vieneu
        tts = Vieneu()
        t0 = time.time()
        for n, x in enumerate(todo, 1):
            text = normalize(x['say'])
            audio = tts.infer(text, voice=voice)
            with tempfile.TemporaryDirectory() as d:
                wav = Path(d) / 'a.wav'
                tts.save(audio, str(wav))
                # giọng nói: mono 64 kbps là đủ rõ, mỗi cảnh chỉ vài chục KB
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar', '24000', '-b:a', '64k', str(OUT / f"{x['key']}.mp3")], check=True)
            if n % 10 == 0 or n == len(todo):
                el = time.time() - t0
                print(f'  {n}/{len(todo)} · {el / 60:.1f} phút · còn khoảng {el / n * (len(todo) - n) / 60:.0f} phút', flush=True)
    keep = {x['key'] for x in items}
    if '--keep' not in sys.argv:
        for f in OUT.glob('*.mp3'):
            if f.stem not in keep: f.unlink(); print('  xóa file cũ', f.name)
    index = {f.stem: duration_ms(f) for f in sorted(OUT.glob('*.mp3')) if f.stem in keep}
    (OUT / 'index.json').write_text(json.dumps({'voice': voice, 'files': index}, ensure_ascii=False))
    print(f'✓ public/audio: {len(index)} file, {sum(index.values()) / 60000:.0f} phút')


if __name__ == '__main__':
    main()
