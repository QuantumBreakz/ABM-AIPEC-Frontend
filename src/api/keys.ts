/** Every TanStack Query key in one place, so invalidating a resource never misses a spelling. */
export const keys = {
  me: ['me'] as const,
  reviewCounts: ['review-counts'] as const,
  /** Prefix of every review list, handy for invalidating them all after something is resolved. */
  reviewAll: ['review'] as const,
  review: (type: string, page: number) => ['review', type, page] as const,
  events: ['events'] as const,
  companies: (params?: object) => ['companies', params ?? {}] as const,
  company: (id: string | undefined) => ['company', id] as const,
  history: (id: string | undefined) => ['history', id] as const,
  overview: (edition: number | undefined) => ['overview', edition] as const,
  /** Prefix of every runs list query, handy for invalidating them all. */
  runsAll: ['runs'] as const,
  runs: (page: number) => ['runs', { page }] as const,
  run: (id: string | undefined) => ['run', id] as const,
}
