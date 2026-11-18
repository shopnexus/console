// Charts and tiles colour agents and providers by their place in the list.
const fills = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']
const texts = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5']

export const fillAt = (i: number) => fills[((i % fills.length) + fills.length) % fills.length]
export const textAt = (i: number) => texts[((i % texts.length) + texts.length) % texts.length]

/** "$2 · $10" per million tokens in and out, or one price for an embedding model. */
export function price(inUsd?: number, outUsd?: number): string {
  if (inUsd === undefined) return '–'
  return outUsd === undefined ? `$${inUsd}` : `$${inUsd} · $${outUsd}`
}

/** "1M", "200K", "512" tokens of context. */
export function contextSize(n?: number): string {
  if (!n) return '–'
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n)
}
