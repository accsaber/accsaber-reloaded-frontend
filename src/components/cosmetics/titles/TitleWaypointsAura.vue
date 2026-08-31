<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleWaypointsAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleWaypointsAuraSpec
  light: boolean
}>()

const STATIC_T = 5

let rect: TitleAuraRect | null = null

function pathColor(): string {
  return pickVariant(props.light, props.aura.lightPath, props.aura.path, '#d9c06a')
}

function flagColor(): string {
  return pickVariant(props.light, props.aura.lightFlag, props.aura.flag, '#62d98a')
}

interface Node {
  x: number
  y: number
}

function routeNodes(cycle: number): Node[] {
  const count = 4
  const out: Node[] = []
  for (let k = 0; k < count; k++) {
    out.push({
      x: 0.06 + (k / (count - 1)) * 0.88 + (hash01(cycle * 17 + k * 5) - 0.5) * 0.08,
      y: 0.25 + hash01(cycle * 29 + k * 11) * 0.65,
    })
  }
  return out
}

function pointAt(nodes: Node[], u: number, r: TitleAuraRect): { x: number; y: number } {
  const seg = Math.min(nodes.length - 2, Math.floor(u * (nodes.length - 1)))
  const f = u * (nodes.length - 1) - seg
  const a = nodes[seg]
  const b = nodes[seg + 1]
  const midY = (a.y + b.y) / 2 - 0.12
  const x = a.x + (b.x - a.x) * f
  const y = (1 - f) * (1 - f) * a.y + 2 * (1 - f) * f * midY + f * f * b.y
  return { x: r.x + r.w * x, y: r.y + (r.h + r.fs * 0.9) * y }
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, fs: number, pop: number, a: number): void {
  const hgt = fs * 0.55 * pop
  ctx.strokeStyle = withAlpha(flagColor(), a)
  ctx.lineWidth = Math.max(0.8, fs * 0.055)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - hgt)
  ctx.stroke()
  ctx.fillStyle = withAlpha(flagColor(), a)
  ctx.beginPath()
  ctx.moveTo(x, y - hgt)
  ctx.lineTo(x + fs * 0.34 * pop, y - hgt + fs * 0.13 * pop)
  ctx.lineTo(x, y - hgt + fs * 0.26 * pop)
  ctx.closePath()
  ctx.fill()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const r = rect
    const period = props.aura.periodS ?? 9
    const t = reduced ? STATIC_T : now / 1000
    const cycle = Math.floor(t / period)
    const u = (t % period) / period
    const drawn = u < 0.6 ? u / 0.6 : 1
    let fade = 1
    if (u > 0.9) fade = (1 - u) / 0.1
    const nodes = routeNodes(cycle)
    ctx.setLineDash([Math.max(2, r.fs * 0.16), Math.max(2, r.fs * 0.14)])
    ctx.strokeStyle = withAlpha(pathColor(), 0.75 * fade)
    ctx.lineWidth = Math.max(0.9, r.fs * 0.06)
    ctx.beginPath()
    const steps = 40
    for (let s = 0; s <= Math.floor(steps * drawn); s++) {
      const p = pointAt(nodes, (s / steps) * 0.999, r)
      if (s === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    for (let k = 0; k < nodes.length; k++) {
      const reach = k / (nodes.length - 1) * 0.6
      if (u < reach) continue
      const pop = Math.min(1, (u - reach) / 0.05)
      const p = pointAt(nodes, k / (nodes.length - 1) * 0.999, r)
      if (k === nodes.length - 1) {
        const s = r.fs * 0.2 * pop
        ctx.strokeStyle = withAlpha(flagColor(), 0.95 * fade)
        ctx.lineWidth = Math.max(1, r.fs * 0.08)
        ctx.beginPath()
        ctx.moveTo(p.x - s, p.y - s)
        ctx.lineTo(p.x + s, p.y + s)
        ctx.moveTo(p.x + s, p.y - s)
        ctx.lineTo(p.x - s, p.y + s)
        ctx.stroke()
      } else {
        drawFlag(ctx, p.x, p.y, r.fs, pop, 0.9 * fade)
      }
    }
    if (!reduced && drawn < 1) {
      const tip = pointAt(nodes, drawn * 0.999, r)
      ctx.fillStyle = withAlpha(pathColor(), 0.95)
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, Math.max(1, r.fs * 0.08), 0, Math.PI * 2)
      ctx.fill()
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
