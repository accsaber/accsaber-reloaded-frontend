import { onUnmounted } from 'vue'

const BLURRED_GAP = 1000 / 15

interface Loop {
  frame: (now: number) => void
  enabled?: () => boolean
}

export interface RenderLoop {
  start: () => void
  stop: () => void
}

const active = new Set<Loop>()
let rafId: number | null = null
let focused = true
let lastBlurredFrame = 0
let listening = false

function schedule() {
  if (rafId === null && active.size > 0 && !document.hidden) rafId = requestAnimationFrame(tick)
}

function tick(now: number) {
  rafId = null
  if (document.hidden) return
  if (!focused && now - lastBlurredFrame < BLURRED_GAP) {
    schedule()
    return
  }
  lastBlurredFrame = now
  schedule()
  for (const loop of active) {
    if (loop.enabled?.() === false) {
      active.delete(loop)
      continue
    }
    try {
      loop.frame(now)
    } catch (e) {
      reportError(e)
    }
  }
}

function listen() {
  if (listening) return
  listening = true
  focused = document.hasFocus()
  document.addEventListener('visibilitychange', schedule)
  window.addEventListener('focus', () => { focused = true })
  window.addEventListener('blur', () => { focused = false })
}

export function useRenderLoop(frame: (now: number) => void, enabled?: () => boolean): RenderLoop {
  const loop: Loop = { frame, enabled }

  function start() {
    if (enabled?.() === false) return
    listen()
    active.add(loop)
    schedule()
  }

  function stop() {
    active.delete(loop)
  }

  onUnmounted(stop)

  return { start, stop }
}
