/**
 * Where to go after signing in. Only local paths are allowed, so a crafted link like
 * /login?next=https://evil.example can never send someone to another site.
 */
export function safeNext(next: string | null | undefined, fallback = '/') {
  if (!next) return fallback
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  if (next === '/login' || next.startsWith('/login?') || next.startsWith('/login/')) return fallback
  return next
}

export function loginUrl(path: string) {
  return path === '/' ? '/login' : `/login?next=${encodeURIComponent(path)}`
}
