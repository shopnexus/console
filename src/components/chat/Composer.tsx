import { type ReactNode, type Ref, useCallback, useState } from 'react'
import IconAdd from '~icons/material-symbols-light/add-rounded'
import IconBolt from '~icons/material-symbols-light/bolt-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconClose from '~icons/material-symbols-light/close-rounded'
import IconExpand from '~icons/material-symbols-light/expand-more-rounded'
import IconLockClock from '~icons/material-symbols-light/lock-clock-outline-rounded'
import IconPause from '~icons/material-symbols-light/pause-rounded'
import IconPlay from '~icons/material-symbols-light/play-arrow-rounded'
import IconRoute from '~icons/material-symbols-light/alt-route-rounded'
import IconSend from '~icons/material-symbols-light/arrow-upward-rounded'
import IconStop from '~icons/material-symbols-light/stop-rounded'
import { maxQuestion, type Skill } from '../../lib/agent'
import { useDismiss } from '../../lib/dom'
import { compact } from '../../lib/format'
import type { PickableAgent } from '../../lib/settings'
import { AgentIcon } from '../AiBits'
import { Btn, Kbd } from '../ui'

/** What the ask box does with a message: ask, steer a running or paused run, or answer the agent's question. */
export type ComposerMode = 'idle' | 'running' | 'pausing' | 'paused' | 'awaiting'

export interface Chip {
  key: string
  icon: ReactNode
  label: string
  tone?: string
  onRemove?: () => void
}

/** How full the agent's context is, as a small ring with the numbers in its title. */
function ContextMeter({ used, window }: { used: number; window: number }) {
  const pct = Math.min(100, (used / window) * 100)
  const r = 7
  const c = 2 * Math.PI * r
  const tone = pct >= 60 ? 'text-on-surface' : 'text-primary'
  return (
    <span title={`Context ${Math.round(pct)}% full · ${compact(used)} of ${compact(window)} tokens`} className="flex h-9 items-center gap-1 px-1 text-label-small font-normal tabular-nums text-on-surface-variant">
      <svg width={18} height={18} viewBox="0 0 18 18" className="-rotate-90" aria-hidden>
        <circle cx={9} cy={9} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} className="text-surface-container-high" />
        <circle cx={9} cy={9} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} strokeDasharray={`${(c * pct) / 100} ${c}`} strokeLinecap="round" className={tone} />
      </svg>
      {Math.round(pct)}%
    </span>
  )
}

