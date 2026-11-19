# Sửa số trong Playbook cho khớp phép tính (bản r1). Mỗi con số mới đều có assert.
import json
p='data-src/vn_60_metrics_and_10_playbooks_pack.json'; d=json.load(open(p))
if d['version'].endswith('_r1'): raise SystemExit('Đã sửa rồi (r1)')
P={x['playbook_id']:x for x in d['playbooks']}; M={x['metric_id']:x for x in d['metrics']}
def close(a,b,t=0.06): assert abs(a-b)<=t,(a,b)

# PB01: CM2 ≈ 260tr khớp từng dòng
dat=4000; huy=160; gui=dat-huy; hoan=480; giao=gui-hoan
assert gui==3840 and abs(hoan/gui-0.125)<1e-9 and giao==3360
dt_giao=giao*250000/1e6; net=dt_giao*0.95; cogs=giao*85000/1e6; cm1=net-cogs
phi=net*0.16; ship_dong=giao*32500/1e6; hoan_cp=hoan*32000/1e6; cm2=cm1-phi-ship_dong-hoan_cp
close(dt_giao,840); close(net,798); close(cogs,285.6); close(cm1,512.4); close(phi,127.68); close(ship_dong,109.2); close(hoan_cp,15.36); close(cm2,260.16)
close(1000/260,3.85,0.01); close(1000/175,5.71,0.01); assert 260-200-85==-25
pb=P['pb_01_profit_reality']; c=pb['case_study']
c['context']='Anh Nam bán đồ gia dụng tiện ích trên TikTok Shop giá niêm yết 250.000đ/đơn. Tháng này báo doanh thu 1 tỷ đồng (4.000 đơn đặt), tiền Ads hết 200 triệu (ROAS = 5.0, tính trên doanh thu hiển thị).'
c['breakdown']=[
 'Giá vốn nhập kho thực tế (Landed Cost): 85.000đ/sp (34% giá niêm yết).',
 'Khách huỷ ngang trước khi giao 4% (160 đơn), gửi đi 3.840 đơn. Tỷ lệ hoàn hàng (RTO) 12,5% số đơn đã gửi: 480 đơn quay đầu. Chỉ 3.360 đơn giao thành công = 840 triệu.',
 'Voucher shop tự giảm 5% → Doanh thu thực thu (Net Sales) còn 798 triệu. Trừ giá vốn 3.360 × 85.000đ = 285,6 triệu → CM1 = 512,4 triệu.',
 'Tổng phí sàn (cố định + thanh toán + Freeship Xtra + Voucher Xtra + thuế sàn thu hộ) 16% Net Sales = 127,7 triệu. Shop bù ship + đóng gói 32.500đ/đơn = 109,2 triệu. Mỗi đơn hoàn tốn 32.000đ (ship 2 chiều + hộp rách hỏng) = 15,4 triệu.']
c['result']='CM2 còn khoảng 260 triệu. Trừ tiếp 200 triệu tiền Ads, CM3 chỉ còn 60 triệu — không đủ trả tiền thuê kho, điện nước và lương 4 nhân sự (85 triệu/tháng). Thực tế lỗ ròng 25 triệu.'
pb['myths_and_mistakes'][0]['detail']='Thấy ROAS = 5.0 là auto có lời. Thực tế với cơ cấu phí sàn và hoàn hàng trên, ROAS hòa vốn biến phí đã là ~3,8 (1 tỷ ÷ 260 triệu), và để nuôi thêm 85 triệu định phí thì ROAS phải đạt khoảng 5,7 trở lên (1 tỷ ÷ 175 triệu).'

# PB02
c=P['pb_02_cashflow_trap']['case_study']
c['result']=c['result'].replace('gần 3 tháng sau','hơn 2,5 tháng sau'); assert 'hơn 2,5 tháng' in c['result']; close(79/30,2.63,0.01)

# PB03
c=P['pb_03_tax_and_opex']['case_study']; close(160/1500*100,10.7,0.05); close(240/1500*100,16,0.01); close(80/1500*100,5.3,0.05)
c['result']+=' Định phí 160 triệu mới là 10,7% doanh thu, chưa phải cao; vấn đề là CM3 chỉ còn 16% doanh thu nên không gánh nổi định phí cộng thuế 5,3%.'

# PB05
c=P['pb_05_sourcing_and_deadstock']['case_study']
lai_ao=299*(1-0.45)-125; lai=lai_ao*550/1000; close(lai_ao,39.45,0.01); close(lai,21.7,0.01); close(450*125/1000-36,20.25,0.001)
c['breakdown']=[
 'Tháng đầu vào mùa lạnh bán chạy được 550 cái giá 299k. Sau phí sàn, ship, Ads (khoảng 45% giá bán), mỗi áo còn lãi khoảng 39.500đ → 550 cái lãi khoảng 21,7 triệu.',
 'Sang tháng thứ 2 thời tiết ấm lên, 450 cái còn lại (chủ yếu size S và XXL) đứng im trong kho suốt 95 ngày. 45% lô hàng thành hàng tồn chết, và lúc này toàn bộ tồn kho của mã đều là hàng chết.',
 'Buộc phải thanh lý 450 cái giá 80k/áo (thu về 36 triệu so với 56,25 triệu vốn, lỗ 20,25 triệu).']
