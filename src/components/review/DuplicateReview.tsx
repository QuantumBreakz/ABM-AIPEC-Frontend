import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useCompany } from '@/api/queries/companies'
import { useMergeCompany, useNotDuplicate } from '@/api/queries/review'
import type { Company } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { NotAvailable } from '@/components/NotAvailable'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'

type Row = {
  label: string
  a: string | number | undefined
  b: string | number | undefined
  compare?: boolean
}

const text = (value: string | undefined) => (value && value.length > 0 ? value : undefined)

function rowsFor(a: Company, b: Company): Row[] {
  return [
    { label: 'Name', a: a.name, b: b.name, compare: true },
    {
      label: 'Also listed as',
      a: text(a.originalNames.filter((n) => n !== a.name).join(', ')),
      b: text(b.originalNames.filter((n) => n !== b.name).join(', ')),
    },
    { label: 'Website', a: a.website.url, b: b.website.url, compare: true },
    { label: 'Country', a: a.country, b: b.country, compare: true },
    { label: 'Category', a: a.category, b: b.category, compare: true },
    {
      label: 'Editions',
      a: a.editions.map((e) => e.edition).join(', '),
      b: b.editions.map((e) => e.edition).join(', '),
    },
    { label: 'LinkedIn', a: a.socials.linkedin, b: b.socials.linkedin, compare: true },
    { label: 'Contacts', a: a.contacts.length, b: b.contacts.length },
    { label: 'Research complete', a: `${a.completeness}%`, b: `${b.completeness}%` },
  ]
}

/** "Same" or "Different" for the fields that help decide, only when both records have a value. */
function Match({ row }: { row: Row }) {
  if (!row.compare || row.a === undefined || row.b === undefined) return null
  const same = String(row.a).toLowerCase() === String(row.b).toLowerCase()
  return (
    <span
      className={
        same
          ? 'rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-ink'
          : 'rounded-full bg-neutral-soft px-2 py-0.5 text-xs font-medium text-neutral-ink'
      }
    >
      {same ? 'Same' : 'Different'}
    </span>
  )
}

function Compare({
  mine,
  other,
  onResolved,
}: {
  mine: Company
  other: Company
  onResolved: () => void
}) {
  const merge = useMergeCompany()
  const notDuplicate = useNotDuplicate()
  const [confirming, setConfirming] = useState(false)
  const [keep, setKeep] = useState<'other' | 'mine'>('other')
  const [error, setError] = useState<string>()

  const keptName = keep === 'other' ? other.name : mine.name
  const removedName = keep === 'other' ? mine.name : other.name
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong.')

  const doMerge = async () => {
    setError(undefined)
    try {
      await merge.mutateAsync(
        keep === 'other'
          ? { sourceId: mine.id, intoId: other.id }
          : { sourceId: other.id, intoId: mine.id },
      )
      toast.success(`Merged. Kept ${keptName}.`)
      setConfirming(false)
      onResolved()
    } catch (e) {
      setConfirming(false)
      fail(e)
    }
  }

  const doNotDuplicate = async () => {
    setError(undefined)
    try {
      await notDuplicate.mutateAsync(mine.id)
      toast.success(`${mine.name} is now marked as a different company.`)
      onResolved()
    } catch (e) {
      fail(e)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">The two records side by side</caption>
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">
                &nbsp;
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                This record
                <Link
                  to={`/companies/${mine.id}`}
                  className="mt-0.5 block text-primary underline-offset-2 hover:underline"
                >
                  Open {mine.name}
                </Link>
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Looks like
                <Link
                  to={`/companies/${other.id}`}
                  className="mt-0.5 block text-primary underline-offset-2 hover:underline"
                >
                  Open {other.name}
                </Link>
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Match
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsFor(mine, other).map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <th scope="row" className="py-2 pr-3 align-top font-medium text-muted-foreground">
                  {row.label}
                </th>
                <td className="px-2 py-2 align-top break-words">
                  {row.a === undefined ? <NotAvailable className="whitespace-nowrap" /> : row.a}
                </td>
                <td className="px-2 py-2 align-top break-words">
                  {row.b === undefined ? <NotAvailable className="whitespace-nowrap" /> : row.b}
                </td>
                <td className="px-2 py-2 align-top">
                  <Match row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          loading={notDuplicate.isPending}
          onClick={() => void doNotDuplicate()}
        >
          Not a duplicate
        </Button>
        <Button onClick={() => setConfirming(true)}>Merge into…</Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Merge these two records?"
        description={`Contacts, editions and names move to ${keptName}. ${removedName} is removed. This cannot be undone.`}
        confirmLabel="Merge"
        destructive
        pending={merge.isPending}
        onConfirm={() => void doMerge()}
      >
        <label htmlFor="merge-keep" className="mb-1.5 block text-sm font-medium">
          Keep
        </label>
        <Select
          id="merge-keep"
          value={keep}
          onChange={(e) => setKeep(e.target.value as 'other' | 'mine')}
        >
          <option value="other">{other.name} (the record it looks like)</option>
          <option value="mine">{mine.name} (this record)</option>
        </Select>
      </ConfirmDialog>
    </div>
  )
}

/** Side-by-side comparison of a flagged record and the one it may duplicate. */
export function DuplicateReview({
  company,
  onResolved,
}: {
  company: Company
  onResolved: () => void
}) {
  const other = useCompany(company.duplicateOf)

  if (!company.duplicateOf) {
    return <p className="text-muted-foreground">This record is no longer flagged as a duplicate.</p>
  }
  if (other.isPending) return <Skeleton className="h-64" />
  if (other.error || !other.data) {
    return <ErrorState error={other.error} onRetry={() => void other.refetch()} />
  }
  return <Compare mine={company} other={other.data} onResolved={onResolved} />
}
