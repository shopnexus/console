import { type ReactNode, useMemo, useState } from 'react'
import { Link } from 'react-router'
import IconArticle from '~icons/material-symbols-light/article-outline-rounded'
import IconFull from '~icons/material-symbols-light/open-in-full-rounded'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconNext from '~icons/material-symbols-light/subdirectory-arrow-right-rounded'
import IconChevron from '~icons/material-symbols-light/expand-more-rounded'
import IconRight from '~icons/material-symbols-light/chevron-right-rounded'
import { splitFigure, useArrival, useCountUp } from '../../lib/motion'
import { type Inline, type MdBlock, parseMarkdown } from '../../lib/markdown'
import { usePanel } from '../../lib/panel'
import type { Block, ChartSeries, Figure, Source } from '../../lib/run'
import { clipped, openLabel, sourceHref, sourceLabel, sourceMeta } from '../../lib/sources'
import { count } from '../../lib/format'
import { SourceAvatar } from '../kindLook'
import { Code, Mermaid } from './Mermaid'
import { CitePill, Claim, HoverCard, IdMention, RecordChip, SourceActions, SourceCard } from './Mention'

/** A marker no words back, left as its number: it previews its source on rest; a click opens the sources panel at it. */
export function Cite({ n, turnId }: { n: number; turnId: string }) {
  const { sourcesOf, open: openPanel, panel } = usePanel()
  const s = sourcesOf(turnId).find((x) => x.n === n)
  if (!s) return <CitePill n={n} />
  const showing = panel?.kind === 'sources' && panel.turnId === turnId && panel.n === n
  return (
    <HoverCard
      label={`Source ${n}`}
      width={340}
      prefer="above"
      room={240}
      escape={false}
      trigger={({ set }) => (
        <button
          type="button"
          data-panel-trigger=""
          onClick={() => {
            set(false)
            openPanel(showing ? undefined : { kind: 'sources', turnId, n })
          }}
          aria-label={`Source ${n}: ${sourceLabel(s)}`}
          aria-pressed={showing}
          className="rounded-full"
        >
          <CitePill n={n} className={`cursor-pointer transition-colors duration-[120ms] ${showing ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-highest hover:text-on-surface'}`} />
        </button>
      )}
    >
      {(close) => (
        <>
          <SourceCard s={s} />
          <SourceActions s={s} turnId={turnId} close={close} />
        </>
      )}
    </HoverCard>
  )
}

/** The plain words of inline Markdown: a record chip's name. */
const textOf = (xs: Inline[]): string => xs.map((x) => ('text' in x ? x.text : 'children' in x ? textOf(x.children) : '')).join('')

/** Words still arriving, each its own span keyed by its place, so only the new ones animate. */
function streamed(text: string, key: string): ReactNode {
  return text.match(/\S+\s*|\s+/g)?.map((w, i) => (
    <span key={`${key}-w${i}`} className="stream-word">
      {w}
    </span>
  ))
}

function renderInline(xs: Inline[], turnId: string, streaming = false): ReactNode[] {
  return xs.map((x, i) => {
    // A span with its own marks arrives as one piece, since its marks are only whole once it is.
    if (streaming && x.kind === 'claim') {
      return (
        <Claim key={i} ns={x.ns} turnId={turnId}>
          {renderInline(x.children, turnId, true)}
        </Claim>
      )
    }
    if (streaming && x.kind !== 'text') {
      return (
        <span key={`${i}-s`} className="stream-word">
          {renderInline([x], turnId)}
        </span>
      )
    }
    switch (x.kind) {
      case 'text':
        return <span key={i}>{streaming ? streamed(x.text, String(i)) : x.text}</span>
      case 'bold':
        return (
          <b key={i} className="font-semibold">
            {renderInline(x.children, turnId)}
          </b>
        )
      case 'italic':
        return <em key={i}>{renderInline(x.children, turnId)}</em>
      case 'code':
        return (
          <code key={i} className="rounded-xs bg-surface-container px-1 text-body-small">
            {x.text}
          </code>
        )
      case 'cite':
        return <Cite key={i} n={x.n} turnId={turnId} />
      case 'record':
        return <RecordChip key={i} kind={x.record} id={x.id} label={textOf(x.children)} turnId={turnId} />
      case 'id':
        return <IdMention key={i} id={x.id} turnId={turnId} />
      case 'claim':
        return (
          <Claim key={i} ns={x.ns} turnId={turnId}>
            {renderInline(x.children, turnId)}
          </Claim>
        )
      case 'link':
        return (
          <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            {renderInline(x.children, turnId)}
          </a>
        )
    }
  })
}

