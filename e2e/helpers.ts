import { expect, type Page, test as base } from '@playwright/test'

export { expect }

export const PASSWORD = 'password'

/**
 * Every test uses this `test`. The fake backend then answers instantly, so the tests measure the
 * app and not the artificial waiting that makes the mock feel like a real server in the browser.
 */
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __MOCK_NO_DELAY__: boolean }).__MOCK_NO_DELAY__ = true
    })
    await runTest(page)
  },
})

/** Sign in through the real login form, then wait for the Overview. */
export async function signIn(page: Page, email = 'admin@example.com') {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
}
