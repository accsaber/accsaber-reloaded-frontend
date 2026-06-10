import type { Router } from 'vue-router'

const prefetched = new Set<string>()
let installed = false

function triggerLoad(router: Router, href: string) {
  try {
    const url = new URL(href, window.location.origin)
    if (url.origin !== window.location.origin) return
    const resolved = router.resolve(url.pathname + url.search)
    const key = String(resolved.name ?? resolved.path)
    if (prefetched.has(key)) return
    prefetched.add(key)
    for (const match of resolved.matched) {
      const comp = match.components?.default
      if (typeof comp === 'function') {
        (comp as () => Promise<unknown>)().catch(() => {
          prefetched.delete(key)
        })
      }
    }
  } catch {
  }
}

export function installRoutePrefetch(router: Router): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const onEvent = (event: Event) => {
    const target = event.target as Element | null
    if (!target) return
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    const raw = anchor.getAttribute('href')
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return
    if (anchor.target && anchor.target !== '_self') return
    if (anchor.host && anchor.host !== window.location.host) return
    triggerLoad(router, anchor.href)
  }

  document.addEventListener('mouseover', onEvent, { passive: true, capture: true })
  document.addEventListener('focusin', onEvent, { passive: true, capture: true })
  document.addEventListener('touchstart', onEvent, { passive: true, capture: true })
}
