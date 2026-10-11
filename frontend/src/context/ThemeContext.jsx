import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

export const CLE_THEME = 'fce-theme'
const VALEURS = ['light', 'dark', 'system']

function themeSysteme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function themeEnregistre() {
  if (typeof window === 'undefined') return 'system'
  const valeur = window.localStorage.getItem(CLE_THEME)
  return VALEURS.includes(valeur) ? valeur : 'system'
}

function appliquer(theme) {
  const resolu = theme === 'system' ? themeSysteme() : theme
  const racine = document.documentElement
  racine.classList.toggle('dark', resolu === 'dark')
  racine.style.colorScheme = resolu
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(themeEnregistre)

  useEffect(() => {
    appliquer(theme)
    window.localStorage.setItem(CLE_THEME, theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const surChangement = () => appliquer('system')
    media.addEventListener('change', surChangement)
    return () => media.removeEventListener('change', surChangement)
  }, [theme])

  const changerTheme = useCallback((valeur) => {
    if (VALEURS.includes(valeur)) setTheme(valeur)
  }, [])

  const themeResolu = theme === 'system' ? themeSysteme() : theme

  const valeur = useMemo(
    () => ({ theme, themeResolu, changerTheme }),
    [theme, themeResolu, changerTheme]
  )

  return <ThemeContext.Provider value={valeur}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const contexte = useContext(ThemeContext)
  if (!contexte) {
    throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  }
  return contexte
}
