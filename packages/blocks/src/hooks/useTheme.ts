import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeConfig {
  themeColor?: string
  themeColorDark?: string
}

export function useTheme(config: ThemeConfig = {}) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    
    // Remove both classes first
    root.classList.remove('light', 'dark')
    
    // Add the current theme class
    root.classList.add(theme)

    // set PWA theme color if config is provided
    if (config.themeColor && config.themeColorDark) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', 
        theme === 'dark' ? config.themeColorDark : config.themeColor
      )
    }
    
    // Store in localStorage
    localStorage.setItem('theme', theme)
  }, [theme, config.themeColor, config.themeColorDark])

  const toggleTheme = () => {
    setTheme((prev: Theme) => prev === 'light' ? 'dark' : 'light')
  }

  return { theme, toggleTheme }
} 