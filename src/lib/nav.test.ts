import { loginUrl, safeNext } from './nav'

describe('safeNext', () => {
  it('keeps normal local paths, including query strings', () => {
    expect(safeNext('/companies')).toBe('/companies')
    expect(safeNext('/companies?country=AE&page=2')).toBe('/companies?country=AE&page=2')
  })

  it('falls back for anything that could leave the site or loop', () => {
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'companies',
      '/login',
      '/login?next=/x',
      '',
      null,
      undefined,
    ]) {
      expect(safeNext(bad as string | null | undefined), String(bad)).toBe('/')
    }
  })

  it('uses a custom fallback', () => {
    expect(safeNext('//x', '/home')).toBe('/home')
  })
})

describe('loginUrl', () => {
  it('remembers where the person was', () => {
    expect(loginUrl('/companies?x=1')).toBe('/login?next=%2Fcompanies%3Fx%3D1')
    expect(loginUrl('/')).toBe('/login')
  })
})
