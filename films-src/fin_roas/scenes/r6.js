const { seg, lerp, eo, eob } = kit;
kit.scene('r6', {
  init(kit) {
    const body = '<div class="mh6-ch"><p class="mh6-ti">Còn lại mỗi tháng (triệu đồng)</p>' +
      '<div class="mh6-col mh6-a"><b class="mh6-bar"></b><p class="mh6-v">41,25</p><p class="mh6-l">Hiện tại</p></div>' +
      '<div class="mh6-col mh6-b"><b class="mh6-bar"></b><p class="mh6-v">91,25</p><p class="mh6-l">Kế hoạch việc 1</p></div><div class="mh6-axis"></div></div>';
    const h = '<div class="ground sh-g mh169 tint-lemon"><div class="ui-root"><p class="sh-hd" style="top:150px;left:80px;width:740px;font-size:58px">ROAS đẹp chưa chắc<br>có lãi. Hòa vốn<br>mới là vạch.</p>' +
      SH.chrome('Báo cáo · trước và sau', 860, 120, 980, 640, body) +
      '<div class="mh6-stk"><p><b>Lưu lại.</b> Tối nay tính ROAS hòa vốn thật của shop.</p><span>1 ÷ (1 − giá vốn% − phí sàn% − hoàn% − cố định%)</span></div>' +
      '<p class="mh6-sig">Ông chú Ecom</p></div></div>';
    const root = kit.h(h); kit.stage.append(root);
    this.a = root.querySelector('.mh6-a .mh6-bar'); this.b = root.querySelector('.mh6-b .mh6-bar'); this.stk = root.querySelector('.mh6-stk'); this.sig = root.querySelector('.mh6-sig');
    this.va = root.querySelector('.mh6-a .mh6-v'); this.vb = root.querySelector('.mh6-b .mh6-v');
  },
  render(t) {
    const pa = seg(t, 0.5, 1.2), pb = seg(t, 1.3, 2.2), S = 3.6; // px mỗi triệu, tỷ lệ đúng
    this.a.style.height = (41.25 * S * (pa <= 0 ? 0 : eob(pa, 1.1))).toFixed(1) + 'px';
    this.b.style.height = (91.25 * S * (pb <= 0 ? 0 : eob(pb, 1.1))).toFixed(1) + 'px';
    this.va.style.opacity = eo(seg(t, 1.0, 1.3)); this.vb.style.opacity = eo(seg(t, 2.0, 2.3));
    const s = seg(t, 3.0, 3.5); this.stk.style.opacity = eo(s); this.stk.style.transform = 'rotate(-2deg) scale(' + (s > 0 ? lerp(1.2, 1, eob(s)) : 1).toFixed(3) + ')';
    this.sig.style.opacity = eo(seg(t, 4.4, 4.8));
  },
});
