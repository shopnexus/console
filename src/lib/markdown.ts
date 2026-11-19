// The answer's text: a Markdown subset (paragraphs, headings, lists, quotes,
// tables, rules, fenced code, ```mermaid diagrams, bold, italic, code,
// links) with [n] citation markers. A marker without a source is dropped,
// as the spec asks. [Name](ticket:<id>) names a record, drawn as a chip.

/** The records an answer may name, as the agent writes them: [Name](account:<id>). */
export type RecordKind = 'account' | 'ticket' | 'listing' | 'order' | 'report'

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: Inline[] }
  | { kind: 'italic'; children: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'cite'; n: number }
  | { kind: 'link'; href: string; children: Inline[] }
  | { kind: 'record'; record: RecordKind; id: string; children: Inline[] }
  /** A bare id the agent left in the text. */
  | { kind: 'id'; id: string }
  /** The words a citation backs, from the sentence's start to its markers. */
  | { kind: 'claim'; ns: number[]; children: Inline[] }

export type MdBlock =
  | { kind: 'p'; inline: Inline[] }
  | { kind: 'h'; level: 1 | 2 | 3; inline: Inline[] }
  | { kind: 'ul' | 'ol'; items: Inline[][] }
  | { kind: 'quote'; inline: Inline[] }
  | { kind: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { kind: 'hr' }
  /** open: the fence has not closed yet, while the answer streams. */
  | { kind: 'code'; lang: string; text: string; open: boolean }

const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const recordLink = new RegExp(`^\\[([^\\]]+)\\]\\((account|ticket|listing|order|report|report_case):(${uuid})\\)$`)
const token = new RegExp(
  [
    '\\*\\*[^*]+\\*\\*',
    '\\*[^*\\s][^*]*\\*',
    '`[^`]+`',
    `\\[[^\\]\\n]+\\]\\((?:account|ticket|listing|order|report|report_case):${uuid}\\)`,
    '\\[[^\\]\\n]+\\]\\(https?:\\/\\/[^)\\s]+\\)',
    'https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?\'"]',
    `\\b${uuid}\\b`,
    '\\[\\d+\\]',
  ].join('|'),
  'g',
)

/** Inline Markdown with citations; known says which [n] have a source. */
export function parseInline(text: string, known: (n: number) => boolean): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of text.matchAll(token)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    const t = m[0]
    const rec = t.match(recordLink)
    const link = t.match(/^\[([^\]]+)\]\((.+)\)$/)
    if (rec) out.push({ kind: 'record', record: rec[2] === 'report_case' ? 'report' : (rec[2] as RecordKind), id: rec[3].toLowerCase(), children: parseInline(rec[1], known) })
    else if (t.startsWith('**')) out.push({ kind: 'bold', children: parseInline(t.slice(2, -2), known) })
    else if (t.startsWith('`')) out.push({ kind: 'code', text: t.slice(1, -1) })
    else if (link) out.push({ kind: 'link', href: link[2], children: parseInline(link[1], known) })
    else if (t.startsWith('http')) out.push({ kind: 'link', href: t, children: [{ kind: 'text', text: t }] })
    else if (/^[0-9a-f]{8}-/i.test(t)) out.push({ kind: 'id', id: t.toLowerCase() })
    else if (t.startsWith('[')) {
      const n = Number(t.slice(1, -1))
      if (known(n)) out.push({ kind: 'cite', n })
      else {
        // The space before a dropped marker goes with it.
        const prev = out[out.length - 1]
        if (prev?.kind === 'text') prev.text = prev.text.replace(/ +$/, '')
      }
    } else out.push({ kind: 'italic', children: parseInline(t.slice(1, -1), known) })
    last = at + t.length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  // Adjacent text pieces join.
  return out.reduce<Inline[]>((acc, x) => {
    const prev = acc[acc.length - 1]
    if (x.kind === 'text' && prev?.kind === 'text') prev.text += x.text
    else acc.push(x)
    return acc
  }, [])
}

/** Which record a source is, so a marker after that record's chip can go. */
export type RecordOf = (n: number) => string | undefined

const idOf = (x: Inline | undefined) => (x?.kind === 'record' || x?.kind === 'id' ? x.id : undefined)
const blank = (x: Inline | undefined) => x?.kind === 'text' && x.text.trim() === ''

/**
 * Drops a marker that follows the chip of the record it points to: the
 * chip already opens that record, so "[No name](account:…) [3]" reads as
 * the chip alone.
 */
export function foldCites(xs: Inline[], recordOf: RecordOf): Inline[] {
  const out: Inline[] = []
  for (const x of xs) {
    if (x.kind === 'cite') {
      const gap = blank(out[out.length - 1])
      const before = out[out.length - (gap ? 2 : 1)]
      const id = idOf(before)
      if (id && id === recordOf(x.n)) {
        if (gap) out.pop()
        continue
      }
    }
    out.push(x)
  }
  return out
}

// A sentence ends at . ! ? ; : and a space, or at a line break.
const sentenceEnd = /[.!?;:](?=\s)\s*|\n/g

/**
 * Turns the markers left into claims: the words from the sentence's start
 * to its markers, drawn with a dotted line that shows the sources on rest.
 * A marker with no words before it in its sentence stays a marker.
 */
