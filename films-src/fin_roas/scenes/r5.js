// Kế hoạch: 3 việc, mỗi việc ra tiền
const ACT = [
  ['Gọi xác nhận đơn trước khi gửi', 'Hoàn 12% → 4%', '+50 tr/tháng'],
  ['Combo nâng giá trị đơn (AOV) 10%', 'Giữ số đơn và tiền Ads', '+69 tr/tháng'],
  ['ROAS dưới 2,94', 'Không tăng ngân sách', 'Giữ tiền'],
];
SH.sheet(kit, 'r5', {
  file: 'P&L · hiện tại và kế hoạch', x: 860, y: 70, w: 980, note: [880, 820, 940], cols: [['', 440], ['', 220], ['', 260]],
  hdr: ['Khoản (mỗi 100 nghìn)', 'Hiện tại', 'Kế hoạch'],
  rows: [['Doanh thu', '100', '100'], ['Giá vốn + phí sàn', '49', '49'], ['Hoàn hàng', '5', ''], ['Quảng cáo', '31,25', '31,25'], ['Chi phí cố định', '12', '12'], ['Còn lại', '2,75', ''], ['Còn lại / tháng (tr)', '41,25', '']],
  ops: [
    { at: 1.4, sel: 'C4', fx: '=5*4%/12%' }, { at: 1.8, set: 'C4', v: '1,67', d: 0.3 }, { at: 2.1, fill: 'C4', c: '#E6F4EA' },
    { at: 2.8, calc: 'C7', v: '6,08', fx: '=C2-SUM(C3:C6)', c: '#E6F4EA' },
    { at: 3.4, calc: 'C8', v: '91,25', fx: '=C7*15', c: '#E6F4EA' },
    { at: 4.0, note: 'Chỉ riêng việc 1: thêm 50 triệu mỗi tháng.' },
  ],
}, {
  html: '<p class="sh-hd" style="top:110px;left:80px;width:740px;font-size:62px">3 việc,<br>việc nào cũng ra tiền</p>' +
    '<div class="r5-list">' + ACT.map((a, i) => '<div class="r5-a r5-a' + i + '"><i>' + (i + 1) + '</i><div><p>' + a[0] + '</p><span>' + a[1] + '</span></div><b>' + a[2] + '</b></div>').join('') + '</div>',
  init(root) { root.classList.add('tint-good'); this.acts = [...root.querySelectorAll('.r5-a')]; },
  render(t) {
    [0.6, 5.6, 8.6].forEach((a, i) => { const p = kit.seg(t, a, a + 0.4); const el = this.acts[i]; el.style.opacity = kit.eo(p); el.style.transform = 'translateX(' + kit.lerp(-30, 0, kit.eo(p)).toFixed(1) + 'px)'; });
  },
});
