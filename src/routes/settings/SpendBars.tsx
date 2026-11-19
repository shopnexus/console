import { fillAt } from '../../lib/aiLook'
import { shortId } from '../../lib/api'
import { day, usd } from '../../lib/format'
import type { Spend } from '../../lib/settings'

/** Spend as a bar a day, split by agent in each agent's colour (its place in order), with its legend. */
export function SpendBars({ s, agents, h = 170 }: { s: Spend; agents: { id: string; name: string }[]; h?: number }) {
  const order = agents.map((a) => a.id)
  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name ?? shortId(id)
  const top = Math.max(1, ...s.days.map((d) => d.total_usd))
  const ids = [...new Set(s.days.flatMap((d) => d.agents.map((a) => a.agent_id)))].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const color = (id: string) => fillAt(Math.max(0, order.indexOf(id)))
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-label-small font-normal text-on-surface-variant">
        {ids.map((id) => (
          <span key={id} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${color(id)}`} />
            {nameOf(id)}
          </span>
        ))}
      </div>
      <div className="relative pr-8" style={{ height: h }}>
        {[50, 100].map((p) => (
          <div key={p} className="absolute inset-x-0 border-t border-dashed border-hairline" style={{ bottom: `${p}%` }}>
            <span className="absolute -top-2.5 right-0 bg-surface-container-lowest pl-1 tabular-nums text-label-small font-normal text-on-surface-variant">${Math.round((top * p) / 100)}</span>
          </div>
        ))}
        <div className={`relative flex h-full items-end ${s.days.length > 40 ? 'gap-px' : 'gap-1.5'}`}>
          {s.days.map((d, i) => (
            <div key={d.date} title={`${day(d.date)} · ${usd(d.total_usd)}`} className={`flex flex-1 flex-col-reverse ${i === s.days.length - 1 ? 'opacity-50' : ''}`}>
              {ids.map((id) => (
                <span key={id} className={`block w-full last:rounded-t-[4px] ${color(id)}`} style={{ height: ((d.agents.find((a) => a.agent_id === id)?.usd ?? 0) / top) * h }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pr-8 text-label-small font-normal text-on-surface-variant">
        <span>{day(s.start)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
