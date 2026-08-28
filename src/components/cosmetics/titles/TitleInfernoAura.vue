<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleInfernoAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01, randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleInfernoAuraSpec
  light: boolean
}>()

const palette = computed(() => ({
  core: pickVariant(props.light, props.aura.lightCore, props.aura.core, '#fde68a'),
  flame: pickVariant(props.light, props.aura.lightFlame, props.aura.flame, '#e8781e'),
  ember: pickVariant(props.light, props.aura.lightEmber, props.aura.ember, '#7c2d12'),
}))

interface Ember {
  x: number
  born: number
  life: number
  drift: number
  size: number
}

let rect: TitleAuraRect | null = null
let embers: Ember[] = []
let nextEmber = 0
let last = 0
let clock = 0

function tongueHeight(i: number, t: number): number {
  return 0.45 + 0.55 * Math.abs(Math.sin(t * 5.3 + i * 2.1) * 0.6 + Math.sin(t * 8.7 + i * 0.7) * 0.4)
}

function drawTongue(ctx: CanvasRenderingContext2D, r: TitleAuraRect, i: number, n: number, t: number): void {
  const u = (i + 0.5) / n
  const x = r.x - r.fs * 0.3 + (r.w + r.fs * 0.6) * u + Math.sin(t * 2 + i) * r.fs * 0.04
  const base = r.y + r.h * 1.02
  const height = r.fs * (0.4 + 0.45 * hash01(i * 3)) * tongueHeight(i, t)
  const wdt = r.fs * (0.14 + 0.1 * hash01(i * 5))
  const lean = Math.sin(t * 1.6 + i * 1.3) * r.fs * 0.12
  for (const [color, scale, alpha] of [[palette.value.ember, 1.25, 0.45], [palette.value.flame, 1, 0.7], [palette.value.core, 0.55, 0.85]] as [string, number, number][]) {
    ctx.fillStyle = withAlpha(color, alpha)
    ctx.beginPath()
    ctx.moveTo(x - wdt * scale, base)
    ctx.quadraticCurveTo(x - wdt * scale * 0.9 + lean * 0.3, base - height * scale * 0.55, x + lean, base - height * scale)
    ctx.quadraticCurveTo(x + wdt * scale * 0.9 + lean * 0.3, base - height * scale * 0.55, x + wdt * scale, base)
    ctx.closePath()
    ctx.fill()
  }
}

function drawEmbers(ctx: CanvasRenderingContext2D, r: TitleAuraRect): void {
  for (const e of embers) {
    const u = (clock - e.born) / e.life
    const x = r.x + r.w * e.x + Math.sin(u * 6 + e.born) * r.fs * 0.15 + e.drift * u * r.fs
    const y = r.y + r.h * 0.9 - u * r.fs * 2.2
    ctx.fillStyle = withAlpha(palette.value.core, (1 - u) * 0.9)
    ctx.beginPath()
    ctx.arc(x, y, r.fs * e.size * (1 - u * 0.5), 0, Math.PI * 2)
    ctx.fill()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    embers = []
    last = now
    clock = 0
    nextEmber = 0
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const dt = reduced ? 0 : Math.min(0.05, (now - last) / 1000)
    last = now
    clock = reduced ? 3 : clock + dt
    if (!reduced && clock >= nextEmber) {
      embers.push({ x: rand(0, 1), born: clock, life: rand(1.2, 2.2), drift: rand(-0.3, 0.3), size: rand(0.025, 0.05) })
      nextEmber = clock + rand(0.08, 0.25)
    }
    embers = embers.filter((e) => clock - e.born < e.life)
    const glow = ctx.createLinearGradient(0, rect.y + rect.h * 0.2, 0, rect.y + rect.h)
    glow.addColorStop(0, withAlpha(palette.value.flame, 0))
    glow.addColorStop(1, withAlpha(palette.value.flame, 0.3))
    ctx.fillStyle = glow
    ctx.fillRect(rect.x - rect.fs * 0.5, rect.y, rect.w + rect.fs, rect.h)
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    const n = props.aura.tongues ?? 16
    for (let i = 0; i < n; i++) drawTongue(ctx, rect, i, n, clock)
    drawEmbers(ctx, rect)
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
