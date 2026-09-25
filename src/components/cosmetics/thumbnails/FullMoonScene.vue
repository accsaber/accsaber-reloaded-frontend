<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { FullMoonScene } from '@/types/api/items'
import { lerpHex } from '@/utils/color'
import { fillCircle as circle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { batFlight, drawBat } from '@/utils/cosmetics/graveyardScenery'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { cloudMask, offscreenLayer, tintLayer, wrapX } from '@/utils/cosmetics/sceneLayer'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: FullMoonScene }>()

interface Cloud {
  dark: HTMLCanvasElement
  lit: HTMLCanvasElement
  w: number
  h: number
  y: number
  x0: number
  speed: number
  alpha: number
}

interface Star {
  x: number
  y: number
  r: number
  phase: number
  rate: number
}

const STATIC_T = 3
const CLOUDS = 4
const PUFFS = 64
const STARS = 40
const MOON_R = 34
const MOON_X = 0.5
const MOON_Y = 0.47
const LIT_REACH = 2.1
const BAT_PERIOD_S = 9
const BAT_CROSSING_S = 2.4
const FLAP_HZ = 7

const MARIA: [number, number, number, number][] = [
  [-0.24, -0.28, 0.36, 0.11],
  [0.28, -0.04, 0.3, 0.47],
  [-0.02, 0.42, 0.22, 0.83],
  [0.4, 0.4, 0.15, 0.29],
  [-0.5, 0.1, 0.13, 0.62],
  [0.08, 0.1, 0.18, 0.37],
]

let unit = 1
let base: HTMLCanvasElement | null = null
let clouds: Cloud[] = []
let stars: Star[] = []
let litLayer: HTMLCanvasElement | null = null
let litMask: HTMLCanvasElement | null = null
let litBox = { x: 0, y: 0, size: 0 }

function buildCloud(i: number, w: number, h: number, scale: number): Cloud {
  const cw = w * (0.7 + hash01(i * 7 + 1) * 0.45)
  const ch = unit * (12 + hash01(i * 11 + 2) * 9)
  const mask = cloudMask(cw, ch, scale, hash01, i, PUFFS, 0.2)
  const lanes = [0.27, 0.44, 0.58, 0.8]
  return {
    dark: tintLayer(mask, props.scene.cloud),
    lit: tintLayer(mask, lerpHex(props.scene.cloud, props.scene.moon, 0.62)),
    w: cw,
    h: ch,
    y: h * (lanes[i % lanes.length] ?? 0.5) - ch * 0.5 + (hash01(i * 13 + 3) - 0.5) * unit * 8,
    x0: hash01(i * 17 + 4) * (w + cw),
    speed: (w / 70) * (0.6 + hash01(i * 19 + 6) * 0.8) * (i % 2 === 0 ? 1 : 0.7),
    alpha: 0.72 + hash01(i * 23 + 8) * 0.24,
  }
}

function buildStars(w: number, h: number): Star[] {
  const out: Star[] = []
  for (let i = 0; i < STARS; i++) {
    const x = hash01(i * 41 + 9) * w
    const y = hash01(i * 43 + 10) * h
    if (Math.hypot(x - w * MOON_X, y - h * MOON_Y) < MOON_R * unit * 1.7) continue
    const bright = hash01(i * 61 + 14)
    out.push({ x, y, r: unit * (0.25 + bright * bright * 0.6), phase: hash01(i * 53 + 12) * 6.28, rate: 0.6 + hash01(i * 59 + 13) * 1.2 })
  }
  return out
}

