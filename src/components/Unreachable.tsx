import { useRouteError } from 'react-router'
import IconRefresh from '~icons/material-symbols/refresh-rounded'
import { ApiError } from '../lib/api'
import { Btn } from './ui'

/**
 * A full page for when the console cannot go on: the API did not answer
 * (offline, the server restarting) or a page threw. Retry runs what failed
 * again when the caller can; otherwise it reloads the page.
 */
export function Unreachable({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  // fetch rejects with a TypeError when nothing answers; a gateway in front of a restarting server answers 502–504.
  const offline =
    (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) ||
    (error instanceof ApiError && error.status >= 502 && error.status <= 504)
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-surface-container-lowest px-6 text-center">
      <img src="/art-ai-reading.webp" alt="" className="h-24 w-24 object-contain" />
      <h1 className="text-headline-large">{offline ? "Can't reach the server" : 'Something went wrong'}</h1>
      <p className="max-w-[420px] text-body-medium text-on-surface-variant">
        {offline
          ? 'The console could not reach the API. It may be restarting; try again in a moment.'
          : 'This page failed to load. Try again, or go back to New chat.'}
      </p>
      <div className="mt-2 flex gap-2">
        <Btn kind="primary" big icon={<IconRefresh width={18} height={18} />} onClick={onRetry ?? (() => location.reload())}>
          Try again
        </Btn>
        {!offline && (
          <Btn big onClick={() => location.assign('/')}>
            New chat
          </Btn>
        )}
      </div>
    </div>
  )
}

/** The router's errorElement: a page that threw, shown as Unreachable. */
export function RouteError() {
  return <Unreachable error={useRouteError()} />
}
