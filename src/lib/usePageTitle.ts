import { useEffect } from 'react'

/** Names the browser tab: "Companies · ADIPEC Lead Gen". */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · ADIPEC Lead Gen`
  }, [title])
}
