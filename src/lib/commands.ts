import type { Conversation } from './agent'

/** What a command gets to act in the chat it was typed in. */
export interface ChatHandle {
  /** Asks in this chat; toReply puts the finished answer in the reply box. */
  ask: (text: string, opts?: { toReply?: boolean }) => void
}

/** A / command of the ask box, run on Enter instead of being sent. */
export interface Command {
  name: string
  /** What may follow the name, shown greyed in the menu ("question"). */
  arg?: string
  description: string
  run: (arg: string, chat: ChatHandle) => void
}

/** "/new why late" is the command new with "why late"; text that names no command is a question. */
export function parseCommand(text: string, commands: readonly Pick<Command, 'name'>[]): { name: string; arg: string } | undefined {
  const m = /^\/(\S+)(?:\s+([\s\S]*))?$/.exec(text.trim())
  if (!m || !commands.some((c) => c.name === m[1])) return undefined
  return { name: m[1], arg: (m[2] ?? '').trim() }
}

/** The commands whose name starts with what follows the slash. */
export function matchCommands<T extends Pick<Command, 'name'>>(commands: readonly T[], filter: string): T[] {
  const f = filter.toLowerCase()
  return commands.filter((c) => c.name.startsWith(f))
}

/**
 * A record's agent tabs: its chats in the order they were made (ids are
 * UUIDv7), without the ones closed here, then the new tabs not sent yet.
 */
export function recordTabs(threads: readonly Conversation[], closed: ReadonlySet<string>, fresh: readonly string[]): string[] {
  const made = threads.filter((c) => !closed.has(c.id)).map((c) => c.id).sort()
  return [...made, ...fresh.filter((id) => !made.includes(id))]
}

/** The tab n steps from id, wrapping at the ends. */
export function stepTab(tabs: readonly string[], id: string | undefined, n: number): string | undefined {
  if (tabs.length === 0) return undefined
  const at = id ? tabs.indexOf(id) : -1
  return tabs[(((at < 0 ? 0 : at + n) % tabs.length) + tabs.length) % tabs.length]
}
