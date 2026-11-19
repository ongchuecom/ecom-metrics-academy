// Hook: ROAS 3,2 nằm sẵn trên khung đầu
SH.sheet(kit, 'r1', {
  file: 'Báo cáo quảng cáo · tháng 11 · shop mỹ phẩm', x: 860, y: 280, w: 980, cols: [['', 470], ['', 250], ['', 200]],
  hdr: ['Khoản', 'Triệu đồng', ''],
  rows: [['Doanh thu từ Ads', '1.500', ''], ['Chi phí Ads', '468,75', ''], ['ROAS', '3,2', '']],
  note: [80, 680, 720],
  ops: [
    { at: 0.9, sel: 'B4', fx: '=B2/B3' }, { at: 1.3, calc: 'B4', v: '3,2', fx: '=B2/B3', c: '#E6F4EA' }, { at: 1.4, calc: 'C4', v: 'đẹp', c: '#E6F4EA' },
    { at: 2.4, note: 'Vấn đề nằm ở vạch hòa vốn.' },
  ],
}, { html: '<p class="sh-cap" style="top:200px;left:80px">CHỦ SHOP CHẠY ADS</p><p class="sh-hd" style="top:250px;left:80px;width:740px;font-size:76px">ROAS 3,2<br>mà cuối tháng<br><span class="r-mk">vẫn hết tiền?</span></p><p class="sh-cap" style="top:540px;left:80px;width:720px;font-size:34px;line-height:1.3;color:#1F2328;font-weight:600">Doanh thu 1,5 tỷ một tháng, Ads báo lãi,<br>nhưng tài khoản ngân hàng thì cạn.</p>' });