/** The agent picker: the console agents the member may use, each with its purpose. */
function AgentPicker({ agents, value, onChange, up }: { agents: PickableAgent[]; value?: string; onChange: (id: string) => void; up: boolean }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const current = agents.find((a) => a.id === value) ?? agents[0]
  if (!current) return null
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        disabled={agents.length < 2}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-label-medium font-normal hover:bg-surface-container-low disabled:hover:bg-transparent"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
          <AgentIcon name={current.icon} size={12} />
        </span>
        {current.name}
        {agents.length > 1 && <IconExpand width={16} height={16} className="text-on-surface-variant" />}
      </button>
      {open && (
        <div
          className={`absolute right-0 z-30 w-[320px] animate-pop rounded-4xl border border-hairline bg-surface-container-lowest p-2 shadow-float ${
            up ? 'bottom-[calc(100%+8px)] origin-bottom-right' : 'top-[calc(100%+8px)] origin-top-right'
          }`}
        >
          {agents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id)
                close()
              }}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${a.id === current.id ? 'bg-primary/6' : 'hover:bg-surface-container-low'}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <AgentIcon name={a.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-title-small">{a.name}</span>
                <span className="mt-0.5 block text-body-small text-on-surface-variant">{a.purpose}</span>
              </span>
              {a.id === current.id && <IconCheck width={18} height={18} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const skillTones = [
  'bg-primary text-on-primary',
  'bg-surface-container-high text-on-surface',
  'bg-secondary-container text-on-secondary-container',
  'bg-surface-container text-on-surface-variant',
  'bg-inverse-primary/40 text-primary-container',
]

/** The / menu: every saved skill, filtered by what follows the slash, and "Make a skill from this chat". */
function SkillsMenu({
  skills,
  filter,
  active,
  onPick,
  onMake,
  up,
}: {
  skills: Skill[]
  filter: string
  active: number
  onPick: (s: Skill) => void
  onMake?: (name: string) => void
  up: boolean
}) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const shown = skills.filter((s) => !filter || s.slug.includes(filter.toLowerCase()) || s.name.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className={`absolute left-0 z-30 w-[460px] animate-pop rounded-4xl border border-hairline bg-surface-container-lowest p-2 shadow-float ${up ? 'bottom-[calc(100%+10px)] origin-bottom-left' : 'top-[calc(100%+10px)] origin-top-left'}`}>
      <div className="flex items-center gap-2 px-3 pb-2 pt-1.5 text-label-small font-normal text-on-surface-variant">
        <IconBolt width={15} height={15} />
        Skills
        <span className="flex-1" />
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        <Kbd>↵</Kbd>
      </div>
      {shown.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(s)}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${i === active ? 'bg-primary/6' : 'hover:bg-surface-container-low'}`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${skillTones[i % skillTones.length]}`}>
            <IconBolt width={18} height={18} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-title-small">
              /{s.slug} <span className="font-normal text-on-surface-variant">· {s.name}</span>
            </span>
            <span className="mt-0.5 block truncate text-body-small text-on-surface-variant">{s.description}</span>
          </span>
        </button>
      ))}
      {shown.length === 0 && <p className="px-3 py-2 text-body-medium text-on-surface-variant">No skill matches.</p>}
      {onMake && (
        <div className="mt-1 border-t border-hairline px-3 pb-1 pt-2.5 text-body-small text-on-surface-variant">
          {naming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim()) onMake(name.trim())
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Skill name"
                className="h-9 flex-1 rounded-xl border border-hairline px-3 text-body-medium text-on-surface outline-none focus:border-primary/50"
              />
              <Btn type="submit" kind="primary" disabled={!name.trim()}>
                Save
              </Btn>
            </form>
          ) : (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setNaming(true)} className="flex items-center gap-2 hover:text-on-surface">
              <IconAdd width={16} height={16} />
              Make a skill from this chat
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The one ask box. It asks, or, while a run works, steers it ("read before
 * its next step"); Pause is the run's main control and becomes Stop now.
 * / lists the skills, @ and + attach a record, and the agent picker and the
 * context meter sit beside send. Enter sends, Shift+Enter breaks the line,
 * Escape pauses.
 */
export function Composer({
  value,
  onChange,
  onSend,
  mode,
  onPause,
  onStopNow,
  chips = [],
  attachMenu,
  skills = [],
  onSkill,
  onMakeSkill,
  agents = [],
  agentId,
  onAgent,
  meter,
  placeholder,
  error,
  hold,
  up = true,
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  mode: ComposerMode
  onPause?: () => void
  onStopNow?: () => void
  chips?: Chip[]
  /** The + menu; it gets close to call once a record is picked. */
  attachMenu?: (close: () => void) => ReactNode
  skills?: Skill[]
  onSkill?: (s: Skill) => void
  onMakeSkill?: (name: string) => void
  agents?: PickableAgent[]
  agentId?: string
  onAgent?: (id: string) => void
  meter?: { used: number; window: number }
  placeholder: string
  error?: string
  /** Why send waits: an attachment, a skill or another agent goes with the next turn, not into a running one. */
  hold?: string
  /** Menus open upwards when the box sits at the bottom. */
  up?: boolean
  inputRef?: Ref<HTMLTextAreaElement>
}) {
  const [attachOpen, setAttachOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [active, setActive] = useState(0)
  const closeAll = useCallback(() => {
    setAttachOpen(false)
    setSkillsOpen(false)
  }, [])
  const ref = useDismiss<HTMLDivElement>(attachOpen || skillsOpen, closeAll)
  const slash = /^\/(\S*)$/.exec(value)
  const showSkills = skillsOpen || !!slash
  const filter = slash?.[1] ?? ''
  const shownSkills = skills.filter((s) => !filter || s.slug.includes(filter.toLowerCase()) || s.name.toLowerCase().includes(filter.toLowerCase()))
  const text = value.trim()
  const over = value.length > maxQuestion
  const steering = mode === 'running' || mode === 'pausing' || mode === 'paused'
  const blocked = !!hold && steering

  function pickSkill(s: Skill) {
    onSkill?.(s)
    if (slash) onChange('')
    setSkillsOpen(false)
    setActive(0)
  }

  function send() {
    if (text === '' || over || blocked) return
    onSend(text)
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`rounded-5xl border bg-surface-container-lowest shadow-soft focus-within:ring-4 focus-within:ring-primary/10 ${
          showSkills ? 'border-primary/40 ring-4 ring-primary/10' : 'border-hairline focus-within:border-primary/40'
        }`}
      >
        {(steering || chips.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
            {steering && (
              <>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary/8 px-2 text-label-small text-primary">
                  <IconRoute width={13} height={13} />
                  Steer
                </span>
                <span className="mr-1 text-body-small text-on-surface-variant">{mode === 'paused' ? 'Sending continues the run with this' : 'The agent reads this before its next step'}</span>
              </>
            )}
            {chips.map((c) => (
              <span key={c.key} className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full pl-1.5 pr-2.5 text-body-small ${c.tone ?? 'bg-primary/7'}`}>
                {c.icon}
                <span className="truncate">{c.label}</span>
                {c.onRemove && (
                  <button type="button" title="Remove" onClick={c.onRemove} className="text-on-surface-variant hover:text-on-surface">
                    <IconClose width={14} height={14} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (attachMenu && v.endsWith('@') && (v.length === 1 || /\s@$/.test(v))) {
              onChange(v.slice(0, -1))
              setAttachOpen(true)
              return
            }
            onChange(v)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (showSkills && shownSkills.length > 0) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + shownSkills.length) % shownSkills.length)
                return
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                pickSkill(shownSkills[Math.min(active, shownSkills.length - 1)])
                return
              }
            }
            // Never send while an input method is composing (Vietnamese Telex, keyCode 229).
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            } else if (e.key === 'Escape') {
              if (showSkills || attachOpen) closeAll()
              else if (mode === 'running' && onPause) {
                e.preventDefault()
                onPause()
              }
            }
          }}
          rows={2}
          placeholder={placeholder}
          aria-label="Message"
          aria-invalid={!!error || over}
          className="field-sizing-content block max-h-[212px] min-h-[56px] w-full resize-none bg-transparent px-5 pt-3 text-body-large text-on-surface outline-none placeholder:text-on-surface-variant/80"
        />
        <div className="flex items-center gap-1.5 px-3 pb-3">
          {attachMenu && (
            <button
              type="button"
              title="Attach a ticket, report or account (@)"
              aria-expanded={attachOpen}
              onClick={() => {
                setSkillsOpen(false)
                setAttachOpen((o) => !o)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
            >
              <IconAdd width={20} height={20} />
            </button>
          )}
          {onSkill && (
            <button
              type="button"
              aria-expanded={showSkills}
              onClick={() => {
                setAttachOpen(false)
                setSkillsOpen((o) => !o)
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-label-medium font-normal text-on-surface-variant hover:bg-surface-container-low"
            >
              <IconBolt width={17} height={17} />
              Skills
            </button>
          )}
          <span className="flex-1" />
          {meter && <ContextMeter used={meter.used} window={meter.window} />}
          {onAgent && agents.length > 0 && <AgentPicker agents={agents} value={agentId} onChange={onAgent} up={up} />}
          {mode === 'running' && onPause && text === '' && (
            <span className="hidden items-center gap-1 text-label-small font-normal text-on-surface-variant xl:flex">
              <Kbd>Esc</Kbd>to pause
            </span>
          )}
          {/* While a run is live the send button is its control: Pause, then Stop now; typing turns it back into send. */}
          {mode === 'running' && onPause && text === '' ? (
            <button type="button" onClick={onPause} className="flex h-9 animate-pop items-center gap-1.5 rounded-full bg-on-surface px-3.5 text-label-medium text-surface">
              <IconPause width={17} height={17} />
              Pause
            </button>
          ) : mode === 'pausing' && onStopNow && text === '' ? (
            <button type="button" onClick={onStopNow} className="flex h-9 animate-pop items-center gap-1.5 rounded-full bg-error px-3.5 text-label-medium text-on-error">
              <IconStop width={17} height={17} />
              Stop now
            </button>
          ) : (
            <button
              type="button"
              title={blocked ? hold : steering ? 'Send to the run (Enter)' : 'Send (Enter)'}
              onClick={send}
              disabled={text === '' || over || blocked}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40"
            >
              <IconSend width={19} height={19} />
            </button>
          )}
        </div>
      </div>
      {(error || over || blocked) && (
        <p role={error || over ? 'alert' : undefined} className={`mt-1.5 px-2 text-body-small ${error || over ? 'text-error' : 'text-on-surface-variant'}`}>
          {over ? `Questions stop at ${maxQuestion} characters` : (error ?? hold)}
        </p>
      )}
      {attachOpen && attachMenu && (
        <div
          className={`absolute left-0 z-30 w-[360px] animate-pop rounded-4xl border border-hairline bg-surface-container-lowest p-2 shadow-float ${
            up ? 'bottom-[calc(100%+10px)] origin-bottom-left' : 'top-[calc(100%+10px)] origin-top-left'
          }`}
        >
          {attachMenu(() => setAttachOpen(false))}
        </div>
      )}
      {showSkills && onSkill && <SkillsMenu skills={skills} filter={filter} active={active} onPick={pickSkill} onMake={onMakeSkill} up={up} />}
    </div>
  )
}

/** Above the ask box while a run is paused: Continue and End, nothing in the transcript. */
export function PausedStrip({ steps, onContinue, onEnd, busy }: { steps: number; onContinue: () => void; onEnd: () => void; busy: boolean }) {
  return (
    <div className="mb-2 flex animate-rise items-center gap-3 rounded-3xl border border-hairline bg-surface-container-low px-4 py-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
        <IconPause width={16} height={16} />
      </span>
      <p className="flex-1 text-body-medium">Paused after {steps === 1 ? '1 step' : `${steps} steps`}</p>
      <Btn onClick={onEnd} disabled={busy}>
        End
      </Btn>
      <Btn kind="primary" icon={<IconPlay width={17} height={17} />} onClick={onContinue} disabled={busy}>
        Continue
      </Btn>
    </div>
  )
}

/** In place of the ask box when the member's daily budget is spent. */
export function BudgetLock() {
  return (
    <div className="flex items-center gap-3 rounded-5xl border border-hairline bg-surface-container-low px-5 py-4 text-body-medium text-on-surface-variant">
      <IconLockClock width={19} height={19} />
      <span className="flex-1">Asking is paused until midnight or until an admin adds budget.</span>
    </div>
  )
}

