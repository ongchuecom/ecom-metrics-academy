// Gộp 7 file dữ liệu theo khâu thành một mảng metricsMaster duy nhất (SPEC V2).
import product from './stages/01_product.json'
import traffic from './stages/02_traffic.json'
import sales from './stages/03_sales.json'
import fulfillment from './stages/04_fulfillment.json'
import retention from './stages/05_retention.json'
import finance from './stages/06_finance.json'
import team from './stages/07_team.json'

export const STAGES = [
  { id: '01_product_rd', short: 'Sản phẩm', label: 'Sản phẩm & R&D' },
  { id: '02_traffic_acquisition', short: 'Traffic', label: 'Thu hút traffic' },
  { id: '03_conversion_sales', short: 'Chuyển đổi', label: 'Chuyển đổi & bán hàng' },
  { id: '04_fulfillment_supply', short: 'Kho vận', label: 'Kho vận & chuỗi cung ứng' },
  { id: '05_retention_lifecycle', short: 'Giữ chân', label: 'Giữ chân & vòng đời khách' },
  { id: '06_finance_unit_econ', short: 'Tài chính', label: 'Tài chính & unit economics' },
  { id: '07_team_operations', short: 'Đội ngũ', label: 'Đội ngũ & vận hành' },
]

export const metricsMaster = [...product, ...traffic, ...sales, ...fulfillment, ...retention, ...finance, ...team]
export const metricById = Object.fromEntries(metricsMaster.map((m) => [m.metric_id, m]))
export const stageById = Object.fromEntries(STAGES.map((s) => [s.id, s]))
export const DEFAULT_METRIC_ID = 'fin_roas'

export const BENCHMARK_LABELS = {
  tiktok_vn: 'TikTok Shop VN',
  meta_vn: 'Meta Ads VN',
  d2c_us: 'D2C Mỹ',
  tham_khao: 'Mốc tham khảo',
}
