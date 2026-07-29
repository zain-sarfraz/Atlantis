import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  setToken as setAdminToken,
  setRefreshToken as setAdminRefreshToken,
  clearToken as clearAdminToken,
  authApi,
  type AdminUser,
} from '@admin/api/client'

export interface GuestUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

export type AuthRole = 'guest' | 'admin' | null

interface AuthState {
  role: AuthRole
  user: GuestUser | null
  admin: AdminUser | null
  token: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  /** Returns 'admin' | 'guest' on success */
  login: (email: string, password: string) => Promise<'admin' | 'guest'>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

const GUEST_TOKEN_KEY = 'serrano_guest_token'
const GUEST_USER_KEY = 'serrano_guest_user'
const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function apiPostRaw(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({ error: 'Request failed' }))) as Record<string, unknown>
  return { ok: res.ok, status: res.status, data }
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const { ok, data } = await apiPostRaw(path, body)
  if (!ok) throw new Error(String(data.error ?? 'Request failed'))
  return data as T
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    role: null,
    user: null,
    admin: null,
    token: null,
    loading: true,
  })

  useEffect(() => {
    const adminToken = localStorage.getItem('serrano_admin_token')
    const guestToken = localStorage.getItem(GUEST_TOKEN_KEY)
    const guestRaw = localStorage.getItem(GUEST_USER_KEY)

    if (adminToken) {
      authApi
        .me()
        .then((admin) => {
          setState({
            role: 'admin',
            admin,
            user: null,
            token: adminToken,
            loading: false,
          })
        })
        .catch(() => {
          clearAdminToken()
          setState({ role: null, user: null, admin: null, token: null, loading: false })
        })
      return
    }

    if (guestToken && guestRaw) {
      try {
        const user = JSON.parse(guestRaw) as GuestUser
        setState({ role: 'guest', user, admin: null, token: guestToken, loading: false })
        return
      } catch {
        /* fall through */
      }
    }

    setState((s) => ({ ...s, loading: false }))
  }, [])

  const login = async (email: string, password: string): Promise<'admin' | 'guest'> => {
    // 1) Try admin credentials first
    const adminRes = await apiPostRaw('/admin/auth/login', { email, password })

    if (adminRes.status === 429) {
      throw new Error(String(adminRes.data.error ?? 'Too many login attempts. Please wait and try again.'))
    }

    if (adminRes.ok) {
      const data = adminRes.data as unknown as {
        accessToken: string
        refreshToken: string
        admin: AdminUser
      }
      clearGuest()
      setAdminToken(data.accessToken)
      setAdminRefreshToken(data.refreshToken)
      setState({
        role: 'admin',
        admin: data.admin,
        user: null,
        token: data.accessToken,
        loading: false,
      })
      return 'admin'
    }

    // 2) Guest / customer (only if admin auth failed with 401)
    const guestRes = await apiPostRaw('/auth/login', { email, password })
    if (!guestRes.ok) {
      throw new Error(String(guestRes.data.error ?? 'Invalid email or password.'))
    }

    const { token, user } = guestRes.data as unknown as { token: string; user: GuestUser }
    clearAdminToken()
    localStorage.setItem(GUEST_TOKEN_KEY, token)
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(user))
    setState({ role: 'guest', user, admin: null, token, loading: false })
    return 'guest'
  }

  const register = async (data: RegisterData) => {
    const { token, user } = await apiPost<{ token: string; user: GuestUser }>('/auth/register', data)
    clearAdminToken()
    localStorage.setItem(GUEST_TOKEN_KEY, token)
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(user))
    setState({ role: 'guest', user, admin: null, token, loading: false })
  }

  function clearGuest() {
    localStorage.removeItem(GUEST_TOKEN_KEY)
    localStorage.removeItem(GUEST_USER_KEY)
  }

  const logout = () => {
    clearGuest()
    clearAdminToken()
    setState({ role: null, user: null, admin: null, token: null, loading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
