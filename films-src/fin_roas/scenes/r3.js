// Cảnh đinh: ROAS tụt 0,3 là lỗ; hòa vốn thật 2,94
const R = { min: 1.5, max: 3.5, x: 110, w: 640 };
const rx = (v) => R.x + (v - R.min) / (R.max - R.min) * R.w;
const tick = (v, cls, lab, top) => '<div class="r3-m ' + cls + '" style="left:' + rx(v).toFixed(0) + 'px"><i></i><b style="top:' + top + 'px">' + lab + '</b></div>';
SH.sheet(kit, 'r3', {
  file: 'P&L · thử tình huống', x: 860, y: 90, w: 980, cols: [['', 520], ['', 200], ['', 200]],
  hdr: ['Khoản (mỗi 100 nghìn)', 'Nghìn đồng', ''],
  rows: [['Doanh thu', '100', ''], ['Giá vốn + phí sàn + hoàn', '54', ''], ['Chi phí cố định', '12', ''], ['ROAS', '3,2', ''], ['Quảng cáo', '31,25', ''], ['Còn lại', '2,75', ''], ['ROAS hòa vốn thật', '', '']],
  note: [80, 560, 720],
  ops: [
    { at: 0.9, sel: 'B5', fx: '3,2' }, { at: 1.3, set: 'B5', v: '2,9', d: 0.3 }, { at: 1.6, fill: 'B5', c: '#FFF2A8' }, { at: 1.6, calc: 'C5', v: '−0,3' },
    { at: 2.1, calc: 'B6', v: '34,48', fx: '=B2/B5' }, { at: 2.6, calc: 'B7', v: '−0,48', fx: '=B2-B3-B4-B6', c: '#FCE8E6' },
    { at: 3.1, note: 'ROAS chỉ tụt 0,3: từ lãi thành lỗ.' },
    { at: 5.4, sel: 'B8', fx: '=1/(1-54%-12%)' }, { at: 5.9, calc: 'B8', v: '2,94', fx: '=1/(1-54%-12%)', c: '#FFF2A8' },
    { at: 6.5, note: 'Tính đủ lương và kho: dưới 2,94 là lỗ.' },
  ],
}, {
  html: '<p class="sh-hd r3-q1" style="top:250px;left:80px;width:740px;font-size:74px">Nếu ROAS<br>tụt xuống 2,9?</p>' +
    '<p class="sh-hd r3-q2" style="top:250px;left:80px;width:740px;font-size:74px;opacity:0">Vạch hòa vốn<br>thật ở đâu?</p>' +
    '<div class="r3-rule"><div class="r3-axis"></div><div class="r3-safe" style="left:' + rx(2.94).toFixed(0) + 'px"></div>' +
    tick(2.17, 'r3-a', 'Hòa vốn<br>chưa tính<br>cố định 2,17', 40) + tick(2.94, 'r3-b', 'Hòa vốn thật<br>2,94', 40) + tick(3.2, 'r3-c', 'Đang chạy<br>3,2', -96) + '</div>',
  init(root) { root.classList.add('tint-warn'); this.q1 = root.querySelector('.r3-q1'); this.q2 = root.querySelector('.r3-q2'); this.rule = root.querySelector('.r3-rule'); this.safe = root.querySelector('.r3-safe'); this.mk = [...root.querySelectorAll('.r3-m')]; },
  render(t) {
    const k = kit.seg(t, 4.6, 5.0); this.q1.style.opacity = 1 - k; this.q2.style.opacity = k;
    const r = kit.eo(kit.seg(t, 6.9, 7.4)); this.rule.style.opacity = r;
    this.mk.forEach((m, i) => { const p = kit.seg(t, 7.2 + i * 0.35, 7.5 + i * 0.35); m.style.opacity = kit.eo(p); });
    const s = kit.seg(t, 8.4, 8.9); this.safe.style.width = (kit.eo(s) * (rx(3.2) - rx(2.94))).toFixed(1) + 'px';
  },
});
