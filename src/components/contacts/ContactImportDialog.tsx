import * as Dialog from '@radix-ui/react-dialog'
import { CircleCheck, Download, TriangleAlert, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { ApiError } from '@/api/client'
import { type ImportResult, useImportContacts } from '@/api/queries/contacts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { CONTACT_CSV_TEMPLATE, previewContactCsv } from '@/lib/csv'
import { useFocusReturn } from '@/lib/useFocusReturn'

function downloadTemplate() {
  const blob = new Blob([CONTACT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'contacts-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function ResultView({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-lg border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success-ink"
      >
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Import finished: <strong>{result.created} added</strong>,{' '}
          <strong>{result.updated} updated</strong>
          {result.errors.length > 0 && (
            <>
              , <strong>{result.errors.length} not imported</strong>
            </>
          )}
          .
        </p>
      </div>
      {result.errors.length > 0 && (
        <div>
          <p className="mb-2 text-[0.8125rem] text-muted-foreground">
            These rows were skipped. Fix them and paste only these rows again. The other rows are
            already saved.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-[0.8125rem]">
              <caption className="sr-only">Rows that could not be imported</caption>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Row
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Problem
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((error) => (
                  <tr key={error.row} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 tabular-nums">{error.row}</td>
                    <td className="px-3 py-2 text-danger-ink">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}

function ImportBody({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const id = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<ImportResult>()
  const importContacts = useImportContacts(companyId)
  const preview = useMemo(() => (text.trim() ? previewContactCsv(text) : undefined), [text])

  if (result) return <ResultView result={result} onClose={onClose} />

  const submit = async () => {
    setError(undefined)
    try {
      setResult(await importContacts.mutateAsync(text))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The import failed. Nothing was saved.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={id} className="text-[0.8125rem] font-medium text-foreground">
            CSV text
          </label>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="size-4" aria-hidden />
            Download template
          </Button>
        </div>
        <Textarea
          id={id}
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="first_name,last_name,title,seniority,profile_url,geography,email"
          className="font-mono text-[0.8125rem]"
          spellCheck={false}
        />
        <p className="text-[0.8125rem] text-muted-foreground">
          The first row must be the column names. Required: first_name, last_name. A person with the
          same name is updated, not added twice. Emails are saved as &ldquo;Not checked&rdquo;.
        </p>
      </div>

      {preview?.problem && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {preview.problem}
        </p>
      )}

      {preview && !preview.problem && (
        <section aria-label="Preview">
          <p className="mb-2 text-[0.8125rem] text-muted-foreground">
            Preview: first {preview.rows.length} of {preview.total} rows
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-[0.8125rem]">
              <caption className="sr-only">Preview of the pasted rows</caption>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                  {preview.header.map((h, i) => (
                    <th key={`${h}-${i}`} scope="col" className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, r) => (
                  <tr key={r} className="border-b border-border last:border-0">
                    {preview.header.map((_, c) => (
                      <td key={c} className="px-3 py-2">
                        {row[c]?.trim() || <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="text-[0.8125rem] text-danger-ink">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={importContacts.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => void submit()}
          loading={importContacts.isPending}
          disabled={!preview || !!preview.problem}
        >
          {preview && !preview.problem ? `Import ${preview.total} rows` : 'Import'}
        </Button>
      </div>
    </div>
  )
}

/** Paste a CSV of contacts. Rows that fail are listed; rows that work are saved. */
export function ContactImportDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
}) {
  const focusReturn = useFocusReturn()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-[2px]" />
        <Dialog.Content
          {...focusReturn}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                Import contacts from CSV
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Paste rows copied from a spreadsheet saved as CSV. Check the preview, then import.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          {open && <ImportBody companyId={companyId} onClose={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
