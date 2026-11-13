import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { reviewItems } from '@/mocks/handlers/review'
import { setupMockApi } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()

afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
})

describe('End-to-end user journey', () => {
  it('completes a full operator workflow from login through company edits, review, and sign-out', async () => {
    const user = userEvent.setup()

    // 1. Visiting protected root redirects to /login
    const { router } = renderApp('/')
    await screen.findByRole('heading', { level: 1, name: 'ADIPEC Lead Gen' }, { timeout: 4000 })
    expect(router.state.location.pathname).toBe('/login')

    // 2. Wrong password shows an inline alert, and password visibility toggles cleanly
    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    await user.type(passwordInput, 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(passwordInput.type).toBe('text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput.type).toBe('password')

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect|wrong|password/i)

    // 3. Valid sign-in lands on Overview
    await user.clear(passwordInput)
    await user.type(passwordInput, 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await screen.findByRole('heading', { level: 1, name: 'Overview' }, { timeout: 4000 })
    expect(router.state.location.pathname).toBe('/')

    // 4. Toggle Overview between Chart and Table views, and toggle dark/light theme
    const tableBtn = await screen.findByRole('button', { name: 'Table' })
    await user.click(tableBtn)
    expect(tableBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)

    const chartBtn = screen.getByRole('button', { name: 'Chart' })
    await user.click(chartBtn)
    expect(chartBtn).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    // 5. Navigate to Runs, open a run detail, and inspect metrics
    const mainNav = () => screen.getByRole('navigation', { name: 'Main' })
    await user.click(within(mainNav()).getByRole('link', { name: /^Runs/ }))
    await screen.findByRole('heading', { level: 1, name: 'Runs' }, { timeout: 4000 })

    const runRows = await screen.findAllByRole('row', { name: /^Open run / })
    expect(runRows.length).toBeGreaterThan(0)
    await user.click(runRows[0] as HTMLElement)
    await screen.findByRole('link', { name: 'All runs' }, { timeout: 4000 })
    expect(router.state.location.pathname).toMatch(/^\/runs\//)

    // 6. Navigate to Companies, use a quick-view pill, toggle a column, and open the first company
    await user.click(within(mainNav()).getByRole('link', { name: /^Companies/ }))
    await screen.findByRole('heading', { level: 1, name: 'Companies' }, { timeout: 4000 })

    const quickNav = screen.getByRole('group', { name: 'Quick views' })
    await user.click(within(quickNav).getByRole('button', { name: 'Needs review' }))
    expect(router.state.location.search).toContain('stepStatus=needs_review')
    await user.click(within(quickNav).getByRole('button', { name: 'All' }))
    expect(router.state.location.search).not.toContain('stepStatus=needs_review')

    const columnsBtn = await screen.findByRole('button', { name: /columns/i })
    await user.click(columnsBtn)
    const standOption = await screen.findByRole('menuitemcheckbox', { name: 'Stand' })
    await user.click(standOption)
    await user.keyboard('{Escape}')

    const companyRows = await screen.findAllByRole('row', { name: /^Open / })
    expect(companyRows.length).toBeGreaterThan(0)
    const firstCompanyRow = companyRows[0] as HTMLElement
    const targetName = firstCompanyRow.getAttribute('aria-label')?.replace(/^Open /, '') ?? ''
    expect(targetName.length).toBeGreaterThan(0)
    await user.click(firstCompanyRow)

    await screen.findByRole('heading', { level: 1, name: targetName }, { timeout: 4000 })

    // 7. Switch to the Website tab, edit website inline, and override the Emails step with an audit reason
    await user.click(
      within(screen.getByRole('navigation', { name: 'Company sections' })).getByRole('link', {
        name: 'Website',
      }),
    )
    await user.click(await screen.findByRole('button', { name: 'Edit Website' }))
    const websiteInput = await screen.findByLabelText('Website')
    await user.clear(websiteInput)
    await user.type(websiteInput, 'https://journey-test.example.com')
    await user.keyboard('{Enter}')

    const aboutRegion = screen.getByRole('region', { name: 'About the company' })
    await waitFor(() =>
      expect(
        within(aboutRegion).getByRole('link', { name: /journey-test\.example\.com/ }),
      ).toHaveAttribute('href', 'https://journey-test.example.com/'),
    )

    await user.click(screen.getByRole('button', { name: 'Change status of Emails' }))
    const overrideDialog = await screen.findByRole('dialog')
    await user.selectOptions(within(overrideDialog).getByLabelText('New status'), 'needs_review')
    await user.type(
      within(overrideDialog).getByLabelText('Reason'),
      'Verified contact inbox during E2E journey test',
    )
    await user.click(within(overrideDialog).getByRole('button', { name: 'Change status' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Verified contact inbox during E2E journey test')).toBeInTheDocument()

    // 8. Check History tab captures both edits
    await user.click(
      within(screen.getByRole('navigation', { name: 'Company sections' })).getByRole('link', {
        name: 'History',
      }),
    )
    const historyList = await screen.findByRole('list', { name: 'Change history' })
    expect(historyList).toHaveTextContent('Website address')
    expect(historyList).toHaveTextContent('https://journey-test.example.com')
    expect(historyList).toHaveTextContent('Emails status')

    // 9. Navigate to Review queue, inspect first item, and resolve its website
    await user.click(within(mainNav()).getByRole('link', { name: /^Review/ }))
    await screen.findByRole('heading', { level: 1, name: 'Review queue' }, { timeout: 4000 })

    const reviewRows = await screen.findAllByRole('row', { name: /^Review / })
    const firstReview = reviewItems('website')[0]!
    expect(reviewRows.length).toBeGreaterThan(0)
    await user.click(reviewRows[0] as HTMLElement)

    const reviewDialog = await screen.findByRole('dialog')
    const urlField = within(reviewDialog).getByLabelText('Website address')
    await user.clear(urlField)
    await user.type(urlField, 'https://resolved-journey.example.com')
    await user.click(within(reviewDialog).getByRole('button', { name: 'Save website' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(
        screen.queryByRole('row', { name: new RegExp(`^Review ${firstReview.companyName}`) }),
      ).not.toBeInTheDocument(),
    )

    // 10. Sign out via account menu and confirm redirect to /login
    await user.click(screen.getByRole('button', { name: /Account menu/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    await screen.findByRole('heading', { level: 1, name: 'ADIPEC Lead Gen' }, { timeout: 4000 })
    expect(router.state.location.pathname).toBe('/login')
  }, 40_000)
})
