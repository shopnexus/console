import { Link, useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import IconCopy from '~icons/material-symbols-light/content-copy-outline-rounded'
import IconPackage from '~icons/material-symbols-light/package-2-outline'
import IconPay from '~icons/material-symbols-light/payments-outline-rounded'
import IconPhoto from '~icons/material-symbols-light/image-outline-rounded'
import IconTruck from '~icons/material-symbols-light/local-shipping-outline-rounded'
import { BackCrumbs, FactRow, Hero, Missing, OpenLink, PartyCard, StatusPill } from '../components/Panes'
import { Shell } from '../components/Shell'
import { Btn, Card, CardHead, IconTile, Initial, Tag } from '../components/ui'
import { cancelReason, conditionLabel, humanize, listingStatus, type OrderDetail, orderStatus, orderTrouble, shipmentStatus, useOrder } from '../lib/commerce'
import { askHref } from '../lib/agent'
import { shortId } from '../lib/api'
import { useCopy } from '../lib/dom'
import { date, int, stamp, vnd, when } from '../lib/format'
import { kindLabel, type TicketKind } from '../lib/support'

const shipMode: Record<string, string> = { linked: "linked to the seller's account", manual: "made in the carrier's app" }
const carrierName: Record<string, string> = { ghtk: 'GHTK', ghn: 'GHN', spx: 'SPX', jt: 'J&T', viettel_post: 'Viettel Post' }
const carrier = (c: string) => carrierName[c] ?? c.toUpperCase()

/** The delivery as ShopNexus knows it, newest first: the order's own dates and what the carrier says now. */
function timeline(o: OrderDetail): { title: string; at?: string; note?: string }[] {
  const s = o.shipment
  const steps: { title: string; at?: string; note?: string }[] = [{ title: 'Order placed', at: o.created_at, note: 'Cash on delivery' }]
  if (o.shipped_at) steps.push({ title: 'Shipped', at: o.shipped_at, note: s ? `${carrier(s.carrier)} · ${s.tracking_code}` : undefined })
  if (s?.delivered_at) steps.push({ title: 'Delivered', at: s.delivered_at })
  if (o.closed_at) {
    const title = o.status === 'cancelled' ? 'Cancelled' : o.status === 'failed' ? 'Delivery failed' : 'Completed'
    const note =
      o.status === 'cancelled'
        ? o.cancel_reason && (cancelReason[o.cancel_reason] ?? humanize(o.cancel_reason))
        : o.status === 'completed'
          ? o.completed_by
            ? `The ${o.completed_by} confirmed it`
            : 'By ShopNexus, 3 days after delivery'
          : undefined
    steps.push({ title, at: o.closed_at, note })
  }
  if (o.carrier_now && !o.closed_at) steps.push({ title: `Carrier says: ${shipmentStatus[o.carrier_now.status] ?? humanize(o.carrier_now.status)}`, note: 'Now' })
  return steps.reverse()
}

/** An order, reached by a link: its hero, the delivery, the shipment, the listing, both parties and the tickets about it. */
export function Order() {
  const { id = '' } = useParams()
  const order = useOrder(id)
  return (
    <Shell>
      <section className="relative flex min-w-0 flex-1 animate-pane flex-col bg-surface-container-low/40">
        {order.error ? <Missing error={order.error} what="order" /> : order.data ? <OrderPage id={id} o={order.data} /> : null}
      </section>
    </Shell>
  )
}

function OrderPage({ id, o }: { id: string; o: OrderDetail }) {
  const navigate = useNavigate()
  const [copied, copy] = useCopy()
  const trouble = orderTrouble.has(o.status)
  const dates = [`Placed ${stamp(o.created_at)}`, o.shipped_at && `shipped ${stamp(o.shipped_at)}`, o.closed_at && `closed ${stamp(o.closed_at)}`].filter(Boolean).join(' · ')
  const s = o.shipment
  const steps = timeline(o)
  return (
    <>
      <BackCrumbs kind="Orders" name={o.code}>
        <Btn icon={<IconSpark width={17} height={17} />} onClick={() => navigate(askHref('order', id, `Order ${o.code}`))}>
          Ask the agent
        </Btn>
        <button
          type="button"
          title={copied ? 'Copied' : 'Copy code'}
          aria-label="Copy code"
          onClick={() => copy(o.code)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/5"
        >
          <span aria-hidden className="ui-icon-swap">
            <IconCopy data-shown={!copied} width={17} height={17} />
            <IconCheck data-shown={copied} width={17} height={17} className="text-primary" />
          </span>
        </button>
      </BackCrumbs>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        <Hero>
          <div className="flex items-center gap-5">
            <IconTile size={64} tone="bg-surface-container-lowest text-primary shadow-soft">
              <IconPackage width={30} height={30} />
            </IconTile>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-display-small">Order {o.code}</h1>
                <StatusPill suspended={trouble}>{orderStatus[o.status] ?? humanize(o.status)}</StatusPill>
              </div>
              <p className="mt-0.5 tabular-nums text-body-small text-on-surface-variant">{dates}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag tone="border border-hairline bg-surface-container-lowest text-on-surface">
                  <IconPay width={13} height={13} />
                  Cash on delivery
                </Tag>
                {s && (
                  <Tag tone="border border-hairline bg-surface-container-lowest text-on-surface">
                    <IconTruck width={13} height={13} />
                    {carrier(s.carrier)}
                  </Tag>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="tabular-nums text-[26px] font-semibold leading-tight text-on-surface">{vnd(o.price)}</p>
              <p className="text-body-small text-on-surface-variant">paid at the door</p>
            </div>
          </div>
        </Hero>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Card>
              <CardHead title="Delivery" />
              <ol className="relative before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-outline-variant/70">
                {steps.map((e, i) => (
                  <li key={e.title} className="relative flex gap-3 pb-4 last:pb-0">
                    <span className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full ${i === 0 ? 'bg-primary ring-4 ring-primary/15' : 'bg-outline-variant'}`} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex gap-2">
                        <p className={`flex-1 text-body-medium ${i === 0 ? 'font-semibold' : ''}`}>{e.title}</p>
                        {e.at && <p className="tabular-nums text-body-small text-on-surface-variant">{when(e.at)}</p>}
                      </div>
                      {e.note && <p className="mt-0.5 text-body-small text-on-surface-variant">{e.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
            {(s || o.carrier_error) && (
              <Card className="p-5 pb-3">
                <CardHead title="Shipment" />
                {s && (
                  <>
                    <FactRow label="Carrier">
                      {carrier(s.carrier)}
                      {shipMode[s.mode] && <span className="text-on-surface-variant"> · {shipMode[s.mode]}</span>}
                    </FactRow>
                    <FactRow label="Tracking">
                      <span className="tabular-nums">{s.tracking_code}</span>
                    </FactRow>
                    <FactRow label="Shipment">{shipmentStatus[s.status] ?? humanize(s.status)}</FactRow>
                    {s.fee !== undefined && (
                      <FactRow label="Shipping fee">
                        <span className="tabular-nums">{vnd(s.fee)}</span>
                      </FactRow>
                    )}
                    {s.delivered_at && <FactRow label="Delivered">{stamp(s.delivered_at)}</FactRow>}
                  </>
                )}
                {o.carrier_now && (
                  <FactRow label="Carrier says now">
                    <span className="text-primary">{shipmentStatus[o.carrier_now.status] ?? humanize(o.carrier_now.status)}</span>
                    {o.carrier_now.fee !== undefined && <span className="tabular-nums text-on-surface-variant"> · fee {vnd(o.carrier_now.fee)}</span>}
                  </FactRow>
                )}
                {o.carrier_error && <FactRow label="Carrier says now">{o.carrier_error}</FactRow>}
              </Card>
            )}
          </div>
          <div className="space-y-4">
            {
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  {o.listing.photo_url ? (
                    <img src={o.listing.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
                      <IconPhoto width={22} height={22} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-label-small font-normal text-on-surface-variant">Listing</p>
                    <p className="mt-0.5 truncate text-title-small">{o.listing.title}</p>
                    <p className="mt-0.5 text-body-small text-on-surface-variant">
                      {[listingStatus[o.listing.status] ?? humanize(o.listing.status), o.listing.category, `${conditionLabel[o.listing.condition] ?? humanize(o.listing.condition)}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <OpenLink to={`/listings/${o.listing.id}`} />
                </div>
              </Card>
            }
            <PartyCard role="Buyer" id={o.buyer.id} name={o.buyer.display_name} status={o.buyer.status} meta={`${shortId(o.buyer.id)} · since ${date(o.buyer.since)}`} />
            <PartyCard
              role="Seller"
              id={o.seller.id}
              name={o.seller.display_name}
              status={o.seller.status}
              meta={[shortId(o.seller.id), `${int(o.seller.orders)} sold`, o.seller.rating && `${o.seller.rating.average.toFixed(1)} ★ (${int(o.seller.rating.count)})`].filter(Boolean).join(' · ')}
            />
            {o.tickets.length > 0 && (
              <Card className="p-4">
                <CardHead title="Tickets about this order" right={<Tag tone="bg-surface-container text-on-surface">{o.tickets.length}</Tag>} />
                {o.tickets.map((t) => (
                  <Link key={t.id} to={`/support/${t.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-on-surface/5">
                    <Initial name={t.person_display_name} id={t.id} size={30} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-label-medium">
                        {t.person_display_name} · {(kindLabel[t.kind as TicketKind] ?? humanize(t.kind)).toLowerCase()}
                      </p>
                      {/* The person's own words, as they wrote them. */}
                      {t.last_line && <p className="mt-0.5 truncate text-body-small text-on-surface-variant">“{t.last_line}”</p>}
                    </div>
                    <Tag tone={t.status === 'open' ? 'bg-primary/8 text-primary' : 'bg-surface-container text-on-surface-variant'}>{humanize(t.status)}</Tag>
                  </Link>
                ))}
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
