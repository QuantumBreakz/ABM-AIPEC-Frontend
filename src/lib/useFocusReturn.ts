import { useRef } from 'react'

/**
 * Props for a Radix `Dialog.Content`: remember what had focus when the popup opened and give
 * focus back to it when the popup closes. Radix does this by itself only for a built-in trigger
 * button; ours open from state, so without this a keyboard user would land at the top of the page.
 */
export function useFocusReturn() {
  const opener = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault()
      opener.current?.focus()
    },
  }
}
