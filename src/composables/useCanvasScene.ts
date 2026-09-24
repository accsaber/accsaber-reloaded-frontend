import { onMounted, onUnmounted, type Ref } from 'vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useRenderLoop } from '@/composables/useRenderLoop'

export interface CanvasScene {
  animated?: boolean
  init: (w: number, h: number, nowMs: number, scale: number) => void
  resize?: (w: number, h: number, nowMs: number, scale: number) => void
  draw: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    nowMs: number,
    reduced: boolean,
  ) => void
}

interface SceneSizing {
  measure: (canvas: HTMLCanvasElement) => { w: number; h: number; scale: number }
  observe?: (canvas: HTMLCanvasElement, onChange: () => void) => () => void
}

const OVERSCAN_BUDGET = 2

function deviceScale(): number {
  return Math.min(window.devicePixelRatio, 2)
}

function inlineHost(canvas: HTMLCanvasElement): HTMLElement | null {
  return canvas.closest('[data-fx-inline]')
}

function inlineZoom(host: HTMLElement): number {
  const zoom = parseFloat(host.getAttribute('data-fx-inline') ?? '')
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1
}

function useSceneCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scene: CanvasScene,
  sizing: SceneSizing,
): void {
  const reduced = useReducedMotion()
  let stopObserving: (() => void) | null = null
  let logicalW = 0
  let logicalH = 0
  let logicalScale = 0
  let initialized = false
  let pendingLayout = 0
  let onScreen = true
  let visibility: IntersectionObserver | null = null

  function isStatic(): boolean {
    return reduced.value || !!canvasRef.value?.closest('[data-fx-static]')
  }

  function render(now: number) {
    if (!canvasRef.value || logicalW <= 0 || logicalH <= 0) return
    const ctx = canvasRef.value.getContext('2d')
    if (!ctx) return
    scene.draw(ctx, logicalW, logicalH, now, isStatic())
  }

  const loop = useRenderLoop(render, () => onScreen && scene.animated !== false && !isStatic())

  function watchVisibility(canvas: HTMLCanvasElement) {
    visibility = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting)
        if (onScreen) loop.start()
      },
      { rootMargin: '64px' },
    )
    visibility.observe(canvas)
  }

  function layout() {
    if (!canvasRef.value) return
    const { w, h, scale } = sizing.measure(canvasRef.value)
    if (w <= 0 || h <= 0) return
    if (w === logicalW && h === logicalH && scale === logicalScale) return
    canvasRef.value.width = w * scale
    canvasRef.value.height = h * scale
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) ctx.setTransform(scale, 0, 0, scale, 0, 0)
    logicalW = w
    logicalH = h
    logicalScale = scale
    const now = performance.now()
    if (initialized) (scene.resize ?? scene.init)(w, h, now, scale)
    else scene.init(w, h, now, scale)
    initialized = true
    if (isStatic() || scene.animated === false) render(now)
  }

  function scheduleLayout() {
    if (pendingLayout) return
    pendingLayout = requestAnimationFrame(() => {
      pendingLayout = 0
      layout()
    })
  }

  onMounted(() => {
    layout()
    window.addEventListener('resize', scheduleLayout)
    if (canvasRef.value && sizing.observe) {
      stopObserving = sizing.observe(canvasRef.value, scheduleLayout)
    }
    if (canvasRef.value) watchVisibility(canvasRef.value)
    loop.start()
  })

  onUnmounted(() => {
    loop.stop()
    if (pendingLayout) cancelAnimationFrame(pendingLayout)
    pendingLayout = 0
    window.removeEventListener('resize', scheduleLayout)
    stopObserving?.()
    stopObserving = null
    visibility?.disconnect()
    visibility = null
  })
}

function observeElement(canvas: HTMLCanvasElement, onChange: () => void): () => void {
  const observer = new ResizeObserver(onChange)
  observer.observe(canvas)
  return () => observer.disconnect()
}

export function useBackdropCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scene: CanvasScene,
): void {
  useSceneCanvas(canvasRef, scene, {
    measure: (canvas) => {
      const host = inlineHost(canvas)
      if (host) {
        const zoom = inlineZoom(host)
        return {
          w: canvas.clientWidth * zoom,
          h: canvas.clientHeight * zoom,
          scale: deviceScale() / zoom,
        }
      }
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const overscan = (w * h) / (window.innerWidth * window.innerHeight)
      return { w, h, scale: deviceScale() * Math.min(1, Math.sqrt(OVERSCAN_BUDGET / overscan)) }
    },
    observe: observeElement,
  })
}

export function useElementCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scene: CanvasScene,
): void {
  useSceneCanvas(canvasRef, scene, {
    measure: (canvas) => ({ w: canvas.clientWidth, h: canvas.clientHeight, scale: deviceScale() }),
    observe: observeElement,
  })
}
