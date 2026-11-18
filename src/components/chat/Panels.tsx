import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import IconArticle from '~icons/material-symbols-light/article-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconLeft from '~icons/material-symbols-light/chevron-left-rounded'
import IconRight from '~icons/material-symbols-light/chevron-right-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconData from '~icons/material-symbols-light/data-object-rounded'
import IconError from '~icons/material-symbols-light/error-outline-rounded'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconPrint from '~icons/material-symbols-light/print-outline-rounded'
import { type DocSection, type DocumentVersion, useDocument, useToolCall } from '../../lib/agent'
import { duration, time, when } from '../../lib/format'
import { usePanel } from '../../lib/panel'
import type { Source, SourceKind } from '../../lib/run'
import { kindName, kindPlural, sourceHref } from '../../lib/sources'
import { toolInfo } from '../../lib/tools'
import { IconBtn, Segmented, Tag } from '../ui'
import { Chart, Markdown, Table } from './Answer'
import { SourceBadge } from './sourceLook'

/** The one panel shell beside a chat: a header, then a body that scrolls. */
export function SidePanel({ width = 'w-[480px]', head, children }: { width?: string; head: ReactNode; children: ReactNode }) {
  return (
    <aside className={`flex shrink-0 animate-panel flex-col border-l border-hairline bg-surface-container-low/50 ${width}`}>
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
export function ToolPanel({ id }: { id: string }) {
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
export function SourcesPanel({ sources, active }: { sources: Source[]; active?: number }) {
  const [kind, setKind] = useState<SourceKind | 'all'>('all')
  const kinds = [...new Set(sources.map((s) => s.kind))]
  const shown = sources.filter((s) => kind === 'all' || s.kind === kind)
  return (
    <SidePanel
      width="w-[400px]"
      head={
        <>
          <p className="flex-1 text-title-medium">Sources</p>
          <CloseBtn />
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {(['all', ...kinds] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex h-8 items-center rounded-full border px-3 text-label-small ${
              k === kind ? 'border-primary/40 bg-primary/6 text-primary' : 'border-hairline bg-surface-container-lowest font-normal text-on-surface-variant'
            }`}
          >
            {k === 'all' ? `All · ${sources.length}` : `${kindPlural[k]} · ${sources.filter((s) => s.kind === k).length}`}
          </button>
        ))}
      </div>
      <div className="space-y-1 px-2 pb-3">
        {shown.map((s) => {
          const hot = s.n === active
          const href = sourceHref(s)
          const body = (
            <>
              <span className={`flex h-6 min-w-6 items-center justify-center rounded-[7px] px-1 text-label-small ${hot ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                {s.n}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-center gap-2">
                  <SourceBadge kind={s.kind} />
                  <span className="truncate text-title-small">{s.label}</span>
                </span>
                <span className="mt-1 block text-label-small font-normal text-on-surface-variant">{kindName(s.kind)}</span>
                {s.quote && <span className={`mt-1.5 block text-body-small ${hot ? 'rounded-lg border-l-2 border-primary bg-primary/5 px-2.5 py-1.5' : ''}`}>{s.quote}</span>}
              </span>
              {href && <IconOpen width={15} height={15} className="mt-1 text-on-surface-variant" />}
            </>
          )
          const cls = `flex gap-3 rounded-3xl p-3 ${hot ? 'bg-surface-container-lowest shadow-soft ring-2 ring-primary/40' : 'hover:bg-on-surface/5'}`
          return href ? (
            <Link key={s.n} id={`source-${s.n}`} to={href} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={s.n} id={`source-${s.n}`} className={cls}>
              {body}
            </div>
          )
        })}
      </div>
    </SidePanel>
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
