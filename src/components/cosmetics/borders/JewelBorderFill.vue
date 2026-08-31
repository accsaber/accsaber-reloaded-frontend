<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { JewelFill } from '@/types/api/items'
import { darken, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef, watch } from 'vue'

const props = defineProps<{
  fill: JewelFill
}>()

const STATIC_T = 4

type GemShape = 'kite' | 'hex' | 'round'

interface Gem {
  x: number
  y: number
  size: number
  speed: number
  sway: number
  phase: number
  spin: number
  shape: GemShape
  colorIdx: number
  glintPeriod: number
}

const SHAPES: GemShape[] = ['kite', 'hex', 'round']

let gems: Gem[] = []
let startTime = 0

function seed(): void {
  const n = props.fill.count ?? 18
  const pace = props.fill.pace ?? 1
  gems = Array.from({ length: n }, (_, i) => {
    const size = rand(2.4, 5.8)
    return {
      x: rand(0, 100),
      y: rand(0, 100),
      size,
      speed: (2 + size * rand(1, 1.4)) * pace,
      sway: rand(1, 2.6),
      phase: rand(0, 6.28),
      spin: rand(-0.9, 0.9),
      shape: SHAPES[i % SHAPES.length],
      colorIdx: i,
      glintPeriod: rand(2.6, 6),
    }
  })
}

watch(() => props.fill, () => seed())

function gemPath(ctx: CanvasRenderingContext2D, shape: GemShape, s: number): void {
  ctx.beginPath()
  if (shape === 'kite') {
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.72, 0)
    ctx.lineTo(0, s)
    ctx.lineTo(-s * 0.72, 0)
    ctx.closePath()
  } else if (shape === 'hex') {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * s * 0.85
      const py = Math.sin(a) * s
      if (k === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  } else {
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2)
  }
}

function drawFacets(ctx: CanvasRenderingContext2D, shape: GemShape, s: number, color: string): void {
  ctx.strokeStyle = withAlpha(darken(color, 0.45), 0.6)
  ctx.lineWidth = Math.max(0.5, s * 0.09)
  if (shape === 'kite') {
    ctx.beginPath()
    ctx.moveTo(-s * 0.72, 0)
    ctx.lineTo(s * 0.72, 0)
    ctx.moveTo(0, -s)
    ctx.lineTo(0, s)
    ctx.moveTo(-s * 0.34, -s * 0.45)
    ctx.lineTo(s * 0.34, -s * 0.45)
    ctx.stroke()
  } else if (shape === 'hex') {
    ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s)
    }
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      ctx.moveTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42)
      ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85)
    }
    ctx.stroke()
  }
}

function drawGem(ctx: CanvasRenderingContext2D, g: Gem, t: number, ux: number, uy: number): void {
  const color = props.fill.gems[g.colorIdx % props.fill.gems.length]
  const y = ((g.y + t * g.speed) % 118) - 9
  const x = g.x + Math.sin(t * 0.9 + g.phase) * g.sway
  const s = g.size * ux
  ctx.save()
  ctx.translate(x * ux, y * uy)
  ctx.rotate(t * g.spin + g.phase)
  const body = ctx.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s * 1.05)
  body.addColorStop(0, lighten(color, 0.25))
  body.addColorStop(0.55, color)
  body.addColorStop(1, darken(color, 0.4))
  ctx.fillStyle = body
  gemPath(ctx, g.shape, s)
  ctx.fill()
  ctx.strokeStyle = withAlpha(lighten(color, 0.4), 0.5)
  ctx.lineWidth = Math.max(0.5, s * 0.08)
  gemPath(ctx, g.shape, s)
  ctx.stroke()
  drawFacets(ctx, g.shape, s, color)
  ctx.fillStyle = withAlpha('#ffffff', 0.55)
  ctx.beginPath()
  ctx.ellipse(-s * 0.3, -s * 0.38, s * 0.2, s * 0.1, -0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  const gp = ((t + g.phase) % g.glintPeriod) / 0.7
  if (gp < 1) {
    const k = Math.sin(gp * Math.PI)
    const glint = props.fill.glint ?? '#ffffff'
    const gs = s * 1.1 * k
    ctx.strokeStyle = withAlpha(glint, 0.9 * k)
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(0.6, s * 0.1)
    ctx.beginPath()
    ctx.moveTo(x * ux - gs, y * uy)
    ctx.lineTo(x * ux + gs, y * uy)
    ctx.moveTo(x * ux, y * uy - gs)
    ctx.lineTo(x * ux, y * uy + gs)
    ctx.stroke()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
    seed()
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    ctx.fillStyle = props.fill.velvet
    ctx.fillRect(0, 0, w, h)
    const rim = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75)
    rim.addColorStop(0, withAlpha('#000000', 0))
    rim.addColorStop(1, withAlpha('#000000', 0.4))
    ctx.fillStyle = rim
    ctx.fillRect(0, 0, w, h)
    const ux = w / 100
    const uy = h / 100
    for (const g of gems) drawGem(ctx, g, t, ux, uy)
  },
})
</script>

<template>
  <canvas ref="canvas" class="jewel-border-fill" aria-hidden="true" />
</template>

<style scoped>
.jewel-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
