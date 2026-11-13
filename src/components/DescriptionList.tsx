import { Lock, Pencil } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { type EditSpec, InlineEditor } from './InlineEditor'
import { NotAvailable } from './NotAvailable'
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'

export type DescriptionItem = {
  label: string
  /** Leave undefined (or empty) for a missing value: it shows "Not available" and the reason. */
  value: ReactNode | undefined
  /** Makes the row editable in place: a pencil button, an inline form, and a lock once edited. */
  edit?: EditSpec
}

const isMissing = (value: ReactNode | undefined) =>
  value === undefined || value === null || value === ''

function Row({
  item,
  reason,
  missingLabel,
}: {
  item: DescriptionItem
  reason: string | undefined
  missingLabel: string | undefined
}) {
  const { label, value, edit } = item
  const [editing, setEditing] = useState(false)
  const pencil = useRef<HTMLButtonElement>(null)

  const close = () => {
    setEditing(false)
    // Put the keyboard back where it was, so editing never loses your place.
    requestAnimationFrame(() => pencil.current?.focus())
  }

  return (
    <div className="contents">
      <dt className="flex items-start gap-1.5 text-[13px] font-medium text-muted-foreground">
        {label}
        {edit?.locked && (
          <Tooltip content="Edited by a person. Automatic updates will not overwrite it.">
            <span tabIndex={0} aria-label="Edited by a person" className="mt-0.5 text-foreground">
              <Lock className="size-3.5" aria-hidden />
            </span>
          </Tooltip>
        )}
      </dt>
      <dd className="min-w-0 break-words">
        {editing && edit ? (
          <InlineEditor label={label} spec={edit} onClose={close} />
        ) : (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {isMissing(value) ? <NotAvailable reason={reason} label={missingLabel} /> : value}
            </div>
            {edit && (
              <Button
                ref={pencil}
                variant="ghost"
                size="icon"
                className="-mt-1 size-7 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={`Edit ${label}`}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" aria-hidden />
              </Button>
            )}
          </div>
        )}
      </dd>
    </div>
  )
}

/**
 * Label and value pairs, one per row. A missing value is never a blank: it reads
 * "Not available" plus the reason it is missing (AT-02). Rows can be made editable.
 */
export function DescriptionList({
  items,
  missingReason,
  missingLabel,
}: {
  items: DescriptionItem[]
  missingReason?: string
  missingLabel?: string
}) {
  // When most of a card is empty for one reason, say it once instead of repeating it on every row.
  const grouped = !!missingReason && items.filter((item) => isMissing(item.value)).length >= 3

  return (
    <>
      {grouped && (
        <p className="mb-3 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">Why details are missing:</span>{' '}
          {missingReason}
        </p>
      )}
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
        {items.map((item) => (
          <Row
            key={item.label}
            item={item}
            reason={grouped ? undefined : missingReason}
            missingLabel={missingLabel}
          />
        ))}
      </dl>
    </>
  )
}
