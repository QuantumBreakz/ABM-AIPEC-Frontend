import { useUpdateCompany } from '@/api/queries/companies'
import type { Company } from '@/api/types'
import type { EditSpec } from '@/components/InlineEditor'
import { type EditableField, validateUrl } from '@/lib/patch'

type Extra = Partial<Pick<EditSpec, 'placeholder' | 'hint' | 'options' | 'validate'>>

/**
 * Builds the edit settings for a company's fields. Saving sends a PATCH; the screen changes at once
 * and the old value comes back if the server refuses. A field a person edited earlier shows a lock.
 */
export function useCompanyEdit(company: Company) {
  const update = useUpdateCompany(company.id)
  const locked = (field: EditableField) => company.lockedFields.includes(field)

  const make =
    (kind: EditSpec['kind']) =>
    (field: EditableField, current: EditSpec['current'], extra: Extra = {}): EditSpec => ({
      field,
      kind,
      current,
      locked: locked(field),
      // an empty text field is sent as null (clear it); an empty list as []
      onSave: (value) => update.mutate({ [field]: value ?? (kind === 'list' ? [] : null) }),
      ...extra,
    })

  return {
    text: make('text'),
    textarea: make('textarea'),
    list: make('list'),
    select: make('select'),
    /** A web address field: must be http(s) or empty. */
    url: (field: EditableField, current: string | undefined, extra: Extra = {}) =>
      make('text')(field, current, {
        placeholder: 'https://www.example.com',
        validate: validateUrl,
        ...extra,
      }),
    /** A list of web addresses, one per line. */
    urlList: (field: EditableField, current: string[], extra: Extra = {}) =>
      make('list')(field, current, {
        placeholder: 'https://…',
        hint: 'One web address per line.',
        validate: validateUrl,
        ...extra,
      }),
  }
}
