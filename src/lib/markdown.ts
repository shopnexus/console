// The answer's text: a Markdown subset (paragraphs, headings, lists, quotes,
// tables, rules, fenced code, ```mermaid diagrams, bold, italic, code,
// links) with [n] citation markers. A marker without a source is dropped,
// as the spec asks.

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: Inline[] }
  | { kind: 'italic'; children: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'cite'; n: number }
  | { kind: 'link'; href: string; children: Inline[] }

export type MdBlock =
  | { kind: 'p'; inline: Inline[] }
  | { kind: 'h'; level: 1 | 2 | 3; inline: Inline[] }
  | { kind: 'ul' | 'ol'; items: Inline[][] }
  | { kind: 'quote'; inline: Inline[] }
  | { kind: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { kind: 'hr' }
  /** open: the fence has not closed yet, while the answer streams. */
  | { kind: 'code'; lang: string; text: string; open: boolean }

const token = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|\[\d+\])/g

/** Inline Markdown with citations; known says which [n] have a source. */
export function parseInline(text: string, known: (n: number) => boolean): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of text.matchAll(token)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    const t = m[0]
    const link = t.match(/^\[([^\]]+)\]\((.+)\)$/)
    if (t.startsWith('**')) out.push({ kind: 'bold', children: parseInline(t.slice(2, -2), known) })
    else if (t.startsWith('`')) out.push({ kind: 'code', text: t.slice(1, -1) })
    else if (link) out.push({ kind: 'link', href: link[2], children: parseInline(link[1], known) })
    else if (t.startsWith('http')) out.push({ kind: 'link', href: t, children: [{ kind: 'text', text: t }] })
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

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

/** The blocks of a stretch of Markdown with no fence in it. */
function parseChunks(md: string, known: (n: number) => boolean, out: MdBlock[]) {
  for (const chunk of md.split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim() !== '')
    if (lines.length === 0) continue
    const h = lines[0].match(/^(#{1,3})\s+(.*)$/)
    if (h && lines.length === 1) {
      out.push({ kind: 'h', level: h[1].length as 1 | 2 | 3, inline: parseInline(h[2], known) })
      continue
    }
    if (lines.length === 1 && /^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[0])) {
      out.push({ kind: 'hr' })
      continue
    }
    if (lines.every((l) => /^\s*>/.test(l))) {
      out.push({ kind: 'quote', inline: parseInline(lines.map((l) => l.replace(/^\s*>\s?/, '')).join('\n'), known) })
      continue
    }
    // A table: a header row, a |---| rule, then rows.
    if (lines.length >= 2 && lines[0].includes('|') && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[1])) {
      const row = (l: string) => cells(l).map((c) => parseInline(c, known))
      out.push({ kind: 'table', head: row(lines[0]), rows: lines.slice(2).map(row) })
      continue
    }
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      out.push({ kind: 'ul', items: lines.map((l) => parseInline(l.replace(/^\s*[-*]\s+/, ''), known)) })
      continue
    }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      out.push({ kind: 'ol', items: lines.map((l) => parseInline(l.replace(/^\s*\d+[.)]\s+/, ''), known)) })
      continue
    }
    out.push({ kind: 'p', inline: parseInline(lines.join('\n'), known) })
  }
}

/**
 * Splits Markdown into blocks. A ``` fence is read first, since its code may
 * hold blank lines; one that has not closed runs to the end.
 */
export function parseMarkdown(md: string, known: (n: number) => boolean): MdBlock[] {
  const out: MdBlock[] = []
  const src = md.replace(/\r\n?/g, '\n')
  const fence = /^```[ \t]*([\w-]*)[^\n]*\n([\s\S]*?)(?:\n```[ \t]*$|$(?![\s\S]))/gm
  let last = 0
  for (const m of src.matchAll(fence)) {
    const at = m.index ?? 0
    parseChunks(src.slice(last, at), known, out)
    out.push({ kind: 'code', lang: m[1].toLowerCase(), text: m[2], open: !/\n```[ \t]*$/.test(m[0]) })
    last = at + m[0].length
  }
  parseChunks(src.slice(last), known, out)
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
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}
