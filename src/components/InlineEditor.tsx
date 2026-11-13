import { useId, useState } from 'react'
import { Button } from './ui/button'
import { Input, Select, Textarea } from './ui/input'

type Value = string | string[] | undefined

/** Everything the editor needs to know about one editable field. */
export type EditSpec = {
  /** The backend's name for the field, for example "website.url". */
  field: string
  /** text: one line · textarea: paragraph · list: one item per line · select: pick from options */
  kind: 'text' | 'textarea' | 'list' | 'select'
  current: Value
  /** Called with the new value (undefined = cleared). The screen updates before the server answers. */
  onSave: (value: Value) => void
  /** True when a person has edited this field before: automatic updates will not overwrite it. */
  locked?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  hint?: string
  /** Return a message to refuse the value, or undefined when it is fine. */
  validate?: (value: Value) => string | undefined
}

const toDraft = (spec: EditSpec) =>
  Array.isArray(spec.current) ? spec.current.join('\n') : (spec.current ?? '')

function parse(spec: EditSpec, draft: string): Value {
  if (spec.kind === 'list') {
    return [
      ...new Set(
        draft
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    ]
  }
  const text = draft.trim()
  return text === '' ? undefined : text
}

const same = (a: Value, b: Value) =>
  JSON.stringify(Array.isArray(a) || Array.isArray(b) ? (a ?? []) : (a ?? null)) ===
  JSON.stringify(Array.isArray(a) || Array.isArray(b) ? (b ?? []) : (b ?? null))

/**
 * The form that replaces a value while it is being edited. Enter saves (one-line fields),
 * Escape cancels, and a value that is not allowed is explained before anything is sent.
 */
export function InlineEditor({
  label,
  spec,
  onClose,
}: {
  label: string
  spec: EditSpec
  onClose: () => void
}) {
  const [draft, setDraft] = useState(() => toDraft(spec))
  const [error, setError] = useState<string>()
  const id = useId()
  const errorId = `${id}-error`

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = parse(spec, draft)
    const message = spec.validate?.(value)
    if (message) {
      setError(message)
      return
    }
    if (!same(value, spec.current)) spec.onSave(value)
    onClose()
  }

  const shared = {
    id,
    autoFocus: true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  } as const

  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {spec.kind === 'select' ? (
        <Select {...shared} value={draft} onChange={(e) => setDraft(e.target.value)}>
          {spec.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : spec.kind === 'text' ? (
        <Input
          {...shared}
          value={draft}
          placeholder={spec.placeholder}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <Textarea
          {...shared}
          value={draft}
          placeholder={spec.placeholder}
          rows={spec.kind === 'list' ? 4 : 5}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      {spec.hint && <p className="text-[13px] text-muted-foreground">{spec.hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-danger-ink">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
