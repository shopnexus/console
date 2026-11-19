import { createContext, use } from 'react'
import type { RecordKind } from './markdown'
import type { Source } from './run'

export type SourcesPanel = { kind: 'sources'; turnId: string; n?: number }

/**
 * A chat's panel: one tool call or the sources of a turn, over the chat, or
 * a document or a record the answer named beside it. A tool call opened from the sources keeps them
 * under it (back) and returns to them when it closes.
 */
export type Panel =
  | { kind: 'tool'; id: string; back?: SourcesPanel }
  | SourcesPanel
  | { kind: 'doc'; id: string; version?: number; turnId?: string }
  | { kind: 'record'; record: RecordKind; id: string; label: string; turnId?: string }

export interface PanelApi {
  panel?: Panel
  open: (p: Panel | undefined) => void
  /** A turn's sources, for the panels and citation popovers. */
  sourcesOf: (turnId: string) => Source[]
}

export const PanelContext = createContext<PanelApi>({ open: () => undefined, sourcesOf: () => [] })

export const usePanel = () => use(PanelContext)