c['result']='Khoản lỗ thanh lý 20,25 triệu nuốt gần sạch 21,7 triệu lãi của 550 cái bán đầu mùa: cả lô 125 triệu vốn chỉ còn lãi khoảng 1,5 triệu sau gần 4 tháng.'

# PB06
gio=8*30; cp_gio=120/gio; close(cp_gio,0.5); close(1.8/cp_gio,3.6)
assert 800-280-264-80-120-22-52==-18; close(135*90/1000,12.15); close(135*0.02,2.7)
c=P['pb_06_livestream_and_koc']['case_study']
c['context']='Chị Mai mở phòng Live 8 tiếng/ngày (240 giờ/tháng) và gửi 200 set mỹ phẩm (giá vốn 90k/set) cho KOC làm clip gắn giỏ hàng. Cuối tháng tổng doanh thu đạt 800 triệu.'
c['breakdown']=[
 'Gửi 200 mẫu tốn 18 triệu tiền hàng + 4 triệu ship (20k/mẫu). Chỉ 65 KOC trả clip (Tỷ lệ trả clip = 32,5%), 135 mẫu mất hút = 12,15 triệu vốn + 2,7 triệu ship đổ sông.',
 'Hoa hồng KOC trung bình 18% + phí sàn & Freeship Xtra 15% = mất đứt 33% doanh thu (264 triệu).',
 'Phiên Live chỉ đạt trung bình 1,8 triệu/giờ, trong khi host + trợ live + Ads mồi phiên hết 120 triệu/tháng = 500k/giờ: doanh thu mỗi giờ chỉ gấp 3,6 lần chi phí, dưới mốc 5 lần.',
 'Chạy thêm Ads đẩy clip KOC: 52 triệu.']
c['result']='Doanh thu 800 triệu, trừ giá vốn 35% (280 triệu), phí sàn + hoa hồng 33% (264 triệu), hoàn hàng 10% (80 triệu), phòng Live 120 triệu, gửi mẫu 22 triệu và Ads đẩy clip 52 triệu: tháng đó chị Mai lỗ ròng 18 triệu.'

# PB07
close(95*2.4/1.47,155.1,0.1); close(12000/155*30/1000,2.32,0.01); close(350/155,2.26,0.01); close(620/165,3.76,0.01); assert 620>=3*165
c=P['pb_07_ads_scaling']['case_study']
c['breakdown']=[
 'Tuần 1 chạy 3 triệu/ngày: CTR = 2,4%, CPA = 95k/đơn (lãi 30k/đơn so với mức CPA tối đa 125k).',
 'Tuần 2 tăng lên 12 triệu/ngày: tệp khách lặp lại khiến CTR tụt xuống 1,47% (CPM và tỷ lệ chốt giữ nguyên), CPA đội lên 155k/đơn (ROAS tụt về 2,26). Khoảng 77 đơn/ngày, mỗi đơn lỗ 30k: lỗ khoảng 2,3 triệu/ngày.',
 'Cách xử lý: Đẩy gói Combo 3 hộp giá 890k (tặng kèm 1 hộp nhỏ) trên trang đích.']
c['result']='AOV nhảy từ 350k lên 620k. Dù CPA vẫn ở mức 165k/đơn, ROAS lập tức vọt lên 3,76, vượt xa mốc hòa vốn 2,8 (giả định biên lãi gói Combo tương đương hộp lẻ) và AOV đã gấp hơn 3 lần CPA.'

# PB08
lan2=110-30-2; close(110+0.34*lan2+0.15*lan2,148.2,0.05)
c=P['pb_08_retention_clv']['case_study']
c['result']='Tổng lãi gộp thu về sau 90 ngày đạt khoảng 148k/khách (đã trừ voucher 30k và 2.000đ tin nhắn cho mỗi đơn quay lại), so với chi phí kéo khách 105k. Shop tự tin vít Ads mạnh hơn hẳn đối thủ.'

# PB10
close(810*1.2,972,0.001); close(972/18,54,0.001); assert 48-15==33
c=P['pb_10_team_vs_automation']['case_study']
c['result']='Hoãn tuyển 4 người, chi 15 triệu/tháng dùng chatbot trả lời tự động, template dựng video và tool đồng bộ đơn hàng. Đội cũ xử lý được nhiều việc hơn, lãi gộp tăng 20% lên 972 triệu với đúng 18 người, tức 54 triệu/người. So với phương án tuyển 4 người, tiết kiệm 33 triệu/tháng định phí.'

# Chỉ số
m=M['vn_ops_picking_error']; m['formula_readable']=m['formula_readable'].replace('sai size, đúng màu','sai size, sai màu'); assert 'sai màu' in m['formula_readable']
m=M['vn_fin_promo_cost_ratio']
m['formula_readable']='(Giá vốn hàng tặng kèm + Giá trị voucher shop tự tung ra) / Doanh thu hiển thị (trước voucher) × 100%'
m['formula_derived']='((Free_Gift_COGS + Shop_Vouchers) / Gross_Sales) * 100'
d['version']=d['version']+'_r1'
json.dump(d,open(p,'w'),ensure_ascii=False,indent=2); open(p,'a').write('\n')
print('Đã sửa Playbook 01, 02, 03, 05, 06, 07, 08, 10 và 2 công thức chỉ số')
