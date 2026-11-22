import { onMounted, onUnmounted, type Ref } from 'vue'
import { prefersReducedMotion } from '@/composables/useReducedMotion'

export interface StackPointer {
  x: number
  y: number
  nx: number
  ny: number
}

export function useStackPointer(el: Readonly<Ref<HTMLElement | null>>, margin: number, enabled: () => boolean) {
  let pointer: { x: number; y: number } | null = null
  let press: { x: number; y: number } | null = null
  let dirty = false
  let state: StackPointer | null = null
  let attached = false

  function onMove(e: PointerEvent): void {
    pointer = { x: e.clientX, y: e.clientY }
    dirty = true
  }

  function onLeave(): void {
    pointer = null
    dirty = true
  }

  function onDown(e: PointerEvent): void {
    press = { x: e.clientX, y: e.clientY }
  }

  function toStack(point: { x: number; y: number }, host: HTMLElement): StackPointer {
    const rect = host.getBoundingClientRect()
    const stack = 100 / (100 + margin * 2)
    const x = (point.x - (rect.left + rect.width / 2)) / (rect.width * stack)
    const y = (point.y - (rect.top + rect.height / 2)) / (rect.height * stack)
    return { x, y, nx: Math.abs(x), ny: Math.abs(y) }
  }

  function read(): StackPointer | null {
    if (!dirty || !el.value) return state
    dirty = false
    state = pointer ? toStack(pointer, el.value) : null
    return state
  }

  function takePress(): StackPointer | null {
    if (!press || !el.value) return null
    const at = toStack(press, el.value)
    press = null
    return at
  }

  onMounted(() => {
    if (!enabled() || prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    attached = true
  })

  onUnmounted(() => {
    if (!attached) return
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    document.documentElement.removeEventListener('pointerleave', onLeave)
  })

  return { read, takePress }
}
