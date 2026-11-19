import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import IconSpark from '~icons/material-symbols/auto-awesome-outline-rounded'
import IconFlag from '~icons/material-symbols-light/flag-outline-rounded'
import IconHide from '~icons/material-symbols-light/visibility-off-outline'
import IconOpen from '~icons/material-symbols-light/north-east-rounded'
import IconPhoto from '~icons/material-symbols-light/image-outline-rounded'
import IconSell from '~icons/material-symbols-light/sell-outline-rounded'
import IconShow from '~icons/material-symbols-light/visibility-outline'
import { BackCrumbs, FactRow, Hero, Missing, PartyCard, StatusPill } from '../components/Panes'
import { Shell } from '../components/Shell'
import { Btn, Card, CardHead, IconTile, Initial, Notice, Tag } from '../components/ui'
import { conditionLabel, humanize, type ListingDetail, listingFailure, listingStatus, useListing, useListingCommands } from '../lib/commerce'
import { askHref } from '../lib/agent'
import { shortId } from '../lib/api'
import { useDismiss } from '../lib/dom'
import { count, day, firstName, int, vnd, when } from '../lib/format'
import { reasonLabel, type ReportReason } from '../lib/reports'

/** A listing, reached by a link: its photos, price and state, the seller's own words, details, the seller and the reports on it. */
export function Listing() {
  const { id = '' } = useParams()
  const listing = useListing(id)
  return (
    <Shell>
      <section className="relative flex min-w-0 flex-1 animate-pane flex-col bg-surface-container-low/40">
        {listing.error ? <Missing error={listing.error} what="listing" /> : listing.data ? <ListingPage id={id} l={listing.data} /> : null}
      </section>
    </Shell>
  )
}

