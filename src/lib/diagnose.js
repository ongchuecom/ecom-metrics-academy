import { safeDiv, contributionMarginPct, breakevenRoas, cac, clv, roas, pct, num, vnd } from './calc.js'

// Chẩn đoán "bệnh án tài chính" từ số liệu một tháng.
// Mỗi kết luận có: mức độ (nang | canh-bao | tot), triệu chứng, chẩn đoán, đơn thuốc.
export function diagnose(d) {
  const revenue = d.revenue
  const orders = d.orders
  const aovValue = safeDiv(revenue, orders)
  const cogsPct = safeDiv(d.cogs, revenue)
  const variablePct = safeDiv(d.variableCost, revenue)
  const margin = contributionMarginPct(cogsPct, variablePct)
  const beRoas = breakevenRoas(margin)
  const roasValue = roas(d.adRevenue, d.adSpend)
  const cacValue = cac(d.adSpend, d.newCustomers)
  const clvValue = clv(aovValue, d.lifetimeOrders, margin)
  const ltvCac = safeDiv(clvValue, cacValue)
  const net = revenue - d.cogs - d.variableCost - d.adSpend - d.fixedCost
  const netPct = safeDiv(net, revenue)
  const fixedPct = safeDiv(d.fixedCost, revenue)
  const adPct = safeDiv(d.adSpend, revenue)
  const returningShare = safeDiv(orders - d.newCustomers, orders)

  const findings = []
  const add = (level, title, symptom, cause, cure) => findings.push({ level, title, symptom, cause, cure })

  if (margin <= 0) {
    add('nang', 'Bán đơn nào lỗ đơn đó', `Giá vốn + chi phí biến đổi chiếm ${pct(cogsPct + variablePct)} doanh thu.`,
      'Chưa tính quảng cáo đã âm. Mọi đơn hàng đều làm mất tiền.', 'Tăng giá, đổi nhà cung cấp, rà lại phí sàn và vận chuyển trước khi chạy thêm bất kỳ đồng quảng cáo nào.')
  } else if (margin < 0.25) {
    add('canh-bao', 'Biên đóng góp mỏng', `Biên đóng góp (trước quảng cáo) chỉ ${pct(margin)}.`,
      `ROAS hòa vốn lên tới ${num(beRoas)}, quảng cáo rất khó có lãi.`, 'Ưu tiên tăng biên: combo nâng AOV, đàm phán giá vốn, giảm phí vận chuyển và hoàn hàng.')
  } else {
    add('tot', 'Biên đóng góp ổn', `Biên đóng góp ${pct(margin)}, ROAS hòa vốn ${num(beRoas)}.`, 'Có dư địa để chi cho tăng trưởng.', 'Giữ kỷ luật giá vốn khi mở rộng sản phẩm.')
  }

  if (d.adSpend > 0) {
    if (roasValue < beRoas) {
      add('nang', 'Quảng cáo đang đốt tiền', `ROAS ${num(roasValue)} thấp hơn ROAS hòa vốn ${num(beRoas)}.`,
        'Mỗi đồng quảng cáo mang về ít hơn mức cần để hòa vốn trên đơn đầu tiên.', 'Tắt nhóm quảng cáo lỗ, tập trung sản phẩm biên tốt; chỉ chấp nhận lỗ đơn đầu nếu chắc chắn khách mua lại (xem CLV/CAC).')
    } else if (roasValue < beRoas * 1.3) {
      add('canh-bao', 'Quảng cáo sát ngưỡng hòa vốn', `ROAS ${num(roasValue)}, hòa vốn ${num(beRoas)}.`, 'Lãi trên đơn quảng cáo rất mỏng, một biến động nhỏ là lỗ.', 'Thử nghiệm creative, landing page để tăng tỉ lệ chuyển đổi.')
    } else {
      add('tot', 'Quảng cáo có lãi', `ROAS ${num(roasValue)} cao hơn hòa vốn ${num(beRoas)}.`, 'Đơn đầu tiên đã có lãi.', 'Tăng ngân sách từ từ và theo dõi ROAS biên khi scale.')
    }
  }

  if (d.newCustomers > 0 && d.adSpend > 0) {
    if (ltvCac < 1) {
      add('nang', 'Mua khách đắt hơn giá trị khách', `CLV ${vnd(clvValue)} < CAC ${vnd(cacValue)} (tỉ lệ ${num(ltvCac)}).`,
        'Kể cả khi khách mua lại đủ vòng đời, bạn vẫn lỗ trên từng khách.', 'Giảm CAC hoặc tăng số lần mua lại; xem lại kênh quảng cáo và tệp khách.')
    } else if (ltvCac < 3) {
      add('canh-bao', 'CLV/CAC chưa đủ an toàn', `CLV/CAC = ${num(ltvCac)} (mốc tham khảo: 3).`, 'Có lãi trên vòng đời nhưng mỏng, tiền về chậm.', 'Đẩy mua lại: chăm sóc sau mua, gói định kỳ, ưu đãi lần 2.')
    } else {
      add('tot', 'CLV/CAC lành mạnh', `CLV/CAC = ${num(ltvCac)}.`, 'Mỗi khách mới mang lại nhiều hơn chi phí có được họ.', 'Có thể cân nhắc tăng chi tìm khách mới.')
    }
  }

  if (fixedPct > 0.3) {
    add('canh-bao', 'Bộ máy nặng so với doanh thu', `Chi phí cố định chiếm ${pct(fixedPct)} doanh thu.`, 'Doanh thu chưa đủ gánh bộ máy.', 'Rà từng khoản cố định; chỉ giữ khoản tạo ra doanh thu hoặc bảo vệ nền móng (pháp lý, kế toán).')
  }
  if (adPct > 0.35) {
    add('canh-bao', 'Phụ thuộc quảng cáo', `Quảng cáo chiếm ${pct(adPct)} doanh thu.`, 'Tăng trưởng đang mua bằng tiền, dễ gãy khi giá quảng cáo tăng.', 'Xây kênh tự nhiên và khách quay lại.')
  }
  if (orders > 0 && returningShare < 0.2) {
    add('canh-bao', 'Ít khách quay lại', `Khách cũ chỉ chiếm ${pct(returningShare)} số đơn.`, 'Gần như mọi đơn đều phải trả tiền để có.', 'Đầu tư chăm sóc sau mua; đo tỉ lệ mua lại sau 30, 60, 90 ngày.')
  }

  if (net < 0) {
    add('nang', 'Kết quả: lỗ ròng', `Lỗ ${vnd(-net)} (biên ròng ${pct(netPct)}).`, 'Tổng các tầng chi phí lớn hơn doanh thu.', 'Chữa các mục "nặng" ở trên trước, theo thứ tự: biên → quảng cáo → bộ máy.')
  } else {
    add(netPct < 0.05 ? 'canh-bao' : 'tot', netPct < 0.05 ? 'Kết quả: lãi mỏng' : 'Kết quả: có lãi', `Lãi ${vnd(net)} (biên ròng ${pct(netPct)}).`,
      netPct < 0.05 ? 'Có lãi nhưng mỏng, dễ âm khi có biến động.' : 'Doanh nghiệp đang tạo ra lợi nhuận.', 'Theo dõi hàng tháng; giữ dự phòng tiền mặt.')
  }

  const order = { nang: 0, 'canh-bao': 1, tot: 2 }
  findings.sort((a, b) => order[a.level] - order[b.level])
  const score = findings.reduce((s, f) => s + (f.level === 'nang' ? 0 : f.level === 'canh-bao' ? 1 : 2), 0) / (findings.length * 2)

  return {
    findings,
    score,
    metrics: { aov: aovValue, margin, beRoas, roas: roasValue, cac: cacValue, clv: clvValue, ltvCac, net, netPct, fixedPct, adPct, returningShare },
  }
}
