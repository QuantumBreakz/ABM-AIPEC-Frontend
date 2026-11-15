import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, signIn, test } from './helpers.ts'

const SCREENS: [string, string][] = [
  ['Overview', '/'],
  ['Runs', '/runs'],
  ['Companies', '/companies'],
  ['Company', '/companies/c_001'],
  ['Company contacts', '/companies/c_001/contacts'],
  ['Company AI', '/companies/c_001/ai'],
  ['Company history', '/companies/c_001/history'],
  ['Review queue', '/review/website'],
  ['AI review', '/ai/c_001'],
  ['Exports', '/exports'],
  ['Gap report', '/admin/gap-report'],
  ['Users', '/admin/users'],
  ['Providers', '/admin/providers'],
  ['Suppressions', '/admin/suppressions'],
]

/**
 * Dark mode shares every component with light mode, so it scans the screens that between them use
 * all of the shared pieces (tables, charts, forms, dialogs, drawers) instead of all of them.
 */
const DARK_SCREENS = [
  'Overview',
  'Companies',
  'Company contacts',
  'Review queue',
  'AI review',
  'Exports',
  'Users',
]

/** The problems that stop someone using the page. Minor and moderate notes are not counted. */
async function serious(page: Page, screen: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${screen}: ${v.id} (${v.impact}): ${v.help}, ${v.nodes.length} element(s), e.g. ${v.nodes[0]?.target.join(' ')}`,
    )
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme })

    test('the login page has no serious accessibility problems', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
      expect(await serious(page, 'Login')).toEqual([])
    })

    // One sign-in, then every screen. All problems are listed together, not just the first.
    test('no screen has serious accessibility problems', async ({ page }) => {
      test.setTimeout(120_000)
      await signIn(page)
      const problems: string[] = []
      const screens =
        scheme === 'dark' ? SCREENS.filter(([name]) => DARK_SCREENS.includes(name)) : SCREENS
      for (const [name, path] of screens) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        await page.waitForLoadState('networkidle')
        problems.push(...(await serious(page, name)))
      }
      expect(problems).toEqual([])
    })
  })
}
