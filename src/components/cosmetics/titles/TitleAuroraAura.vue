<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleAuroraAuraSpec, TitleStarlitSpec } from '@/types/cosmetics/title'
import { AURORA_UNTINTED, drawAuroraCurtain, tintAurora, type AuroraBand } from '@/utils/cosmetics/aurora'
import { sparkle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { starPass } from '@/utils/cosmetics/starPass'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { TITLE_HIGHLIGHT } from '@/utils/cosmetics/titleEffects'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleAuroraAuraSpec
  light: boolean
  starlit?: TitleStarlitSpec
}>()

interface Twinkle {
  x: number
  y: number
  r: number
  phase: number
  rate: number
}

const STATIC_T = 4
const TAU = Math.PI * 2

let rect: TitleAuraRect | null = null
let twinkles: Twinkle[] = []

function colors(): string[] {
  return pickVariant(props.light, props.aura.lightColors, props.aura.colors)
}

function star(): string {
  return pickVariant(props.light, props.aura.lightStar, props.aura.star, TITLE_HIGHLIGHT)
}

function band(r: TitleAuraRect, k: number): AuroraBand {
  return {
    left: r.x - r.fs * 0.7,
    span: r.w + r.fs * 1.4,
    base: r.y + r.h * (0.42 - k * 0.14),
    reach: r.fs * (1.9 - k * 0.22),
    sway: r.fs,
    step: 1,
  }
}

function drawTwinkles(ctx: Ctx, r: TitleAuraRect, t: number): void {
  ctx.fillStyle = star()
  for (const s of twinkles) {
    ctx.globalAlpha = 0.15 + 0.85 * Math.max(0, Math.sin(t * s.rate + s.phase)) ** 2
    ctx.beginPath()
    ctx.arc(r.x + (s.x - 0.1) * (r.w / 0.8), r.y + s.y * r.fs, s.r * r.fs, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawShootingStar(ctx: Ctx, r: TitleAuraRect, nowMs: number): void {
  const pass = starPass(nowMs, props.starlit)
  if (!pass || pass.u >= 1) return
  const at = (u: number): [number, number] => {
    const x = pass.dir > 0 ? u : 1 - u
    return [r.x + r.w * x, r.y - r.fs * (0.12 + 0.34 * Math.sin(Math.PI * clampUnit(u)))]
  }
  const progress = (pass.dir > 0 ? pass.x : 1 - pass.x)
  const [hx, hy] = at(progress)
  const [tx, ty] = at(progress - 0.16)
  const fade = Math.sin(Math.PI * pass.u) ** 0.5
  const grad = ctx.createLinearGradient(hx, hy, tx, ty)
  grad.addColorStop(0, withAlpha(star(), fade))
  grad.addColorStop(1, withAlpha(star(), 0))
  ctx.strokeStyle = grad
  ctx.lineWidth = Math.max(1, r.fs * 0.07)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hx, hy)
  ctx.lineTo(tx, ty)
  ctx.stroke()
  ctx.fillStyle = withAlpha(star(), fade)
  sparkle(ctx, hx, hy, r.fs * 0.26)
}

function clampUnit(u: number): number {
  return Math.min(1.2, Math.max(-0.2, u))
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    twinkles = Array.from({ length: props.aura.stars ?? 9 }, () => ({
      x: rand(0, 1),
      y: rand(-1.4, 0.2),
      r: rand(0.025, 0.055),
      phase: rand(0, TAU),
      rate: rand(0.8, 2.2),
    }))
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? STATIC_T : (now / 1000) * (props.aura.speed ?? 1)
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    const palette = colors()
    const count = props.aura.curtains ?? palette.length
    const hues = props.aura.hues
    for (let k = 0; k < count; k++) drawAuroraCurtain(ctx, band(rect, k), t, k, hues?.length ? AURORA_UNTINTED : palette[k % palette.length])
    if (hues?.length) {
      tintAurora(ctx, w, h, t, hues)
      ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    }
    drawTwinkles(ctx, rect, t)
    if (!reduced) drawShootingStar(ctx, rect, now)
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
