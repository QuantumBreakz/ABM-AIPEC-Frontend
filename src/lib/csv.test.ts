import { CONTACT_CSV_TEMPLATE, parseCsv, previewContactCsv } from './csv'

describe('parseCsv', () => {
  it('handles quotes, commas inside quotes and Windows line breaks', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ])
  })
})

describe('previewContactCsv', () => {
  it('asks for text first', () => {
    expect(previewContactCsv('').problem).toMatch(/Paste your CSV/)
  })
  it('requires the name columns', () => {
    expect(previewContactCsv('title\nCEO').problem).toMatch(/first_name, last_name/)
  })
  it('rejects unknown columns', () => {
    expect(previewContactCsv('first_name,last_name,phone\nA,B,1').problem).toMatch(/phone/)
  })
  it('needs a data row', () => {
    expect(previewContactCsv('first_name,last_name').problem).toMatch(/at least one row/)
  })
  it('previews at most 10 rows and counts all of them', () => {
    const body = Array.from({ length: 12 }, (_, i) => `A${i},B`).join('\n')
    const preview = previewContactCsv(`first_name,last_name\n${body}`)
    expect(preview.problem).toBeUndefined()
    expect(preview.rows).toHaveLength(10)
    expect(preview.total).toBe(12)
  })
  it('template is the header row only', () => {
    expect(parseCsv(CONTACT_CSV_TEMPLATE)).toHaveLength(1)
  })
})
