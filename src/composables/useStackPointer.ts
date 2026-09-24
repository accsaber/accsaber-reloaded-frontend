import { onMounted, onUnmounted, type Ref } from 'vue'
import { prefersReducedMotion } from '@/composables/useReducedMotion'

export interface StackPointer {
  nx: number
  ny: number
}

export function useStackPointer(el: Readonly<Ref<HTMLElement | null>>, margin: number, enabled: () => boolean) {
  let pointer: { x: number; y: number } | null = null
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

  function read(): StackPointer | null {
    if (!dirty || !el.value) return state
    dirty = false
    if (!pointer) {
      state = null
      return state
    }
    const rect = el.value.getBoundingClientRect()
    const stack = 100 / (100 + margin * 2)
    state = {
      nx: Math.abs(pointer.x - (rect.left + rect.width / 2)) / (rect.width * stack),
      ny: Math.abs(pointer.y - (rect.top + rect.height / 2)) / (rect.height * stack),
    }
    return state
  }

  onMounted(() => {
    if (!enabled() || prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    attached = true
  })

  onUnmounted(() => {
    if (!attached) return
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
  })

  return { read }
}
