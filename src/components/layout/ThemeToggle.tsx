import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { applyTheme, isDark, readTheme, saveTheme, type Theme } from '@/lib/theme'
import { Button } from '../ui/button'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const dark = isDark(theme)

  const toggle = () => {
    const next: Theme = dark ? 'light' : 'dark'
    setTheme(next)
    saveTheme(next)
    applyTheme(next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Button>
  )
}
