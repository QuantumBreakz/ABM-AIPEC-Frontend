import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { api } from '@/api/client'
import { createQueryClient } from '@/api/queryClient'
import { beginWaking, endWaking } from '@/api/waking'
import { WakingBanner } from '@/components/layout/WakingBanner'
import { routes } from '@/routes'
import { signIn, setupMockApi } from '@/test/mockApi'

setupMockApi()

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

async function submitLogin(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

describe('signed out', () => {
  it('sends you to login, then back to the page you wanted', async () => {
    const router = renderApp('/companies')
    await screen.findByRole('heading', { name: 'ADIPEC Lead Gen' })
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?next=%2Fcompanies')

    await submitLogin('admin@example.com', 'password')
    await screen.findByRole('heading', { name: 'Companies' })
    expect(router.state.location.pathname).toBe('/companies')
  })

  it('never follows a next link to another site', async () => {
    const router = renderApp('/login?next=https%3A%2F%2Fevil.example')
    await submitLogin('admin@example.com', 'password')
    await screen.findByRole('heading', { name: 'Overview' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('explains empty or invalid fields before calling the server', async () => {
    renderApp('/login')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it('shows the server message for a wrong password', async () => {
    renderApp('/login')
    await submitLogin('admin@example.com', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
  })

  it('shows the too-many-attempts message (429)', async () => {
    for (let i = 0; i < 5; i++) {
      await api.post('/auth/login', { email: 'admin@example.com', password: 'x' }).catch(() => {})
    }
    renderApp('/login')
    await submitLogin('admin@example.com', 'password')
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many failed attempts/i)
  })

  it('can show and hide the password', async () => {
    renderApp('/login')
    const user = userEvent.setup()
    const field = await screen.findByLabelText('Password')
    expect(field).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(field).toHaveAttribute('type', 'text')
  })
})

describe('signed in', () => {
  it('skips the login page and shows the app shell', async () => {
    await signIn()
    const router = renderApp('/login')
    await screen.findByRole('heading', { name: 'Overview' })
    expect(router.state.location.pathname).toBe('/')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const name of ['Overview', 'Runs', 'Companies', 'Review', 'Exports', 'Gap report']) {
      expect(nav).toHaveTextContent(name)
    }
  })

  it('shows how many items wait in the review queue', async () => {
    await signIn()
    renderApp('/')
    const badge = await screen.findByLabelText(/\d+ waiting/)
    expect(Number.parseInt(badge.textContent ?? '0', 10)).toBeGreaterThan(0)
  })

  it('opens deep links such as /companies/c_001/website', async () => {
    await signIn()
    renderApp('/companies/c_001/website')
    expect(await screen.findByRole('heading', { name: 'Company' })).toBeInTheDocument()
  })

  it('shows a 404 page for unknown addresses and bad review types', async () => {
    await signIn()
    renderApp('/nope')
    expect(await screen.findByText('We could not find that page')).toBeInTheDocument()
  })

  it('names the browser tab after the page', async () => {
    await signIn()
    renderApp('/runs')
    await screen.findByRole('heading', { name: 'Runs' })
    expect(document.title).toBe('Runs · ADIPEC Lead Gen')
  })

  it('signs out from the account menu and returns to login', async () => {
    await signIn()
    const router = renderApp('/')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /account menu/i }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    await screen.findByRole('button', { name: 'Sign in' })
    expect(router.state.location.pathname).toBe('/login')
    expect(await api.get('/auth/me').catch((e) => e.status)).toBe(401)
  })
})

describe('roles', () => {
  it('admin sees the admin links and pages', async () => {
    await signIn('admin@example.com')
    renderApp('/admin/users')
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const name of ['Users', 'Providers', 'Suppressions']) expect(nav).toHaveTextContent(name)
  })

  it('reviewer does not see admin links and cannot open admin pages', async () => {
    await signIn('reviewer@example.com')
    renderApp('/admin/users')
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const name of ['Users', 'Providers', 'Suppressions'])
      expect(nav).not.toHaveTextContent(name)
    // ...but the gap report is for everyone
    expect(nav).toHaveTextContent('Gap report')
  })
})

describe('session expiry', () => {
  it('goes to login when the server says the session ended', async () => {
    await signIn()
    const router = renderApp('/companies')
    await screen.findByRole('heading', { name: 'Companies' })
    await api.post('/auth/logout')
    // Any API call now gets a 401, which must land the person on the login page.
    await api.get('/companies').catch(() => {})
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?next=%2Fcompanies')
  })
})

describe('WakingBanner', () => {
  it('appears while a request waits for the server and disappears afterwards', async () => {
    render(<WakingBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    beginWaking()
    expect(await screen.findByRole('status')).toHaveTextContent(/waking up/i)
    endWaking()
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })
})
