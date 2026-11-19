const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8766/film.html?export=1'); await p.waitForTimeout(500);
  const w = await p.evaluate(() => window.__wav()); fs.writeFileSync(process.argv[2], Buffer.from(w, 'base64')); await b.close(); })();
