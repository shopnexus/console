import { type ReactNode, useCallback, useState } from 'react'
import { Link } from 'react-router'
import IconArticle from '~icons/material-symbols-light/article-outline-rounded'
import IconFull from '~icons/material-symbols-light/open-in-full-rounded'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconArrow from '~icons/material-symbols-light/arrow-forward-rounded'
import { useDismiss } from '../../lib/dom'
import { splitFigure, useArrival, useCountUp } from '../../lib/motion'
import { type Inline, type MdBlock, parseMarkdown } from '../../lib/markdown'
import { usePanel } from '../../lib/panel'
import type { Block, ChartSeries, Figure, Source } from '../../lib/run'
import { kindName, sourceHref } from '../../lib/sources'
import { Tag } from '../ui'
import { SourceBadge } from './sourceLook'

/** A citation as a numbered chip; a press opens the source it points to. */
export function Cite({ n, turnId }: { n: number; turnId: string }) {
  const { sourcesOf, open: openPanel, panel } = usePanel()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLSpanElement>(open, close)
  const s = sourcesOf(turnId).find((x) => x.n === n)
  const on = open || (panel?.kind === 'sources' && panel.turnId === turnId && panel.n === n)
  const href = s && sourceHref(s)
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Source ${n}`}
        className={`mx-0.5 inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[6px] px-1 align-[2px] text-[11px] font-semibold leading-none ${
          on ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'
        }`}
      >
        {n}
      </button>
      {open && s && (
        <span className="absolute left-[-12px] top-[26px] z-30 block w-[300px] animate-pop rounded-3xl border border-hairline bg-surface-container-lowest p-3 text-left text-body-medium shadow-float">
          <span className="flex items-center gap-2">
            <SourceBadge kind={s.kind} size={24} />
            <span className="min-w-0 flex-1 truncate font-semibold">{s.label}</span>
            <Tag tone="bg-surface-container text-on-surface-variant">{kindName(s.kind)}</Tag>
          </span>
          {s.quote && <span className="mt-2 block rounded-lg border-l-2 border-primary bg-primary/5 px-2.5 py-1.5 text-body-small">{s.quote}</span>}
          <span className="mt-2 flex items-center gap-3 text-body-small font-medium text-primary">
            {href && (
              <Link to={href} className="inline-flex items-center gap-1">
                Open {kindName(s.kind).toLowerCase()}
                <IconOpen width={14} height={14} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                close()
                openPanel({ kind: 'sources', turnId, n })
              }}
            >
              All sources
            </button>
          </span>
        </span>
      )}
    </span>
  )
}

function renderInline(xs: Inline[], turnId: string): ReactNode[] {
  return xs.map((x, i) => {
    switch (x.kind) {
      case 'text':
        return <span key={i}>{x.text}</span>
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
    }
  })
}

/** Markdown with citations, as the answer's text or a document's section. */
export function Markdown({ md, turnId, sources, big = false, caret = false }: { md: string; turnId: string; sources: Source[]; big?: boolean; caret?: boolean }) {
  const known = (n: number) => sources.some((s) => s.n === n)
  const blocks: MdBlock[] = parseMarkdown(md, known)
  const text = big ? 'text-body-large leading-[26px]' : 'text-body-medium leading-[23px]'
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.kind === 'h') {
          const cls = b.level === 1 ? 'text-headline-large' : b.level === 2 ? 'mt-2 text-title-medium' : 'text-title-small'
          return (
            <p key={i} className={cls}>
              {renderInline(b.inline, turnId)}
            </p>
          )
        }
        if (b.kind === 'p') {
          return (
            <p key={i} className={`whitespace-pre-wrap ${text}`}>
              {renderInline(b.inline, turnId)}
              {caret && i === blocks.length - 1 && <Caret />}
            </p>
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
                <span>{renderInline(it, turnId)}</span>
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}

/** The soft caret at the end of text while it is revealed. */
function Caret() {
  return <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse-soft rounded-full bg-primary" />
}

const figureTone = { good: 'text-primary', bad: 'text-error', neutral: 'text-primary' }

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

const seriesFill = ['bg-error', 'bg-chart-2', 'bg-chart-5', 'bg-chart-3', 'bg-chart-1']
const seriesText = ['text-error', 'text-chart-2', 'text-chart-5', 'text-chart-3', 'text-chart-1']

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

export function FollowUps({ items, onAsk }: { items: string[]; onAsk?: (text: string) => void }) {
  return (
    <div className="rise-list flex flex-wrap gap-2">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onAsk?.(t)}
          disabled={!onAsk}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-3.5 text-label-medium font-normal hover:bg-surface-container-low"
        >
          <IconArrow width={16} height={16} className="text-primary" />
          {t}
        </button>
      ))}
    </div>
  )
}

/** The first sources as chips, and "+n more" that opens the panel. */
export function SourceRow({ sources, turnId }: { sources: Source[]; turnId: string }) {
  const { open } = usePanel()
  if (sources.length === 0) return null
  const shown = sources.slice(0, 4)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((s) => (
        <button
          key={s.n}
          type="button"
          onClick={() => open({ kind: 'sources', turnId, n: s.n })}
          className="inline-flex h-7 max-w-[240px] items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest pl-1 pr-2.5 text-label-small font-normal hover:bg-surface-container-low"
        >
          <SourceBadge kind={s.kind} />
          <span className="truncate">{s.label}</span>
        </button>
      ))}
      {sources.length > shown.length && (
        <button type="button" onClick={() => open({ kind: 'sources', turnId })} className="inline-flex h-7 items-center rounded-full px-2.5 text-label-small text-primary hover:bg-surface-container-low">
          +{sources.length - shown.length} more
        </button>
      )}
    </div>
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
  reveal?: { text: string; caret: boolean }
  finished: boolean
}) {
  const firstText = blocks.findIndex((b) => b.type === 'text')
  return (
    <>
      {firstText < 0 && reveal?.text && <Markdown md={reveal.text} turnId={turnId} sources={sources} big caret={reveal.caret} />}
      {blocks.map((b, i) => {
        if (i === firstText && reveal) return <Markdown key={i} md={reveal.text} turnId={turnId} sources={sources} big caret={reveal.caret} />
        if (b.type === 'follow_ups' && (!finished || reveal?.caret)) return null
        return <BlockView key={i} id={`${turnId}:b${i}`} b={b} sources={sources} turnId={turnId} onAsk={onAsk} />
      })}
    </>
  )
}
