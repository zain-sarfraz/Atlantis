import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, setToken, setRefreshToken, clearToken, type AdminUser } from '../api/client'

interface AuthContext {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('serrano_admin_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then(setAdmin)
      .catch(() => {
        clearToken()
        setAdmin(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    setToken(res.accessToken)
    setRefreshToken(res.refreshToken)
    setAdmin(res.admin)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAdmin(null)
  }, [])

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
