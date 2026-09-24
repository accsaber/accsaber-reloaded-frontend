<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { type Ctx, sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { darken, lerpHex, lighten } from '@/utils/color'
import {
  batFlight,
  buildStones,
  drawBat,
  drawCrypt,
  drawDeadTree,
  drawDrift,
  drawGraveSky,
  drawHeadstone,
  drawIronFence,
  drawRaven,
  drawWisp,
  driftSprite,
  stoneTop,
  type DriftSprite,
  type GraveColors,
  type GraveSky,
  type Stone,
  type StoneField,
} from '@/utils/cosmetics/graveyardScenery'
import { offscreenLayer } from '@/utils/cosmetics/sceneLayer'
import { hash01, randBetween as rand } from '@/utils/random'
import type { GraveyardBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: GraveyardBackdropConfig
}>()

const STATIC_T = 5
const HORIZON = 0.58
const MOON: [number, number] = [0.76, 0.2]
const STONE_FIELD: StoneField = { count: 34, horizon: HORIZON, depth: 0.36, size: [0.55, 1.6], curve: 0.85 }
const GHOST_PERIOD_S = 22
const BAT_PERIOD_S = 13
const BAT_CROSS_S = 4

const seed = Math.floor(rand(0, 100000))
let unit = 1
let startTime = 0
let base: HTMLCanvasElement | null = null
let clouds: DriftSprite[] = []
let fog: DriftSprite[] = []
let stones: Stone[] = []
let ghostPlot: Stone | null = null
const ghostEye = darken(props.config.ghostColor, 0.85)

function h01(n: number): number {
  return hash01(seed + n)
}

function skyEnd(): string {
  return props.config.skyColors[props.config.skyColors.length - 1] ?? props.config.groundColor
}

function colors(): GraveColors {
  return { stone: props.config.stoneColor, ground: props.config.groundColor, moon: props.config.moonColor, sky: skyEnd() }
}

function sky(): GraveSky {
  return { colors: props.config.skyColors, moon: props.config.moonColor, moonAt: MOON, moonR: 16, stars: 70, starSize: [0.15, 0.3], starBand: 0.5 }
}

function buildSprites(w: number, h: number, scale: number): void {
  const cloudColor = darken(skyEnd(), 0.25)
  clouds = Array.from({ length: 4 }, (_, i) => {
    const cw = w * (0.35 + h01(i * 7) * 0.4)
    const ch = unit * (12 + h01(i * 11) * 10)
    return { img: driftSprite(i, cw, ch, scale, cloudColor, 0.5, h01), w: cw, h: ch, y: h * (0.06 + i * 0.09) - ch / 2, x0: h01(i * 17) * (w + cw), speed: (w / 90) * (0.5 + h01(i * 19) * 0.6) }
  })
  fog = Array.from({ length: 5 }, (_, i) => {
    const cw = w * (0.45 + h01(i * 23) * 0.5)
    const ch = unit * (9 + h01(i * 29) * 8)
    return { img: driftSprite(i + 10, cw, ch, scale, props.config.fogColor, 0.28, h01), w: cw, h: ch, y: h * (0.6 + i * 0.085) - ch / 2, x0: h01(i * 31) * (w + cw), speed: (w / 70) * (0.4 + h01(i * 37) * 0.7) * (i % 2 ? -1 : 1) }
  })
}

function hill(ctx: Ctx, w: number, h: number, base: number, amp: number, sd: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += unit * 2) {
    const u = x / w
    ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(u * 4.2 + sd) * Math.sin(u * 2.1 + sd * 2)))
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
}

