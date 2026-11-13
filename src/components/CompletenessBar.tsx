/** A number plus a thin bar: how much of the research for a company is done (0–100). */
export function CompletenessBar({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="flex items-center gap-2" title={`${percent}% of the steps are complete`}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Completeness"
        className="h-1.5 w-12 overflow-hidden rounded-full bg-track"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 text-right tabular-nums">{percent}%</span>
    </div>
  )
}
