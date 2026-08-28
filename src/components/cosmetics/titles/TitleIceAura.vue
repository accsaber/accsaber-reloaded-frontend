<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleIceAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleIceAuraSpec
  light: boolean
}>()

const palette = computed(() => ({
  frost: pickVariant(props.light, props.aura.lightFrost, props.aura.frost, '#e0f2fe'),
  ice: pickVariant(props.light, props.aura.lightIce, props.aura.ice, '#7dd3fc'),
}))

let rect: TitleAuraRect | null = null

function growth(t: number): number {
  const interval = (props.aura.intervalMs ?? 9000) / 1000
  const local = (t % interval) - interval * 0.3
  if (local < 0) return 0.25
  if (local < 1.4) return 0.25 + 0.75 * (local / 1.4)
  if (local < 3.6) return 1
  if (local < 4.8) return 1 - 0.75 * ((local - 3.6) / 1.2)
  return 0.25
}

function fern(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, depth: number, g: number, seed: number): void {
  if (depth === 0 || len < 1) return
  const ex = x + Math.cos(angle) * len * g
  const ey = y + Math.sin(angle) * len * g
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  for (let k = 1; k <= 3; k++) {
    const u = k / 4
    if (u > g) break
    const bx = x + Math.cos(angle) * len * u
    const by = y + Math.sin(angle) * len * u
    for (const sd of [-1, 1]) {
      fern(ctx, bx, by, angle + sd * (0.9 + 0.2 * hash01(seed + k)), len * 0.4 * (1 - u * 0.5), depth - 1, g, seed * 3 + k)
    }
  }
}

function drawFerns(ctx: CanvasRenderingContext2D, r: TitleAuraRect, g: number): void {
  ctx.strokeStyle = withAlpha(palette.value.frost, 0.85)
  ctx.lineWidth = Math.max(0.5, r.fs * 0.025)
  ctx.lineCap = 'round'
  const corners: [number, number, number][] = [[r.x, r.y + r.h * 0.9, -0.5], [r.x + r.w, r.y + r.h * 0.9, Math.PI + 0.5], [r.x, r.y + r.h * 0.1, 0.5], [r.x + r.w, r.y + r.h * 0.1, Math.PI - 0.5]]
  corners.forEach(([x, y, a], i) => {
    fern(ctx, x, y, a, r.fs * 0.9, 3, g, i + 1)
    fern(ctx, x, y, a + (i < 2 ? -0.7 : 0.7), r.fs * 0.6, 2, g, i + 7)
  })
}

function drawIcicles(ctx: CanvasRenderingContext2D, r: TitleAuraRect, g: number, t: number): void {
  const base = r.y + r.h * 0.86
  for (let i = 0; i < 9; i++) {
    const x = r.x + r.w * (0.06 + 0.88 * hash01(i * 5))
    const len = r.fs * (0.15 + 0.35 * hash01(i * 9)) * g
    const wdt = r.fs * (0.04 + 0.03 * hash01(i * 3))
    ctx.fillStyle = withAlpha(palette.value.ice, 0.8)
    ctx.beginPath()
    ctx.moveTo(x - wdt, base)
    ctx.lineTo(x + wdt, base)
    ctx.lineTo(x, base + len)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = withAlpha('#ffffff', 0.6)
    ctx.fillRect(x - wdt * 0.5, base, wdt * 0.35, len * 0.55)
    const drip = (t * 0.35 + hash01(i * 11)) % 1
    if (g > 0.8 && drip > 0.85) {
      ctx.fillStyle = withAlpha(palette.value.ice, 0.9)
      ctx.beginPath()
      ctx.arc(x, base + len + (drip - 0.85) * r.fs * 1.5, wdt * 0.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawSnow(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  for (let i = 0; i < 26; i++) {
    const u = (t * (0.08 + hash01(i * 3) * 0.06) + hash01(i * 7)) % 1
    const x = r.x - r.fs * 0.6 + (r.w + r.fs * 1.2) * hash01(i * 11) + Math.sin(t * 1.2 + i) * r.fs * 0.15
    const y = r.y - r.fs * 1.2 + (r.h + r.fs * 1.7) * u
    ctx.fillStyle = withAlpha('#ffffff', 0.7 * Math.sin(u * Math.PI))
    ctx.beginPath()
    ctx.arc(x, y, r.fs * (0.015 + hash01(i * 13) * 0.03), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawMist(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const y = r.y + r.h * 0.95
  for (let i = 0; i < 4; i++) {
    const x = r.x + r.w * ((0.25 * i + t * 0.03 + hash01(i * 5)) % 1)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r.fs * 0.7)
    g.addColorStop(0, withAlpha(palette.value.frost, 0.22))
    g.addColorStop(1, withAlpha(palette.value.frost, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, r.fs * 0.8, r.fs * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? 4.5 : now / 1000
    const g = growth(t)
    drawMist(ctx, rect, t)
    drawFerns(ctx, rect, g)
    drawIcicles(ctx, rect, g, t)
    drawSnow(ctx, rect, t)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
