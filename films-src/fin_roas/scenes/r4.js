// Màn hình đơn hàng: 3 trên 25 đơn quay đầu (12%)
const { seg, lerp, eo, eob } = kit;
const N = 25, BAD = [6, 13, 21];
kit.scene('r4', {
  init(kit) {
    let g = '<div class="r4-grid">';
    for (let i = 0; i < N; i++) g += '<div class="r4-o r4-o' + i + '"><b>#' + (2101 + i) + '</b><span>Đã giao</span></div>';
    g += '</div><div class="r4-sum"><p>3 / 25 đơn</p><b>= 12% đơn hoàn</b></div>';
    const h = '<div class="ground sh-g mh169"><div class="ui-root">' +
      '<p class="sh-hd" style="top:250px;left:80px;width:740px;font-size:72px">12 trên 100 đơn<br>quay đầu</p>' +
      '<div class="r4-cost"><p>Mỗi đơn hoàn, shop mất:</p><ul><li>ship đi và ship về</li><li>hàng móp, phải bán rẻ</li><li>tiền Ads đã chi cho đơn đó</li></ul></div>' +
      '<div class="r4-keep"><p>Cộng lại</p><b>mất 5 nghìn / 100 nghìn doanh thu</b></div>' +
      SH.chrome('Quản lý đơn hàng · tháng 11', 860, 80, 980, 880, g) + '</div></div>';
    const root = kit.h(h); kit.stage.append(root);
    this.o = [...root.querySelectorAll('.r4-o')]; this.sum = root.querySelector('.r4-sum'); this.cost = root.querySelector('.r4-cost'); this.keep = root.querySelector('.r4-keep');
  },
  render(t) {
    this.o.forEach((el, i) => { const p = seg(t, 0.2 + i * 0.03, 0.5 + i * 0.03); el.style.opacity = eo(p); });
    BAD.forEach((k, j) => {
      const a = 1.3 + j * 0.55, p = seg(t, a, a + 0.3), el = this.o[k];
      const on = p > 0; el.classList.toggle('bad', on); el.querySelector('span').textContent = on ? 'Hoàn' : 'Đã giao';
      el.style.transform = 'scale(' + (on ? lerp(1.25, 1, eob(p)) : 1).toFixed(3) + ')';
    });
    const s = seg(t, 3.2, 3.6); this.sum.style.opacity = eo(s); this.sum.style.transform = 'translateY(' + lerp(16, 0, eo(s)).toFixed(1) + 'px)';
    this.cost.style.opacity = eo(seg(t, 4.0, 4.5));
    const k = seg(t, 5.6, 6.1); this.keep.style.opacity = eo(k); this.keep.style.transform = 'scale(' + (k > 0 ? lerp(1.15, 1, eob(k)) : 1).toFixed(3) + ')';
  },
});
