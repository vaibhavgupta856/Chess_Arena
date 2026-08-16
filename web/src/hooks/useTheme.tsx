import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  BOARD_THEMES,
  getStoredThemeId,
  getThemeById,
  setStoredThemeId,
  type BoardTheme,
} from '../lib/themes'

type ThemeContextValue = {
  theme: BoardTheme
  themeId: string
  setThemeId: (id: string, opts?: { persist?: boolean }) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(getStoredThemeId)

  const setThemeId = useCallback((id: string, opts?: { persist?: boolean }) => {
    if (opts?.persist !== false) setStoredThemeId(id)
    setThemeIdState(id)
  }, [])

  const value = useMemo(
    () => ({
      theme: getThemeById(themeId),
      themeId,
      setThemeId,
    }),
    [themeId, setThemeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export { BOARD_THEMES }
