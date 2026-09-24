<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { GraveyardScene } from '@/types/api/items'
import { type Ctx, flickerNoise } from '@/utils/cosmetics/canvasShapes'
import { darken, lerpHex, lighten, parseHex } from '@/utils/color'
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
import { createRadialSprite, offscreenLayer } from '@/utils/cosmetics/sceneLayer'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: GraveyardScene }>()

const STATIC_T = 3
const HORIZON = 0.6
const MOON: [number, number] = [0.3, 0.22]
const STONE_FIELD: StoneField = { count: 16, horizon: HORIZON, depth: 0.34, size: [0.5, 0.9], curve: 1 }
const BAT_PERIOD_S = 11
const BAT_CROSS_S = 3

const seed = Math.floor(rand(0, 100000))
const flame = lighten(props.scene.candle, 0.45)
const batColor = darken(props.scene.skyTop, 0.6)
let unit = 1
let base: HTMLCanvasElement | null = null
let glow: HTMLCanvasElement | null = null
let clouds: DriftSprite[] = []
let fog: DriftSprite[] = []
let stones: Stone[] = []

function h01(n: number): number {
  return hash01(seed + n)
}

function colors(): GraveColors {
  return { stone: props.scene.stone, ground: props.scene.ground, moon: props.scene.moon, sky: props.scene.skyBottom }
}

function sky(): GraveSky {
  return { colors: [props.scene.skyTop, props.scene.skyBottom], moon: props.scene.moon, moonAt: MOON, moonR: 13, stars: 26, starSize: [0.2, 0.35], starBand: 0.5 }
}

function buildSprites(w: number, h: number, scale: number): void {
  const cloudColor = darken(props.scene.skyBottom, 0.2)
  clouds = Array.from({ length: 3 }, (_, i) => {
    const cw = w * (0.4 + h01(i * 7) * 0.4)
    const ch = unit * (10 + h01(i * 11) * 8)
    return { img: driftSprite(i, cw, ch, scale, cloudColor, 0.5, h01), w: cw, h: ch, y: h * (0.08 + i * 0.1) - ch / 2, x0: h01(i * 17) * (w + cw), speed: (w / 60) * (0.6 + h01(i * 19) * 0.6) }
  })
  fog = Array.from({ length: 4 }, (_, i) => {
    const cw = w * (0.5 + h01(i * 23) * 0.5)
    const ch = unit * (8 + h01(i * 29) * 6)
    return { img: driftSprite(i + 10, cw, ch, scale, props.scene.fog, 0.3, h01), w: cw, h: ch, y: h * (0.62 + i * 0.09) - ch / 2, x0: h01(i * 31) * (w + cw), speed: (w / 45) * (0.5 + h01(i * 37) * 0.7) * (i % 2 ? -1 : 1) }
  })
}

function buildBase(w: number, h: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = offscreenLayer(w, h, scale)
  if (!ctx) return c
  const col = colors()
  const s = unit
  drawGraveSky(ctx, w, h, s, sky(), h01)
  ctx.fillStyle = lerpHex(props.scene.ground, props.scene.skyBottom, 0.3)
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += s * 2) ctx.lineTo(x, h * HORIZON - s * (2 + 3 * Math.sin((x / w) * 4.2 + 1)))
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  drawCrypt(ctx, w * 0.5, h * HORIZON + s * 1, s, col)
  drawDeadTree(ctx, w * 0.12, h * HORIZON + s * 2, s, darken(props.scene.ground, 0.35), h01, 1)
  ctx.fillStyle = props.scene.ground
  ctx.fillRect(0, h * HORIZON + s * 4, w, h)
  drawIronFence(ctx, 0, w, h * HORIZON + s * 6, s, darken(props.scene.stone, 0.4))
  const moonX = w * MOON[0]
  for (const st of stones) drawHeadstone(ctx, st, col, moonX)
  const perch = stones[stones.length - 3]
  if (perch) drawRaven(ctx, perch.x, perch.y - stoneTop(perch), perch.s * 0.9, darken(props.scene.ground, 0.5))
  const wax = stones[4]
  if (wax) {
    ctx.fillStyle = lighten(props.scene.stone, 0.4)
    ctx.fillRect(wax.x + wax.s * 5.5 - s * 0.6, wax.y + wax.s * 0.2 - s * 2.2, s * 1.2, s * 2.4)
  }
  return c
}

function drawCandle(ctx: Ctx, t: number): void {
  const st = stones[4]
  if (!st || !glow) return
  const s = unit
  const x = st.x + st.s * 5.5
  const y = st.y + st.s * 0.2
  const f = 0.7 + flickerNoise(t, 1.5) * 0.3
  const r = s * 7 * f
  ctx.globalAlpha = f
  ctx.drawImage(glow, x - r, y - s * 1.5 - r, r * 2, r * 2)
  ctx.globalAlpha = 0.95
  ctx.fillStyle = flame
  ctx.beginPath()
  ctx.ellipse(x, y - s * (2.8 + f * 0.4), s * 0.45, s * (0.7 + f * 0.4), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawBats(ctx: Ctx, w: number, h: number, t: number): void {
  const flight = batFlight(t, BAT_PERIOD_S, BAT_CROSS_S)
  if (!flight) return
  const s = unit
  for (let i = 0; i < 3; i++) {
    const x = w * (1.05 - flight.u * 1.1 * (1 + i * 0.05)) + i * s * 6
    const y = h * 0.28 + Math.sin(flight.u * 8 + i) * s * 4 + i * s * 3
    drawBat(ctx, x, y, s * 3.3, -1, Math.sin(t * 22 + i), batColor)
  }
}

function wispAt(w: number, h: number, t: number): (lag: number) => [number, number] {
  return (lag) => [w * 0.5 + Math.sin((t - lag) * 0.6) * w * 0.3, h * (HORIZON + 0.14) + Math.sin((t - lag) * 1.7) * unit * 6]
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _now, scale) {
    unit = Math.min(w, h) / 110
    stones = buildStones(STONE_FIELD, w, h, unit, h01)
    buildSprites(w, h, scale)
    base = buildBase(w, h, scale)
    const rgb = parseHex(props.scene.candle)
    glow = rgb ? createRadialSprite(64, rgb, [[0, 0.35], [1, 0]]) : null
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : now / 1000
    ctx.clearRect(0, 0, w, h)
    if (base) ctx.drawImage(base, 0, 0, w, h)
    drawDrift(ctx, clouds, w, t, 0.85)
    if (!reduced) drawBats(ctx, w, h, t)
    drawCandle(ctx, t)
    drawDrift(ctx, fog, w, t, 0.5)
    drawWisp(ctx, wispAt(w, h, t), unit, props.scene.wisp)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
