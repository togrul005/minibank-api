import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export const themes = [
  { id: 'light', label: 'Light' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'organic', label: 'Organic' },
  { id: 'retro', label: 'Retro' },
  { id: 'swiss', label: 'Swiss' },
] as const

export type ThemeId = (typeof themes)[number]['id']

const STORAGE_KEY = 'minibank.theme'
const DEFAULT_THEME: ThemeId = 'light'

function isTheme(v: unknown): v is ThemeId {
  return themes.some((t) => t.id === v)
}

/** ?theme=retro in the URL wins (handy for sharing a look), then the saved choice, then the default. */
function initialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const fromUrl = new URLSearchParams(window.location.search).get('theme')
  if (isTheme(fromUrl)) return fromUrl
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isTheme(saved)) return saved
  } catch {
    // storage blocked: fall back to default
  }
  return DEFAULT_THEME
}

const ThemeContext = createContext<{ theme: ThemeId; setTheme: (t: ThemeId) => void }>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
    try {
      window.localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // ignore
    }
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