function blob(ctx: Ctx, cx: number, cy: number, r: number, seed: number): void {
  ctx.beginPath()
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * Math.PI * 2
    const rr = r * (0.82 + 0.18 * (Math.sin(a * 2 + seed * 9) * 0.6 + Math.sin(a * 3 + seed * 4) * 0.4))
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr * 0.85
    if (k === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawMaria(ctx: Ctx, mx: number, my: number, r: number): void {
  for (const [ox, oy, sr, seed] of MARIA) {
    ctx.fillStyle = withAlpha(props.scene.crater, 0.14)
    blob(ctx, mx + ox * r, my + oy * r, sr * r * 1.16, seed)
    ctx.fillStyle = withAlpha(props.scene.crater, 0.2)
    blob(ctx, mx + ox * r, my + oy * r, sr * r, seed)
  }
  ctx.fillStyle = withAlpha(props.scene.crater, 0.4)
  circle(ctx, mx + r * 0.05, my - r * 0.62, r * 0.05)
  circle(ctx, mx - r * 0.55, my + r * 0.18, r * 0.035)
  circle(ctx, mx + r * 0.62, my - r * 0.3, r * 0.03)
  circle(ctx, mx - r * 0.3, my + r * 0.62, r * 0.025)
}

function paintSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, props.scene.skyTop)
  g.addColorStop(1, props.scene.skyBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const mx = w * MOON_X
  const my = h * MOON_Y
  const r = MOON_R * unit
  const halo = ctx.createRadialGradient(mx, my, r * 0.9, mx, my, r * 2.6)
  halo.addColorStop(0, withAlpha(props.scene.moon, 0.14))
  halo.addColorStop(0.45, withAlpha(props.scene.moon, 0.05))
  halo.addColorStop(1, withAlpha(props.scene.moon, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
}

function paintMoon(ctx: Ctx, w: number, h: number): void {
  const mx = w * MOON_X
  const my = h * MOON_Y
  const r = MOON_R * unit
  ctx.fillStyle = props.scene.moon
  circle(ctx, mx, my, r)
  ctx.save()
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.clip()
  drawMaria(ctx, mx, my, r)
  const limb = ctx.createRadialGradient(mx - r * 0.18, my - r * 0.2, r * 0.3, mx, my, r)
  limb.addColorStop(0, withAlpha(props.scene.crater, 0))
  limb.addColorStop(0.75, withAlpha(props.scene.crater, 0.22))
  limb.addColorStop(1, withAlpha(props.scene.crater, 0.75))
  ctx.fillStyle = limb
  ctx.fillRect(mx - r, my - r, r * 2, r * 2)
  ctx.restore()
}

function buildLitLayers(w: number, h: number, scale: number): void {
  const r = MOON_R * unit
  const size = r * LIT_REACH * 2
  litBox = { x: w * MOON_X - size / 2, y: h * MOON_Y - size / 2, size }
  litLayer = offscreenLayer(size, size, scale)[0]
  const [mask, mctx] = offscreenLayer(size, size, scale)
  litMask = mask
  if (!mctx) return
  const c = size / 2
  const g = mctx.createRadialGradient(c, c, r * 0.9, c, c, r * LIT_REACH)
  g.addColorStop(0, 'rgba(0, 0, 0, 1)')
  g.addColorStop(0.12, 'rgba(0, 0, 0, 0.55)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  mctx.fillStyle = g
  mctx.fillRect(0, 0, size, size)
}

function drawStars(ctx: Ctx, t: number): void {
  ctx.fillStyle = props.scene.moon
  for (const st of stars) {
    ctx.globalAlpha = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t * st.rate + st.phase))
    circle(ctx, st.x, st.y, st.r)
  }
  ctx.globalAlpha = 1
}

function drawLitClouds(ctx: Ctx, w: number, t: number): void {
  const lctx = litLayer?.getContext('2d')
  if (!litLayer || !litMask || !lctx) return
  const { x, y, size } = litBox
  lctx.clearRect(0, 0, size, size)
  for (const c of clouds) {
    const cx = wrapX(c.x0, c.speed, t, w, c.w)
    if (cx + c.w < x || cx > x + size || c.y + c.h < y || c.y > y + size) continue
    lctx.globalAlpha = c.alpha * 0.75
    lctx.drawImage(c.lit, cx - x, c.y - y, c.w, c.h)
  }
  lctx.globalAlpha = 1
  lctx.globalCompositeOperation = 'destination-in'
  lctx.drawImage(litMask, 0, 0, size, size)
  lctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(litLayer, x, y, size, size)
}

function drawClouds(ctx: Ctx, w: number, t: number): void {
  for (const c of clouds) {
    ctx.globalAlpha = c.alpha
    ctx.drawImage(c.dark, wrapX(c.x0, c.speed, t, w, c.w), c.y, c.w, c.h)
  }
  ctx.globalAlpha = 1
  drawLitClouds(ctx, w, t)
}

function drawBatCrossing(ctx: Ctx, w: number, h: number, t: number): void {
  const flight = batFlight(t, BAT_PERIOD_S, BAT_CROSSING_S)
  if (!flight) return
  const { n, u } = flight
  const dir = hash01(n * 3 + 1) > 0.5 ? 1 : -1
  const size = unit * (5.5 + hash01(n * 5 + 2) * 3)
  const x = dir > 0 ? -size + u * (w + size * 2) : w + size - u * (w + size * 2)
  const y = h * MOON_Y + (hash01(n * 7 + 3) - 0.5) * MOON_R * unit * 1.1 + Math.sin(u * 7 + n) * unit * 4 - u * unit * 6
  drawBat(ctx, x, y, size, dir, Math.sin(t * FLAP_HZ * Math.PI * 2), props.scene.bat)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _nowMs, scale) {
    unit = Math.min(w, h) / 110
    clouds = Array.from({ length: CLOUDS }, (_, i) => buildCloud(i, w, h, scale))
    stars = buildStars(w, h)
    const [layer, lctx] = offscreenLayer(w, h, scale)
    if (lctx) {
      paintSky(lctx, w, h)
      paintMoon(lctx, w, h)
    }
    base = layer
    buildLitLayers(w, h, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : now / 1000
    ctx.clearRect(0, 0, w, h)
    if (base) ctx.drawImage(base, 0, 0, w, h)
    drawStars(ctx, t)
    drawClouds(ctx, w, t)
    if (!reduced) drawBatCrossing(ctx, w, h, t)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
