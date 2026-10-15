import { readStored, writeStored } from '@/utils/storage'
import { computed, onMounted, onUnmounted, ref } from 'vue'

export type WallSide = 'left' | 'right'

interface StoredPosition {
  side: WallSide
  y: number
}

const DRAG_THRESHOLD = 5

function parsePosition(raw: unknown): StoredPosition | null {
  if (!raw || typeof raw !== 'object') return null
  const { side, y } = raw as Record<string, unknown>
  return (side === 'left' || side === 'right') && typeof y === 'number' ? { side, y } : null
}

function readPosition(key: string): StoredPosition | null {
  return readStored(key, parsePosition, null)
}

function topInset(inset: number): number {
  const navbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height'))
  return (Number.isFinite(navbar) ? navbar : 0) + inset
}

export function useWallSnap(storageKey: string, size: number, inset: number) {
  const stored = readPosition(storageKey)
  const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
  const side = ref<WallSide>(stored?.side ?? 'left')
  const drag = ref<{ x: number; y: number } | null>(null)

  let start: { pointerX: number; pointerY: number; x: number; y: number } | null = null
  let swallowClick = false

  function clampY(value: number): number {
    const max = viewport.value.height - size - inset
    return Math.max(topInset(inset), Math.min(max, value))
  }

  const y = ref(clampY(stored?.y ?? Number.POSITIVE_INFINITY))

  const restX = computed(() => (side.value === 'left' ? inset : viewport.value.width - size - inset))
  const position = computed(() => drag.value ?? { x: restX.value, y: y.value })
  const dragging = computed(() => drag.value !== null)

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    swallowClick = false
    start = { pointerX: e.clientX, pointerY: e.clientY, x: restX.value, y: y.value }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!start) return
    const dx = e.clientX - start.pointerX
    const dy = e.clientY - start.pointerY
    if (!drag.value && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    const maxX = viewport.value.width - size
    drag.value = { x: Math.max(0, Math.min(maxX, start.x + dx)), y: clampY(start.y + dy) }
  }

  function onPointerUp(e: PointerEvent) {
    start = null
    const dropped = drag.value
    if (!dropped) return
    swallowClick = e.type === 'pointerup'
    side.value = dropped.x + size / 2 < viewport.value.width / 2 ? 'left' : 'right'
    y.value = dropped.y
    drag.value = null
    writeStored(storageKey, { side: side.value, y: y.value })
  }

  function consumeDragClick(): boolean {
    const swallowed = swallowClick
    swallowClick = false
    return swallowed
  }

  function onResize() {
    viewport.value = { width: window.innerWidth, height: window.innerHeight }
    y.value = clampY(y.value)
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  return {
    side,
    position,
    dragging,
    viewport,
    consumeDragClick,
    handlers: {
      pointerdown: onPointerDown,
      pointermove: onPointerMove,
      pointerup: onPointerUp,
      pointercancel: onPointerUp,
    },
  }
}