function drawOpenGrave(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = darken(props.config.groundColor, 0.55)
  ctx.beginPath()
  ctx.ellipse(x, y, s * 9, s * 3.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = lighten(props.config.groundColor, 0.18)
  ctx.beginPath()
  ctx.ellipse(x + s * 11, y - s * 1.5, s * 4.5, s * 2.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = props.config.treeColor
  ctx.lineWidth = s * 0.5
  ctx.beginPath()
  ctx.moveTo(x + s * 12, y - s * 3)
  ctx.lineTo(x + s * 16, y - s * 14)
  ctx.stroke()
  ctx.fillStyle = lighten(props.config.stoneColor, 0.2)
  ctx.beginPath()
  ctx.moveTo(x + s * 11, y - s * 1.5)
  ctx.lineTo(x + s * 14, y - s * 5)
  ctx.lineTo(x + s * 11, y - s * 6.5)
  ctx.lineTo(x + s * 8.5, y - s * 3.5)
  ctx.closePath()
  ctx.fill()
}

function buildBase(w: number, h: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = offscreenLayer(w, h, scale)
  if (!ctx) return c
  const col = colors()
  drawGraveSky(ctx, w, h, unit, sky(), h01)
  const far = lerpHex(props.config.groundColor, col.sky, 0.3)
  hill(ctx, w, h, h * HORIZON - unit * 6, unit * 14, 0.3, far)
  drawCrypt(ctx, w * 0.5, h * HORIZON + unit * 2, unit * 1.6, col)
  drawDeadTree(ctx, w * 0.1, h * HORIZON + unit * 2, unit * 1.4, props.config.treeColor, h01, 1)
  drawDeadTree(ctx, w * 0.9, h * HORIZON + unit * 1, unit * 1.1, props.config.treeColor, h01, 5)
  ctx.fillStyle = props.config.groundColor
  ctx.fillRect(0, h * HORIZON + unit * 4, w, h)
  drawIronFence(ctx, 0, w, h * HORIZON + unit * 9, unit * 1.2, darken(props.config.stoneColor, 0.4))
  drawRaven(ctx, w * 0.31, h * HORIZON + unit * 9 - unit * 12.6, unit * 0.9, props.config.treeColor)
  drawRaven(ctx, w * 0.66, h * HORIZON + unit * 9 - unit * 12.6, unit * 0.8, props.config.treeColor)
  const moonX = w * MOON[0]
  for (const st of stones) drawHeadstone(ctx, st, col, moonX)
  const perch = stones[stones.length - 4]
  if (perch) drawRaven(ctx, perch.x, perch.y - stoneTop(perch), perch.s * 0.9, props.config.treeColor)
  const plot = stones[Math.floor(stones.length * 0.62)]
  if (plot) drawOpenGrave(ctx, plot.x + plot.s * 10, plot.y + plot.s * 2, plot.s * 1.1)
  return c
}

function drawGhost(ctx: Ctx, w: number, h: number, t: number): void {
  if (!ghostPlot) return
  const local = t % GHOST_PERIOD_S
  const start = 4 + h01(Math.floor(t / GHOST_PERIOD_S) * 7) * 8
  const u = (local - start) / 7
  if (u < 0 || u > 1) return
  const s = ghostPlot.s * 7
  const rise = Math.min(1, u / 0.45)
  const x = ghostPlot.x + Math.sin(u * 4.2) * s * 0.9 + u * s * 1.5
  const y = ghostPlot.y - rise * s * 1.4 - Math.max(0, u - 0.45) * s * 2.2
  const a = (u < 0.2 ? u / 0.2 : u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1) * 0.55
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, ghostPlot.y + unit)
  ctx.clip()
  ctx.globalAlpha = a
  ctx.fillStyle = props.config.ghostColor
  ctx.beginPath()
  ctx.arc(x, y - s * 0.5, s * 0.5, Math.PI, 0)
  ctx.lineTo(x + s * 0.5, y + s * 0.6)
  for (let i = 0; i < 4; i++) {
    const x0 = x + s * 0.5 - (i * s) / 4
    ctx.quadraticCurveTo(x0 - s / 8, y + s * 0.6 + s * (0.16 + 0.06 * Math.sin(t * 5 + i)), x0 - s / 4, y + s * 0.6)
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = ghostEye
  for (const ex of [-0.16, 0.16]) {
    ctx.beginPath()
    ctx.ellipse(x + ex * s, y - s * 0.5, s * 0.07, s * 0.11, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.ellipse(x, y - s * 0.2, s * 0.08, s * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBats(ctx: Ctx, w: number, h: number, t: number): void {
  const flight = batFlight(t, BAT_PERIOD_S, BAT_CROSS_S)
  if (!flight) return
  const { n, u } = flight
  for (let i = 0; i < 4; i++) {
    const x = w * (1.05 - u * 1.12 * (1 + i * 0.04)) + i * unit * 9
    const y = h * (0.22 + h01(n * 5 + i) * 0.12) + Math.sin(u * 8 + i) * unit * 5
    drawBat(ctx, x, y, unit * (4.2 + h01(n * 9 + i) * 1.8), -1, Math.sin(t * 22 + i), props.config.batColor)
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function layout(w: number, h: number, scale: number): void {
  unit = sceneUnit(w, h)
  stones = buildStones(STONE_FIELD, w, h, unit, h01)
  ghostPlot = stones[Math.floor(stones.length * 0.5)] ?? null
  buildSprites(w, h, scale)
  base = buildBase(w, h, scale)
}

useBackdropCanvas(canvasRef, {
  init(w, h, now, scale) {
    startTime = now
    layout(w, h, scale)
  },
  resize(w, h, _now, scale) {
    layout(w, h, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    if (base) ctx.drawImage(base, 0, 0, w, h)
    drawDrift(ctx, clouds, w, t, 0.85)
    if (!reduced) drawBats(ctx, w, h, t)
    drawGhost(ctx, w, h, t)
    drawDrift(ctx, fog, w, t, 0.45)
    if (!reduced) {
      drawWisp(ctx, (lag) => [w * 0.5 + Math.sin((t - lag) * 0.5) * w * 0.32, h * (HORIZON + 0.2) + Math.sin((t - lag) * 1.7) * unit * 8], unit, props.config.wispColor)
    }
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>
