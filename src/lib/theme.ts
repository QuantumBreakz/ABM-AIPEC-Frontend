export type Theme = 'light' | 'dark' | 'system'

const KEY = 'theme'

export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // storage blocked (private window): fall back to the system setting
  }
  return 'system'
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // not saved, but the theme still applies for this visit
  }
}

export function isDark(theme: Theme) {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** Switch the whole app between light and dark by toggling a class and color-scheme on <html>. */
export function applyTheme(theme: Theme) {
  const dark = isDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}
