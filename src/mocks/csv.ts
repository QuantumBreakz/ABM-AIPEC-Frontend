/** Byte order mark: tells Excel the file is UTF-8 so non-English characters show correctly. */
const BOM = String.fromCharCode(0xfeff)

/** Parse CSV text (handles quotes, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const input = text.startsWith(BOM) ? text.slice(1) : text

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

/** Stop spreadsheets from running a cell as a formula (=, +, -, @). */
function safeCell(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/** Build a CSV file body: UTF-8 BOM first so Excel shows non-English characters correctly. */
export function toCsv(rows: (string | number | undefined)[][]): string {
  const lines = rows.map((row) =>
    row
      .map((value) => {
        const text = safeCell(value === undefined ? '' : String(value))
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      })
      .join(','),
  )
  return `${BOM}${lines.join('\r\n')}\r\n`
}
