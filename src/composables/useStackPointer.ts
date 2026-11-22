import { onMounted, onUnmounted, type Ref } from 'vue'
import { prefersReducedMotion } from '@/composables/useReducedMotion'

export interface StackPointer {
  x: number
  y: number
  nx: number
  ny: number
}

interface Point {
  x: number
  y: number
}

let pointer: Point | null = null
let pressed: Point | null = null
let moves = 0
let presses = 0
let users = 0

function onMove(e: PointerEvent): void {
  pointer = { x: e.clientX, y: e.clientY }
  moves++
}

function onLeave(): void {
  pointer = null
  moves++
}

function onDown(e: PointerEvent): void {
  pressed = { x: e.clientX, y: e.clientY }
  presses++
}

function attach(): void {
  if (users++ > 0) return
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
}

function detach(): void {
  if (--users > 0) return
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerdown', onDown)
  document.documentElement.removeEventListener('pointerleave', onLeave)
  pointer = null
  pressed = null
}

function toStack(point: Point, host: HTMLElement, margin: number): StackPointer {
  const rect = host.getBoundingClientRect()
  const stack = 100 / (100 + margin * 2)
  const x = (point.x - (rect.left + rect.width / 2)) / (rect.width * stack)
  const y = (point.y - (rect.top + rect.height / 2)) / (rect.height * stack)
  return { x, y, nx: Math.abs(x), ny: Math.abs(y) }
}

export function useStackPointer(el: Readonly<Ref<HTMLElement | null>>, margin: number, enabled: () => boolean) {
  let state: StackPointer | null = null
  let seenMove = -1
  let seenPress = 0
  let attached = false

  function read(): StackPointer | null {
    if (!attached || !el.value || seenMove === moves) return state
    seenMove = moves
    state = pointer ? toStack(pointer, el.value, margin) : null
    return state
  }

  function takePress(): StackPointer | null {
    if (!attached || !el.value || !pressed || seenPress === presses) return null
    seenPress = presses
    return toStack(pressed, el.value, margin)
  }

  onMounted(() => {
    if (!enabled() || prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return
    attach()
    attached = true
    seenPress = presses
  })

  onUnmounted(() => {
    if (attached) detach()
  })

  return { read, takePress }
}
