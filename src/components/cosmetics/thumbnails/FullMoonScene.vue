<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { FullMoonScene } from '@/types/api/items'
import { lerpHex } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

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

const CLOUDS = 4
const PUFFS = 64
const STARS = 40
const MOON_R = 34
const MOON_Y = 0.47
const BAT_PERIOD_S = 9
const BAT_CROSSING_S = 2.4
const FLAP_HZ = 7

let clouds: Cloud[] = []
let stars: Star[] = []
let litLayer: HTMLCanvasElement | null = null

function wave(x: number, seed: number): number {
  return (
    Math.sin(x * 1.7 + seed * 6.28) * 0.5 +
    Math.sin(x * 3.9 + seed * 12.9) * 0.3 +
    Math.sin(x * 8.3 + seed * 3.1) * 0.2
  )
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
  ctx.fill()
}

function puff(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(255,255,255,${a})`)
  g.addColorStop(0.55, `rgba(255,255,255,${a * 0.5})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

function tinted(mask: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = mask.width
  c.height = mask.height
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.drawImage(mask, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, c.width, c.height)
  return c
}

function cloudMask(i: number, cw: number, ch: number, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.ceil(cw * scale)
  c.height = Math.ceil(ch * scale)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  const seed = hash01(i * 31 + 5)
  const thick = ch * 0.3
  for (let k = 0; k <= PUFFS; k++) {
    const u = k / PUFFS
    const taper = Math.pow(Math.sin(u * Math.PI), 0.5)
    const torn = 0.5 + 0.5 * wave(u * 6 + i, seed + 0.3)
    const x = cw * 0.04 + u * cw * 0.92
    const y = ch * 0.5 + wave(u * 2.2, seed) * thick * 0.7 + (hash01(i * 71 + k) - 0.5) * thick * 0.5
    const rx = (cw / PUFFS) * (3.2 + hash01(i * 97 + k) * 2.6)
    const ry = thick * (0.3 + hash01(i * 53 + k) * 0.45) * taper
    puff(ctx, x, y, rx, ry, 0.2 * torn * taper)
  }
  return c
}

function buildCloud(i: number, w: number, h: number, s: number, scale: number): Cloud {
  const cw = w * (0.7 + hash01(i * 7 + 1) * 0.45)
  const ch = s * (12 + hash01(i * 11 + 2) * 9)
  const mask = cloudMask(i, cw, ch, scale)
  const litColor = lerpHex(props.scene.cloud, props.scene.moon, 0.62)
  const lanes = [0.27, 0.44, 0.58, 0.8]
  return {
    dark: tinted(mask, props.scene.cloud),
    lit: tinted(mask, litColor),
    w: cw,
    h: ch,
    y: h * (lanes[i % lanes.length] ?? 0.5) - ch * 0.5 + (hash01(i * 13 + 3) - 0.5) * s * 8,
    x0: hash01(i * 17 + 4) * (w + cw),
    speed: (w / 70) * (0.6 + hash01(i * 19 + 6) * 0.8) * (i % 2 === 0 ? 1 : 0.7),
    alpha: 0.72 + hash01(i * 23 + 8) * 0.24,
  }
}

function buildStars(w: number, h: number, s: number): Star[] {
  const out: Star[] = []
  for (let i = 0; i < STARS; i++) {
    const x = hash01(i * 41 + 9) * w
    const y = hash01(i * 43 + 10) * h
    const dx = x - w * 0.5
    const dy = y - h * MOON_Y
    if (Math.hypot(dx, dy) < MOON_R * s * 1.7) continue
    const bright = hash01(i * 61 + 14)
    out.push({ x, y, r: s * (0.25 + bright * bright * 0.6), phase: hash01(i * 53 + 12) * 6.28, rate: 0.6 + hash01(i * 59 + 13) * 1.2 })
  }
  return out
}

function drawSky(ctx: Ctx, w: number, h: number, s: number, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, props.scene.skyTop)
  g.addColorStop(1, props.scene.skyBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (const st of stars) {
    const tw = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t * st.rate + st.phase))
    ctx.fillStyle = withAlpha(props.scene.moon, tw)
    circle(ctx, st.x, st.y, st.r)
  }
  const halo = ctx.createRadialGradient(w * 0.5, h * MOON_Y, MOON_R * s * 0.9, w * 0.5, h * MOON_Y, MOON_R * s * 2.6)
  halo.addColorStop(0, withAlpha(props.scene.moon, 0.14))
  halo.addColorStop(0.45, withAlpha(props.scene.moon, 0.05))
  halo.addColorStop(1, withAlpha(props.scene.moon, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
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

const MARIA: [number, number, number, number][] = [
  [-0.24, -0.28, 0.36, 0.11],
  [0.28, -0.04, 0.3, 0.47],
  [-0.02, 0.42, 0.22, 0.83],
  [0.4, 0.4, 0.15, 0.29],
  [-0.5, 0.1, 0.13, 0.62],
  [0.08, 0.1, 0.18, 0.37],
]

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

function drawMoon(ctx: Ctx, w: number, h: number, s: number): void {
  const mx = w * 0.5
  const my = h * MOON_Y
  const r = MOON_R * s
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

function cloudX(c: Cloud, w: number, t: number): number {
  const span = w + c.w
  return ((((c.x0 + t * c.speed) % span) + span) % span) - c.w
}

function litClouds(w: number, h: number, s: number, t: number): HTMLCanvasElement | null {
  const layer = litLayer
  const lctx = layer?.getContext('2d')
  if (!layer || !lctx) return null
  lctx.clearRect(0, 0, w, h)
  for (const c of clouds) {
    lctx.globalAlpha = c.alpha * 0.75
    lctx.drawImage(c.lit, cloudX(c, w, t), c.y, c.w, c.h)
  }
  lctx.globalAlpha = 1
  lctx.globalCompositeOperation = 'destination-in'
  const r = MOON_R * s
  const g = lctx.createRadialGradient(w * 0.5, h * MOON_Y, r * 0.9, w * 0.5, h * MOON_Y, r * 2.1)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.12, 'rgba(0,0,0,0.55)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  lctx.fillStyle = g
  lctx.fillRect(0, 0, w, h)
  lctx.globalCompositeOperation = 'source-over'
  return layer
}

function drawClouds(ctx: Ctx, w: number, h: number, s: number, t: number): void {
  for (const c of clouds) {
    ctx.globalAlpha = c.alpha
    ctx.drawImage(c.dark, cloudX(c, w, t), c.y, c.w, c.h)
  }
  ctx.globalAlpha = 1
  const lit = litClouds(w, h, s, t)
  if (lit) ctx.drawImage(lit, 0, 0, w, h)
}

function wing(ctx: Ctx, f: number): void {
  ctx.moveTo(0, -0.1)
  ctx.quadraticCurveTo(-0.32, -0.42 - 0.3 * f, -1, -0.18 - 0.55 * f)
  ctx.quadraticCurveTo(-0.86, -0.12 - 0.42 * f, -0.68, 0.02 - 0.3 * f)
  ctx.quadraticCurveTo(-0.54, -0.04 - 0.2 * f, -0.38, 0.1 - 0.12 * f)
  ctx.quadraticCurveTo(-0.24, 0.06 - 0.05 * f, -0.08, 0.2)
  ctx.lineTo(0, 0.2)
  ctx.closePath()
}

function drawBat(ctx: Ctx, x: number, y: number, size: number, dir: number, f: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size * dir, size)
  ctx.fillStyle = props.scene.bat
  ctx.beginPath()
  wing(ctx, f)
  ctx.fill()
  ctx.save()
  ctx.scale(-1, 1)
  ctx.beginPath()
  wing(ctx, f)
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(0, 0.02, 0.13, 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, -0.17, 0.11, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-0.11, -0.2)
  ctx.lineTo(-0.1, -0.4)
  ctx.lineTo(-0.02, -0.25)
  ctx.moveTo(0.11, -0.2)
  ctx.lineTo(0.1, -0.4)
  ctx.lineTo(0.02, -0.25)
  ctx.fill()
  ctx.restore()
}

function drawBatCrossing(ctx: Ctx, w: number, h: number, s: number, t: number): void {
  const n = Math.floor(t / BAT_PERIOD_S)
  const phase = t - n * BAT_PERIOD_S
  if (phase >= BAT_CROSSING_S) return
  const u = phase / BAT_CROSSING_S
  const dir = hash01(n * 3 + 1) > 0.5 ? 1 : -1
  const size = s * (5.5 + hash01(n * 5 + 2) * 3)
  const x = dir > 0 ? -size + u * (w + size * 2) : w + size - u * (w + size * 2)
  const y = h * MOON_Y + (hash01(n * 7 + 3) - 0.5) * MOON_R * s * 1.1 + Math.sin(u * 7 + n) * s * 4 - u * s * 6
  drawBat(ctx, x, y, size, dir, Math.sin(t * FLAP_HZ * Math.PI * 2))
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _nowMs, scale) {
    const s = Math.min(w, h) / 110
    clouds = Array.from({ length: CLOUDS }, (_, i) => buildCloud(i, w, h, s, scale))
    stars = buildStars(w, h, s)
    litLayer = document.createElement("canvas")
    litLayer.width = Math.ceil(w * scale)
    litLayer.height = Math.ceil(h * scale)
    litLayer.getContext('2d')?.setTransform(scale, 0, 0, scale, 0, 0)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 3 : now / 1000
    const s = Math.min(w, h) / 110
    ctx.clearRect(0, 0, w, h)
    drawSky(ctx, w, h, s, t)
    drawMoon(ctx, w, h, s)
    drawClouds(ctx, w, h, s, t)
    if (!reduced) drawBatCrossing(ctx, w, h, s, t)
  },
})
</script>

<template>
  <canvas ref="canvas" class="full-moon-scene" aria-hidden="true" />
</template>

<style scoped>
.full-moon-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
