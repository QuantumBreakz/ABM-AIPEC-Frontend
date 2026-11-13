/** Tunable behaviour of the fake backend. Tests switch the delays off. */
export const mockConfig = {
  /** Random fake latency per request (ms). */
  delayMin: 200,
  delayMax: 600,
  /** How long an AI "Regenerate" stays pending (ms). */
  aiDelayMs: 2500,
  /** Share of each queued step that finishes every time a running run is read. */
  runStepFraction: 0.25,
}

/** Runtime switches that can be flipped from the browser URL or from tests. */
export const mockState = {
  /** Until this timestamp every request answers 503, like a sleeping Render service. */
  wakeUntil: 0,
}

export function disableDelays() {
  mockConfig.delayMin = 0
  mockConfig.delayMax = 0
  mockConfig.aiDelayMs = 0
}

/** Read a query parameter of the page URL (?mock_role=reviewer). Safe outside a browser. */
export function pageParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name)
  } catch {
    return null
  }
}
