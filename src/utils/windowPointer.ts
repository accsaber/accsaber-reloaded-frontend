const IDLE_MS = 150

interface PointerSubscriber {
  measure: () => DOMRect | null
  apply: (rect: DOMRect, x: number, y: number) => void
  idle: () => void
}

const subscribers = new Set<PointerSubscriber>()
let pointerX = 0
let pointerY = 0
let frame = 0
let idleTimer: ReturnType<typeof setTimeout> | undefined

function flush() {
  frame = 0
  const measured = [...subscribers].map((s) => [s, s.measure()] as const)
  for (const [s, rect] of measured) if (rect) s.apply(rect, pointerX, pointerY)
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => subscribers.forEach((s) => s.idle()), IDLE_MS)
}

function onPointerMove(e: PointerEvent) {
  pointerX = e.clientX
  pointerY = e.clientY
  if (!frame) frame = requestAnimationFrame(flush)
}

export function subscribeWindowPointer(subscriber: PointerSubscriber): () => void {
  if (subscribers.size === 0) window.addEventListener('pointermove', onPointerMove, { passive: true })
  subscribers.add(subscriber)

  function stop() {
    if (!subscribers.delete(subscriber) || subscribers.size > 0) return
    window.removeEventListener('pointermove', onPointerMove)
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    if (idleTimer) clearTimeout(idleTimer)
  }

  return stop
}
