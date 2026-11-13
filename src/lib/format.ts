const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "3 hours ago", "yesterday". Returns undefined for a missing or invalid date. */
export function formatRelative(iso: string | undefined, now: Date = new Date()) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  if (Math.abs(seconds) < 45) return 'just now'
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(Math.round(seconds / 60), 'minute')
}

/** "13 Nov 2026, 15:04" */
export function formatExact(iso: string | undefined) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export const formatNumber = (n: number) => new Intl.NumberFormat('en').format(n)

/** Only http(s) URLs are ever linked. Blocks javascript: and data: URLs. */
export function safeHttpUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

/** "https://www.example.com/about/" -> "example.com/about". Falls back to the raw text if it is not a URL. */
export function shortUrl(value: string | undefined): string {
  const url = safeHttpUrl(value)
  if (!url) return value ?? ''
  const host = url.hostname.replace(/^www\./, '')
  const path = url.pathname.replace(/\/+$/, '')
  return `${host}${path}`
}
