import { nextTick } from 'vue'
import type { RouteLocationNormalized, Router } from 'vue-router'

const TRANSITION_NAME = 'shared-cover'
const ACTIVE_ATTR = 'coverTransition'
const TARGET_SELECTOR = '[data-shared-target]:not(.page-leave-active *)'
const TARGET_WAIT_MS = 500
const IMAGE_KIND_BY_ROUTE: Record<string, string> = {
  'map-detail': 'cover',
  'player-profile': 'avatar',
}

let clicked: Element | null = null

function findSource(to: RouteLocationNormalized): HTMLImageElement | null {
  const kind = IMAGE_KIND_BY_ROUTE[String(to.name)]
  if (!kind || !clicked?.isConnected || matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  for (let scope: Element | null = clicked; scope && scope !== document.body; scope = scope.parentElement) {
    const matches = scope.querySelectorAll<HTMLImageElement>(`img[data-shared="${kind}"]`)
    if (matches.length) return matches.length === 1 ? matches[0]! : null
  }
  return null
}

function waitForTarget(): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const find = () => document.querySelector<HTMLElement>(TARGET_SELECTOR)
    const done = (el: HTMLElement | null) => {
      observer.disconnect()
      clearTimeout(timer)
      resolve(el)
    }
    const observer = new MutationObserver(() => {
      const el = find()
      if (el) done(el)
    })
    const timer = setTimeout(() => done(null), TARGET_WAIT_MS)
    const present = find()
    if (present) done(present)
    else observer.observe(document.body, { childList: true, subtree: true })
  })
}

async function nameTarget(): Promise<HTMLElement | null> {
  await nextTick()
  const target = await waitForTarget()
  if (!target) return null
  target.style.viewTransitionName = TRANSITION_NAME
  const img = target instanceof HTMLImageElement ? target : target.querySelector('img')
  await img?.decode().catch(() => undefined)
  return target
}

export function installCoverTransitions(router: Router) {
  if (!document.startViewTransition) return
  const root = document.documentElement
  let arrive: (() => void) | null = null

  document.addEventListener('click', (e) => { clicked = e.target instanceof Element ? e.target : null }, true)

  router.beforeResolve((to) => {
    const img = findSource(to)
    clicked = null
    if (!img) return
    img.style.viewTransitionName = TRANSITION_NAME
    root.dataset[ACTIVE_ATTR] = ''
    return new Promise<void>((resolve) => {
      let target: HTMLElement | null = null
      const transition = document.startViewTransition(async () => {
        img.style.viewTransitionName = ''
        const arrived = new Promise<void>((done) => { arrive = done })
        resolve()
        await arrived
        target = await nameTarget()
      })
      void transition.finished.catch(() => undefined).finally(() => {
        if (target) target.style.viewTransitionName = ''
        delete root.dataset[ACTIVE_ATTR]
      })
    })
  })

  const release = () => {
    arrive?.()
    arrive = null
  }
  router.afterEach(release)
  router.onError(release)
}
