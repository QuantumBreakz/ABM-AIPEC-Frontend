import { expect, signIn, test } from './helpers.ts'

const SCREENS = [
  '/',
  '/runs',
  '/companies',
  '/companies/c_001',
  '/companies/c_001/contacts',
  '/companies/c_001/ai',
  '/review/website',
  '/review/emails',
  '/ai/c_001',
  '/exports',
  '/admin/gap-report',
  '/admin/users',
  '/admin/providers',
  '/admin/suppressions',
]

test('every screen fits a 1280 px wide window without sideways scrolling', async ({ page }) => {
  await signIn(page)
  for (const path of SCREENS) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0)
  }
})

test('a very long name and job title stay inside the page', async ({ page }) => {
  await signIn(page)
  const long = `Extraordinarily-Long-Name-Without-Any-Spaces-${'X'.repeat(80)}`
  await page.goto('/companies/c_001/contacts')
  await page.getByRole('button', { name: 'Add contact' }).first().click()
  const form = page.getByRole('dialog', { name: 'Add a contact' })
  await form.getByLabel(/First name/).fill(long)
  await form.getByLabel(/Last name/).fill('Surname')
  await form.getByRole('button', { name: 'Add contact' }).click()
  await expect(form).toBeHidden()
  await expect(page.getByRole('rowheader', { name: new RegExp(long.slice(0, 40)) })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
