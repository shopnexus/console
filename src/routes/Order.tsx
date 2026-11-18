import { useState } from 'react'
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
import { askHref, conditionLabel, humanize, listingStatus, type OrderDetail, orderStatus, orderTrouble, shipmentStatus, useOrder } from '../lib/commerce'
import { date, int, stamp, vnd, when } from '../lib/format'
import { kindLabel, type TicketKind } from '../lib/support'

const payMode: Record<string, string> = { cod: 'COD', cod_inspection: 'COD with inspection', prepaid: 'Paid ahead' }

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
  const [copied, setCopied] = useState(false)
  const trouble = orderTrouble.has(o.status)
  const dates = [`Placed ${stamp(o.created_at)}`, o.shipped_at && `shipped ${stamp(o.shipped_at)}`, o.closed_at && `closed ${stamp(o.closed_at)}`].filter(Boolean).join(' · ')
  const s = o.shipment
  const events = [...(o.events ?? [])].sort((a, b) => b.at.localeCompare(a.at))
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
          onClick={() => {
            void navigator.clipboard?.writeText(o.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/5"
        >
          <span aria-hidden className="ui-icon-swap">
            <IconCopy data-shown={!copied} width={17} height={17} />
            <IconCheck data-shown={copied} width={17} height={17} className="text-primary" />
          </span>
        </button>
      </BackCrumbs>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        <Hero error={trouble}>
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
                {s?.mode && (
                  <Tag tone="border border-hairline bg-surface-container-lowest text-on-surface">
                    <IconPay width={13} height={13} />
                    {payMode[s.mode] ?? humanize(s.mode)}
                  </Tag>
                )}
                {s?.carrier && (
                  <Tag tone="border border-hairline bg-surface-container-lowest text-on-surface">
                    <IconTruck width={13} height={13} />
                    {s.carrier.toUpperCase()}
                  </Tag>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="tabular-nums text-[26px] font-semibold leading-tight text-tertiary">{vnd(o.price)}</p>
              {s?.mode?.startsWith('cod') && <p className="text-body-small text-on-surface-variant">paid at the door</p>}
            </div>
          </div>
        </Hero>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Card>
              <CardHead title="Delivery" />
              {events.length === 0 ? (
                <p className="text-body-small text-on-surface-variant">No delivery events yet.</p>
              ) : (
                <ol className="relative before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-outline-variant/70">
                  {events.map((e, i) => (
                    <li key={`${e.status}${e.at}`} className="relative flex gap-3 pb-4 last:pb-0">
                      <span className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full ${i === 0 ? 'bg-primary ring-4 ring-primary/15' : 'bg-outline-variant'}`} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex gap-2">
                          <p className={`flex-1 text-body-medium ${i === 0 ? 'font-semibold' : ''}`}>{shipmentStatus[e.status] ?? orderStatus[e.status] ?? humanize(e.status)}</p>
                          <p className="tabular-nums text-body-small text-on-surface-variant">{when(e.at)}</p>
                        </div>
                        {(e.place || e.note) && <p className="mt-0.5 text-body-small text-on-surface-variant">{[e.place, e.note].filter(Boolean).join(' · ')}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            {(s || o.carrier_now || o.carrier_error || o.completed_by) && (
              <Card className="p-5 pb-3">
                <CardHead title="Shipment" />
                {s?.carrier && <FactRow label="Carrier">{s.carrier.toUpperCase()}</FactRow>}
                {s?.tracking_code && (
                  <FactRow label="Tracking">
                    <span className="tabular-nums">{s.tracking_code}</span>
                  </FactRow>
                )}
                {s?.status && <FactRow label="Shipment">{shipmentStatus[s.status] ?? humanize(s.status)}</FactRow>}
                {s?.fee !== undefined && (
                  <FactRow label="Shipping fee">
                    <span className="tabular-nums">{vnd(s.fee)}</span>
                  </FactRow>
                )}
                {s?.delivered_at && <FactRow label="Delivered">{stamp(s.delivered_at)}</FactRow>}
                {(o.carrier_now || o.carrier_error) && (
                  <FactRow label="Carrier says now">{o.carrier_now ? <span className="text-primary">{o.carrier_now}</span> : <span className="text-error">{o.carrier_error}</span>}</FactRow>
                )}
                {o.completed_by && <FactRow label="Completed by">{o.completed_by}</FactRow>}
              </Card>
            )}
          </div>
          <div className="space-y-4">
            {o.listing && (
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
                      {[o.listing.status && (listingStatus[o.listing.status] ?? humanize(o.listing.status)), o.listing.category, o.listing.condition && `${conditionLabel[o.listing.condition] ?? humanize(o.listing.condition)} condition`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <OpenLink to={`/listings/${o.listing.id}`} />
                </div>
              </Card>
            )}
            {o.buyer && (
              <PartyCard
                role="Buyer"
                id={o.buyer.id}
                name={o.buyer.display_name}
                status={o.buyer.status}
                meta={[o.buyer.id.slice(0, 8), o.buyer.since && `since ${date(o.buyer.since)}`].filter(Boolean).join(' · ')}
              />
            )}
            {o.seller && (
              <PartyCard
                role="Seller"
                id={o.seller.id}
                name={o.seller.display_name}
                status={o.seller.status}
                meta={[o.seller.id.slice(0, 8), o.seller.orders !== undefined && `${int(o.seller.orders)} orders`, o.seller.rating !== undefined && `${o.seller.rating.toFixed(1)} ★`].filter(Boolean).join(' · ')}
              />
            )}
            {o.tickets && o.tickets.length > 0 && (
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