/**
 * Markdown with citations, as the answer's text or a document's section.
 * streaming: the text is still arriving, so each new word resolves out of
 * blur and a caret rides the end of the last block.
 */
export function Markdown({ md, turnId, sources, big = false, streaming = false }: { md: string; turnId: string; sources: Source[]; big?: boolean; streaming?: boolean }) {
  const blocks: MdBlock[] = useMemo(() => {
    const known = new Set(sources.map((s) => s.n))
    const records = new Map(sources.map((s) => [s.n, s.record_id?.toLowerCase()]))
    return parseMarkdown(md, (n) => known.has(n), (n) => records.get(n))
  }, [md, sources])
  const text = big ? 'text-body-large leading-[26px]' : 'text-body-medium leading-[23px]'
  return (
    <div className={`space-y-3 ${streaming ? 'streaming-tail' : ''}`}>
      {blocks.map((b, i) => {
        if (b.kind === 'h') {
          const cls = b.level === 1 ? 'text-headline-large' : b.level === 2 ? 'mt-2 text-title-medium' : 'text-title-small'
          return (
            <p key={i} className={cls}>
              {renderInline(b.inline, turnId, streaming)}
            </p>
          )
        }
        if (b.kind === 'p') {
          return (
            <p key={i} className={`whitespace-pre-wrap ${text}`}>
              {renderInline(b.inline, turnId, streaming)}
            </p>
          )
        }
        if (b.kind === 'code') return b.lang === 'mermaid' ? <Mermaid key={i} code={b.text} open={b.open} /> : <Code key={i} text={b.text} />
        if (b.kind === 'hr') return <hr key={i} className="border-outline-variant" />
        if (b.kind === 'quote') {
          return (
            <blockquote key={i} className={`whitespace-pre-wrap border-l-[3px] border-outline-variant pl-3 text-on-surface-variant ${text}`}>
              {renderInline(b.inline, turnId, streaming)}
            </blockquote>
          )
        }
        if (b.kind === 'table') {
          return (
            <div key={i} className="overflow-x-auto">
              <table className={`w-full border-collapse ${text}`}>
                <thead>
                  <tr>
                    {b.head.map((c, j) => (
                      <th key={j} className="border-b border-outline-variant px-2 py-1.5 text-left text-title-small">
                        {renderInline(c, turnId)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, k) => (
                        <td key={k} className="border-b border-outline-variant/60 px-2 py-1.5 align-top">
                          {renderInline(c, turnId, streaming)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        const List = b.kind === 'ul' ? 'ul' : 'ol'
        return (
          <List key={i} className={`space-y-1.5 ${text}`}>
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2.5">
                {b.kind === 'ul' ? (
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                ) : (
                  <span className="w-4 shrink-0 tabular-nums text-on-surface-variant">{j + 1}.</span>
                )}
                <span>{renderInline(it, turnId, streaming)}</span>
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}

// A bad change reads by its arrow, in plain ink; teal marks the good one.
const figureTone = { good: 'text-primary', bad: 'text-on-surface', neutral: 'text-on-surface-variant' }

/** A figure's value, counted up from zero when it arrives. */
function FigureValue({ value, animate }: { value: string; animate: boolean }) {
  const parts = splitFigure(value)
  const n = useCountUp(parts?.n ?? 0, animate && !!parts)
  if (!parts) return <>{value}</>
  return (
    <>
      {parts.before}
      {n.toFixed(parts.decimals)}
      {parts.after}
    </>
  )
}

export function Figures({ items, animate = false }: { items: Figure[]; animate?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map((f, i) => (
        <div key={i} className="rounded-2xl border border-hairline bg-surface-container-lowest px-3.5 py-3">
          <p className="text-display-small tabular-nums">
            <FigureValue value={f.value} animate={animate} />
          </p>
          <p className="text-body-small text-on-surface-variant">{f.label}</p>
          {f.change && <p className={`mt-1 tabular-nums text-label-small ${figureTone[f.tone ?? 'neutral']}`}>{f.change}</p>}
        </div>
      ))}
    </div>
  )
}

export function Table({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-hairline bg-surface-container-lowest">
      <table className="w-full text-left text-body-small">
        <thead className="bg-surface-container-low/60 text-label-small font-normal text-on-surface-variant">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3.5 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-hairline">
              {r.map((c, j) => (
                <td key={j} className={`px-3.5 py-2.5 ${j === 0 ? 'font-medium' : ''} ${typeof c === 'number' ? 'tabular-nums' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const seriesFill = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']
const seriesText = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5']

/** A bar, stacked bar or line chart drawn in CSS and SVG, with its legend. */
export function Chart({ kind, labels, series, title, h = 96 }: { kind: 'bar' | 'stacked_bar' | 'line'; labels: string[]; series: ChartSeries[]; title?: string; h?: number }) {
  const totals = labels.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0))
  const top = Math.max(1, ...(kind === 'stacked_bar' ? totals : series.flatMap((x) => x.values)))
  const legend = (
    <div className="flex flex-wrap gap-3 text-label-small font-normal text-on-surface-variant">
      {series.map((x, i) => (
        <span key={x.name} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-[3px] ${seriesFill[i % seriesFill.length]}`} />
          {x.name}
        </span>
      ))}
    </div>
  )
  let body: ReactNode
  if (kind === 'line') {
    const w = 600
    body = (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="block overflow-visible" aria-label={title}>
        {series.map((x, i) => (
          <polyline
            key={x.name}
            points={x.values.map((v, j) => `${(j * w) / Math.max(1, labels.length - 1)},${h - (v / top) * h}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
            className={seriesText[i % seriesText.length]}
          />
        ))}
      </svg>
    )
  } else {
    body = (
      <div className="flex items-end gap-2" style={{ height: h }}>
        {labels.map((l, i) => (
          <div key={l} title={`${l} · ${totals[i]}`} className={`flex h-full flex-1 items-end ${kind === 'bar' ? 'gap-0.5' : 'flex-col-reverse justify-start'}`}>
            {series.map((x, si) => (
              <span
                key={x.name}
                className={`block ${kind === 'bar' ? 'flex-1 rounded-t-[4px]' : 'w-full last:rounded-t-[5px]'} ${seriesFill[si % seriesFill.length]}`}
                style={{ height: `${((x.values[i] ?? 0) / top) * 100}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="rounded-3xl border border-hairline bg-surface-container-lowest p-4">
      <div className="mb-3 flex items-center gap-3">
        {title && <p className="flex-1 text-title-small">{title}</p>}
        {legend}
      </div>
      {body}
      <div className="mt-1.5 flex gap-2">
        {labels.map((l) => (
          <span key={l} className="flex-1 text-center text-label-small font-normal text-on-surface-variant">
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DocCard({ b, turnId }: { b: Extract<Block, { type: 'document_ref' }>; turnId: string }) {
  const { open, panel } = usePanel()
  const on = panel?.kind === 'doc' && panel.id === b.document_id
  return (
    <button
      type="button"
      onClick={() => open(on ? undefined : { kind: 'doc', id: b.document_id, version: b.version, turnId })}
      className={`flex w-full items-center gap-3 rounded-3xl border p-3 text-left shadow-soft ${on ? 'border-primary/40 bg-primary/4 ring-4 ring-primary/10' : 'border-hairline bg-surface-container-lowest'}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary">
        <IconArticle width={22} height={22} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-title-small">{b.title ?? 'Document'}</span>
        <span className="mt-0.5 block text-body-small text-on-surface-variant">
          Document{b.sections ? ` · ${b.sections} sections` : ''} · version {b.version}
        </span>
      </span>
      <span className="flex h-8 items-center gap-1 rounded-full px-3 text-label-medium text-primary">
        Open
        <IconFull width={15} height={15} />
      </span>
    </button>
  )
}

/**
 * What the agent offered to ask next (AI Portal's next-action chips): a
 * click sends it, and the whole suggestion shows. They fade up one after
 * another when they arrive.
 */
export function FollowUps({ items, onAsk }: { items: string[]; onAsk?: (text: string) => void }) {
  const arrived = useArrival(items.length ? `next:${items.join('\n')}` : undefined)
  if (items.length === 0) return null
  return (
    <fieldset className="flex w-full min-w-0 flex-wrap gap-2">
      <legend className="sr-only">Suggested next questions</legend>
      {items.map((t, i) => (
        <button
          key={t}
          type="button"
          title={`Ask: ${t}`}
          onClick={() => onAsk?.(t)}
          disabled={!onAsk}
          style={arrived ? { animation: `fade-up 220ms var(--act-ease-out) ${80 + Math.min(i, 4) * 50}ms both` } : undefined}
          className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-3 py-1 text-left text-[13px] text-on-surface transition-colors duration-150 hover:bg-surface-container-low disabled:cursor-default disabled:hover:bg-surface-container-lowest"
        >
          <IconNext width={14} height={14} className="shrink-0 text-outline" aria-hidden />
          <span className="min-w-0 break-words">{t}</span>
        </button>
      ))}
    </fieldset>
  )
}

const sourceRow = 'flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-surface-container-low'

function SourceLabel({ s }: { s: Source }) {
  return (
    <>
      <CitePill n={s.n} className="m-0 shrink-0" />
      <SourceAvatar seed={sourceLabel(s)} />
      <span className="min-w-0 flex-1 leading-4">
        <span title={sourceLabel(s)} className="block truncate text-[14px] font-medium leading-5 text-on-surface">
          {sourceLabel(s)}
        </span>
        <span className="block truncate text-[12.5px] text-outline">{sourceMeta(s)}</span>
      </span>
    </>
  )
}

/** A source with a quote: closed by default and per source, opening to what the answer rested on. */
function QuotedSource({ s }: { s: Source }) {
  const [open, setOpen] = useState(false)
  const href = sourceHref(s)
  return (
    <div className="flex min-w-0 flex-col">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={sourceRow}>
        <SourceLabel s={s} />
        <IconChevron width={16} height={16} aria-hidden className={`shrink-0 text-outline transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-2 pb-3 pl-[52px] pr-4">
          <figure className="border-l-2 border-primary pl-3">
            <blockquote className="text-[13.5px] leading-[21px] text-on-surface-variant">{clipped(s.quote ?? '')}</blockquote>
            {href && (
              <figcaption className="mt-1">
                <Link to={href} className="-ml-2.5 flex h-7 w-fit items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-on-surface transition-colors duration-150 hover:bg-on-surface/8">
                  <IconOpen width={14} height={14} aria-hidden />
                  {openLabel(s)}
                </Link>
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </div>
  )
}

/** The answer's sources as one bordered list, numbered the way the answer marks them (AI Portal's source list). */
export function SourceList({ sources, turnId }: { sources: Source[]; turnId: string }) {
  const { open } = usePanel()
  return (
    <div className="mt-2 flex min-w-0 flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-[13px] font-medium text-on-surface">
          {count(sources.length, 'source')}
        </span>
        <span className="text-[12px] text-outline">Numbers match the marks in the answer</span>
      </div>
      {sources.map((s) => {
        const href = sourceHref(s)
        if (s.quote) return <QuotedSource key={s.n} s={s} />
        if (href) {
          return (
            <Link key={s.n} to={href} className={sourceRow}>
              <SourceLabel s={s} />
              <IconOpen width={15} height={15} aria-hidden className="shrink-0 text-outline" />
            </Link>
          )
        }
        // Nothing to quote or open here: the sources panel has its facts and its tool call.
        return (
          <button key={s.n} type="button" data-panel-trigger="" onClick={() => open({ kind: 'sources', turnId, n: s.n })} className={sourceRow}>
            <SourceLabel s={s} />
            <IconRight width={16} height={16} aria-hidden className="shrink-0 text-outline" />
          </button>
        )
      })}
    </div>
  )
}

/** The sources toggle in the reply actions: three stacked letter marks and "N sources". */
export function SourcesButton({ sources, open, onToggle }: { sources: Source[]; open: boolean; onToggle: () => void }) {
  if (sources.length === 0) return null
  return (
    <button type="button" aria-expanded={open} onClick={onToggle} className="ml-1 flex h-8 items-center gap-1.5 rounded-lg px-2 text-left transition-colors duration-[120ms] hover:bg-on-surface/8">
      <span className="flex -space-x-1">
        {sources.slice(0, 3).map((s) => (
          <SourceAvatar key={s.n} seed={sourceLabel(s)} size={14} ring />
        ))}
      </span>
      <span className="text-[12.5px] leading-4 text-on-surface-variant">
        {count(sources.length, 'source')}
      </span>
    </button>
  )
}

/** One block, rising in once when it arrives now; history draws still. */
function BlockView({ b, sources, turnId, onAsk, id }: { b: Block; sources: Source[]; turnId: string; onAsk?: (text: string) => void; id: string }) {
  const arrived = useArrival(id)
  const rise = arrived ? 'animate-rise' : ''
  switch (b.type) {
    case 'figures':
      return (
        <div className={rise}>
          <Figures items={b.items} animate={arrived} />
        </div>
      )
    case 'table':
      return (
        <div className={rise}>
          <Table columns={b.columns} rows={b.rows} />
        </div>
      )
    case 'chart':
      return (
        <div className={rise}>
          <Chart kind={b.kind} labels={b.labels} series={b.series} title={b.title} />
        </div>
      )
    case 'document_ref':
      return (
        <div className={rise}>
          <DocCard b={b} turnId={turnId} />
        </div>
      )
    case 'follow_ups':
      return <FollowUps items={b.items} onAsk={onAsk} />
    case 'text':
      return <Markdown md={b.markdown} turnId={turnId} sources={sources} big />
    default:
      return null
  }
}

/**
 * The answer's blocks in order. reveal stands in for the first text block
 * (or the draft before it) while it is revealed; follow-ups wait for the
 * answer to finish.
 */
export function Blocks({
  blocks,
  sources,
  turnId,
  onAsk,
  reveal,
  finished,
}: {
  blocks: Block[]
  sources: Source[]
  turnId: string
  onAsk?: (text: string) => void
  reveal?: { text: string; streaming: boolean }
  finished: boolean
}) {
  const firstText = blocks.findIndex((b) => b.type === 'text')
  return (
    <>
      {firstText < 0 && reveal?.text && <Markdown md={reveal.text} turnId={turnId} sources={sources} big streaming={reveal.streaming} />}
      {blocks.map((b, i) => {
        if (i === firstText && reveal) return <Markdown key={i} md={reveal.text} turnId={turnId} sources={sources} big streaming={reveal.streaming} />
        // Follow-ups belong to the latest answer once it is whole; an older one's would send out of turn.
        if (b.type === 'follow_ups' && (!finished || reveal?.streaming || !onAsk)) return null
        return <BlockView key={i} id={`${turnId}:b${i}`} b={b} sources={sources} turnId={turnId} onAsk={onAsk} />
      })}
    </>
  )
}
