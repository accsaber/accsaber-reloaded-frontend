<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleHoardAuraSpec } from '@/types/api/items'
import { darken } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleHoardAuraSpec
  light: boolean
}>()

interface PileCoin {
  x: number
  y: number
  rot: number
  size: number
}

interface Drop {
  born: number
  x: number
  targetY: number
}

interface Puff {
  born: number
  x: number
}

const STATIC_T = 3
const DROP_S = 0.85

let rect: TitleAuraRect | null = null
let pile: PileCoin[] = []
let drop: Drop | null = null
let puffs: Puff[] = []
let nextDropAt = 0
let nextPuffAt = 0

function coin(): string {
  return pickVariant(props.light, props.aura.lightCoin, props.aura.coin, '#f2c94c')
}

function rim(): string {
  return pickVariant(props.light, props.aura.lightRim, props.aura.rim, '#a16207')
}

function smoke(): string {
  return pickVariant(props.light, props.aura.lightSmoke, props.aura.smoke, '#8c87a3')
}

function seedPile(): void {
  pile = []
  for (let row = 0; row < 3; row++) {
    const count = 7 - row * 2
    for (let k = 0; k < count; k++) {
      pile.push({
        x: 0.5 + (k - (count - 1) / 2) * 0.09 + rand(-0.015, 0.015),
        y: row,
        rot: rand(-0.3, 0.3),
        size: rand(0.9, 1.1),
      })
    }
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, r: TitleAuraRect, x: number, y: number, rot: number, size: number, a: number): void {
  const rx = r.fs * 0.24 * size
  const ry = rx * 0.42
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = withAlpha(rim(), a)
  ctx.beginPath()
  ctx.ellipse(0, ry * 0.35, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha(coin(), a)
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(darken(coin(), 0.25), a * 0.8)
  ctx.lineWidth = Math.max(0.5, r.fs * 0.03)
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    seedPile()
    const t = now / 1000
    nextDropAt = t + rand(1, props.aura.dropEveryS ?? 5)
    nextPuffAt = t + rand(2, 7)
    drop = null
    puffs = []
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const r = rect
    const t = reduced ? STATIC_T : now / 1000
    const baseY = r.y + r.h + r.fs * 0.75
    for (const p of pile) {
      drawCoin(ctx, r, r.x + r.w * p.x, baseY - p.y * r.fs * 0.22, p.rot, p.size, 0.9)
    }
    if (!reduced) {
      if (!drop && t >= nextDropAt) {
        drop = { born: t, x: rand(0.32, 0.68), targetY: baseY - rand(0, 2) * r.fs * 0.22 }
        nextDropAt = t + (props.aura.dropEveryS ?? 5) * rand(0.7, 1.5)
      }
      if (drop) {
        const u = (t - drop.born) / DROP_S
        if (u >= 1.6) {
          pile.push({ x: drop.x, y: rand(0, 1.6), rot: rand(-0.3, 0.3), size: 1 })
          if (pile.length > 22) pile.splice(0, 1)
          drop = null
        } else {
          const x = r.x + r.w * drop.x
          const fall = Math.min(1, u)
          const y = (r.y - r.fs * 1.2) + (drop.targetY - (r.y - r.fs * 1.2)) * fall * fall
          const bounce = u > 1 ? Math.abs(Math.sin((u - 1) * Math.PI * 1.6)) * Math.exp(-(u - 1) * 4) * r.fs * 0.3 : 0
          drawCoin(ctx, r, x, y - bounce, (t - drop.born) * 6, 1, 1)
          if (u > 1 && u < 1.3) {
            const k = Math.sin(((u - 1) / 0.3) * Math.PI)
            ctx.strokeStyle = withAlpha('#ffffff', k * 0.9)
            ctx.lineWidth = Math.max(0.6, r.fs * 0.05)
            const gs = r.fs * 0.3 * k
            ctx.beginPath()
            ctx.moveTo(x - gs, drop.targetY)
            ctx.lineTo(x + gs, drop.targetY)
            ctx.moveTo(x, drop.targetY - gs)
            ctx.lineTo(x, drop.targetY + gs)
            ctx.stroke()
          }
        }
      }
      puffs = puffs.filter((p) => t - p.born < 3.4)
      if (t >= nextPuffAt) {
        puffs.push({ born: t, x: rand(0.12, 0.3) })
        nextPuffAt = t + rand(4, 9)
      }
    }
    for (const p of puffs) {
      const u = (t - p.born) / 3.4
      if (u < 0 || u > 1) continue
      const x = r.x + r.w * p.x + Math.sin(t * 1.1 + p.born) * r.fs * 0.2
      const y = baseY - r.fs * 0.4 - u * r.fs * 1.6
      const a = Math.sin(u * Math.PI) * 0.3
      ctx.fillStyle = withAlpha(smoke(), a)
      ctx.beginPath()
      ctx.arc(x, y, r.fs * (0.14 + u * 0.24), 0, Math.PI * 2)
      ctx.fill()
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
