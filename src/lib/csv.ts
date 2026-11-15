/** Contact import columns, in the order of the downloadable template. */
export const CONTACT_CSV_COLUMNS = [
  'first_name',
  'last_name',
  'title',
  'seniority',
  'profile_url',
  'geography',
  'email',
] as const

const REQUIRED = ['first_name', 'last_name']

/** Parse CSV text (handles quotes, commas and line breaks inside quotes). Empty lines are skipped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

export type CsvPreview = {
  header: string[]
  rows: string[][]
  /** Number of data rows (the header row is not counted). */
  total: number
  /** A problem with the header that stops the import, in plain words. */
  problem?: string
}

/** Check the pasted text before sending it, and return the first rows for the preview. */
export function previewContactCsv(text: string, limit = 10): CsvPreview {
  const all = parseCsv(text)
  const header = (all[0] ?? []).map((h) => h.trim().toLowerCase())
  const rows = all.slice(1)
  const base = { header, rows: rows.slice(0, limit), total: rows.length }
  if (all.length === 0) return { ...base, problem: 'Paste your CSV first.' }
  const missing = REQUIRED.filter((c) => !header.includes(c))
  if (missing.length > 0) {
    return { ...base, problem: `The first row must contain these columns: ${missing.join(', ')}.` }
  }
  const unknown = header.filter((h) => !(CONTACT_CSV_COLUMNS as readonly string[]).includes(h))
  if (unknown.length > 0) return { ...base, problem: `Unknown columns: ${unknown.join(', ')}.` }
  if (rows.length === 0) return { ...base, problem: 'Add at least one row under the header.' }
  return base
}

/** Header row only, with a byte order mark so Excel opens it as UTF-8. */
export const CONTACT_CSV_TEMPLATE = `${String.fromCharCode(0xfeff)}${CONTACT_CSV_COLUMNS.join(',')}\r\n`
