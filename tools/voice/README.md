# Giọng đọc video bảng giảng

Video trong mỗi bài đọc lời từ file mp3 đọc sẵn (`public/audio/`), không dùng giọng của trình duyệt,
nên ai mở cũng nghe cùng một giọng.

- Mô hình: [VieNeu-TTS v3 Turbo](https://github.com/pnnbao97/VieNeu-TTS), giấy phép Apache 2.0, chạy được trên CPU.
- Giọng: `site.json → voice.name` (đang dùng Hải Đăng; giọng có sẵn khác: Thiện Minh, Trúc Ly, Mai Anh…).
- Tên file = băm(giọng + lời đọc), tính ở `src/lib/scenes.js` → sửa bài thì chỉ cảnh bị đổi phải đọc lại.

## Đọc lại sau khi thêm hoặc sửa bài

```bash
python3 -m venv .venv-voice && .venv-voice/bin/pip install -r tools/voice/requirements.txt   # lần đầu
PYTHON=.venv-voice/bin/python npm run voice
```

Cần `ffmpeg`. Mỗi cảnh khoảng 10 giây trên CPU 4 nhân. `npm run build` in ra số cảnh còn thiếu giọng
(cảnh thiếu vẫn chạy, chỉ không có tiếng).

## Sửa cách đọc

- Từ đọc sai (viết tắt, đơn vị…): thêm vào `WORDS` hoặc quy tắc trong `tools/voice/norm.py`, rồi tăng
  `site.json → voice.version` để đọc lại toàn bộ.
- Đổi giọng: sửa `voice.name`, chạy lại `npm run voice` (file của giọng cũ tự bị xóa).
