/** Every TanStack Query key in one place, so invalidating a resource never misses a spelling. */
export const keys = {
  me: ['me'] as const,
  reviewCounts: ['review-counts'] as const,
  events: ['events'] as const,
  companies: (params?: object) => ['companies', params ?? {}] as const,
  overview: (edition: number | undefined) => ['overview', edition] as const,
  /** Prefix of every runs list query, handy for invalidating them all. */
  runsAll: ['runs'] as const,
  runs: (page: number) => ['runs', { page }] as const,
  run: (id: string | undefined) => ['run', id] as const,
}
