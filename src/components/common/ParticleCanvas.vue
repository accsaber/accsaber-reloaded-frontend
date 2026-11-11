<script setup lang="ts">
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useRenderLoop } from '@/composables/useRenderLoop'
import { subscribeWindowPointer } from '@/utils/windowPointer'
import { onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'

const props = defineProps<{
  particleCount?: number
  darkMode?: boolean
  interactive?: boolean
}>()

interface Star {
  x: number
  y: number
  opacity: number
  size: number
  speed: number
  phase: number
  depth: number
  warm: boolean
}

const RADIUS = 120
const count = props.particleCount ?? 170

const canvasRef = ref<HTMLCanvasElement | null>(null)
const reduced = useReducedMotion()
const mobile = useMediaQuery('(max-width: 767px)')
let particles: Star[] = []
let mouseX = -1000
let mouseY = -1000
let startTime = 0
let logicalW = 0
let logicalH = 0
let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let stopPointer: (() => void) | null = null
const onScreen = ref(true)

function animated(): boolean {
  return !reduced.value && !mobile.value && onScreen.value
}

function tracksCursor(): boolean {
  return props.interactive !== false && !mobile.value && !reduced.value
}

function initParticles() {
  particles = Array.from({ length: count }, () => {
    const y = Math.random()
    const bright = Math.random() < 0.32
    return {
      x: Math.random(),
      y,
      opacity: bright ? 0.6 + Math.random() * 0.4 : 0.18 + Math.random() * 0.18,
      size: bright ? 2 + Math.random() * 1.5 : 1 + Math.random() * 1.5,
      speed: 0.5 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      depth: bright ? 0.6 + Math.random() * 0.4 : 0.3 + Math.random() * 0.4,
      warm: Math.random() < (1 - y) * 0.6,
    }
  })
}

function starColor(warm: boolean, dark: boolean): [number, number, number] {
  if (dark) return warm ? [255, 220, 150] : [232, 232, 240]
  return warm ? [80, 60, 20] : [40, 40, 60]
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h)
  const elapsed = (time - startTime) / 1000
  const cursor = tracksCursor()
  const dark = props.darkMode !== false
  const [cr, cg, cb] = dark ? [255, 215, 120] : [60, 50, 10]

  for (const p of particles) {
    const twinkle = reduced.value ? 1 : 1 - p.depth * 0.5 * (1 - Math.sin(elapsed * p.speed + p.phase))
    let opacity = p.opacity * twinkle
    let size = p.size
    let near = 0
    const x = p.x * w
    const y = p.y * h
    if (cursor) {
      const dist = Math.hypot(x - mouseX, y - mouseY)
      if (dist < RADIUS) {
        near = 1 - dist / RADIUS
        near = near * near * (3 - 2 * near)
        opacity += (0.9 - opacity) * near
        size += (4.5 - size) * near
      }
    }
    const [r, g, b] = starColor(p.warm, dark)
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${Math.round(r + (cr - r) * near)}, ${Math.round(g + (cg - g) * near)}, ${Math.round(b + (cb - b) * near)}, ${opacity})`
    ctx.fill()
  }
}

function render(time: number) {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx || logicalW <= 0 || logicalH <= 0) return
  draw(ctx, logicalW, logicalH, time)
}

const loop = useRenderLoop(render, animated)

watch(animated, (on) => {
  if (on) loop.start()
  else render(performance.now())
})

function clearPointer() {
  mouseX = -1000
  mouseY = -1000
}

function resize() {
  if (!canvasRef.value) return
  const parent = canvasRef.value.parentElement
  if (!parent) return
  const dpr = Math.min(window.devicePixelRatio, 2)
  const w = parent.clientWidth + 120
  const h = parent.clientHeight + 120
  canvasRef.value.width = w * dpr
  canvasRef.value.height = h * dpr
  canvasRef.value.style.width = w + 'px'
  canvasRef.value.style.height = h + 'px'
  const ctx = canvasRef.value.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  logicalW = w
  logicalH = h
  if (!animated()) render(startTime || performance.now())
}

watchEffect(() => {
  stopPointer?.()
  stopPointer = null
  clearPointer()
  if (!tracksCursor()) return
  stopPointer = subscribeWindowPointer({
    measure: () => canvasRef.value?.getBoundingClientRect() ?? null,
    apply: (rect, x, y) => {
      mouseX = x - rect.left
      mouseY = y - rect.top
    },
    idle: () => {},
  })
})

onMounted(() => {
  startTime = performance.now()
  initParticles()
  resizeObserver = new ResizeObserver(resize)
  if (canvasRef.value?.parentElement) resizeObserver.observe(canvasRef.value.parentElement)
  observer = new IntersectionObserver(([entry]) => { onScreen.value = !!entry?.isIntersecting })
  if (canvasRef.value) observer.observe(canvasRef.value)
  loop.start()
})

onUnmounted(() => {
  loop.stop()
  observer?.disconnect()
  resizeObserver?.disconnect()
  stopPointer?.()
})
</script>

<template>
  <canvas ref="canvasRef" class="particle-canvas" />
</template>

<style scoped>
.particle-canvas {
  position: absolute;
  max-width: none;
  inset: -40px -60px -80px -60px;
  pointer-events: none;
  z-index: 0;
  -webkit-mask-image:
    linear-gradient(to bottom, transparent 0%, white 3%, white 96%, transparent 100%),
    linear-gradient(to right, transparent 0%, white 3%, white 97%, transparent 100%);
  -webkit-mask-composite: destination-in;
  mask-image:
    linear-gradient(to bottom, transparent 0%, white 3%, white 96%, transparent 100%),
    linear-gradient(to right, transparent 0%, white 3%, white 97%, transparent 100%);
  mask-composite: intersect;
}
</style>
