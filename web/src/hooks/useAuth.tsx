import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AUTH_RESET_EVENT,
  apiFetch,
  getAuthToken,
  getTabAuthLabel,
  initTabAuthIsolation,
  setAuthToken,
} from '../lib/api'
import type { UserProfile } from '../types'

type AuthResponse = {
  token: string
  user: UserProfile
}

type AuthContextValue = {
  user: UserProfile | null
  loading: boolean
  tabLabel: string
  register: (username: string, password: string, displayName?: string) => Promise<UserProfile>
  login: (username: string, password: string) => Promise<UserProfile>
  logout: () => void
  updateProfile: (displayName: string, avatarUrl?: string) => Promise<UserProfile>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tabLabel, setTabLabel] = useState('')

  const refresh = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await apiFetch('/users/me')
      if (!res.ok) {
        setAuthToken(null)
        setUser(null)
        return
      }
      setUser((await res.json()) as UserProfile)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initTabAuthIsolation()
    setTabLabel(getTabAuthLabel())
    void refresh()

    const onReset = () => {
      setUser(null)
      setTabLabel(getTabAuthLabel())
      setLoading(false)
    }
    window.addEventListener(AUTH_RESET_EVENT, onReset)
    return () => window.removeEventListener(AUTH_RESET_EVENT, onReset)
  }, [refresh])

  const register = useCallback(async (username: string, password: string, displayName?: string) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName: displayName || username }),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = (await res.json()) as AuthResponse
    setAuthToken(data.token)
    setUser(data.user)
    setTabLabel(getTabAuthLabel())
    return data.user
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = (await res.json()) as AuthResponse
    setAuthToken(data.token)
    setUser(data.user)
    setTabLabel(getTabAuthLabel())
    return data.user
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (displayName: string, avatarUrl?: string) => {
    const res = await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName, avatarUrl: avatarUrl ?? '' }),
    })
    if (!res.ok) throw new Error(await res.text())
    const updated = (await res.json()) as UserProfile
    setUser(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ user, loading, tabLabel, register, login, logout, updateProfile, refresh }),
    [user, loading, tabLabel, register, login, logout, updateProfile, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
