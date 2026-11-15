import { expect, signIn, test } from './helpers.ts'

test('the main flow works with the keyboard alone', async ({ page }) => {
  await page.goto('/login')

  // Sign in without touching the mouse
  await page.getByLabel('Email').focus()
  await page.keyboard.type('admin@example.com')
  await page.keyboard.press('Tab')
  await page.keyboard.type('password')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()

  // The skip link is reachable first, and moves focus past the menu
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()

  // Open the company list through the sidebar link, then a company with Enter
  const companies = page.getByRole('link', { name: 'Companies' }).first()
  await companies.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Companies' })).toBeVisible()
  const row = page.getByRole('row', { name: /^Open / }).first()
  await expect(row).toBeVisible()
  await row.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/companies\/c_/)
})

test('a popup keeps focus inside, closes with Escape and returns focus to its button', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/admin/users')
  const open = page.getByRole('button', { name: 'Add user' })
  await expect(open).toBeVisible()
  await open.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Add a user' })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(open).toBeFocused()
})
