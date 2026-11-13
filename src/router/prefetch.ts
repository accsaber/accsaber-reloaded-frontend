import type { RouteLocation, Router } from 'vue-router'

const prefetched = new Set<string>()
const seenHrefs = new Set<string>()
let installed = false

const DATA_WARMERS: Record<string, (to: RouteLocation) => Promise<void>> = {
  'player-profile': async (to) => {
    const id = to.params.userId as string
    const [{ warm }, users, items] = await Promise.all([
      import('@/api/client'),
      import('@/api/users'),
      import('@/api/items'),
    ])
    warm(() => {
      void users.getUser(id)
      void items.getUserEquippedItems(id)
      void items.getUserItems(id, { typeKey: 'badge' })
    })
  },
  'map-detail': async (to) => {
    const [{ warm }, maps] = await Promise.all([import('@/api/client'), import('@/api/maps')])
    warm(() => {
      void maps.getMapByRef(
        to.params.mapId as string,
        to.query.difficulty as string | undefined,
        to.query.characteristic as string | undefined,
      )
    })
  },
}

function resolveHref(router: Router, href: string): RouteLocation | null {
  const url = new URL(href, window.location.origin)
  return url.origin === window.location.origin ? router.resolve(url.pathname + url.search) : null
}

function triggerLoad(router: Router, href: string) {
  if (seenHrefs.has(href)) return
  seenHrefs.add(href)
  const resolved = resolveHref(router, href)
  if (!resolved) return
  const key = String(resolved.name ?? resolved.path)
  if (prefetched.has(key)) return
  prefetched.add(key)
  for (const match of resolved.matched) {
    const comp = match.components?.default
    if (typeof comp === 'function') {
      (comp as () => Promise<unknown>)().catch(() => {
        prefetched.delete(key)
        seenHrefs.delete(href)
      })
    }
  }
}

function warmData(router: Router, href: string) {
  const resolved = resolveHref(router, href)
  if (resolved) void DATA_WARMERS[String(resolved.name)]?.(resolved).catch(() => undefined)
}

function linkHref(event: Event): string | null {
  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!anchor) return null
  const raw = anchor.getAttribute('href')
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return null
  if (anchor.target && anchor.target !== '_self') return null
  if (anchor.host && anchor.host !== window.location.host) return null
  return anchor.href
}

export function installRoutePrefetch(router: Router): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const listen = (type: string, run: (router: Router, href: string) => void) =>
    document.addEventListener(
      type,
      (event) => {
        const href = linkHref(event)
        if (href) run(router, href)
      },
      { passive: true, capture: true },
    )

  listen('mouseover', triggerLoad)
  listen('focusin', triggerLoad)
  listen('touchstart', triggerLoad)
  listen('pointerdown', warmData)
}
