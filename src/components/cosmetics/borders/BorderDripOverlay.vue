<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorderDripOverlaySpec, BorderOverlayHost } from '@/types/api/items'
import { lighten } from '@/utils/color'
import { frameDelta, overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<BorderOverlayHost & { overlay: BorderDripOverlaySpec }>()

const MARGIN = 20
const FLOOR = 118
const TRAIL_S = 0.21

interface Drop {
  x: number
  top: number
  y: number
  r: number
  vy: number
  wobble: number
  bead: number
  beadT: number
}

let drops: Drop[] = []
let nextAt: number[] = []
let last = 0
let clock = 0

const highlight = computed(() => withAlpha(lighten(props.overlay.color, 0.35), 0.55))

function interval(): number {
  return rand(props.overlay.minIntervalMs ?? 500, props.overlay.maxIntervalMs ?? 2200) / 1000
}

function spawn(i: number): void {
  const src = props.overlay.sources[i]
  if (!src) return
  const r = rand(1.2, 2.3)
  drops.push({ x: src.x, top: src.y, y: src.y, r, vy: 0, wobble: rand(0, 6.28), bead: rand(0.2, 0.6), beadT: 0 })
}

function step(dt: number): void {
  const g = props.overlay.gravity ?? 240
  for (const d of drops) {
    if (d.beadT < d.bead) {
      d.beadT += dt
      continue
    }
    d.vy += g * dt
    d.y += d.vy * dt
    d.x += Math.sin(clock * 9 + d.wobble) * 0.6 * dt
  }
  let kept = 0
  for (const d of drops) if (d.y < FLOOR) drops[kept++] = d
  drops.length = kept
}

function schedule(): void {
  props.overlay.sources.forEach((_, i) => {
    if (nextAt[i] === undefined) nextAt[i] = clock + interval()
    if (clock >= (nextAt[i] ?? 0)) {
      spawn(i)
      nextAt[i] = clock + interval()
    }
  })
}

function drawTrail(ctx: CanvasRenderingContext2D, d: Drop, sx: number, toX: (u: number) => number, toY: (u: number) => number, color: string): void {
  if (d.vy <= 0) return
  const y1 = toY(d.y)
  const y0 = toY(Math.max(d.top, d.y - d.vy * TRAIL_S))
  if (y1 - y0 < 0.5) return
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, withAlpha(color, 0))
  g.addColorStop(1, withAlpha(color, 0.9))
  ctx.strokeStyle = g
  ctx.lineWidth = Math.max(0.5, d.r * 0.8 * sx)
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(toX(d.x), y0)
  ctx.lineTo(toX(d.x), y1)
  ctx.stroke()
}

function drawDrop(ctx: CanvasRenderingContext2D, d: Drop, sx: number, sy: number, toX: (u: number) => number, toY: (u: number) => number, color: string): void {
  const grow = d.beadT < d.bead ? Math.min(1, d.beadT / d.bead) : 1
  const r = d.r * grow
  const x = toX(d.x)
  const y = toY(d.y)
  const stretch = 1 + Math.min(1.2, d.vy / 60)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - r * sy * (1 + stretch))
  ctx.quadraticCurveTo(x + r * sx * 1.05, y, x, y + r * sy)
  ctx.quadraticCurveTo(x - r * sx * 1.05, y, x, y - r * sy * (1 + stretch))
  ctx.fill()
  ctx.fillStyle = highlight.value
  ctx.beginPath()
  ctx.ellipse(x - r * sx * 0.35, y - r * sy * 0.1, r * sx * 0.22, r * sy * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawStatic(ctx: CanvasRenderingContext2D, sx: number, sy: number, toX: (u: number) => number, toY: (u: number) => number, color: string): void {
  props.overlay.sources.forEach((src, i) => {
    const len = 6 + (i % 2) * 4
    ctx.strokeStyle = withAlpha(color, 0.7)
    ctx.lineWidth = Math.max(0.6, 0.8 * sx)
    ctx.beginPath()
    ctx.moveTo(toX(src.x), toY(src.y))
    ctx.lineTo(toX(src.x), toY(src.y + len))
    ctx.stroke()
    drawDrop(ctx, { x: src.x, top: src.y, y: src.y + len, r: 1.4, vy: 0, wobble: 0, bead: 1, beadT: 1 }, sx, sy, toX, toY, color)
  })
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    drops = []
    nextAt = []
    last = nowMs
    clock = 0
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    const { sx, sy, toX, toY } = overlaySpace(w, h, MARGIN)
    const color = props.overlay.color
    if (reduced) {
      drawStatic(ctx, sx, sy, toX, toY, color)
      return
    }
    const dt = frameDelta(now, last, reduced)
    last = now
    clock += dt
    schedule()
    step(dt)
    for (const d of drops) {
      drawTrail(ctx, d, sx, toX, toY, color)
      drawDrop(ctx, d, sx, sy, toX, toY, color)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
