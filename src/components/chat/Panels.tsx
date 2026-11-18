import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import IconArticle from '~icons/material-symbols-light/article-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconLeft from '~icons/material-symbols-light/chevron-left-rounded'
import IconRight from '~icons/material-symbols-light/chevron-right-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconData from '~icons/material-symbols-light/data-object-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconLess from '~icons/material-symbols-light/expand-less-rounded'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconTool from '~icons/material-symbols-light/build-outline-rounded'
import IconPrint from '~icons/material-symbols-light/print-outline-rounded'
import { type DocSection, type DocumentVersion, useDocument, useToolCall } from '../../lib/agent'
import { duration, time, when } from '../../lib/format'
import { usePanel } from '../../lib/panel'
import { reducedMotion } from '../../lib/motion'
import type { Source, SourceKind, ToolCall } from '../../lib/run'
import { accountStatus, hasName, kindOf, kindPlural, openLabel, sourceHref, sourceKinds, sourceLabel, sourceMeta } from '../../lib/sources'
import { useMe } from '../../lib/session'
import { toolInfo } from '../../lib/tools'
import { IconBtn, Initial, Segmented, Tag } from '../ui'
import { Chart, Markdown, Table } from './Answer'
import { KindIcon, SourceBadge } from './sourceLook'

/** The one panel shell beside a chat: a header, then a body that scrolls. bare fills the sheet a tool call floats in instead. */
export function SidePanel({ width = 'w-[480px]', head, children, bare = false }: { width?: string; head: ReactNode; children: ReactNode; bare?: boolean }) {
  return (
    <aside className={bare ? 'flex min-h-0 flex-1 flex-col bg-surface-container-low/50' : `flex shrink-0 animate-panel flex-col border-l border-hairline bg-surface-container-low/50 ${width}`}>
      <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface-container-lowest px-4 py-2.5">{head}</div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </aside>
  )
}

function CloseBtn() {
  const { open } = usePanel()
  return (
    <IconBtn title="Close" onClick={() => open(undefined)}>
      <IconClose width={18} height={18} />
    </IconBtn>
  )
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Without clipboard access the button does nothing.
  }
}

/** A JSON value with keys, strings and numbers in their colours, numbered by line. */
function Json({ value }: { value: unknown }) {
  const lines = JSON.stringify(value ?? null, null, 2).split('\n')
  const paint = (line: string) =>
    line.split(/("(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*"|\b-?\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/).map((part, i) => {
      if (/^".*"$/.test(part)) {
        const key = line.slice(line.indexOf(part) + part.length).trimStart().startsWith(':')
        return (
          <span key={i} className={key ? 'text-code-key' : 'text-code-string'}>
            {part}
          </span>
        )
      }
      if (/^(-?\d|true|false|null)/.test(part)) {
        return (
          <span key={i} className="text-code-number">
            {part}
          </span>
        )
      }
      return part
    })
  return (
    <div className="overflow-x-auto rounded-2xl bg-surface-container-low p-3.5 font-mono text-[12.5px] leading-5">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-3">
          <span className="w-5 shrink-0 select-none text-right text-on-surface-variant/50">{i + 1}</span>
          <span className="whitespace-pre">{paint(l)}</span>
        </div>
      ))}
    </div>
  )
}

