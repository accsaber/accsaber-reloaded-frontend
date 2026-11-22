<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { lerpHex, parseHex } from '@/utils/color'
import { flickerNoise, sceneUnit, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { createRadialSprite, drawStarField, layeredWave, offscreenLayer, starField, type FieldStar } from '@/utils/cosmetics/sceneLayer'
import { CABIN_WINDOW, drawCabin, drawPine, drawSmoke, groundY, makePine, type Pine } from '@/utils/cosmetics/snowGlobeKit'
import type { SnowfieldBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ config: SnowfieldBackdropConfig }>()

const STATIC_T = 3
const HORIZON = 0.64
const CABIN = { x: 0.73, scale: 1.25, sink: 2.2 }
const CLEARING = 0.055
const ROWS = [
  { count: 46, scale: [0.7, 1.1], lift: -4, fade: 0.45 },
  { count: 26, scale: [1.2, 2], lift: 2, fade: 0 },
]
const STARS = 70
const FLAKES = 80
const TAU = Math.PI * 2

let unit = 1
let base: HTMLCanvasElement | null = null
let glow: HTMLCanvasElement | null = null
let stars: FieldStar[] = []
const pines: Pine[] = Array.from({ length: 12 }, (_, i) => makePine(i * 9, 11 + (i % 3) * 3 + hash01(i * 3 + 1) * 2, 3 + (i % 3), 0.95 + hash01(i * 5 + 2) * 0.45))

function horizonY(w: number, h: number, x: number): number {
  return h * HORIZON - layeredWave((x / w) * 3, 0.42) * unit * 3
}

function paintLand(ctx: Ctx, w: number, h: number, lift: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += unit * 3) ctx.lineTo(x, horizonY(w, h, x) + lift)
  ctx.lineTo(w, horizonY(w, h, w) + lift)
  ctx.lineTo(w, h)
  ctx.fill()
}

function cabinSpace(ctx: Ctx, w: number, h: number): void {
  const x = w * CABIN.x
  ctx.translate(x, horizonY(w, h, x) + unit * CABIN.sink)
  ctx.scale(unit * CABIN.scale, unit * CABIN.scale)
}

function paintRow(ctx: Ctx, w: number, h: number, r: number): void {
  const c = props.config
  const row = ROWS[r]
  const sky = c.skyColors[c.skyColors.length - 1] ?? c.pineColor
  const colors = { ink: lerpHex(c.cabinColor, sky, row.fade), pine: lerpHex(c.pineColor, sky, row.fade), snow: lerpHex(c.capColor, sky, row.fade) }
  for (let i = 0; i < row.count; i++) {
    const at = (i + 0.2 + hash01(r * 100 + i * 7) * 0.6) / row.count
    if (r === 1 && Math.abs(at - CABIN.x) < CLEARING) continue
    const pine = pines[Math.floor(hash01(r * 50 + i * 11) * pines.length)]
    const scale = unit * (row.scale[0] + hash01(r * 70 + i * 13) * (row.scale[1] - row.scale[0]))
    const x = w * at
    ctx.save()
    ctx.translate(x, horizonY(w, h, x) + unit * row.lift)
    ctx.rotate((hash01(r * 90 + i * 17) - 0.5) * 0.09)
    ctx.scale(hash01(r * 30 + i * 19) > 0.5 ? scale : -scale, scale)
    ctx.translate(-pine.x, -groundY(pine.x))
    drawPine(ctx, pine, colors, 1)
    ctx.restore()
  }
}

function paintBase(ctx: Ctx, w: number, h: number): void {
  const c = props.config
  const sky = ctx.createLinearGradient(0, 0, 0, h * HORIZON)
  c.skyColors.forEach((color, i) => sky.addColorStop(c.skyColors.length > 1 ? i / (c.skyColors.length - 1) : 0, color))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  paintLand(ctx, w, h, -unit * 7, lerpHex(c.snowColor, c.skyColors[c.skyColors.length - 1] ?? c.snowColor, 0.55))
  paintRow(ctx, w, h, 0)
  ctx.save()
  cabinSpace(ctx, w, h)
  drawCabin(ctx, { ink: c.cabinColor, accent: c.roofColor, snow: c.capColor, light: c.lightColor }, 0)
  ctx.restore()
  paintRow(ctx, w, h, 1)
  paintLand(ctx, w, h, unit * 2.5, c.snowColor)
  paintLand(ctx, w, h, h * 0.2, c.driftColor)
}

function drawCabinLife(ctx: Ctx, w: number, h: number, t: number): void {
  const c = props.config
  const flicker = 0.78 + 0.22 * flickerNoise(t * 0.35, 1.1)
  ctx.save()
  cabinSpace(ctx, w, h)
  ctx.fillStyle = withAlpha(c.lightColor, flicker)
  ctx.fillRect(...CABIN_WINDOW)
  drawSmoke(ctx, c.smokeColor, t, 3.6, -15, 0.35)
  ctx.restore()
  if (!glow) return
  const x = w * CABIN.x - unit * 4
  const size = unit * 46
  ctx.globalAlpha = flicker
  ctx.drawImage(glow, x - size / 2, horizonY(w, h, x) - size / 2, size, size)
  ctx.globalAlpha = 1
}

function drawSnowfall(ctx: Ctx, w: number, h: number, t: number): void {
  ctx.fillStyle = props.config.flakeColor
  for (let i = 0; i < FLAKES; i++) {
    const depth = hash01(i * 13 + 5)
    const fall = (t * (0.018 + depth * 0.03) + hash01(i * 5 + 2)) % 1
    ctx.globalAlpha = (0.14 + depth * 0.3) * Math.sin(fall * Math.PI) ** 0.5
    ctx.beginPath()
    ctx.arc(w * hash01(i * 7 + 3) + Math.sin(t * 0.4 + i) * unit * 5, h * fall, unit * (0.35 + depth * 0.7), 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function layout(w: number, h: number, scale: number): void {
  unit = sceneUnit(w, h)
  stars = starField(STARS, w, h * HORIZON * 0.9, unit * 2)
  const [layer, lctx] = offscreenLayer(w, h, scale)
  if (lctx) paintBase(lctx, w, h)
  base = layer
  const rgb = parseHex(props.config.lightColor)
  glow = rgb ? createRadialSprite(128, rgb, [[0, 0.12], [0.3, 0.05], [0.65, 0.012], [1, 0]]) : null
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, _now, scale) {
    layout(w, h, scale)
  },
  resize(w, h, _now, scale) {
    layout(w, h, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : now / 1000
    if (base) ctx.drawImage(base, 0, 0, w, h)
    drawStarField(ctx, stars, t, props.config.starColor)
    drawCabinLife(ctx, w, h, t)
    drawSnowfall(ctx, w, h, t)
  },
})
</script>

<template>
  <canvas ref="canvas" :style="{ opacity: config.opacity }" aria-hidden="true" />
</template>
