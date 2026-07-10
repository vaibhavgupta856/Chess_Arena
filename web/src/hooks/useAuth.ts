import { useCallback, useEffect, useState } from 'react'
import { apiFetch, getAuthToken, setAuthToken } from '../lib/api'
import type { UserProfile } from '../types'

type AuthResponse = {
  token: string
  user: UserProfile
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
    void refresh()
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

  return { user, loading, register, login, logout, updateProfile, refresh }
}
