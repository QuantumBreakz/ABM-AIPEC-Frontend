import * as Dropdown from '@radix-ui/react-dropdown-menu'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'
import { type KeyboardEvent, type MouseEvent, type ReactNode, useState } from 'react'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { Skeleton } from './Skeleton'
import { Button } from './ui/button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Columns<T> = ColumnDef<T, any>[]

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Keep this column pinned to the left while the table scrolls sideways. */
    sticky?: boolean
  }
}

const INTERACTIVE = 'a,button,input,select,textarea,label,[role=button],[role=menuitem]'

type Props<T> = {
  columns: Columns<T>
  data: T[] | undefined
  getRowId: (row: T) => string
  isLoading?: boolean
  isFetching?: boolean
  error?: unknown
  onRetry?: () => void
  /** Server-side sort in contract format: "name" (ascending) or "-name" (descending). */
  sort?: string
  onSortChange?: (sort: string | undefined) => void
  page: number
  pageSize: number
  total: number | undefined
  onPageChange: (page: number) => void
  onRowClick?: (row: T) => void
  /** Describes a row for screen readers, e.g. (c) => `Open ${c.name}`. */
  rowLabel?: (row: T) => string
  empty?: ReactNode
  /** Remember hidden columns in localStorage under this key. */
  storageKey?: string
  /** Columns hidden until the person turns them on, e.g. { stand: false }. */
  defaultVisibility?: VisibilityState
}

function readVisibility(
  key: string | undefined,
  fallback: VisibilityState | undefined,
): VisibilityState {
  if (!key) return fallback ?? {}
  try {
    const stored = localStorage.getItem(`table:${key}`)
    return stored ? (JSON.parse(stored) as VisibilityState) : (fallback ?? {})
  } catch {
    return fallback ?? {}
  }
}

function toSorting(sort: string | undefined): SortingState {
  if (!sort) return []
  return sort.startsWith('-') ? [{ id: sort.slice(1), desc: true }] : [{ id: sort, desc: false }]
}

/**
 * Table for server-side data: sorting and paging happen on the backend.
 * Handles the four states (loading skeleton, error, empty, data), keyboard row activation,
 * column show/hide and the pagination footer.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  isFetching,
  error,
  onRetry,
  sort,
  onSortChange,
  page,
  pageSize,
  total,
  onPageChange,
  onRowClick,
  rowLabel,
  empty,
  storageKey,
  defaultVisibility,
}: Props<T>) {
  const [visibility, setVisibility] = useState<VisibilityState>(() =>
    readVisibility(storageKey, defaultVisibility),
  )

  // TanStack Table returns functions React Compiler cannot memoize; that is expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data ?? [],
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: { sorting: toSorting(sort), columnVisibility: visibility },
    onColumnVisibilityChange: (updater) => {
      setVisibility((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (storageKey) {
          try {
            localStorage.setItem(`table:${storageKey}`, JSON.stringify(next))
          } catch {
            // storage unavailable: the table still works
          }
        }
        return next
      })
    },
  })

  const visibleColumns = table.getVisibleLeafColumns().length
  const hideable = table
    .getAllLeafColumns()
    .filter((c) => c.getCanHide() && typeof c.columnDef.header === 'string')

  const cycleSort = (id: string) => {
    if (!onSortChange) return
    if (sort === id) onSortChange(`-${id}`)
    else if (sort === `-${id}`) onSortChange(undefined)
    else onSortChange(id)
  }

  const handleRowClick = (event: MouseEvent, row: T) => {
    if (!onRowClick) return
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return
    onRowClick(row)
  }
  const handleRowKey = (event: KeyboardEvent, row: T) => {
    if (!onRowClick || event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick(row)
    }
  }

  const rows = table.getRowModel().rows
  const pageCount = total === undefined ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 || total === undefined ? 0 : (page - 1) * pageSize + 1
  const to = total === undefined ? 0 : Math.min(page * pageSize, total)

  return (
    <div className="card-elevated overflow-hidden">
      {hideable.length > 0 && (
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/25 px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {total !== undefined && !isLoading ? `${formatNumber(total)} total records` : ''}
          </span>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <Button variant="secondary" size="sm">
                <Columns3 className="size-3.5" aria-hidden />
                Columns
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-48 rounded-xl border border-border bg-surface p-1.5 shadow-xl"
              >
                {hideable.map((column) => (
                  <Dropdown.CheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4 items-center justify-center rounded border border-border-strong text-[10px] transition-colors',
                        column.getIsVisible() &&
                          'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {column.getIsVisible() ? '✓' : ''}
                    </span>
                    {column.columnDef.header as string}
                  </Dropdown.CheckboxItem>
                ))}
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      )}

      <div
        tabIndex={0}
        role="region"
        aria-label="Results table"
        className="overflow-x-auto focus-visible:outline-offset-[-2px]"
      >
        <table className="w-full border-collapse text-left" aria-busy={isLoading || isFetching}>
          <thead className="bg-muted/60">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort() && !!onSortChange
                  const dir = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined
                      }
                      className={cn(
                        'min-h-10 whitespace-nowrap border-b border-border px-3.5 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground',
                        header.column.columnDef.meta?.sticky &&
                          'sticky left-0 z-10 bg-muted shadow-[1px_0_0_var(--border)]',
                      )}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={() => cycleSort(header.column.id)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded uppercase transition-colors hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' ? (
                            <ArrowUp className="size-3.5 text-primary" aria-hidden />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="size-3.5 text-primary" aria-hidden />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>

          <tbody className={cn(isFetching && !isLoading && 'opacity-60 transition-opacity')}>
            {isLoading &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-t border-border/70">
                  {Array.from({ length: visibleColumns }, (_, j) => (
                    <td key={j} className="px-3.5 py-3">
                      <Skeleton className="h-4 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              !error &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={rowLabel?.(row.original)}
                  onClick={(e) => handleRowClick(e, row.original)}
                  onKeyDown={(e) => handleRowKey(e, row.original)}
                  className={cn(
                    'group border-t border-border/70 transition-colors first:border-t-0',
                    onRowClick && 'cursor-pointer hover:bg-muted/45 focus-visible:bg-muted/45',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3.5 py-3 align-middle text-[0.84375rem]',
                        cell.column.columnDef.meta?.sticky &&
                          'sticky left-0 z-10 bg-surface shadow-[1px_0_0_var(--border)] group-hover:bg-muted group-focus-visible:bg-muted',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : (
        !isLoading &&
        rows.length === 0 &&
        (empty ?? (
          <EmptyState title="Nothing to show" hint="No results match what you asked for." />
        ))
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3 text-[0.8125rem] text-muted-foreground">
        <span aria-live="polite" className="tabular-nums">
          {total === undefined
            ? 'Loading…'
            : total === 0
              ? '0 results'
              : `${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted/70 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
