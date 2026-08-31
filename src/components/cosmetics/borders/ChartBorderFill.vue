<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { ChartFill } from '@/types/api/items'
import { darken, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: ChartFill
}>()

const STATIC_T = 8
const ROUTE_S = 11

interface Node {
  x: number
  y: number
}

let base: HTMLCanvasElement | null = null
let startTime = 0

function coastline(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number, w: number, h: number): void {
  ctx.beginPath()
  const pts = 12
  for (let k = 0; k <= pts; k++) {
    const a = (k / pts) * Math.PI * 2
    const rr = r * (0.65 + hash01(seed * 31 + k * 7) * 0.55)
    const x = cx + Math.cos(a) * rr * w
    const y = cy + Math.sin(a) * rr * h * 0.8
    if (k === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function renderBase(w: number, h: number): void {
  base = document.createElement('canvas')
  base.width = w
  base.height = h
  const ctx = base.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = props.fill.paper
  ctx.fillRect(0, 0, w, h)
  for (let k = 0; k < 40; k++) {
    ctx.fillStyle = withAlpha(darken(props.fill.paper, 0.2), hash01(k * 3) * 0.08)
    ctx.fillRect(hash01(k * 7) * w, hash01(k * 11) * h, rand(6, 26), rand(3, 9))
  }
  ctx.strokeStyle = withAlpha(props.fill.ink, 0.1)
  ctx.lineWidth = 1
  for (let gx = 1; gx < 5; gx++) {
    ctx.beginPath()
    ctx.moveTo((gx / 5) * w, 0)
    ctx.lineTo((gx / 5) * w, h)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, (gx / 5) * h)
    ctx.lineTo(w, (gx / 5) * h)
    ctx.stroke()
  }
  for (let c = 0; c < 4; c++) {
    const cx = hash01(c * 17 + 2) * w
    const cy = hash01(c * 23 + 5) * h
    const r = 0.06 + hash01(c * 13) * 0.08
    ctx.fillStyle = withAlpha(lighten(props.fill.paper, 0.06), 0.9)
    coastline(ctx, cx, cy, r, c, w, h)
    ctx.fill()
    ctx.strokeStyle = withAlpha(props.fill.ink, 0.55)
    ctx.lineWidth = Math.max(1, w * 0.004)
    coastline(ctx, cx, cy, r, c, w, h)
    ctx.stroke()
  }
  const rose = props.fill.rose ?? props.fill.ink
  const rx = w * 0.86
  const ry = h * 0.16
  const rs = Math.min(w, h) * 0.07
  ctx.strokeStyle = withAlpha(rose, 0.8)
  ctx.lineWidth = Math.max(1, rs * 0.09)
  ctx.beginPath()
  ctx.arc(rx, ry, rs, 0, Math.PI * 2)
  ctx.stroke()
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(rx, ry)
    ctx.lineTo(rx + Math.cos(a) * rs * 1.35, ry + Math.sin(a) * rs * 1.35)
    ctx.stroke()
  }
}

function routeNodes(cycle: number): Node[] {
  const count = 5
  return Array.from({ length: count }, (_, k) => ({
    x: 0.08 + (k / (count - 1)) * 0.84 + (hash01(cycle * 19 + k * 3) - 0.5) * 0.1,
    y: 0.18 + hash01(cycle * 37 + k * 9) * 0.64,
  }))
}

function routePoint(nodes: Node[], u: number, w: number, h: number): { x: number; y: number } {
  const seg = Math.min(nodes.length - 2, Math.floor(u * (nodes.length - 1)))
  const f = u * (nodes.length - 1) - seg
  const a = nodes[seg]
  const b = nodes[seg + 1]
  const midY = (a.y + b.y) / 2 + (hash01(seg * 7) - 0.5) * 0.2
  return {
    x: (a.x + (b.x - a.x) * f) * w,
    y: ((1 - f) * (1 - f) * a.y + 2 * (1 - f) * f * midY + f * f * b.y) * h,
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, now) {
    startTime = now
    renderBase(Math.max(2, Math.floor(w)), Math.max(2, Math.floor(h)))
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    if (base) ctx.drawImage(base, 0, 0, w, h)
    else {
      ctx.fillStyle = props.fill.paper
      ctx.fillRect(0, 0, w, h)
    }
    const cycle = Math.floor(t / ROUTE_S)
    const u = (t % ROUTE_S) / ROUTE_S
    const drawn = Math.min(1, u / 0.62)
    let fade = 1
    if (u > 0.92) fade = (1 - u) / 0.08
    const nodes = routeNodes(cycle)
    const unit = Math.min(w, h) / 100
    ctx.setLineDash([Math.max(2, unit * 2.4), Math.max(2, unit * 2)])
    ctx.strokeStyle = withAlpha(props.fill.route, 0.9 * fade)
    ctx.lineWidth = Math.max(1, unit * 1.1)
    ctx.beginPath()
    const steps = 60
    for (let s = 0; s <= Math.floor(steps * drawn); s++) {
      const p = routePoint(nodes, (s / steps) * 0.999, w, h)
      if (s === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    if (drawn >= 1) {
      const p = routePoint(nodes, 0.999, w, h)
      const s = unit * 2.6
      ctx.strokeStyle = withAlpha(props.fill.route, fade)
      ctx.lineWidth = Math.max(1.2, unit * 1.3)
      ctx.beginPath()
      ctx.moveTo(p.x - s, p.y - s)
      ctx.lineTo(p.x + s, p.y + s)
      ctx.moveTo(p.x + s, p.y - s)
      ctx.lineTo(p.x - s, p.y + s)
      ctx.stroke()
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="chart-border-fill" aria-hidden="true" />
</template>

<style scoped>
.chart-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