/** An object's top-level fields as label and value rows; nested values show as compact JSON. */
function Fields({ value }: { value: unknown }) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return <Json value={value} />
  return (
    <table className="w-full text-body-small">
      <tbody>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <tr key={k} className="border-t border-hairline first:border-t-0">
            <td className="w-[130px] py-2 pr-3 align-top text-on-surface-variant">{k.replace(/_/g, ' ')}</td>
            <td className="py-2 break-words">{typeof v === 'object' && v !== null ? <code className="text-label-small font-normal">{JSON.stringify(v)}</code> : String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Box({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-hairline bg-surface-container-lowest p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <p className="flex-1 text-label-small text-on-surface-variant">{title}</p>
        {right}
      </div>
      {children}
    </div>
  )
}

type ToolTab = 'result' | 'input' | 'raw' | 'timing'

/** One tool call: its result, its input, the raw request and response, and where the time went. */
/**
 * A panel over the chat, at its right edge: the tool call or the sources.
 * It takes no room, so the thread keeps its width and its place. A click
 * outside it or Esc closes it; a press on what opens a panel
 * ([data-panel-trigger]) is that control's own, to close or switch. Focus
 * moves into it when it opens. An overlay under another one is inactive.
 */
export function Overlay({
  label,
  width = 'w-[480px]',
  leaving,
  active = true,
  onClose,
  children,
}: {
  label: string
  width?: string
  leaving: boolean
  active?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.focus(), [])
  useEffect(() => {
    if (!active) return
    const down = (e: PointerEvent) => {
      const t = e.target as Element
      if (ref.current?.contains(t) || t.closest?.('[data-panel-trigger]')) return
      onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Esc closes this rather than pausing the run behind it.
      e.stopPropagation()
      e.preventDefault()
      onClose()
    }
    document.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      window.removeEventListener('keydown', key, true)
    }
  }, [active, onClose])
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={label}
      className={`absolute inset-y-3 right-3 z-40 flex ${width} max-w-[calc(100%-24px)] flex-col overflow-hidden rounded-3xl border border-hairline bg-surface-container-lowest shadow-float outline-none ${leaving ? 'animate-panel-out' : 'animate-panel'}`}
    >
      {children}
    </div>
  )
}

export function ToolPanel({ id, bare = false }: { id: string; bare?: boolean }) {
  const call = useToolCall(id)
  const [tab, setTab] = useState<ToolTab>('result')
  const c = call.data
  const failed = c?.status === 'failed'
  const t = c?.timing
  const q = t?.queued ?? 0
  const sv = t?.server ?? 0
  const total = t ? q + sv + (t.return ?? 0) : (c?.duration_ms ?? 0)
  // Parts the server did not report (null) are left out.
  const bars: [string, number, number, string][] = t
    ? ([
        t.queued !== null && ['Queued', 0, q, 'bg-outline-variant'],
        t.server !== null && ['MCP server', q, sv, 'bg-primary'],
        t.db !== null && ['Database', q + Math.max(0, sv - t.db) / 2, t.db, 'bg-primary/50'],
        t.return !== null && ['Return', q + sv, t.return, 'bg-outline-variant'],
      ].filter(Boolean) as [string, number, number, string][])
    : []
  return (
    <SidePanel
      bare={bare}
      head={
        <>
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${failed ? 'bg-error-container text-error' : 'bg-primary/8 text-primary'}`}>
            {failed ? <IconError width={20} height={20} /> : <IconData width={20} height={20} />}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-2 text-title-medium">
              {c?.tool ?? 'Tool call'}
              {c?.duration_ms !== undefined && (
                <Tag tone={failed ? 'bg-error-container text-error' : undefined}>
                  {failed ? <IconError width={13} height={13} /> : <IconCheck width={13} height={13} />}
                  {duration(c.duration_ms)}
                </Tag>
              )}
            </p>
            <p className="mt-0.5 truncate tabular-nums text-body-small text-on-surface-variant">
              {[c ? time(c.started_at) : '', c && c.attempts > 1 ? `${c.attempts} attempts` : '', 'read-only'].filter(Boolean).join(' · ')}
            </p>
          </div>
          {c && (
            <IconBtn title="Copy JSON" onClick={() => void copy(JSON.stringify({ input: c.input, output: c.output }, null, 2))}>
              <IconCopy width={17} height={17} />
            </IconBtn>
          )}
          <CloseBtn />
        </>
      }
    >
      <div className="px-4 py-2.5">
        <Segmented
          full
          label="Tool call"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'result', label: 'Result' },
            { value: 'input', label: 'Input' },
            { value: 'raw', label: 'Raw JSON' },
            { value: 'timing', label: 'Timing' },
          ]}
        />
      </div>
      <div className="space-y-3 px-4 pb-4">
        {call.error && <p className="text-body-small text-error">This tool call did not load.</p>}
        {c && tab === 'result' && (
          <Box title={c.tool ? toolInfo(c.tool).label : 'Result'}>
            {c.output === undefined ? (
              <p className="text-body-small text-on-surface-variant">{c.status === 'running' ? 'Still running' : 'No result'}</p>
            ) : (
              <Fields value={c.output} />
            )}
            {c.output_spilled && <p className="mt-2 text-body-small text-on-surface-variant">The result was too long to keep whole.</p>}
          </Box>
        )}
        {c && tab === 'input' && (
          <Box title="Input">
            <Fields value={c.input ?? {}} />
          </Box>
        )}
        {c && tab === 'raw' && (
          <>
            <Box
              title="Request"
              right={
                <button type="button" onClick={() => void copy(JSON.stringify(c.input ?? {}, null, 2))} className="text-label-small text-primary">
                  Copy
                </button>
              }
            >
              <Json value={c.input ?? {}} />
            </Box>
            <Box
              title={`Response${c.output_spilled ? ' · cut' : ''}`}
              right={
                <button type="button" onClick={() => void copy(JSON.stringify(c.output ?? null, null, 2))} className="text-label-small text-primary">
                  Copy
                </button>
              }
            >
              <Json value={c.output ?? null} />
            </Box>
          </>
        )}
        {c && (tab === 'timing' || tab === 'result') && (bars.length > 0 || (c.attempt_errors?.length ?? 0) > 0) && (
          <Box title="Timing" right={<span className="tabular-nums text-label-small font-normal text-on-surface-variant">{duration(total)}</span>}>
            <div className="space-y-2">
              {bars.map(([label, start, len, tone]) => (
                <div key={label} className="flex items-center gap-3 text-body-small">
                  <span className="w-[92px] text-on-surface-variant">{label}</span>
                  <div className="relative h-2 flex-1 rounded-full bg-surface-container">
                    <span className={`absolute h-full rounded-full ${tone}`} style={{ left: `${(start / total) * 100}%`, width: `${Math.max(2, (len / total) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right tabular-nums">{duration(len)}</span>
                </div>
              ))}
              {c.attempt_errors?.map((a) => (
                <p key={a.attempt} className="flex items-center gap-2 text-body-small">
                  <IconClose width={15} height={15} className="text-error" />
                  <span className="w-[70px] text-on-surface-variant">Attempt {a.attempt}</span>
                  <span className="min-w-0 flex-1 truncate" title={a.error}>
                    {a.error}
                  </span>
                  <span className="tabular-nums text-on-surface-variant">{time(a.at)}</span>
                </p>
              ))}
            </div>
          </Box>
        )}
      </div>
    </SidePanel>
  )
}

