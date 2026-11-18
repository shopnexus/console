import type { ComponentType, SVGProps } from 'react'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconArticle from '~icons/material-symbols-light/article-outline-rounded'
import IconBuild from '~icons/material-symbols-light/build-outline-rounded'
import IconChat from '~icons/material-symbols-light/chat-outline-rounded'
import IconData from '~icons/material-symbols-light/data-object-rounded'
import IconHub from '~icons/material-symbols-light/hub-outline-rounded'
import IconNotes from '~icons/material-symbols-light/notes-rounded'
import IconPhoto from '~icons/material-symbols-light/photo-camera-outline-rounded'
import IconReason from '~icons/material-symbols-light/psychology-outline-rounded'
import IconSearch from '~icons/material-symbols-light/search-rounded'
import IconShield from '~icons/material-symbols-light/gpp-maybe-outline-rounded'
import IconTranslate from '~icons/material-symbols-light/translate-rounded'
import IconVision from '~icons/material-symbols-light/visibility-outline'
import { fillAt } from '../lib/aiLook'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// An agent's icon is a name the server keeps; these are the ones the console draws.
const agentIcons: Record<string, Icon> = {
  spark: IconSpark,
  shield: IconShield,
  photo: IconPhoto,
  search: IconSearch,
  hub: IconHub,
  article: IconArticle,
  chat: IconChat,
}

export function AgentIcon({ name, size = 18 }: { name: string; size?: number }) {
  const I = agentIcons[name] ?? IconSpark
  return <I width={size} height={size} />
}

const tagLook: Record<string, [Icon, string]> = {
  Chat: [IconChat, 'bg-primary text-on-primary'],
  Embedding: [IconHub, 'bg-on-surface text-surface'],
  Vision: [IconVision, 'bg-tertiary-fixed/80 text-on-tertiary-fixed-variant'],
  'Tool use': [IconBuild, 'bg-primary/8 text-primary'],
  'Long context': [IconNotes, 'bg-secondary-container/80 text-on-secondary-container'],
  Reasoning: [IconReason, 'bg-inverse-primary/40 text-primary-container'],
  'Structured output': [IconData, 'bg-surface-container text-on-surface'],
  Multilingual: [IconTranslate, 'bg-surface-container text-on-surface'],
}

/** A model tag as a pill, with the tag's icon and colours. */
export function ModelTag({ name, small = false }: { name: string; small?: boolean }) {
  const [I, tone] = tagLook[name] ?? [IconData, 'bg-surface-container text-on-surface']
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full text-label-small ${small ? 'h-6 px-2' : 'h-7 px-2.5'} ${tone}`}
    >
      <I width={small ? 13 : 14} height={small ? 13 : 14} />
      {name}
    </span>
  )
}

export function TagIcon({ name, size = 15 }: { name: string; size?: number }) {
  const I = tagLook[name]?.[0] ?? IconData
  return <I width={size} height={size} />
}

/** A provider's letter on its colour, ringed so tiles can overlap. */
export function ProviderTile({ name, index, size = 36 }: { name: string; index: number; size?: number }) {
  return (
    <span
      title={name}
      className={`flex shrink-0 items-center justify-center font-semibold text-white ring-2 ring-surface-container-lowest ${fillAt(index)}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * 0.42) }}
    >
      {name.trim()[0]?.toUpperCase()}
    </span>
  )
}
