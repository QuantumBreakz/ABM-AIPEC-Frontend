/** Every TanStack Query key in one place, so invalidating a resource never misses a spelling. */
export const keys = {
  me: ['me'] as const,
  reviewCounts: ['review-counts'] as const,
}
