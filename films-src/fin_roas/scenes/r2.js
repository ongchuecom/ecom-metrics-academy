// Bóc 100 nghìn doanh thu
SH.sheet(kit, 'r2', {
  file: 'P&L · mỗi 100 nghìn doanh thu từ Ads', x: 860, y: 60, w: 980, rh: 60, cols: [['', 420], ['', 190], ['', 310]],
  hdr: ['Khoản', 'Nghìn đồng', 'Ghi chú'],
  rows: [['Doanh thu', '100', ''], ['Giá vốn', '', ''], ['Phí sàn + thanh toán', '', ''], ['Hoàn hàng', '', ''], ['Quảng cáo', '', ''], ['Lãi sau Ads', '', ''], ['Chi phí cố định', '', ''], ['Còn lại', '', '']],
  note: [80, 640, 720],
  ops: [
    { at: 0.8, sel: 'B3' }, { at: 1.1, set: 'B3', v: '35', d: 0.25 },
    { at: 1.9, sel: 'B4' }, { at: 2.2, set: 'B4', v: '14', d: 0.25 },
    { at: 3.0, sel: 'B5' }, { at: 3.3, set: 'B5', v: '5', d: 0.2 }, { at: 3.5, calc: 'C5', v: '12% đơn hoàn' },
    { at: 4.4, sel: 'B6', fx: '=B2/3,2' }, { at: 4.8, calc: 'B6', v: '31,25', fx: '=B2/3,2' }, { at: 4.9, calc: 'C6', v: 'ROAS 3,2' },
    { at: 5.9, sel: 'B7', fx: '=B2-SUM(B3:B6)' }, { at: 6.3, calc: 'B7', v: '14,75', fx: '=B2-SUM(B3:B6)', c: '#FFF2A8' },
    { at: 7.4, sel: 'B8', fx: '=180/1500*100' }, { at: 7.8, calc: 'B8', v: '12', fx: '=180/1500*100' }, { at: 7.9, calc: 'C8', v: '180 tr/tháng' },
    { at: 8.9, sel: 'B9', fx: '=B7-B8' }, { at: 9.3, calc: 'B9', v: '2,75', fx: '=B7-B8', c: '#FCE8E6' },
    { at: 10.0, note: 'Bán 100 nghìn, giữ lại chưa tới 3 nghìn.' },
  ],
}, { init(root) { root.classList.add('tint-lemon'); }, html: '<p class="sh-hd" style="top:260px;left:80px;width:740px;font-size:72px">Bóc 100 nghìn<br>doanh thu từ Ads</p>' });
