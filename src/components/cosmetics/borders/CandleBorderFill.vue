<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { CandleFill } from '@/types/api/items'
import { lighten } from '@/utils/color'
import { flickerNoise } from '@/utils/cosmetics/canvasShapes'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: CandleFill
}>()

const MARGIN = 25
const STATIC_T = 4
const EMBERS = 12

interface Flame {
  x: number
  y: number
  size: number
  phase: number
  rate: number
  gutterAt: number
}

interface Ember {
  x: number
  y: number
  speed: number
  phase: number
}

let flames: Flame[] = []
let embers: Ember[] = []
let startTime = 0

function seedFlames(): void {
  const n = props.fill.count ?? 7
  flames = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3)
    const d = rand(38, 66)
    return { x: 50 + Math.cos(a) * d, y: 50 + Math.sin(a) * d, size: rand(1.1, 1.9), phase: rand(0, 9), rate: rand(0.9, 1.6), gutterAt: rand(6, 20) }
  })
  embers = Array.from({ length: EMBERS }, () => ({ x: rand(-20, 120), y: rand(-20, 120), speed: rand(2, 5), phase: rand(0, 6.28) }))
}

function flameLevel(f: Flame, t: number): number {
  const flick = 0.7 + flickerNoise(t * f.rate + f.phase, 1.2) * 0.3
  const g = ((t + f.phase) % f.gutterAt) / f.gutterAt
  const gutter = g > 0.9 ? 0.25 + 0.75 * Math.abs(Math.sin((g - 0.9) * 31.4)) : 1
  return flick * gutter
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, level: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, withAlpha(props.fill.glow, 0.42 * level))
  g.addColorStop(0.35, withAlpha(props.fill.glow, 0.14 * level))
  g.addColorStop(1, withAlpha(props.fill.glow, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, size: number, level: number, t: number): void {
  const hgt = size * (2.2 + level * 1.4) * sy
  const wid = size * 0.9 * sx
  const sway = Math.sin(t * 5.1 + x) * wid * 0.25
  ctx.fillStyle = withAlpha(props.fill.flame, 0.75 + level * 0.25)
  ctx.beginPath()
  ctx.moveTo(x + sway, y - hgt)
  ctx.quadraticCurveTo(x + wid, y - hgt * 0.35, x, y + wid * 0.5)
  ctx.quadraticCurveTo(x - wid, y - hgt * 0.35, x + sway, y - hgt)
  ctx.fill()
  ctx.fillStyle = withAlpha(lighten(props.fill.flame, 0.6), 0.8 * level)
  ctx.beginPath()
  ctx.ellipse(x, y - hgt * 0.2, wid * 0.35, hgt * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawEmbers(ctx: CanvasRenderingContext2D, toX: (u: number) => number, toY: (u: number) => number, sx: number, t: number): void {
  for (const e of embers) {
    const y = ((((e.y - t * e.speed) % 140) + 140) % 140) - 20
    const x = e.x + Math.sin(t * 0.8 + e.phase) * 3
    const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.3 + e.phase))
    ctx.fillStyle = withAlpha(props.fill.flame, a)
    ctx.beginPath()
    ctx.arc(toX(x), toY(y), Math.max(0.5, 0.45 * sx), 0, Math.PI * 2)
    ctx.fill()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
    seedFlames()
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    const { sx, sy, toX, toY } = overlaySpace(w, h, MARGIN)
    ctx.fillStyle = props.fill.dark
    ctx.fillRect(0, 0, w, h)
    for (const f of flames) {
      const level = reduced ? 0.9 : flameLevel(f, t)
      drawGlow(ctx, toX(f.x), toY(f.y), f.size * 19 * sx, level)
    }
    if (!reduced) drawEmbers(ctx, toX, toY, sx, t)
    for (const f of flames) {
      const level = reduced ? 0.9 : flameLevel(f, t)
      drawFlame(ctx, toX(f.x), toY(f.y), sx, sy, f.size, level, t)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="candle-border-fill" aria-hidden="true" />
</template>

<style scoped>
.candle-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
