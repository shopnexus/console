// A server-sent events reader for fetch bodies: EventSource cannot send the
// X-Requested-With header the console API requires.

export interface SseMessage {
  id?: string
  event?: string
  data: string
}

/** Splits a stream of text chunks into messages; a message may span chunks. */
export class SseParser {
  private buf = ''

  push(chunk: string): SseMessage[] {
    this.buf += chunk.replace(/\r\n?/g, '\n')
    const out: SseMessage[] = []
    let end: number
    while ((end = this.buf.indexOf('\n\n')) >= 0) {
      const raw = this.buf.slice(0, end)
      this.buf = this.buf.slice(end + 2)
      const msg: SseMessage = { data: '' }
      const data: string[] = []
      for (const line of raw.split('\n')) {
        if (line === '' || line.startsWith(':')) continue
        const at = line.indexOf(':')
        const field = at < 0 ? line : line.slice(0, at)
        const value = at < 0 ? '' : line.slice(at + 1).replace(/^ /, '')
        if (field === 'data') data.push(value)
        else if (field === 'id') msg.id = value
        else if (field === 'event') msg.event = value
      }
      if (data.length === 0) continue
      msg.data = data.join('\n')
      out.push(msg)
    }
    return out
  }
}
