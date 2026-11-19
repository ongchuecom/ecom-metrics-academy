const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://localhost:8766/film.html?export=1'); await p.waitForTimeout(2500);
  const dur = await p.evaluate(() => window.FILM.dur); const fps = 30; fs.mkdirSync('frames', { recursive: true });
  for (let i = 0; i < Math.round(dur * fps); i++) { await p.evaluate((T) => window.__seek(T), i / fps); await p.screenshot({ path: `frames/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  await b.close(); })();