function ListingPage({ id, l }: { id: string; l: ListingDetail }) {
  const navigate = useNavigate()
  const commands = useListingCommands(id)
  const [photo, setPhoto] = useState(0)
  const [hiding, setHiding] = useState(false)
  const closeHide = useCallback(() => {
    setHiding(false)
    commands.hide.reset()
  }, [commands.hide])
  const hideBox = useDismiss<HTMLDivElement>(hiding, closeHide)
  const hidden = l.status === 'hidden'
  const photos = l.photo_urls ?? []
  const reports = l.reports ?? []
  const failure = commands.hide.error ?? commands.unhide.error
  const top = topReason(reports)
  const guide = l.price_guide
  const line = [
    `Created ${day(l.created_at)}`,
    l.published_at && `published ${day(l.published_at)}`,
    l.sold_at && `sold ${day(l.sold_at)}`,
    hidden && l.hidden ? `hidden ${when(l.hidden.at)}${l.hidden.by_member_name ? ` by ${firstName(l.hidden.by_member_name)}` : ''}` : reports.length > 0 && count(reports.length, 'report'),
  ]
    .filter(Boolean)
    .join(' · ')
  const details: [string, string | undefined][] = [
    ['Category', l.category || l.category_code],
    ['Condition', conditionLabel[l.condition] ?? humanize(l.condition)],
    ...(l.specs ?? []).map((x) => [x.label, x.value] as [string, string]),
    ['Offers', l.allow_offers ? 'Allowed' : 'Not allowed'],
    ['Area', [l.commune, l.province].filter(Boolean).join(', ') || undefined],
  ]
  // The report case is keyed by the seller's account, as the Reports page is.
  const caseHref = l.report_case_id ? `/reports/${l.report_case_id}` : undefined

  return (
    <>
      <BackCrumbs kind="Listings" name={l.title}>
        <Btn icon={<IconSpark width={17} height={17} />} onClick={() => navigate(askHref('listing', id, l.title))}>
          Ask the agent
        </Btn>
        {hidden ? (
          <Btn kind="primary" icon={<IconShow width={16} height={16} />} onClick={() => commands.unhide.mutate()} disabled={commands.unhide.isPending}>
            Unhide
          </Btn>
        ) : (
          (l.status === 'active' || l.status === 'reserved') && (
            <div ref={hideBox} className="relative">
              <Btn icon={<IconHide width={16} height={16} />} onClick={() => setHiding((h) => !h)} aria-expanded={hiding} className={hiding ? 'bg-on-surface/5 ring-4 ring-on-surface/5' : ''}>
                Hide listing
              </Btn>
              {hiding && <HidePopover l={l} onClose={closeHide} hide={commands.hide} />}
            </div>
          )
        )}
      </BackCrumbs>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        {failure && <Notice>{listingFailure(failure)}</Notice>}
        <Hero>
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="w-full shrink-0 lg:w-[300px]">
              {photos.length > 0 ? (
                <img src={photos[Math.min(photo, photos.length - 1)]} alt="" className="h-[200px] w-full rounded-3xl object-cover shadow-soft" />
              ) : (
                <span className="flex h-[200px] w-full items-center justify-center rounded-3xl bg-surface-container text-on-surface-variant">
                  <IconPhoto width={32} height={32} />
                </span>
              )}
              {photos.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {photos.map((src, i) => (
                    <button
                      key={src + i}
                      type="button"
                      aria-label={`Photo ${i + 1}`}
                      aria-pressed={i === photo}
                      onClick={() => setPhoto(i)}
                      className={`h-14 w-14 shrink-0 rounded-[10px] bg-cover bg-center ${i === photo ? 'ring-2 ring-primary' : 'opacity-80 hover:opacity-100'}`}
                      style={{ backgroundImage: `url(${src})` }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-display-small">{l.title}</h1>
                <StatusPill suspended={hidden}>{hidden ? 'Hidden' : (listingStatus[l.status] ?? humanize(l.status))}</StatusPill>
              </div>
              <p className="mt-1 tabular-nums text-[26px] font-semibold leading-tight text-on-surface">{vnd(l.price)}</p>
              <p className="mt-1 tabular-nums text-body-small text-on-surface-variant">{line}</p>
              {(reports.length > 0 || guide) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {reports.length > 0 && (
                    <Tag tone="border border-hairline bg-surface-container-lowest text-on-surface-variant">
                      <IconFlag width={13} height={13} />
                      {count(reports.length, 'report')}
                      {top && ` · ${(reasonLabel[top as ReportReason] ?? humanize(top)).toLowerCase()}`}
                    </Tag>
                  )}
                  {guide && guide.pct_vs_guide !== 0 && (
                    <Tag tone="border border-hairline bg-surface-container-lowest text-on-surface-variant">
                      <IconSell width={13} height={13} />
                      {Math.abs(Math.round(guide.pct_vs_guide))}% {guide.pct_vs_guide < 0 ? 'under' : 'over'} the price guide
                    </Tag>
                  )}
                </div>
              )}
              {/* The seller's description, as they wrote it. */}
              {l.description && <p className="mt-4 max-w-[560px] whitespace-pre-line border-l-2 border-primary/40 pl-3 text-body-medium leading-[22px] text-on-surface-variant">{l.description}</p>}
            </div>
          </div>
        </Hero>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_380px]">
          <Card className="p-5 pb-3">
            <CardHead title="Details" />
            {details
              .filter((d): d is [string, string] => !!d[1])
              .map(([k, v]) => (
                <FactRow key={k} label={k}>
                  {v}
                </FactRow>
              ))}
            {guide && (
              <FactRow label="Price guide">
                {vnd(guide.median)} <span className="text-on-surface-variant">· {int(guide.sample_size)} similar</span>
              </FactRow>
            )}
          </Card>
          <div className="space-y-4">
            {
              <PartyCard
                role="Seller"
                id={l.seller.id}
                name={l.seller.display_name}
                status={l.seller.status}
                meta={`${shortId(l.seller.id)} · ${int(l.seller.listings)} on sale · ${int(l.seller.sold)} sold`}
              />
            }
            {reports.length > 0 && (
              <Card className="p-4">
                <CardHead title="Reports on this listing" right={<Tag tone="bg-surface-container text-on-surface">{reports.length}</Tag>} />
                {reports.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 py-2">
                    <Initial name={r.reporter_display_name} id={r.reporter_display_name} size={30} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-label-medium">
                        {r.reporter_display_name} <span className="font-normal tabular-nums text-on-surface-variant">· {when(r.at)}</span>
                      </p>
                      <p className="mt-0.5 text-body-small text-on-surface-variant">{reasonLabel[r.reason as ReportReason] ?? humanize(r.reason)}</p>
                      {/* What the reporter wrote stays as they wrote it. */}
                      {r.note && <p className="mt-0.5 text-body-small text-on-surface-variant">“{r.note}”</p>}
                    </div>
                  </div>
                ))}
                {caseHref && (
                  <Link to={caseHref} className="mt-1 inline-flex items-center gap-1 text-label-medium text-primary">
                    Open report case
                    <IconOpen width={14} height={14} />
                  </Link>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/** The reason most reports give. */
function topReason(reports: { reason: string }[]): string | undefined {
  const n = new Map<string, number>()
  for (const r of reports) n.set(r.reason, (n.get(r.reason) ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

/** Hide: what it does, then Hide listing. The server takes no reason for it yet. */
function HidePopover({ l, onClose, hide }: { l: ListingDetail; onClose: () => void; hide: ReturnType<typeof useListingCommands>['hide'] }) {
  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-[380px] origin-top-right animate-pop overflow-hidden rounded-5xl border border-hairline bg-surface-container-lowest shadow-float">
      <div className="flex items-start gap-3 p-4">
        <IconTile size={40} tone="bg-surface-container text-on-surface-variant">
          <IconHide width={20} height={20} />
        </IconTile>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-title-medium">Hide {l.title}?</p>
          <p className="mt-1 text-body-small text-on-surface-variant">Buyers stop seeing it, and {l.seller.display_name} cannot put it back on sale until a member unhides it.</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-hairline bg-surface-container-low/60 p-3">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn autoFocus kind="danger-fill" disabled={hide.isPending} onClick={() => hide.mutate(undefined, { onSuccess: onClose })}>
          Hide listing
        </Btn>
      </div>
    </div>
  )
}
