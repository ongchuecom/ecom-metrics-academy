// Bộ tính biểu thức an toàn cho simulator.outputs[].formula_eval (không dùng eval/new Function).
// Hỗ trợ: số, biến (key của controls hoặc output đứng trước), + - * / %, ngoặc, dấu âm, min/max/abs/round/pow/sqrt.
const FUNCS = { min: Math.min, max: Math.max, abs: Math.abs, round: Math.round, pow: Math.pow, sqrt: Math.sqrt }
const cache = new Map()

function tokenize(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9._eE]/.test(src[j])) {
        if ((src[j] === 'e' || src[j] === 'E') && /[+-]/.test(src[j + 1])) j++
        j++
      }
      out.push({ t: 'num', v: Number(src.slice(i, j).replace(/_/g, '')) })
      i = j
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      out.push({ t: 'id', v: src.slice(i, j) })
      i = j
    } else if ('+-*/%(),'.includes(c)) {
      out.push({ t: c }); i++
    } else throw new Error(`Ký tự không hợp lệ "${c}" trong công thức`)
  }
  return out
}

// Parser đệ quy -> cây AST
function parse(src) {
  const tk = tokenize(src)
  let p = 0
  const peek = () => tk[p]
  const eat = (t) => { if (tk[p]?.t !== t) throw new Error(`Thiếu "${t}" trong công thức: ${src}`); return tk[p++] }
  function expr() {
    let n = term()
    while (peek() && (peek().t === '+' || peek().t === '-')) { const op = tk[p++].t; n = { op, a: n, b: term() } }
    return n
  }
  function term() {
    let n = unary()
    while (peek() && '*/%'.includes(peek().t)) { const op = tk[p++].t; n = { op, a: n, b: unary() } }
    return n
  }
  function unary() {
    if (peek()?.t === '-') { p++; return { op: 'neg', a: unary() } }
    if (peek()?.t === '+') { p++; return unary() }
    return atom()
  }
  function atom() {
    const x = tk[p++]
    if (!x) throw new Error(`Công thức kết thúc đột ngột: ${src}`)
    if (x.t === 'num') return { num: x.v }
    if (x.t === '(') { const n = expr(); eat(')'); return n }
    if (x.t === 'id') {
      if (peek()?.t === '(') {
        if (!FUNCS[x.v]) throw new Error(`Hàm không hỗ trợ: ${x.v}`)
        p++
        const args = []
        if (peek()?.t !== ')') { args.push(expr()); while (peek()?.t === ',') { p++; args.push(expr()) } }
        eat(')')
        return { fn: x.v, args }
      }
      return { id: x.v }
    }
    throw new Error(`Không hiểu "${x.t}" trong công thức: ${src}`)
  }
  const tree = expr()
  if (p < tk.length) throw new Error(`Thừa ký tự trong công thức: ${src}`)
  return tree
}

function run(n, vars) {
  if ('num' in n) return n.num
  if ('id' in n) {
    if (!(n.id in vars)) throw new Error(`Biến chưa định nghĩa: ${n.id}`)
    return vars[n.id]
  }
  if (n.fn) return FUNCS[n.fn](...n.args.map((a) => run(a, vars)))
  if (n.op === 'neg') return -run(n.a, vars)
  const a = run(n.a, vars), b = run(n.b, vars)
  switch (n.op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return a / b
    case '%': return a % b
  }
  throw new Error('Toán tử lạ')
}

export function evaluate(src, vars) {
  let tree = cache.get(src)
  if (!tree) { tree = parse(src); cache.set(src, tree) }
  return run(tree, vars)
}

// Tính tất cả outputs theo thứ tự; output sau dùng được kết quả output trước.
export function evaluateOutputs(outputs, controlValues) {
  const vars = { ...controlValues }
  const res = {}
  for (const o of outputs) {
    let v
    try { v = evaluate(o.formula_eval, vars) } catch { v = NaN }
    res[o.key] = v
    vars[o.key] = v
  }
  return res
}

// "> 8000", "<= 0", "< 3" -> true nếu giá trị vượt ngưỡng cảnh báo
export function isWarning(value, threshold) {
  if (!threshold || !Number.isFinite(value)) return !Number.isFinite(value) && !!threshold
  const m = String(threshold).trim().match(/^(>=|<=|>|<|==)\s*(-?[\d.,_]+)$/)
  if (!m) return false
  const t = Number(m[2].replace(/[,_]/g, ''))
  switch (m[1]) {
    case '>': return value > t
    case '<': return value < t
    case '>=': return value >= t
    case '<=': return value <= t
    case '==': return value === t
  }
  return false
}

// Định dạng số theo đơn vị của control/output
export function formatUnit(value, unit) {
  if (!Number.isFinite(value)) return '—'
  const nf = (d) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(value)
  switch (unit) {
    case 'VND': {
      const a = Math.abs(value)
      if (a >= 1e9) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value / 1e9) + ' tỷ'
      if (a >= 1e7) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1e6) + ' tr'
      return nf(0) + 'đ'
    }
    case '%': return nf(2) + '%'
    case 'x': return nf(2) + 'x'
    default: return nf(Math.abs(value) < 100 ? 2 : 0) + (unit ? ' ' + unit : '')
  }
}
