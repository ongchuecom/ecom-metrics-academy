// Các công thức tính chỉ số. Mọi hàm đều thuần (không trạng thái) để dễ kiểm tra.

export const safeDiv = (a, b) => (b ? a / b : 0)

/** AOV: giá trị trung bình mỗi đơn = Doanh thu / Số đơn */
export const aov = (revenue, orders) => safeDiv(revenue, orders)

/** CAC: chi phí có một khách mới = Chi phí marketing / Số khách mới */
export const cac = (marketingSpend, newCustomers) => safeDiv(marketingSpend, newCustomers)

/** ROAS: doanh thu trên mỗi đồng quảng cáo = Doanh thu từ quảng cáo / Chi phí quảng cáo */
export const roas = (adRevenue, adSpend) => safeDiv(adRevenue, adSpend)

/** Biên đóng góp trước quảng cáo (%) = 1 - giá vốn% - chi phí biến đổi% */
export const contributionMarginPct = (cogsPct, variablePct) => 1 - cogsPct - variablePct

/** ROAS hòa vốn = 1 / biên đóng góp trước quảng cáo */
export const breakevenRoas = (marginPct) => (marginPct > 0 ? 1 / marginPct : Infinity)

/** CLV (theo lợi nhuận gộp) = AOV × số đơn trong vòng đời × biên đóng góp */
export const clv = (aovValue, lifetimeOrders, marginPct) => aovValue * lifetimeOrders * marginPct

/** Mô phỏng một tháng kinh doanh từ các giả định của Simulator */
export function simulate(p) {
  const clicks = safeDiv(p.adSpend, p.cpc)
  const newOrders = clicks * p.conversionRate
  const newCustomers = newOrders
  const totalOrders = newOrders + p.returningOrders
  const revenue = totalOrders * p.aov
  const adRevenue = newOrders * p.aov
  const cogs = revenue * p.cogsPct
  const variable = revenue * p.variablePct
  const grossProfit = revenue - cogs
  const contribution = revenue - cogs - variable
  const netProfit = contribution - p.adSpend - p.fixedCost
  const marginPct = contributionMarginPct(p.cogsPct, p.variablePct)
  const cacValue = cac(p.adSpend, newCustomers)
  const clvValue = clv(p.aov, p.lifetimeOrders, marginPct)
  return {
    clicks,
    newOrders,
    newCustomers,
    totalOrders,
    revenue,
    adRevenue,
    cogs,
    variable,
    grossProfit,
    contribution,
    netProfit,
    netMarginPct: safeDiv(netProfit, revenue),
    marginPct,
    aov: p.aov,
    cac: cacValue,
    roas: roas(adRevenue, p.adSpend),
    breakevenRoas: breakevenRoas(marginPct),
    clv: clvValue,
    ltvCac: safeDiv(clvValue, cacValue),
    profitPerNewOrder: p.aov * marginPct - cacValue,
  }
}

/** Định dạng tiền Việt: 1.250.000 ₫, hoặc rút gọn 1,25 tr / 3,4 tỷ */
export function vnd(n, short = false) {
  if (!Number.isFinite(n)) return '—'
  if (short) {
    const a = Math.abs(n)
    const sign = n < 0 ? '−' : ''
    if (a >= 1e9) return sign + (a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ'
    if (a >= 1e6) return sign + (a / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tr'
    if (a >= 1e3) return sign + (a / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' k'
  }
  return Math.round(n).toLocaleString('vi-VN') + ' ₫'
}

export const pct = (x, digits = 1) =>
  Number.isFinite(x) ? (x * 100).toLocaleString('vi-VN', { maximumFractionDigits: digits }) + '%' : '—'

export const num = (x, digits = 2) =>
  Number.isFinite(x) ? x.toLocaleString('vi-VN', { maximumFractionDigits: digits }) : '—'
