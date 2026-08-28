<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { WoodFill } from '@/types/api/items'
import { darken, lerpHex, lighten } from '@/utils/color'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{
  fill: WoodFill
}>()

const MARGIN = 25

let seed = 0
let board: HTMLCanvasElement | null = null

function h01(n: number): number {
  return hash01(seed + n)
}

function grain(ctx: Ctx, x0: number, x1: number, y: number, amp: number, sd: number, alpha: number): void {
  ctx.strokeStyle = withAlpha(props.fill.dark, alpha)
  ctx.beginPath()
  for (let x = x0; x <= x1; x += 2) {
    const u = (x - x0) / Math.max(1, x1 - x0)
    const yy = y + Math.sin(u * 9 + sd * 6.28) * amp + Math.sin(u * 23 + sd * 3) * amp * 0.35
    if (x === x0) ctx.moveTo(x, yy)
    else ctx.lineTo(x, yy)
  }
  ctx.stroke()
}

function knot(ctx: Ctx, x: number, y: number, r: number, sd: number): void {
  for (let i = 4; i >= 1; i--) {
    ctx.strokeStyle = withAlpha(props.fill.dark, 0.35 - i * 0.05)
    ctx.beginPath()
    ctx.ellipse(x, y, r * i * 0.35, r * i * 0.22, sd * 0.6, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = withAlpha(props.fill.dark, 0.55)
  ctx.beginPath()
  ctx.ellipse(x, y, r * 0.3, r * 0.2, sd * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

function plank(ctx: Ctx, x: number, y: number, w: number, h: number, k: number): void {
  const tone = lerpHex(props.fill.base, h01(k * 3) < 0.5 ? props.fill.dark : props.fill.light, h01(k * 5) * 0.35)
  ctx.fillStyle = tone
  ctx.fillRect(x, y, w, h)
  ctx.lineWidth = 0.6
  for (let i = 0; i < 6; i++) {
    grain(ctx, x + 1, x + w - 1, y + h * (0.12 + i * 0.15) + (h01(k * 7 + i) - 0.5) * h * 0.1, h * 0.05, h01(k * 11 + i), 0.18 + h01(k * 13 + i) * 0.2)
  }
  if (h01(k * 17) < 0.35) knot(ctx, x + w * (0.2 + h01(k * 19) * 0.6), y + h * (0.3 + h01(k * 23) * 0.4), h * 0.5, h01(k * 29))
  if (h01(k * 31) < 0.45) {
    ctx.fillStyle = withAlpha(props.fill.light, 0.1 + h01(k * 37) * 0.12)
    ctx.fillRect(x + w * h01(k * 41) * 0.5, y + 1, w * (0.2 + h01(k * 43) * 0.3), h - 2)
  }
  ctx.fillStyle = withAlpha(props.fill.dark, 0.75)
  ctx.fillRect(x, y + h - 1.2, w, 1.2)
  ctx.fillRect(x + w - 1, y, 1, h)
  ctx.fillStyle = withAlpha(props.fill.light, 0.18)
  ctx.fillRect(x, y, w, 0.8)
}

function buildBoard(w: number, h: number, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  const { sx, sy, toX, toY } = overlaySpace(w, h, MARGIN)
  const ph = (props.fill.plank ?? 14) * sy
  ctx.fillStyle = darken(props.fill.base, 0.5)
  ctx.fillRect(0, 0, w, h)
  let row = 0
  for (let y = toY(-MARGIN); y < h; y += ph) {
    let x = toX(-MARGIN) - ph * 2.5 * h01(row * 53)
    let k = row * 100
    while (x < w) {
      const pw = ph * (2.2 + h01(k * 47) * 2.6)
      plank(ctx, x, y, pw, ph, k)
      x += pw
      k++
    }
    row++
  }
  ctx.fillStyle = withAlpha(darken(props.fill.base, 0.6), 0.18)
  for (let i = 0; i < 12; i++) {
    ctx.beginPath()
    ctx.ellipse(h01(i * 61) * w, h01(i * 67) * h, (5 + h01(i * 71) * 9) * sx, (1.5 + h01(i * 73) * 3) * sy, h01(i * 79) * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = withAlpha(lighten(props.fill.light, 0.2), 0.12)
  ctx.lineWidth = 0.8
  for (let i = 0; i < 6; i++) {
    const x0 = h01(i * 83) * w
    const y0 = h01(i * 89) * h
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + (h01(i * 97) - 0.5) * 30 * sx, y0 + (h01(i * 101) - 0.5) * 10 * sy)
    ctx.stroke()
  }
  return c
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _now, scale) {
    seed = Math.floor(rand(0, 100000))
    board = buildBoard(w, h, scale)
  },
  draw(ctx, w, h) {
    if (board) ctx.drawImage(board, 0, 0, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" class="wood-border-fill" aria-hidden="true" />
</template>

<style scoped>
.wood-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
