import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { AI_STATUSES, EMAIL_STATUSES, STEP_KEYS, STEP_STATUSES, type StepState } from '@/api/types'
import { COMPANY_FILTER_FIELDS } from '@/lib/filters'
import { AI_STATUS_META, EMAIL_STATUS_META, STEP_STATUS_META } from '@/lib/status'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { ConfirmDialog } from './ConfirmDialog'
import { type Columns, DataTable } from './DataTable'
import { FilterBar } from './FilterBar'
import { SourceLink } from './SourceLink'
import { StatusBadge } from './StatusBadge'
import { StepDots } from './StepDots'

describe('StatusBadge', () => {
  it('shows a text label for every step, email and AI status', () => {
    for (const status of STEP_STATUSES) {
      const { unmount } = render(<StatusBadge kind="step" status={status} />)
      expect(screen.getByText(STEP_STATUS_META[status].label)).toBeInTheDocument()
      unmount()
    }
    for (const status of EMAIL_STATUSES) {
      const { unmount } = render(<StatusBadge kind="email" status={status} />)
      expect(screen.getByText(EMAIL_STATUS_META[status].label)).toBeInTheDocument()
      unmount()
    }
    for (const status of AI_STATUSES) {
      const { unmount } = render(<StatusBadge kind="ai" status={status} />)
      expect(screen.getByText(AI_STATUS_META[status].label)).toBeInTheDocument()
      unmount()
    }
  })

  it('never styles not_checked / unknown like verified', () => {
    expect(EMAIL_STATUS_META.not_checked.tone).not.toBe(EMAIL_STATUS_META.verified.tone)
    expect(EMAIL_STATUS_META.unknown.tone).not.toBe(EMAIL_STATUS_META.verified.tone)
    expect(EMAIL_STATUS_META.not_checked.label).not.toBe(EMAIL_STATUS_META.unknown.label)
  })
})

describe('StepDots', () => {
  it('renders one dot per step and describes them all for screen readers', () => {
    const stages = Object.fromEntries(
      STEP_KEYS.map((k) => [k, { status: 'completed' } as StepState]),
    )
    stages.website = { status: 'failed', reason: 'Site offline' }
    const { container } = render(<StepDots stages={stages} />)
    expect(container.querySelectorAll('[data-step]')).toHaveLength(8)
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-label', expect.stringContaining('Website: Failed'))
  })

  it('treats a missing step as not started', () => {
    render(<StepDots stages={{}} />)
    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Website: Not started'),
    )
  })
})

describe('SourceLink', () => {
  it('opens safely in a new tab', () => {
    render(<SourceLink href="https://www.example.com/about" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('example.com')
  })

  it('does not render a link for unsafe or missing URLs', () => {
    render(<SourceLink href="javascript:alert(1)" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('No valid source')).toBeInTheDocument()
  })
})

type Row = { id: string; name: string }
const columns: Columns<Row> = [
  { id: 'name', accessorKey: 'name', header: 'Name', enableSorting: true },
  { id: 'action', header: 'Action', cell: () => <button type="button">Inner</button> },
]

describe('DataTable', () => {
  const base = {
    columns,
    getRowId: (r: Row) => r.id,
    page: 1,
    pageSize: 50,
    onPageChange: () => {},
  }

  it('opens a row with Enter but not when an inner button is clicked', async () => {
    const onRowClick = vi.fn()
    const user = userEvent.setup()
    render(
      <DataTable
        {...base}
        data={[{ id: '1', name: 'Acme' }]}
        total={1}
        onRowClick={onRowClick}
        rowLabel={(r) => `Open ${r.name}`}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Inner' }))
    expect(onRowClick).not.toHaveBeenCalled()

    screen.getByRole('row', { name: 'Open Acme' }).focus()
    await user.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'Acme' })
  })

  it('cycles sort ascending, descending, then off', async () => {
    const onSortChange = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <DataTable {...base} data={[]} total={0} sort={undefined} onSortChange={onSortChange} />,
    )
    await user.click(screen.getByRole('button', { name: /name/i }))
    expect(onSortChange).toHaveBeenLastCalledWith('name')
    rerender(<DataTable {...base} data={[]} total={0} sort="name" onSortChange={onSortChange} />)
    await user.click(screen.getByRole('button', { name: /name/i }))
    expect(onSortChange).toHaveBeenLastCalledWith('-name')
    rerender(<DataTable {...base} data={[]} total={0} sort="-name" onSortChange={onSortChange} />)
    await user.click(screen.getByRole('button', { name: /name/i }))
    expect(onSortChange).toHaveBeenLastCalledWith(undefined)
  })

  it('shows the four states', () => {
    const retry = vi.fn()
    const { rerender } = render(
      <DataTable {...base} data={undefined} isLoading total={undefined} />,
    )
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    rerender(
      <DataTable
        {...base}
        data={undefined}
        error={new Error('x')}
        onRetry={retry}
        total={undefined}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(<DataTable {...base} data={[]} total={0} />)
    expect(screen.getByText('Nothing to show')).toBeInTheDocument()

    rerender(<DataTable {...base} data={[{ id: '1', name: 'Acme' }]} total={120} />)
    expect(screen.getByText('1–50 of 120')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })

  it('disables Previous on the first page and Next on the last', () => {
    render(<DataTable {...base} data={[{ id: '1', name: 'A' }]} total={30} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })
})

function FilterHarness() {
  const { filters, setFilters, clearFilters } = useUrlFilters(COMPANY_FILTER_FIELDS)
  const [seen, setSeen] = useState('')
  return (
    <>
      <FilterBar
        fields={COMPANY_FILTER_FIELDS}
        values={filters}
        onChange={(v) => {
          setFilters(v)
          setSeen(JSON.stringify(v))
        }}
        onClear={clearFilters}
      />
      <output data-testid="values">{JSON.stringify(filters)}</output>
      <output data-testid="seen">{seen}</output>
    </>
  )
}

describe('FilterBar', () => {
  it('reads initial values from the URL and can clear them', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/?country=AE&stepStatus=failed']}>
        <FilterHarness />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('values')).toHaveTextContent('"country":"AE"')
    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(screen.getByTestId('values')).toHaveTextContent('{}')
  })

  it('writes a select change to the URL state', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/?country=AE']}>
        <FilterHarness />
      </MemoryRouter>,
    )
    // The panel opens automatically because a filter is active.
    const status = screen.getByLabelText('Step status')
    await user.selectOptions(status, 'failed')
    expect(screen.getByTestId('values')).toHaveTextContent('"stepStatus":"failed"')
    expect(within(screen.getByTestId('values')).queryByText('page')).toBeNull()
  })
})

describe('ConfirmDialog', () => {
  it('confirms and cancels', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete contact?"
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByRole('dialog', { name: 'Delete contact?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
