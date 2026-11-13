/// <reference types="node" />
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Guards the colour contrast of both themes. It reads the real tokens from src/index.css and
 * checks the pairs the app uses: text is held to 4.5:1 (WCAG AA), control outlines and chart
 * fills to 3:1. If you change a colour and this fails, pick another colour; do not lower a bar.
 */

const css = readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8')

function tokens(selector: ':root' | '.dark') {
  const escaped = selector.replace('.', '\\.')
  const block = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ''
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[m[1] as string] = m[2] as string
  }
  return out
}

const rgb = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as number[]
const hex = (c: number[]) =>
  `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
/** Same as CSS color-mix(in srgb, a t%, b). */
const mix = (a: string, b: string, t: number) =>
  hex(rgb(a).map((v, i) => v * t + (rgb(b)[i] as number) * (1 - t)))
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const light = tokens(':root')
const dark = { ...light, ...tokens('.dark') }
// In dark mode the chart tokens are color-mix() rules, so they are not read above;
// they are rebuilt here with the same percentages as index.css.
for (const key of Object.keys(dark))
  if (key.startsWith('seg-') && !(key in tokens('.dark'))) delete dark[key]

type Pair = [name: string, fg: string, bg: string, min: number]

function pairs(t: Record<string, string>): Pair[] {
  const get = (k: string) => t[k] as string
  const s = get('surface')
  const bg = get('background')
  const seg = (k: string, fallback: string) => t[k] ?? fallback
  return [
    // text: 4.5:1
    ['body text on page', get('foreground'), bg, 4.5],
    ['body text on card', get('foreground'), s, 4.5],
    ['muted text on page', get('muted-foreground'), bg, 4.5],
    ['muted text on card', get('muted-foreground'), s, 4.5],
    ['muted text on muted fill', get('muted-foreground'), get('muted'), 4.5],
    ['table header text', get('muted-foreground'), mix(get('muted'), s, 0.6), 4.5],
    ['button text', get('primary-foreground'), get('primary'), 4.5],
    ['link on card', get('primary'), s, 4.5],
    ['active nav text', get('primary-hover'), mix(get('primary'), s, 0.1), 4.5],
    ['tooltip text', bg, get('foreground'), 4.5],
    ['success badge', get('success-ink'), get('success-soft'), 4.5],
    ['info badge', get('info-ink'), get('info-soft'), 4.5],
    ['warning badge', get('warning-ink'), get('warning-soft'), 4.5],
    ['neutral badge', get('neutral-ink'), get('neutral-soft'), 4.5],
    ['danger badge', get('danger-ink'), get('danger-soft'), 4.5],
    ['error text on card', get('danger-ink'), s, 4.5],
    ['label on verified fill', get('ink-on-strong'), get('success'), 4.5],
    ['label on risky fill', get('ink-on-strong'), get('warning'), 4.5],
    ['label on invalid fill', get('ink-on-strong'), get('danger'), 4.5],
    ['label on unknown fill', get('ink-on-strong'), get('neutral'), 4.5],
    [
      'label on not-checked fill',
      get('foreground'),
      seg('seg-not-started', mix(get('neutral'), s, 0.3)),
      4.5,
    ],
    // controls and marks: 3:1
    ['input and button outline', get('border-strong'), s, 3],
    ['focus ring', get('ring'), s, 3],
    ['primary fill', get('primary'), s, 3],
    ['step dot success', get('success'), s, 3],
    ['step dot warning', get('warning'), s, 3],
    ['step dot info', get('info'), s, 3],
    ['step dot neutral', get('neutral'), s, 3],
    ['step dot danger', get('danger'), s, 3],
    ['step dot not started ring', get('border-strong'), s, 3],
    ['chart approved', seg('seg-approved', get('success')), s, 3],
    ['chart completed', seg('seg-completed', mix(get('success'), s, 0.5)), s, 3],
    ['chart needs review', seg('seg-needs-review', get('warning')), s, 3],
    ['chart partial', seg('seg-partial', mix(get('warning'), s, 0.5)), s, 3],
    ['chart restricted', seg('seg-restricted', get('neutral')), s, 3],
    ['chart pending access', seg('seg-pending-access', mix(get('neutral'), s, 0.5)), s, 3],
    // empty / track greys only need to be visible, not strong
    ['progress track', mix(get('neutral'), s, 0.3), s, 1.5],
    ['chart not started (empty)', seg('seg-not-started', mix(get('neutral'), s, 0.3)), s, 1.5],
  ]
}

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme contrast', (_mode, theme) => {
  it.each(pairs(theme))('%s', (name, fg, bg, min) => {
    expect(ratio(fg, bg), `${name}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min)
  })
})

describe('contrast helper', () => {
  it('matches known values', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(ratio('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
  })
})
