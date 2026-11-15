import { expect, signIn, test } from './helpers.ts'

test.describe('a reviewer', () => {
  test('cannot reach the admin screens and sees no admin links', async ({ page }) => {
    await signIn(page, 'reviewer@example.com')
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Providers' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Suppressions' })).toHaveCount(0)

    for (const path of ['/admin/users', '/admin/providers', '/admin/suppressions']) {
      await page.goto(path)
      await expect(
        page.getByRole('heading', { name: 'You do not have access to this page' }),
      ).toBeVisible()
    }
  })

  test('can still use the gap report and the review queue', async ({ page }) => {
    await signIn(page, 'reviewer@example.com')
    await page.getByRole('link', { name: 'Gap report' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Gap report' })).toBeVisible()
    await page
      .getByRole('link', { name: /^Review/ })
      .first()
      .click()
    await expect(page.getByRole('heading', { level: 1, name: 'Review queue' })).toBeVisible()
  })
})

test('a signed-out visitor is sent to the login page and back after signing in', async ({
  page,
}) => {
  await page.goto('/companies')
  await expect(page).toHaveURL(/\/login\?next=/)
  await page.getByLabel('Email').fill('admin@example.com')
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Companies' })).toBeVisible()
})
