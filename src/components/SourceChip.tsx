import type { ComponentType, SVGProps } from 'react'
import { Link } from 'react-router'
import IconActions from '~icons/material-symbols-light/history-rounded'
import IconDefault from '~icons/material-symbols-light/database-outline'
import IconListing from '~icons/material-symbols-light/sell-outline'
import IconOrder from '~icons/material-symbols-light/receipt-long-outline-rounded'
import IconPerson from '~icons/material-symbols-light/person-outline-rounded'
import IconPrice from '~icons/material-symbols-light/price-check-rounded'
import IconTicket from '~icons/material-symbols-light/chat-outline-rounded'
import type { Source } from '../lib/agent'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// The server's MCP tools, with a Vietnamese label in place of the tool's
// English title. A tool missing here shows the label the server sent.
const tools: Record<string, [Icon, string]> = {
  ticket_get: [IconTicket, 'Ticket'],
  tickets_of_account: [IconTicket, 'Ticket của tài khoản'],
  account_get: [IconPerson, 'Tài khoản'],
  account_actions: [IconActions, 'Thao tác trên tài khoản'],
  order_get: [IconOrder, 'Đơn'],
  listing_get: [IconListing, 'Tin đăng'],
  price_guide: [IconPrice, 'Giá tham khảo'],
}

const chip = 'inline-flex h-6 items-center gap-1 rounded-sm border border-hairline px-1.5 text-body-small text-on-surface-variant'

/** A record the agent read, as a 24 px chip; a ticket opens in Hỗ trợ. */
export function SourceChip({ source }: { source: Source }) {
  const [Icon, label] = tools[source.tool] ?? [IconDefault, source.label]
  const body = (
    <>
      <Icon width={14} height={14} />
      {label}
    </>
  )
  const title = source.ids.join(', ') || undefined
  if (source.tool === 'ticket_get' && source.ids.length === 1) {
    return (
      <Link to={`/support/${source.ids[0]}`} title={title} className={`${chip} hover:bg-surface-container-low`}>
        {body}
      </Link>
    )
  }
  return (
    <span title={title} className={chip}>
      {body}
    </span>
  )
}

/** The sources of an answer, in the order the agent read them. */
export function SourceChips({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((s, i) => (
        <SourceChip key={`${s.tool}-${i}`} source={s} />
      ))}
    </div>
  )
}
