import type { LucideIcon } from 'lucide-react'

export type LegendItem = { key: string; label: string; fill: string; icon: LucideIcon }

/**
 * Names only (numbers live in the tooltip and the table view). Each entry has a colour swatch AND
 * an icon AND a text label, so a status is never identified by colour alone.
 */
export function Legend({ items, label }: { items: LegendItem[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map(({ key, label: text, fill, icon: Icon }) => (
        <li
          key={key}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
        >
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ background: fill }}
          />
          <Icon className="size-3.5" aria-hidden />
          <span className="font-medium text-foreground">{text}</span>
        </li>
      ))}
    </ul>
  )
}
