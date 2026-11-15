import { expect, signIn, test } from './helpers.ts'

test('an operator works through a company from filter to export, then adds a user', async ({
  page,
}) => {
  await signIn(page)

  // Company list: filter by search, open a company
  await page.getByRole('link', { name: 'Companies' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Companies' })).toBeVisible()
  const search = page.getByPlaceholder('Search companies…')
  await search.fill('a')
  await expect(page).toHaveURL(/q=a/)
  const first = page.getByRole('row', { name: /^Open / }).first()
  await expect(first).toBeVisible()
  await first.click()
  await expect(page).toHaveURL(/\/companies\/c_/)
  const companyName = (await page.getByRole('heading', { level: 1 }).textContent()) ?? ''
  expect(companyName.length).toBeGreaterThan(0)

  // Add a contact
  await page.getByRole('link', { name: /^Contacts/ }).click()
  await page.getByRole('button', { name: 'Add contact' }).first().click()
  const form = page.getByRole('dialog', { name: 'Add a contact' })
  await form.getByLabel(/First name/).fill('Taylor')
  await form.getByLabel(/Last name/).fill('Brooks')
  await form.getByRole('button', { name: 'Add contact' }).click()
  await expect(form).toBeHidden()
  await expect(page.getByRole('rowheader', { name: /Taylor Brooks/ })).toBeVisible()

  // AI review: approve the company draft (write one first if the company has none)
  await page.getByRole('link', { name: 'AI', exact: true }).click()
  await page.getByRole('link', { name: /Open AI review/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /AI review/ })).toBeVisible()
  const companyBlock = page.getByRole('region', { name: 'Company', exact: true })
  const approve = companyBlock.getByRole('button', { name: 'Approve' })
  if (await approve.isDisabled()) {
    await companyBlock.getByRole('button', { name: 'Edit' }).click()
    await companyBlock.getByLabel('Company summary').fill('A short summary. It has two sentences.')
    await companyBlock.getByLabel('Signal', { exact: true }).fill('Opened a new office.')
    await companyBlock.getByLabel('Signal source').fill('https://example.com/news')
    await companyBlock.getByRole('button', { name: 'Save' }).click()
  }
  await expect(approve).toBeEnabled()
  await approve.click()
  await expect(companyBlock.getByRole('region', { name: 'Approved copy, Company' })).toBeVisible()

  // Export: download the initial contacts file
  await page.getByRole('link', { name: 'Exports' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Exports' })).toBeVisible()
  const contactsFile = page.getByRole('radio', { name: /Contacts/ })
  await contactsFile.click()
  await expect(contactsFile).toBeChecked()
  await expect(page.getByRole('status').filter({ hasText: /rows?/ })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download CSV' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.csv$/)
  await expect(page.getByText(/was downloaded/)).toBeVisible()

  // Admin: add a user
  await page.getByRole('link', { name: 'Users' }).click()
  await page.getByRole('button', { name: 'Add user' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a user' })
  await dialog.getByLabel('Email').fill('new.reviewer@example.com')
  await dialog.getByLabel('Password').fill('a-long-password')
  await dialog.getByRole('button', { name: 'Add user' }).click()
  await expect(page.getByRole('rowheader', { name: /new.reviewer@example.com/ })).toBeVisible()
})
