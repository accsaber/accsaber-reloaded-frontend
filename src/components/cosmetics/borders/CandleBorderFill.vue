<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { CandleFill } from '@/types/api/items'
import { lighten, parseHex } from '@/utils/color'
import { flickerNoise, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { framePoint, overlaySpace, type OverlaySpace } from '@/utils/cosmetics/overlayCanvas'
import { createRadialSprite } from '@/utils/cosmetics/sceneLayer'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  fill: CandleFill
  margin?: number
}>()

const MARGIN = props.margin ?? 25
const STATIC_T = 4
const STATIC_LEVEL = 0.9
const EMBERS = 12
const GLOW_PX = 128

interface Flame {
  x: number
  y: number
  size: number
  phase: number
  rate: number
  gutterAt: number
  level: number
}

interface Ember {
  x: number
  y: number
  speed: number
  phase: number
}

const count = props.fill.count ?? 7
const flames: Flame[] = Array.from({ length: count }, (_, i) => {
  const { x, y } = framePoint((i + rand(-0.3, 0.3)) / count, rand(1.5, 5))
  return { x, y, size: rand(1.1, 1.9), phase: rand(0, 9), rate: rand(0.9, 1.6), gutterAt: rand(6, 20), level: STATIC_LEVEL }
})
const embers: Ember[] = Array.from({ length: EMBERS }, () => ({ x: rand(-20, 120), y: rand(-20, 120), speed: rand(2, 5), phase: rand(0, 6.28) }))

const core = computed(() => lighten(props.fill.flame, 0.6))
let glow: HTMLCanvasElement | null = null
let startTime = 0

function flameLevel(f: Flame, t: number): number {
  const flick = 0.7 + flickerNoise(t * f.rate + f.phase, 1.2) * 0.3
  const g = ((t + f.phase) % f.gutterAt) / f.gutterAt
  const gutter = g > 0.9 ? 0.25 + 0.75 * Math.abs(Math.sin((g - 0.9) * 31.4)) : 1
  return flick * gutter
}

function glowSprite(): HTMLCanvasElement {
  glow ??= createRadialSprite(GLOW_PX, parseHex(props.fill.glow) ?? [0, 0, 0], [[0, 0.42], [0.35, 0.14], [1, 0]])
  return glow
}

function drawFlame(ctx: Ctx, x: number, y: number, sp: OverlaySpace, f: Flame, t: number): void {
  const hgt = f.size * (2.2 + f.level * 1.4) * sp.sy
  const wid = f.size * 0.9 * sp.sx
  const sway = Math.sin(t * 5.1 + x) * wid * 0.25
  ctx.fillStyle = props.fill.flame
  ctx.globalAlpha = 0.75 + f.level * 0.25
  ctx.beginPath()
  ctx.moveTo(x + sway, y - hgt)
  ctx.quadraticCurveTo(x + wid, y - hgt * 0.35, x, y + wid * 0.5)
  ctx.quadraticCurveTo(x - wid, y - hgt * 0.35, x + sway, y - hgt)
  ctx.fill()
  ctx.fillStyle = core.value
  ctx.globalAlpha = 0.8 * f.level
  ctx.beginPath()
  ctx.ellipse(x, y - hgt * 0.2, wid * 0.35, hgt * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawEmbers(ctx: Ctx, sp: OverlaySpace, t: number): void {
  ctx.fillStyle = props.fill.flame
  for (const e of embers) {
    const y = ((((e.y - t * e.speed) % 140) + 140) % 140) - 20
    const x = e.x + Math.sin(t * 0.8 + e.phase) * 3
    ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.3 + e.phase))
    ctx.beginPath()
    ctx.arc(sp.toX(x), sp.toY(y), Math.max(0.5, 0.45 * sp.sx), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    const sp = overlaySpace(w, h, MARGIN)
    const sprite = glowSprite()
    ctx.fillStyle = props.fill.dark
    ctx.fillRect(0, 0, w, h)
    for (const f of flames) {
      f.level = reduced ? STATIC_LEVEL : flameLevel(f, t)
      const r = f.size * 19 * sp.sx
      ctx.globalAlpha = f.level
      ctx.drawImage(sprite, sp.toX(f.x) - r, sp.toY(f.y) - r, r * 2, r * 2)
    }
    ctx.globalAlpha = 1
    if (!reduced) drawEmbers(ctx, sp, t)
    for (const f of flames) drawFlame(ctx, sp.toX(f.x), sp.toY(f.y), sp, f, t)
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
