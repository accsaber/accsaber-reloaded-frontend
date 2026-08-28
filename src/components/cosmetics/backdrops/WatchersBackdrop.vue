<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import type { WatchersBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: WatchersBackdropConfig
}>()

interface Eye {
  phase: number
  period: number
  hold: number
  cycle: number
  x: number
  y: number
  size: number
  gap: number
  aspect: number
  color: string
  blinkAt: number
}

const BLACK = '#000000'
const STATIC_T = 5
const BLINK_S = 0.09
const GLOW = 2.6

let eyes: Eye[] = []
let startTime = 0
let unit = 1

function randomHex(): string {
  const c = [rand(0, 256), rand(0, 256), rand(0, 256)].map(Math.floor)
  if (Math.max(c[0] ?? 0, c[1] ?? 0, c[2] ?? 0) < 0x90) return randomHex()
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function reseed(e: Eye, cycle: number): void {
  e.cycle = cycle
  e.hold = rand(3.5, 7)
  e.x = rand(0.02, 0.98)
  e.y = rand(0.02, 0.98)
  e.size = 1.6 + Math.pow(Math.random(), 1.6) * 3
  e.gap = rand(2.2, 3.2)
  e.aspect = rand(0.4, 0.6)
  e.color = randomHex()
  e.blinkAt = rand(0.3, 0.75) * e.hold
}

function makeEye(): Eye {
  return {
    phase: rand(0, 40),
    period: rand(14, 30),
    hold: 4,
    cycle: -1,
    x: 0,
    y: 0,
    size: 1,
    gap: 2.5,
    aspect: 0.5,
    color: BLACK,
    blinkAt: 2,
  }
}

function eyeAlpha(u: number): number {
  if (u < 0.2) return u / 0.2
  if (u > 0.7) return 1 - (u - 0.7) / 0.3
  return 1
}

function lidScale(e: Eye, s: number): number {
  return props.config.blink && Math.abs(s - e.blinkAt) < BLINK_S ? 0.08 : 1
}

function eyeball(ctx: CanvasRenderingContext2D, color: string, r: number, ry: number): void {
  ctx.save()
  ctx.scale(r * GLOW, ry * GLOW)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, withAlpha(color, 0.3))
  g.addColorStop(0.4, withAlpha(color, 0.1))
  g.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-r, 0)
  ctx.quadraticCurveTo(0, -ry * 2, r, 0)
  ctx.quadraticCurveTo(0, ry * 2, -r, 0)
  ctx.fill()
}

function drawEye(ctx: CanvasRenderingContext2D, e: Eye, w: number, h: number, t: number): void {
  const local = t + e.phase
  const cycle = Math.floor(local / e.period)
  if (cycle !== e.cycle) reseed(e, cycle)
  const s = local - cycle * e.period
  if (s >= e.hold) return
  const r = e.size * unit
  const ry = r * e.aspect * lidScale(e, s)
  ctx.save()
  ctx.translate(e.x * w, e.y * h)
  ctx.globalAlpha = eyeAlpha(s / e.hold) * 0.8
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * r * e.gap * 0.5, 0)
    eyeball(ctx, e.color, r, ry)
    ctx.restore()
  }
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now) {
    startTime = now
    unit = sceneUnit(w, h)
    eyes = Array.from({ length: props.config.count }, makeEye)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    ctx.fillStyle = BLACK
    ctx.fillRect(0, 0, w, h)
    for (const e of eyes) drawEye(ctx, e, w, h, t)
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="watchers-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.watchers-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  z-index: -1;
  pointer-events: none;
}
</style>