/** A turn's sources by kind, with the quoted line; the cited one is ringed. */
/** One source as a row: its mark, name, meta, number and quote; pressed, it opens in place to the quote, facts and actions. */
function SourceItem({ s, open, onToggle, call, admin }: { s: Source; open: boolean; onToggle: () => void; call?: ToolCall; admin: boolean }) {
  const { open: openPanel } = usePanel()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const kind = kindOf(s.kind)
  const named = hasName(s)
  const label = sourceLabel(s)
  const href = sourceHref(s, admin)
  const facts = (s.facts ?? []).slice(0, 4)
  const viewCall = s.call_id ? () => openPanel({ kind: 'tool', id: s.call_id! }) : undefined
  const lead =
    named && (kind === 'account' || kind === 'report' || kind === 'member') ? (
      <Initial name={label} id={s.record_id ?? label} size={32} status={accountStatus(s)} member={kind === 'member'} />
    ) : (
      <SourceBadge kind={kind} size={32} tile />
    )
  const ran = [s.tool ?? call?.tool, call?.durationMs !== undefined ? duration(call.durationMs) : undefined].filter(Boolean).join(' · ')
  return (
    <div id={`source-${s.n}`} className={`scroll-mt-2 rounded-3xl ${open ? 'bg-surface-container-lowest shadow-soft ring-1 ring-primary/30' : 'hover:bg-on-surface/5'}`}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-start gap-3 p-3 text-left">
        {lead}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{label}</span>
            <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] px-1 text-[11px] font-semibold tabular-nums ${open ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary'}`}>{s.n}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-on-surface-variant">{sourceMeta(s)}</span>
          {!open && s.quote && <span className="mt-1.5 line-clamp-1 text-[13px] text-on-surface-variant">{s.quote}</span>}
        </span>
        {open ? <IconLess width={18} height={18} className="mt-1.5 shrink-0 text-on-surface-variant" /> : <IconRight width={18} height={18} className="mt-1.5 shrink-0 text-on-surface-variant" />}
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          {s.quote && <p className="rounded-[10px] border-l-2 border-primary bg-primary/5 px-2.5 py-1.5 text-[13px]">{s.quote}</p>}
          {facts.length > 0 && (
            <div className="rounded-xl bg-surface-container-low px-3 py-1.5">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-3 py-1 text-[13px]">
                  <span className="text-on-surface-variant">{f.label}</span>
                  <span className="text-right">{f.value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {(href || (kind === 'data' && viewCall)) && (
              <button
                type="button"
                data-panel-trigger=""
                onClick={() => (href ? navigate(href) : viewCall?.())}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-medium text-on-primary hover:bg-primary/90"
              >
                {href ? openLabel(s) : 'View result'}
                <IconOpen width={15} height={15} />
              </button>
            )}
            {viewCall && (href || kind !== 'data') && (
              <button
                type="button"
                data-panel-trigger=""
                onClick={viewCall}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline bg-surface-container-lowest px-3 text-[13px] hover:bg-surface-container-low"
              >
                <IconTool width={15} height={15} />
                View tool call
              </button>
            )}
            {s.record_id && (
              <button
                type="button"
                title={copied ? 'Copied' : 'Copy id'}
                aria-label="Copy id"
                onClick={() => {
                  void copy(s.record_id!)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1200)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/8"
              >
                <span aria-hidden className="ui-icon-swap">
                  <IconCopy data-shown={!copied} width={15} height={15} />
                  <IconCheck data-shown={copied} width={15} height={15} className="text-primary" />
                </span>
              </button>
            )}
            {ran && <span className="ml-auto text-[11.5px] tabular-nums text-on-surface-variant">{ran}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * A turn's sources over the chat, grouped by kind with filter chips. A row
 * opens in place, one at a time; a citation opens the panel with its source
 * open and in view.
 */
export function SourcesPanel({ sources, active, tools }: { sources: Source[]; active?: number; tools?: Record<string, ToolCall> }) {
  const me = useMe()
  // A filter holds until a citation opens another source, which shows under All.
  const [filter, setFilter] = useState<{ k: SourceKind | 'all'; at?: number }>({ k: 'all', at: active })
  const kind = filter.at === active ? filter.k : 'all'
  const setKind = (k: SourceKind | 'all') => setFilter({ k, at: active })
  const [picked, setPicked] = useState<{ n?: number; from?: number }>({})
  // A citation pressed again, or another one, opens its source over the member's own pick.
  const openN = picked.from === active ? picked.n : active
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (active === undefined) return
    requestAnimationFrame(() => list.current?.querySelector(`#source-${active}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }))
  }, [active])
  const kinds = sourceKinds.filter((k) => sources.some((s) => kindOf(s.kind) === k))
  const groups = kinds.filter((k) => kind === 'all' || k === kind).map((k) => [k, sources.filter((s) => kindOf(s.kind) === k)] as const)
  const chip = (on: boolean) =>
    `flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[13px] ${on ? 'border-primary/40 bg-primary/6 font-medium text-primary' : 'border-hairline bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'}`
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <p className="flex-1 text-[15px] font-semibold">Sources</p>
        <span className="text-[12px] text-on-surface-variant">Esc to close</span>
        <CloseBtn />
      </div>
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1">
        <button type="button" onClick={() => setKind('all')} className={chip(kind === 'all')}>
          All · {sources.length}
        </button>
        {kinds.map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={chip(kind === k)}>
            {kindPlural[k]} · {sources.filter((s) => kindOf(s.kind) === k).length}
          </button>
        ))}
      </div>
      <div ref={list} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sources.length === 0 && <p className="px-2 pt-4 text-body-small text-on-surface-variant">This answer has no sources.</p>}
        {groups.map(([k, rows]) => (
          <section key={k}>
            <p className="flex items-center gap-2 px-2 pb-1.5 pt-3 text-[12px] font-medium text-on-surface-variant">
              <KindIcon kind={k} size={14} />
              {kindPlural[k]}
              <span className="tabular-nums opacity-70">{rows.length}</span>
            </p>
            <div className="space-y-1">
              {rows.map((s) => (
                <SourceItem
                  key={s.n}
                  s={s}
                  open={openN === s.n}
                  onToggle={() => setPicked({ n: openN === s.n ? undefined : s.n, from: active })}
                  call={s.call_id ? tools?.[s.call_id] : undefined}
                  admin={me.role === 'admin'}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

/** A document as Markdown, for copy. */
function documentMarkdown(d: DocumentVersion): string {
  const section = (s: DocSection): string => {
    if (s.type === 'markdown') return s.markdown
    const head = s.type === 'table' ? s.columns : ['', ...s.series.map((x) => x.name)]
    const rows = s.type === 'table' ? s.rows : s.labels.map((l, i) => [l, ...s.series.map((x) => x.values[i] ?? '')])
    return [s.title ? `### ${s.title}` : '', `| ${head.join(' | ')} |`, `|${head.map(() => ' --- ').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].filter(Boolean).join('\n')
  }
  return d.sections.map(section).join('\n\n')
}

/** Prints the document alone; the browser's dialog saves it as a PDF. */
function printDocument() {
  document.body.classList.add('print-doc')
  const done = () => {
    document.body.classList.remove('print-doc')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}

/** A document the agent wrote: its versions, copy as Markdown and print to PDF. */
export function DocumentPanel({ id, version, sources, turnId }: { id: string; version?: number; sources: Source[]; turnId: string }) {
  const doc = useDocument(id)
  const [v, setV] = useState(version)
  // Versions come newest first; the panel walks them oldest to newest.
  const versions = [...(doc.data?.versions ?? [])].sort((a, b) => a.version - b.version)
  const d = versions.find((x) => x.version === (v ?? doc.data?.latest_version)) ?? versions[versions.length - 1]
  const at = d ? versions.indexOf(d) : -1
  const [copied, setCopied] = useState(false)
  return (
    <SidePanel
      width="w-[640px]"
      head={
        <>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
            <IconArticle width={17} height={17} />
          </span>
          <p className="min-w-0 flex-1 truncate text-title-medium">{d?.title ?? doc.data?.title ?? 'Document'}</p>
          {d && versions.length > 0 && (
            <span className="inline-flex h-8 items-center gap-0.5 rounded-full border border-hairline px-1 text-label-small font-normal">
              <button type="button" title="Earlier version" disabled={at <= 0} onClick={() => setV(versions[at - 1].version)} className="disabled:text-outline">
                <IconLeft width={16} height={16} />
              </button>
              <span className="tabular-nums">
                v{d.version} of {versions.length}
              </span>
              <button type="button" title="Later version" disabled={at >= versions.length - 1} onClick={() => setV(versions[at + 1].version)} className="disabled:text-outline">
                <IconRight width={16} height={16} />
              </button>
            </span>
          )}
          {d && (
            <IconBtn
              title={copied ? 'Copied' : 'Copy as Markdown'}
              onClick={() => {
                void copy(documentMarkdown(d))
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? <IconCheck width={16} height={16} className="text-primary" /> : <IconCopy width={16} height={16} />}
            </IconBtn>
          )}
          {d && (
            <button type="button" onClick={printDocument} className="inline-flex h-8 items-center gap-1 rounded-full border border-hairline px-3 text-label-small hover:bg-surface-container-low">
              <IconPrint width={16} height={16} />
              Print to PDF
            </button>
          )}
          <CloseBtn />
        </>
      }
    >
      {d && <p className="px-5 pt-2.5 text-right text-label-small font-normal text-on-surface-variant">Written {when(d.created_at)}</p>}
      {doc.error && <p className="p-5 text-body-small text-error">This document did not load.</p>}
      {d && (
        <div className="doc-print mx-4 mb-4 mt-2.5 space-y-5 rounded-4xl border border-hairline bg-surface-container-lowest px-8 py-7 shadow-soft">
          {d.sections.map((s, i) =>
            s.type === 'markdown' ? (
              <Markdown key={i} md={s.markdown} turnId={turnId} sources={sources} />
            ) : s.type === 'table' ? (
              <Table key={i} columns={s.columns} rows={s.rows} />
            ) : (
              <Chart key={i} kind={s.kind} labels={s.labels} series={s.series} title={s.title} h={86} />
            ),
          )}
        </div>
      )}
    </SidePanel>
  )
}
