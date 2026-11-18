import { describe, expect, it } from 'vitest'
import { citedIn, parseInline, parseMarkdown, plain } from './markdown'
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
    expect(blocks[1]).toMatchObject({ kind: 'ul', items: [[{ kind: 'text', text: '86 reports ' }, { kind: 'cite', n: 1 }], [{ kind: 'text', text: '2 rings' }]] })
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
