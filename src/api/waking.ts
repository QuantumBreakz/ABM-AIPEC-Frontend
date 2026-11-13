import { useSyncExternalStore } from 'react'

/**
 * Tracks whether any API request is currently waiting for a sleeping backend
 * (Render free tier). The WakingBanner reads this with `useWaking()`.
 * A counter is used so one request finishing doesn't hide the banner for others.
 */
let waitingRequests = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function beginWaking() {
  waitingRequests += 1
  emit()
}

export function endWaking() {
  waitingRequests = Math.max(0, waitingRequests - 1)
  emit()
}

export function resetWaking() {
  waitingRequests = 0
  emit()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const getSnapshot = () => waitingRequests > 0

/** True while the backend is waking up. */
export function useWaking() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
