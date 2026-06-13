import { useQuery } from '@tanstack/react-query'

import { fetchPolicy } from './api'

import type { PolicySlug } from './schema'

export const policiesKeys = {
  all: ['policies'] as const,
  detail: (slug: PolicySlug) => [...policiesKeys.all, 'detail', slug] as const,
}

/** 게시된 정책 본문은 거의 바뀌지 않으므로 세션 내 재방문은 캐시로 충분하다. */
const POLICY_STALE_TIME_MS = 30 * 60 * 1000

export function usePolicy(slug: PolicySlug) {
  return useQuery({
    queryKey: policiesKeys.detail(slug),
    queryFn: ({ signal }) => fetchPolicy(slug, { signal }),
    staleTime: POLICY_STALE_TIME_MS,
  })
}
