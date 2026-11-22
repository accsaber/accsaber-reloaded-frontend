import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import { mediaMatches, PHONE_MEDIA_QUERY } from '@/composables/useMediaQuery'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useRenderLoop } from '@/composables/useRenderLoop'
import { observeSize, observeVisible } from '@/utils/observe'

export interface CanvasScene {
  animated?: boolean
  init?: (w: number, h: number, nowMs: number, scale: number) => void
  resize?: (w: number, h: number, nowMs: number, scale: number) => void
  draw: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    nowMs: number,
    reduced: boolean,
  ) => void
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
  measure: (canvas: HTMLCanvasElement) => { w: number; h: number; scale: number },
): void {
  const reduced = useReducedMotion()
  const phone = mediaMatches(PHONE_MEDIA_QUERY)
  const stops: Array<() => void> = []
  let ctx: CanvasRenderingContext2D | null = null
  let staticHost = false
  let logicalW = 0
  let logicalH = 0
  let logicalScale = 0
  let initialized = false
  let pendingLayout = 0
  let onScreen = true

  function isStatic(): boolean {
    return staticHost || reduced.value || phone.value
  }

  function render(now: number) {
    if (ctx && logicalW > 0 && logicalH > 0) scene.draw(ctx, logicalW, logicalH, now, isStatic())
  }

  const loop = useRenderLoop(render, () => onScreen && scene.animated !== false && !isStatic())

  function layout() {
    const canvas = canvasRef.value
    if (!canvas) return
    const { w, h, scale } = measure(canvas)
    if (w <= 0 || h <= 0) return
    if (w === logicalW && h === logicalH && scale === logicalScale) return
    canvas.width = w * scale
    canvas.height = h * scale
    ctx = canvas.getContext('2d')
    ctx?.setTransform(scale, 0, 0, scale, 0, 0)
    logicalW = w
    logicalH = h
    logicalScale = scale
    const now = performance.now()
    if (initialized) (scene.resize ?? scene.init)?.(w, h, now, scale)
    else scene.init?.(w, h, now, scale)
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

  watch([reduced, phone], () => {
    if (isStatic()) render(performance.now())
    else loop.start()
  })

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    staticHost = !!canvas.closest('[data-fx-static]')
    layout()
    stops.push(
      observeSize(canvas, scheduleLayout),
      observeVisible(canvas, (visible) => {
        onScreen = visible
        if (visible) loop.start()
      }),
    )
    loop.start()
  })

  onUnmounted(() => {
    loop.stop()
    if (pendingLayout) cancelAnimationFrame(pendingLayout)
    pendingLayout = 0
    for (const stop of stops) stop()
  })
}

export function useBackdropCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scene: CanvasScene,
): void {
  useSceneCanvas(canvasRef, scene, (canvas) => {
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
  })
}

export function useElementCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scene: CanvasScene,
): void {
  useSceneCanvas(canvasRef, scene, (canvas) => ({ w: canvas.clientWidth, h: canvas.clientHeight, scale: deviceScale() }))
}
