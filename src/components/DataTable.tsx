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
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {hideable.length > 0 && (
        <div className="flex justify-end border-b border-border px-3 py-2">
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <Button variant="ghost" size="sm">
                <Columns3 className="size-4" aria-hidden />
                Columns
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-lg"
              >
                {hideable.map((column) => (
                  <Dropdown.CheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4 items-center justify-center rounded border border-border text-[10px]',
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

      <div className="overflow-x-auto">
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
                      className="h-10 whitespace-nowrap px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={() => cycleSort(header.column.id)}
                          className="inline-flex items-center gap-1.5 rounded uppercase hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="size-3.5" aria-hidden />
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
                <tr key={i} className="border-t border-border">
                  {Array.from({ length: visibleColumns }, (_, j) => (
                    <td key={j} className="h-11 px-4">
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
                    'border-t border-border transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="h-11 px-4 align-middle">
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-muted-foreground">
        <span aria-live="polite">
          {total === undefined
            ? 'Loading…'
            : total === 0
              ? '0 results'
              : `${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`}
        </span>
        <div className="flex items-center gap-2">
          <span>
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
