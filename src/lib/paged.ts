import { type QueryKey, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api, type Page } from './api'

/**
 * A list the server pages by cursor, 50 rows a page; fetchNextPage reads the
 * next. Params left undefined or empty stay off the URL. items is every row
 * loaded so far, total the count the first page carries, when it does.
 */
export function usePaged<T>(key: QueryKey, path: string, params: Record<string, string | null | undefined>, opts: { refetchOnWindowFocus?: boolean } = {}) {
  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limit: '50' })
      for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
      if (pageParam) q.set('cursor', pageParam)
      return api<Page<T>>(`${path}?${q}`)
    },
    getNextPageParam: (last) => last.next_cursor,
    ...opts,
  })
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items), [query.data])
  return { ...query, items, total: query.data?.pages[0]?.total }
}
