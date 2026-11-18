// The answer's text: a small Markdown subset (paragraphs, headings, lists,
// bold, italic, code) with [n] citation markers. A marker without a source
// is dropped, as the spec asks.

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: Inline[] }
  | { kind: 'italic'; children: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'cite'; n: number }

export type MdBlock =
  | { kind: 'p'; inline: Inline[] }
  | { kind: 'h'; level: 1 | 2 | 3; inline: Inline[] }
  | { kind: 'ul' | 'ol'; items: Inline[][] }

const token = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\d+\])/g

/** Inline Markdown with citations; known says which [n] have a source. */
export function parseInline(text: string, known: (n: number) => boolean): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of text.matchAll(token)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    const t = m[0]
    if (t.startsWith('**')) out.push({ kind: 'bold', children: parseInline(t.slice(2, -2), known) })
    else if (t.startsWith('`')) out.push({ kind: 'code', text: t.slice(1, -1) })
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

/** Splits Markdown into paragraphs, headings and lists. */
export function parseMarkdown(md: string, known: (n: number) => boolean): MdBlock[] {
  const out: MdBlock[] = []
  for (const chunk of md.replace(/\r\n?/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim() !== '')
    if (lines.length === 0) continue
    const h = lines[0].match(/^(#{1,3})\s+(.*)$/)
    if (h && lines.length === 1) {
      out.push({ kind: 'h', level: h[1].length as 1 | 2 | 3, inline: parseInline(h[2], known) })
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
  return md.replace(/\s*\[\d+\]/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
}
