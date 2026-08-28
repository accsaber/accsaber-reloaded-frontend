<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleWaterAuraSpec } from '@/types/api/items'
import { lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleWaterAuraSpec
  light: boolean
}>()

const palette = computed(() => ({
  color: pickVariant(props.light, props.aura.lightColor, props.aura.color, '#3b82f6'),
  foam: pickVariant(props.light, props.aura.lightFoam, props.aura.foam, '#e0f2fe'),
}))

interface Ring {
  x: number
  born: number
}

interface Drop {
  x: number
  born: number
  vx: number
  vy: number
}

let rect: TitleAuraRect | null = null
let rings: Ring[] = []
let drops: Drop[] = []
let nextRing = 0
let last = 0
let clock = 0

function waveY(r: TitleAuraRect, u: number, t: number): number {
  return r.y + r.h * 0.9 + Math.sin(u * 9 + t * 2.1) * r.fs * 0.06 + Math.sin(u * 4 - t * 1.3) * r.fs * 0.05
}

function drawWave(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const x0 = r.x - r.fs * 0.8
  const x1 = r.x + r.w + r.fs * 0.8
  const bottom = r.y + r.h + r.fs * 0.3
  for (const layer of [0, 1]) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0)
    const a = layer ? 0.16 : 0.3
    g.addColorStop(0, withAlpha(palette.value.color, 0))
    g.addColorStop(0.18, withAlpha(palette.value.color, a))
    g.addColorStop(0.82, withAlpha(palette.value.color, a))
    g.addColorStop(1, withAlpha(palette.value.color, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x0, bottom)
    for (let k = 0; k <= 30; k++) {
      const u = k / 30
      ctx.lineTo(x0 + (x1 - x0) * u, waveY(r, u + layer * 0.3, t + layer * 0.8) + layer * r.fs * 0.1)
    }
    ctx.lineTo(x1, bottom)
    ctx.closePath()
    ctx.fill()
  }
  const foam = ctx.createLinearGradient(x0, 0, x1, 0)
  foam.addColorStop(0, withAlpha(palette.value.foam, 0))
  foam.addColorStop(0.2, withAlpha(palette.value.foam, 0.6))
  foam.addColorStop(0.8, withAlpha(palette.value.foam, 0.6))
  foam.addColorStop(1, withAlpha(palette.value.foam, 0))
  ctx.strokeStyle = foam
  ctx.lineWidth = Math.max(0.6, r.fs * 0.04)
  ctx.beginPath()
  for (let k = 0; k <= 30; k++) {
    const u = k / 30
    const y = waveY(r, u, t)
    if (k === 0) ctx.moveTo(x0, y)
    else ctx.lineTo(x0 + (x1 - x0) * u, y)
  }
  ctx.stroke()
}

function drawRings(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  for (const ring of rings) {
    const u = (clock - ring.born) / 1.4
    const x = r.x + r.w * ring.x
    ctx.strokeStyle = withAlpha(palette.value.foam, 0.7 * (1 - u))
    ctx.lineWidth = Math.max(0.5, r.fs * 0.035 * (1 - u * 0.6))
    ctx.beginPath()
    ctx.ellipse(x, waveY(r, ring.x, t), r.fs * (0.1 + u * 0.9), r.fs * (0.03 + u * 0.22), 0, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawDrops(ctx: CanvasRenderingContext2D, r: TitleAuraRect): void {
  for (const d of drops) {
    const age = clock - d.born
    const x = r.x + r.w * d.x + d.vx * age * r.fs
    const y = waveY(r, d.x, clock) - (d.vy * age - 6 * age * age) * r.fs
    ctx.fillStyle = withAlpha(lighten(palette.value.color, 0.3), 0.85)
    ctx.beginPath()
    ctx.ellipse(x, y, r.fs * 0.05, r.fs * 0.075, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    rings = []
    drops = []
    last = now
    clock = 0
    nextRing = 0.4
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const dt = reduced ? 0 : Math.min(0.05, (now - last) / 1000)
    last = now
    clock = reduced ? 3 : clock + dt
    if (!reduced && clock >= nextRing) {
      const x = rand(0.05, 0.95)
      rings.push({ x, born: clock })
      for (let k = 0; k < 3; k++) drops.push({ x, born: clock, vx: rand(-0.5, 0.5), vy: rand(1.4, 2.4) })
      nextRing = clock + rand(0.6, 1.4)
    }
    rings = rings.filter((rg) => clock - rg.born < 1.4)
    drops = drops.filter((d) => clock - d.born < 0.8)
    drawWave(ctx, rect, clock)
    drawRings(ctx, rect, clock)
    drawDrops(ctx, rect)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
