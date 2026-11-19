// Đăng nhập Gmail / Facebook qua Firebase Authentication.
// SDK chỉ được tải khi người dùng bấm đăng nhập, hoặc khi máy này đã từng đăng nhập (để khôi phục phiên) — trang vẫn nhẹ cho người không đăng nhập.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import site from '../data/site.json'

const CFG = site.auth?.firebase || {}
export const authEnabled = !!CFG.apiKey
export const PROVIDERS = (site.auth?.providers || []).filter((p) => ['google', 'facebook'].includes(p))
const FLAG = 'ema-auth'
const flag = { get: () => { try { return localStorage.getItem(FLAG) === '1' } catch { return false } }, set: (v) => { try { v ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG) } catch { /* bỏ qua */ } } }

let sdk = null
async function load() {
  if (sdk) return sdk
  const [{ initializeApp }, a] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = initializeApp(CFG)
  const auth = a.getAuth(app)
  auth.languageCode = 'vi'
  sdk = { auth, a }
  return sdk
}

// Trình duyệt nhúng trong Zalo, Facebook, Messenger, TikTok… thường bị Google chặn đăng nhập
export const inAppBrowser = () => typeof navigator !== 'undefined' && /FBAN|FBAV|FB_IAB|Instagram|Zalo|Line\/|TikTok|musical_ly|Messenger/i.test(navigator.userAgent)

const Ctx = createContext({ user: null, ready: true, signIn: async () => {}, signOut: async () => {}, getToken: async () => null, login: null, openLogin: () => {}, closeLogin: () => {} })
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!authEnabled || !flag.get())
  const [login, setLogin] = useState(null) // { reason } khi hộp đăng nhập đang mở
  const openLogin = useCallback((reason) => setLogin({ reason }), [])
  const closeLogin = useCallback(() => setLogin(null), [])

  const watch = useCallback(async () => {
    const { auth, a } = await load()
    return a.onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, name: u.displayName || '', photo: u.photoURL || '', provider: u.providerData[0]?.providerId || '' } : null)
      flag.set(!!u)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!authEnabled || !flag.get()) return
    let off; watch().then((f) => { off = f }).catch(() => setReady(true))
    return () => off?.()
  }, [watch])

  const signIn = useCallback(async (which) => {
    const { auth, a } = await load()
    const provider = which === 'facebook' ? new a.FacebookAuthProvider() : new a.GoogleAuthProvider()
    if (which === 'google') provider.setCustomParameters({ prompt: 'select_account' })
    const cred = await a.signInWithPopup(auth, provider)
    flag.set(true)
    watch()
    return cred.user
  }, [watch])

  const signOut = useCallback(async () => {
    if (!sdk) return
    await sdk.a.signOut(sdk.auth)
    flag.set(false); setUser(null)
  }, [])

  const getToken = useCallback(async () => (sdk?.auth.currentUser ? sdk.auth.currentUser.getIdToken() : null), [])

  return <Ctx.Provider value={{ user, ready, signIn, signOut, getToken, login, openLogin, closeLogin }}>{children}</Ctx.Provider>
}

// Lỗi Firebase → câu dễ hiểu
export function authError(e) {
  const c = e?.code || ''
  if (c.includes('popup-closed') || c.includes('cancelled-popup')) return ''
  if (c.includes('popup-blocked')) return 'Trình duyệt chặn cửa sổ đăng nhập. Cho phép cửa sổ bật lên rồi thử lại.'
  if (c.includes('account-exists-with-different-credential')) return 'Email này đã đăng nhập bằng cách khác trước đó. Thử đăng nhập bằng Google hoặc Facebook còn lại.'
  if (c.includes('unauthorized-domain')) return 'Tên miền này chưa được cho phép đăng nhập. Báo quản trị viên thêm vào Firebase.'
  if (c.includes('network')) return 'Mạng đang chập chờn, thử lại giúp.'
  return 'Chưa đăng nhập được, thử lại sau ít phút.'
}
