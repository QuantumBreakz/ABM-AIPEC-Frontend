import { ListFilter, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { countActiveFilters, type FilterField, type FilterValues } from '@/lib/filters'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Input, Select } from './ui/input'

const DEBOUNCE_MS = 300

/** Text box that reports its value 300 ms after the user stops typing. */
function DebouncedInput({
  value,
  onCommit,
  ...props
}: {
  value: string
  onCommit: (value: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [local, setLocal] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Follow outside changes (e.g. "Clear filters" or the Back button).
  if (value !== lastValue) {
    setLastValue(value)
    setLocal(value)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Input
      {...props}
      value={local}
      onChange={(e) => {
        const next = e.target.value
        setLocal(next)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => onCommit(next), DEBOUNCE_MS)
      }}
    />
  )
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FilterField
  value: FilterValues[string]
  onChange: (value: FilterValues[string]) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
      >
        {field.label}
      </label>
      {field.type === 'select' && (
        <Select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">Any</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
      {field.type === 'boolean' && (
        <Select
          id={id}
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
        >
          <option value="">Any</option>
          <option value="true">{field.yesLabel ?? 'Yes'}</option>
          <option value="false">{field.noLabel ?? 'No'}</option>
        </Select>
      )}
      {(field.type === 'text' || field.type === 'number') && (
        <DebouncedInput
          id={id}
          type={field.type === 'number' ? 'number' : 'text'}
          placeholder={field.placeholder}
          value={value === undefined ? '' : String(value)}
          onCommit={(v) => onChange(v === '' ? undefined : field.type === 'number' ? Number(v) : v)}
        />
      )}
    </div>
  )
}

/**
 * Search box + a collapsible panel of filters. It is "controlled": pass the current values
 * and get the new values back; pair it with useUrlFilters so everything lives in the URL.
 */
export function FilterBar({
  fields,
  values,
  onChange,
  onClear,
  className,
}: {
  fields: FilterField[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  onClear: () => void
  className?: string
}) {
  const search = fields.find((f) => f.type === 'search')
  const others = fields.filter((f) => f !== search)
  const active = countActiveFilters(values)
  const activeOther = others.filter((f) => values[f.key] !== undefined).length
  const [open, setOpen] = useState(activeOther > 0)
  const panelId = useId()

  const set = (key: string, value: FilterValues[string]) => onChange({ ...values, [key]: value })

  return (
    <section aria-label="Filters" className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        {search && (
          <div className="relative min-w-64 flex-1 sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <DebouncedInput
              type="search"
              aria-label={search.label}
              placeholder={'placeholder' in search ? search.placeholder : 'Search…'}
              className="pl-9"
              value={typeof values[search.key] === 'string' ? (values[search.key] as string) : ''}
              onCommit={(v) => set(search.key, v === '' ? undefined : v)}
            />
          </div>
        )}
        {others.length > 0 && (
          <Button
            variant="secondary"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
          >
            <ListFilter className="size-4" aria-hidden />
            Filters
            {activeOther > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none text-primary-foreground">
                {activeOther}
              </span>
            )}
          </Button>
        )}
        {active > 0 && (
          <Button variant="ghost" onClick={onClear}>
            <X className="size-4" aria-hidden />
            Clear filters
          </Button>
        )}
      </div>

      {open && others.length > 0 && (
        <div
          id={panelId}
          className="grid grid-cols-1 gap-3.5 rounded-xl border border-border bg-surface p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-4"
        >
          {others.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => set(field.key, v)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
