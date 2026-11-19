import { useEffect, useRef, useState } from 'react'
import { useAuth, authEnabled, authError, inAppBrowser, PROVIDERS } from '../lib/auth.jsx'
import { href } from '../lib/route.js'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
  </svg>
)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#1877F2]" aria-hidden="true"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12" /></svg>
)

export function Avatar({ user, size = 32 }) {
  const st = { width: size, height: size }
  if (user.photo) return <img src={user.photo} alt="" referrerPolicy="no-referrer" style={st} className="shrink-0 rounded-full object-cover ring-2 ring-white" />
  return <span style={st} className="flex shrink-0 items-center justify-center rounded-full bg-white font-display text-sm font-black text-brand-600">{(user.name || '?').trim().charAt(0).toUpperCase()}</span>
}

export function LoginDialog() {
  const { signIn, login, closeLogin: onClose } = useAuth()
  const open = !!login, reason = login?.reason
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const ref = useRef(null)
  useEffect(() => { if (open) { setErr(''); setBusy(''); ref.current?.focus() } }, [open])
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open || !authEnabled) return null

  const go = async (which) => {
    setErr(''); setBusy(which)
    try { await signIn(which); onClose() } catch (e) { setErr(authError(e)) } finally { setBusy('') }
  }
  const btn = 'flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-ink ring-1 ring-stone-300 transition hover:ring-brand-500 disabled:opacity-60'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="login-h">
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label="Đóng" tabIndex={-1} />
      <div ref={ref} tabIndex={-1} className="fade-up relative w-full max-w-sm rounded-t-3xl bg-white p-6 outline-none sm:rounded-3xl">
        <h2 id="login-h" className="font-display text-xl font-black text-ink">Đăng nhập</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{reason || 'Để lưu điểm trắc nghiệm trên mọi thiết bị và lên bảng xếp hạng bằng tên thật.'}</p>
        {inAppBrowser() && (
          <p className="mt-3 rounded-xl bg-lemon/60 px-3 py-2 text-xs leading-relaxed text-navy-ink">
            Anh/chị đang mở trong Zalo hoặc Facebook. Nếu không đăng nhập được, bấm dấu ⋯ ở góc rồi chọn “Mở bằng trình duyệt”.
          </p>
        )}
        <div className="mt-5 space-y-2.5">
          {PROVIDERS.includes('google') && <button className={btn} disabled={!!busy} onClick={() => go('google')}><GoogleIcon />{busy === 'google' ? 'Đang mở…' : 'Tiếp tục với Google'}</button>}
          {PROVIDERS.includes('facebook') && <button className={btn} disabled={!!busy} onClick={() => go('facebook')}><FacebookIcon />{busy === 'facebook' ? 'Đang mở…' : 'Tiếp tục với Facebook'}</button>}
        </div>
        {err && <p className="mt-3 text-sm text-coral" role="alert">{err}</p>}
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Chỉ dùng tên và ảnh đại diện để hiện trên bảng xếp hạng. Không đăng bài, không đọc bạn bè.{' '}
          <a href={href({ type: 'privacy' })} className="underline hover:text-brand-700">Chính sách riêng tư</a>
        </p>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-body">Đóng</button>
      </div>
    </div>
  )
}

// Nút ở thanh bên (variant 'side') hoặc trên thanh trên cùng điện thoại ('icon')
export function AccountButton({ variant = 'side' }) {
  const { user, ready, signOut, openLogin } = useAuth()
  const onLogin = () => openLogin()
  const [menu, setMenu] = useState(false)
  if (!authEnabled) return null
  if (!ready) return <span className={variant === 'icon' ? 'h-9 w-9 rounded-full bg-white/30' : 'block h-9 rounded-xl bg-white/15'} aria-hidden="true" />
  if (!user) return variant === 'icon'
    ? <button onClick={onLogin} aria-label="Đăng nhập" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">
        <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="7" r="3.2" /><path d="M3.8 17c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6" strokeLinecap="round" /></svg>
      </button>
    : <button onClick={onLogin} className="w-full rounded-xl bg-white px-3 py-2 text-left text-sm font-bold text-brand-700 hover:bg-brand-50">Đăng nhập (Google, Facebook)</button>
  return (
    <div className="relative">
      <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Tài khoản"
        className={variant === 'icon' ? 'flex items-center rounded-full' : 'flex w-full items-center gap-2 rounded-xl bg-white/15 px-2 py-1.5 text-left text-sm font-semibold text-white hover:bg-white/25'}>
        <Avatar user={user} size={variant === 'icon' ? 36 : 28} />
        {variant !== 'icon' && <span className="min-w-0 flex-1 truncate">{user.name || 'Tài khoản'}</span>}
      </button>
      {menu && (
        <div className={`absolute z-40 mt-2 w-56 rounded-xl bg-white p-1.5 text-sm shadow-lg ring-1 ring-stone-200 ${variant === 'icon' ? 'right-0' : 'left-0'}`}>
          <p className="truncate px-3 py-2 text-xs text-muted">Đăng nhập bằng {user.provider.includes('facebook') ? 'Facebook' : 'Google'}</p>
          <a href={href({ type: 'leaderboard' })} className="block rounded-lg px-3 py-2 font-semibold text-ink hover:bg-stone-50">Điểm của tôi</a>
          <button onClick={() => { setMenu(false); signOut() }} className="block w-full rounded-lg px-3 py-2 text-left font-semibold text-coral hover:bg-stone-50">Đăng xuất</button>
        </div>
      )}
    </div>
  )
}
