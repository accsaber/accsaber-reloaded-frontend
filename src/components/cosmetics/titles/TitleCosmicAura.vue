<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleCosmicAuraSpec } from '@/types/api/items'
import { drawCosmicNebula, drawCosmicPlanet, drawCosmicStar, drawCosmicStreak } from '@/utils/cosmetics/cosmicField'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01, randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleCosmicAuraSpec
  light: boolean
}>()

const palette = computed(() => ({
  star: pickVariant(props.light, props.aura.lightStar, props.aura.star, '#e0e7ff'),
  nebula: pickVariant(props.light, props.aura.lightNebula, props.aura.nebula, '#7c3aed'),
  planet: pickVariant(props.light, props.aura.lightPlanet, props.aura.planet, '#f59e0b'),
}))

interface Comet {
  born: number
  y: number
  dir: number
}

let rect: TitleAuraRect | null = null
let comet: Comet | null = null
let nextComet = 0

function drawNebulas(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  for (let i = 0; i < 3; i++) {
    const x = r.x + r.w * (0.2 + 0.3 * i) + Math.sin(t * 0.3 + i * 2) * r.fs * 0.4
    const y = r.y + r.h * (0.3 + 0.4 * ((i + 1) % 2)) + Math.cos(t * 0.25 + i) * r.fs * 0.3
    drawCosmicNebula(ctx, x, y, r.fs * 1.1, palette.value.nebula, 0.28 + 0.1 * Math.sin(t * 0.4 + i), 0.8)
  }
}

function drawStars(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  for (let i = 0; i < 34; i++) {
    const x = r.x - r.fs * 0.8 + (r.w + r.fs * 1.6) * hash01(i * 7)
    const y = r.y - r.fs * 1.4 + (r.h + r.fs * 1.9) * hash01(i * 11)
    const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + hash01(i * 3) * 2) + i)
    drawCosmicStar(ctx, x, y, r.fs * (0.02 + hash01(i * 13) * 0.035), palette.value.star, tw, hash01(i * 17) < 0.2, 1)
  }
}

function drawPlanet(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const ang = t * 0.35
  const cx = r.x + r.w / 2 + Math.cos(ang) * (r.w / 2 + r.fs * 0.55)
  const cy = r.y + r.h / 2 + Math.sin(ang) * (r.h / 2 + r.fs * 0.5)
  const depth = 0.6 + 0.4 * (Math.sin(ang) + 1) / 2
  drawCosmicPlanet(ctx, cx, cy, r.fs * 0.17 * depth, palette.value.planet, true, depth)
}

function drawComet(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  if (!comet) return
  const u = (t - comet.born) / 1.1
  if (u > 1) {
    comet = null
    return
  }
  const x = r.x - r.fs + (r.w + r.fs * 2) * (comet.dir > 0 ? u : 1 - u)
  const y = r.y + r.h * comet.y - u * r.fs * 0.5
  const vx = comet.dir * (r.w + r.fs * 2)
  const vy = -r.fs * 0.5
  const len = Math.hypot(vx, vy)
  drawCosmicStreak(ctx, x, y, vx / len, vy / len, r.fs * 0.9, palette.value.star, 1, Math.max(0.8, r.fs * 0.05))
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    comet = null
    nextComet = rand(2, 5)
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? 3 : now / 1000
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    drawNebulas(ctx, rect, t)
    drawStars(ctx, rect, t)
    if (!reduced && !comet && t >= nextComet) {
      comet = { born: t, y: rand(-0.3, 0.5), dir: rand(0, 1) < 0.5 ? 1 : -1 }
      nextComet = t + rand(4, 9)
    }
    drawComet(ctx, rect, t)
    ctx.globalCompositeOperation = 'source-over'
    drawPlanet(ctx, rect, t)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