export function groupClaims(xs: Inline[]): Inline[] {
  const out: Inline[] = []
  let i = 0
  while (i < xs.length) {
    const x = xs[i]
    if (x.kind !== 'cite') {
      out.push(x)
      i++
      continue
    }
    // Markers side by side, with only spaces between, back one claim.
    const ns = [x.n]
    let j = i + 1
    while (j < xs.length) {
      const y = xs[j]
      if (y.kind === 'cite') {
        if (!ns.includes(y.n)) ns.push(y.n)
      } else if (!(blank(y) && xs[j + 1]?.kind === 'cite')) break
      j++
    }
    // Walk back to the sentence's start.
    const words: Inline[] = []
    while (out.length) {
      const prev = out[out.length - 1]
      if (prev.kind === 'claim') break
      if (prev.kind === 'text') {
        let cut = -1
        for (const m of prev.text.matchAll(sentenceEnd)) if ((m.index ?? 0) + m[0].length < prev.text.trimEnd().length) cut = (m.index ?? 0) + m[0].length
        if (cut >= 0) {
          words.unshift({ kind: 'text', text: prev.text.slice(cut) })
          prev.text = prev.text.slice(0, cut)
          break
        }
      }
      words.unshift(prev)
      out.pop()
    }
    // The space before the markers stays outside the line.
    const last = words[words.length - 1]
    if (last?.kind === 'text') {
      last.text = last.text.trimEnd()
      if (!last.text) words.pop()
    }
    if (words.length === 0) {
      out.push(...ns.map((n) => ({ kind: 'cite', n }) as Inline))
    } else {
      const first = words[0]
      let lead = ''
      if (first.kind === 'text') {
        lead = first.text.match(/^\s*/)?.[0] ?? ''
        first.text = first.text.slice(lead.length)
      }
      if (lead) out.push({ kind: 'text', text: lead })
      out.push({ kind: 'claim', ns, children: words })
    }
    i = j
  }
  return out.filter((x) => !(x.kind === 'text' && x.text === ''))
}

/** A line of the answer: inline Markdown, markers folded into chips and claims. */
export function parseLine(text: string, known: (n: number) => boolean, recordOf: RecordOf = () => undefined): Inline[] {
  return groupClaims(foldCites(parseInline(text, known), recordOf))
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

/** The blocks of a stretch of Markdown with no fence in it. */
function parseChunks(md: string, known: (n: number) => boolean, recordOf: RecordOf, out: MdBlock[]) {
  const line = (text: string) => parseLine(text, known, recordOf)
  for (const chunk of md.split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim() !== '')
    if (lines.length === 0) continue
    const h = lines[0].match(/^(#{1,3})\s+(.*)$/)
    if (h && lines.length === 1) {
      out.push({ kind: 'h', level: h[1].length as 1 | 2 | 3, inline: line(h[2]) })
      continue
    }
    if (lines.length === 1 && /^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[0])) {
      out.push({ kind: 'hr' })
      continue
    }
    if (lines.every((l) => /^\s*>/.test(l))) {
      out.push({ kind: 'quote', inline: line(lines.map((l) => l.replace(/^\s*>\s?/, '')).join('\n')) })
      continue
    }
    // A table: a header row, a |---| rule, then rows.
    if (lines.length >= 2 && lines[0].includes('|') && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[1])) {
      const row = (l: string) => cells(l).map(line)
      out.push({ kind: 'table', head: row(lines[0]), rows: lines.slice(2).map(row) })
      continue
    }
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      out.push({ kind: 'ul', items: lines.map((l) => line(l.replace(/^\s*[-*]\s+/, ''))) })
      continue
    }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      out.push({ kind: 'ol', items: lines.map((l) => line(l.replace(/^\s*\d+[.)]\s+/, ''))) })
      continue
    }
    out.push({ kind: 'p', inline: line(lines.join('\n')) })
  }
}

/**
 * Splits Markdown into blocks. A ``` fence is read first, since its code may
 * hold blank lines; one that has not closed runs to the end.
 */
export function parseMarkdown(md: string, known: (n: number) => boolean, recordOf: RecordOf = () => undefined): MdBlock[] {
  const out: MdBlock[] = []
  const src = md.replace(/\r\n?/g, '\n')
  const fence = /^```[ \t]*([\w-]*)[^\n]*\n([\s\S]*?)(?:\n```[ \t]*$|$(?![\s\S]))/gm
  let last = 0
  for (const m of src.matchAll(fence)) {
    const at = m.index ?? 0
    parseChunks(src.slice(last, at), known, recordOf, out)
    out.push({ kind: 'code', lang: m[1].toLowerCase(), text: m[2], open: !/\n```[ \t]*$/.test(m[0]) })
    last = at + m[0].length
  }
  parseChunks(src.slice(last), known, recordOf, out)
  return out
}

/** The citation numbers a text uses, in order of first use. */
export function citedIn(md: string): number[] {
  const seen: number[] = []
  for (const m of md.matchAll(/\[(\d+)\]/g)) {
    const n = Number(m[1])
    if (!seen.includes(n)) seen.push(n)
  }
  return seen
}

/** Plain text of a Markdown string without markers, for copy. */
export function plain(md: string): string {
  return md
    .replace(/\s*\[\d+\]/g, '')
    .replace(/\[([^\]]+)\]\((?:account|ticket|listing|order|report|report_case):[0-9a-fA-F-]{36}\)/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}
