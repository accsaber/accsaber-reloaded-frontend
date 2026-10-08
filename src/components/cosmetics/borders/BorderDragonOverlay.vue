<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorderColorValue, BorderDragonOverlaySpec } from '@/types/api/items'
import { frameDelta, overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  overlay: BorderDragonOverlaySpec
  avatarUrl?: string | null
  color?: BorderColorValue | null
}>()

const MARGIN = 20
const LIFE_S = 0.75
const SMOKE_LIFE_S = 1.6

interface Puff {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  born: number
  smoke: boolean
}

let puffs: Puff[] = []
let clock = 0
let last = 0
let nextBurst = 0
let burstUntil = 0
let nextSmoke = 0

function interval(): number {
  return (props.overlay.intervalMs ?? 5200) / 1000
}

function emitFlame(): void {
  const { mouth, angleDeg } = props.overlay
  const range = props.overlay.rangePct ?? 42
  const a = ((angleDeg + rand(-11, 11)) * Math.PI) / 180
  const speed = (range / LIFE_S) * rand(1, 1.3)
  puffs.push({ x: mouth.x, y: mouth.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: rand(1, 1.6), born: clock, smoke: false })
}

function emitSmoke(): void {
  const { mouth } = props.overlay
  puffs.push({ x: mouth.x + rand(-1, 1), y: mouth.y - 1, vx: rand(-2, 2), vy: rand(-9, -5), r: rand(1.2, 2), born: clock, smoke: true })
}

function schedule(dt: number): void {
  if (clock >= nextBurst) {
    burstUntil = clock + (props.overlay.burstMs ?? 1400) / 1000
    nextBurst = clock + interval() * rand(0.85, 1.2)
  }
  if (clock < burstUntil) {
    const count = Math.ceil(dt * 110)
    for (let i = 0; i < count; i++) emitFlame()
  } else if (clock >= nextSmoke) {
    emitSmoke()
    nextSmoke = clock + rand(0.6, 1.3)
  }
}

function step(dt: number): void {
  for (const p of puffs) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (!p.smoke) {
      p.vx *= 1 - 0.4 * dt
      p.vy = p.vy * (1 - 0.4 * dt) - 10 * dt
    }
  }
  puffs = puffs.filter((p) => clock - p.born < (p.smoke ? SMOKE_LIFE_S : LIFE_S))
}

function flameColor(t: number): string {
  if (t < 0.25) return props.overlay.core
  if (t < 0.7) return props.overlay.flame
  return props.overlay.smoke
}

function drawPuff(ctx: CanvasRenderingContext2D, p: Puff, t: number, sx: number, toX: (u: number) => number, toY: (u: number) => number): void {
  const grow = p.smoke ? 1 + t * 1.8 : 1 + t * 4.5
  const alpha = p.smoke ? 0.45 * (1 - t) : t < 0.7 ? 0.95 : 0.6 * (1 - t) / 0.3
  ctx.fillStyle = withAlpha(p.smoke ? props.overlay.smoke : flameColor(t), alpha)
  ctx.beginPath()
  ctx.arc(toX(p.x), toY(p.y), p.r * grow * sx, 0, Math.PI * 2)
  ctx.fill()
}

function drawStatic(ctx: CanvasRenderingContext2D, sx: number, toX: (u: number) => number, toY: (u: number) => number): void {
  const { mouth, angleDeg } = props.overlay
  const range = props.overlay.rangePct ?? 42
  for (let i = 0; i < 9; i++) {
    const t = i / 9
    const a = (angleDeg * Math.PI) / 180
    const p: Puff = { x: mouth.x + Math.cos(a) * range * t * 0.8, y: mouth.y + Math.sin(a) * range * t * 0.8, vx: 0, vy: 0, r: 1.8, born: 0, smoke: false }
    drawPuff(ctx, p, t, sx, toX, toY)
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    puffs = []
    clock = 0
    last = nowMs
    nextBurst = rand(1, 2.5)
    burstUntil = 0
    nextSmoke = 0.4
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    const { sx, toX, toY } = overlaySpace(w, h, MARGIN)
    if (reduced) {
      drawStatic(ctx, sx, toX, toY)
      return
    }
    const dt = frameDelta(now, last, reduced)
    last = now
    clock += dt
    schedule(dt)
    step(dt)
    for (const p of puffs) drawPuff(ctx, p, (clock - p.born) / (p.smoke ? SMOKE_LIFE_S : LIFE_S), sx, toX, toY)
  },
})
</script>

<template>
  <canvas ref="canvas" class="border-dragon-overlay" aria-hidden="true" />
</template>

<style scoped>
.border-dragon-overlay {
  position: absolute;
  inset: -20%;
  width: 140%;
  height: 140%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
