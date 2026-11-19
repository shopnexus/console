import { describe, expect, it } from 'vitest'
import { citedIn, parseInline, parseLine, parseMarkdown, plain } from './markdown'
import { SseParser } from './sse'

const known = (n: number) => n <= 3

describe('parseInline', () => {
  it('turns [n] into citations and drops a marker without a source', () => {
    expect(parseInline('Rose to **86** this week [1]. A new group [4] in Thủ Đức[2].', known)).toEqual([
      { kind: 'text', text: 'Rose to ' },
      { kind: 'bold', children: [{ kind: 'text', text: '86' }] },
      { kind: 'text', text: ' this week ' },
      { kind: 'cite', n: 1 },
      { kind: 'text', text: '. A new group in Thủ Đức' },
      { kind: 'cite', n: 2 },
      { kind: 'text', text: '.' },
    ])
  })

  it('reads code and italic', () => {
    expect(parseInline('Call `listing_get` *twice*', known)).toEqual([
      { kind: 'text', text: 'Call ' },
      { kind: 'code', text: 'listing_get' },
      { kind: 'text', text: ' ' },
      { kind: 'italic', children: [{ kind: 'text', text: 'twice' }] },
    ])
  })
})

describe('parseMarkdown', () => {
  it('splits headings, lists and paragraphs', () => {
    const blocks = parseMarkdown('## Summary\n\n- 86 reports [1]\n- 2 rings\n\n1. Hide\n2. Suspend\n\nA paragraph\nwith two lines.', known)
    expect(blocks.map((b) => b.kind)).toEqual(['h', 'ul', 'ol', 'p'])
    expect(blocks[1]).toMatchObject({ kind: 'ul', items: [[{ kind: 'claim', ns: [1], children: [{ kind: 'text', text: '86 reports' }] }], [{ kind: 'text', text: '2 rings' }]] })
  })
})

describe('blocks beyond paragraphs', () => {
  it('reads a fence whole, blank lines included, and one still open', () => {
    const blocks = parseMarkdown('Before\n\n```mermaid\ngraph LR\n\n  A-->B\n```\n\nAfter\n\n```sql\nselect 1', known)
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'code', 'p', 'code'])
    expect(blocks[1]).toEqual({ kind: 'code', lang: 'mermaid', text: 'graph LR\n\n  A-->B', open: false })
    expect(blocks[3]).toEqual({ kind: 'code', lang: 'sql', text: 'select 1', open: true })
  })

  it('reads a table, a quote and a rule', () => {
    const blocks = parseMarkdown('| Kind | Count |\n|---|--:|\n| Scam | **4** |\n\n> Checked [1]\n\n---', known)
    expect(blocks.map((b) => b.kind)).toEqual(['table', 'quote', 'hr'])
    expect(blocks[0]).toMatchObject({ kind: 'table', head: [[{ text: 'Kind' }], [{ text: 'Count' }]], rows: [[[{ text: 'Scam' }], [{ kind: 'bold' }]]] })
    expect(blocks[1]).toMatchObject({ kind: 'quote', inline: [{ kind: 'claim', ns: [1], children: [{ kind: 'text', text: 'Checked' }] }] })
  })

  it('reads links, written and bare, without taking a citation for one', () => {
    expect(parseInline('See [the listing](https://shopnexus.id.vn/listings/1) or https://shopnexus.id.vn/help. [2]', known)).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'link', href: 'https://shopnexus.id.vn/listings/1', children: [{ kind: 'text', text: 'the listing' }] },
      { kind: 'text', text: ' or ' },
      { kind: 'link', href: 'https://shopnexus.id.vn/help', children: [{ kind: 'text', text: 'https://shopnexus.id.vn/help' }] },
      { kind: 'text', text: '. ' },
      { kind: 'cite', n: 2 },
    ])
  })
})

describe('citedIn and plain', () => {
  it('lists citations in order of first use and strips them for copy', () => {
    expect(citedIn('a [2] b [1] c [2]')).toEqual([2, 1])
    expect(plain('Rose to **86** [1].')).toBe('Rose to 86.')
  })
})

describe('SseParser', () => {
  it('joins messages split across chunks and reads id and data', () => {
    const p = new SseParser()
    expect(p.push('id: 1\ndata: {"a"')).toEqual([])
    expect(p.push(':1}\n\nid: 2\r\ndata: x\r\ndata: y\r\n\r\n: keepalive\n\n')).toEqual([
      { id: '1', data: '{"a":1}' },
      { id: '2', data: 'x\ny' },
    ])
  })
})

describe('records and claims', () => {
  const ticket = '01a1f462-e547-70c6-8443-3bf9e6169157'
  const account = '01a1f462-ab19-78f6-97ef-d6e7d2a2f9e8'
  const recordOf = (n: number) => ({ 2: ticket, 3: account })[n]

  it('reads a named record as a chip and drops the marker of that record', () => {
    expect(parseLine(`[Mermaid](ticket:${ticket}) [2] của [No name](account:${account}) [3], mở 15:18.`, known, recordOf)).toEqual([
      { kind: 'record', record: 'ticket', id: ticket, children: [{ kind: 'text', text: 'Mermaid' }] },
      { kind: 'text', text: ' của ' },
      { kind: 'record', record: 'account', id: account, children: [{ kind: 'text', text: 'No name' }] },
      { kind: 'text', text: ', mở 15:18.' },
    ])
  })

  it('keeps a marker that points elsewhere, as a claim on its sentence', () => {
    expect(parseLine(`Đã xem. Có **2 ticket** mở [1] [3]. Xong`, known, recordOf)).toEqual([
      { kind: 'text', text: 'Đã xem. ' },
      { kind: 'claim', ns: [1, 3], children: [{ kind: 'text', text: 'Có ' }, { kind: 'bold', children: [{ kind: 'text', text: '2 ticket' }] }, { kind: 'text', text: ' mở' }] },
      { kind: 'text', text: '. Xong' },
    ])
  })

  it('takes the sentence before a marker set after its full stop', () => {
    expect(parseLine('Hai ticket đang mở.[1]', known)).toEqual([{ kind: 'claim', ns: [1], children: [{ kind: 'text', text: 'Hai ticket đang mở.' }] }])
  })

  it('reads a bare id, and a report_case as a report', () => {
    expect(parseInline(`user ${account.toUpperCase()} and [Case](report_case:${account})`, known)).toEqual([
      { kind: 'text', text: 'user ' },
      { kind: 'id', id: account },
      { kind: 'text', text: ' and ' },
      { kind: 'record', record: 'report', id: account, children: [{ kind: 'text', text: 'Case' }] },
    ])
  })

  it('copies a record as its name', () => {
    expect(plain(`Ticket [Mermaid](ticket:${ticket}) [2]`)).toBe('Ticket Mermaid')
  })
})
