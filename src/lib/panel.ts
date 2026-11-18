import { createContext, use } from 'react'
import type { Source } from './run'

/** The side panel beside a chat: one tool call, the sources of a turn, or a document. */
export type Panel =
  | { kind: 'tool'; id: string }
  | { kind: 'sources'; turnId: string; n?: number }
  | { kind: 'doc'; id: string; version?: number; turnId?: string }

export interface PanelApi {
  panel?: Panel
  open: (p: Panel | undefined) => void
  /** A turn's sources, for the panels and citation popovers. */
  sourcesOf: (turnId: string) => Source[]
}

export const PanelContext = createContext<PanelApi>({ open: () => undefined, sourcesOf: () => [] })

export const usePanel = () => use(PanelContext)
