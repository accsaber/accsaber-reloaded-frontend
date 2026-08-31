<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleStampsAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleStampsAuraSpec
  light: boolean
}>()

interface Stamp {
  born: number
  x: number
  y: number
  rot: number
  size: number
  round: boolean
  colorIdx: number
}

const STATIC_T = 2
const LIFE = 4.2

let rect: TitleAuraRect | null = null
let stamps: Stamp[] = []
let nextAt = 0
let spawned = 0

function palette(): string[] {
  return pickVariant(props.light, props.aura.lightColors, props.aura.colors, ['#22c55e', '#3b82f6', '#f2c94c', '#ef4444'])
}

function spawn(now: number): Stamp {
  const side = spawned % 3
  const x = side === 0 ? rand(0.02, 0.2) : side === 1 ? rand(0.8, 0.98) : rand(0.3, 0.7)
  const y = side === 2 ? rand(-0.15, 0.1) : rand(0.15, 0.95)
  spawned++
  return {
    born: now,
    x,
    y,
    rot: rand(-0.45, 0.45),
    size: rand(0.85, 1.25),
    round: Math.random() < 0.5,
    colorIdx: spawned % palette().length,
  }
}

function drawStamp(ctx: CanvasRenderingContext2D, s: Stamp, t: number, r: TitleAuraRect): void {
  const u = (t - s.born) / LIFE
  if (u < 0 || u > 1) return
  const thump = u < 0.08 ? 1.5 - 0.5 * (u / 0.08) : 1
  const a = u < 0.08 ? u / 0.08 : u > 0.75 ? (1 - u) / 0.25 : 1
  const color = palette()[s.colorIdx]
  const size = r.fs * s.size * thump
  const cx = r.x + r.w * s.x
  const cy = r.y + r.h * s.y
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(s.rot)
  ctx.strokeStyle = withAlpha(color, 0.75 * a)
  ctx.lineWidth = Math.max(1, r.fs * 0.09)
  if (s.round) {
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = Math.max(0.6, r.fs * 0.05)
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    const w2 = size * 0.95
    const h2 = size * 0.52
    ctx.strokeRect(-w2 / 2, -h2 / 2, w2, h2)
    ctx.lineWidth = Math.max(0.6, r.fs * 0.05)
    ctx.strokeRect(-w2 / 2 + size * 0.09, -h2 / 2 + size * 0.09, w2 - size * 0.18, h2 - size * 0.18)
  }
  ctx.lineWidth = Math.max(0.6, r.fs * 0.055)
  ctx.strokeStyle = withAlpha(color, 0.55 * a)
  for (let d = -1; d <= 1; d++) {
    ctx.beginPath()
    ctx.moveTo(-size * 0.28, d * size * 0.11)
    ctx.lineTo(size * 0.28, d * size * 0.11)
    ctx.stroke()
  }
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    const t = now / 1000
    stamps = [spawn(t - 1.2), spawn(t - 2.8)]
    nextAt = t + (props.aura.intervalMs ?? 2200) / 1000
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? STATIC_T : now / 1000
    if (!reduced && t >= nextAt) {
      stamps.push(spawn(t))
      nextAt = t + ((props.aura.intervalMs ?? 2200) / 1000) * rand(0.7, 1.4)
    }
    stamps = stamps.filter((s) => t - s.born < LIFE)
    if (reduced && stamps.length === 0) stamps = [spawn(t - 1)]
    for (const s of stamps) drawStamp(ctx, s, t, rect)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
