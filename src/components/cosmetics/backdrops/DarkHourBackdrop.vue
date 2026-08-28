<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { type Ctx, sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { lerpHex } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import type { DarkHourBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: DarkHourBackdropConfig
}>()

interface Cloud {
  dark: HTMLCanvasElement
  lit: HTMLCanvasElement
  w: number
  h: number
  y: number
  x0: number
  speed: number
}

interface Puddle {
  x: number
  y: number
  rx: number
  ry: number
  seed: number
}

const STATIC_T = 5
const CLOUDS = 10
const PUFFS = 80
const HORIZON = 0.8
const MOON_X = 0.62
const MOON_Y = 0.22
const LAYERS = [
  { haze: 0.55, minH: 40, maxH: 110, minW: 14, maxW: 34, lift: 2 },
  { haze: 0.3, minH: 22, maxH: 74, minW: 10, maxW: 30, lift: 1 },
  { haze: 0, minH: 8, maxH: 40, minW: 8, maxW: 26, lift: 0 },
]

let startTime = 0
let unit = 1
let seed = 0
let clouds: Cloud[] = []
let puddles: Puddle[] = []
let skyline: HTMLCanvasElement | null = null
let street: HTMLCanvasElement | null = null
let litLayer: HTMLCanvasElement | null = null

function h01(n: number): number {
  return hash01(seed + n)
}

function wave(x: number, s: number): number {
  return Math.sin(x * 1.7 + s * 6.28) * 0.5 + Math.sin(x * 3.9 + s * 12.9) * 0.3 + Math.sin(x * 8.3 + s * 3.1) * 0.2
}

function offscreen(w: number, h: number, scale: number): [HTMLCanvasElement, Ctx | null] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const ctx = c.getContext('2d')
  ctx?.setTransform(scale, 0, 0, scale, 0, 0)
  return [c, ctx]
}

function puff(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(255,255,255,${a})`)
  g.addColorStop(0.5, `rgba(255,255,255,${a * 0.55})`)
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
  const [c, ctx] = offscreen(cw, ch, scale)
  if (!ctx) return c
  const s = h01(i * 31)
  const thick = ch * 0.34
  for (let k = 0; k <= PUFFS; k++) {
    const u = k / PUFFS
    const taper = Math.pow(Math.sin(u * Math.PI), 0.45)
    const torn = 0.55 + 0.45 * wave(u * 5 + i, s + 0.3)
    const x = cw * 0.04 + u * cw * 0.92
    const y = ch * 0.5 + wave(u * 2.4, s) * thick * 0.8 + (h01(i * 71 + k) - 0.5) * thick * 0.6
    const rx = (cw / PUFFS) * (2.6 + h01(i * 97 + k) * 2.4)
    const ry = thick * (0.4 + h01(i * 53 + k) * 0.6) * taper
    puff(ctx, x, y, rx, ry, 0.5 * torn * taper)
  }
  return c
}

function buildCloud(i: number, w: number, h: number, scale: number): Cloud {
  const cw = w * (0.5 + h01(i * 7) * 0.55)
  const ch = unit * (40 + h01(i * 11) * 40)
  const mask = cloudMask(i, cw, ch, scale)
  const lit = lerpHex(props.config.cloudColor, props.config.moonColor, 0.62)
  return {
    dark: tinted(mask, props.config.cloudColor),
    lit: tinted(mask, lit),
    w: cw,
    h: ch,
    y: h * (-0.04 + (i / CLOUDS) * 0.6) + (h01(i * 13) - 0.5) * unit * 16 - ch * 0.5,
    x0: h01(i * 17) * (w + cw),
    speed: (w / 150) * (0.5 + h01(i * 19) * 0.9),
  }
}

function drawWindows(ctx: Ctx, x: number, top: number, bw: number, bh: number, k: number, haze: number): void {
  const cell = unit * 2.6
  const cols = Math.floor((bw - unit) / cell)
  const rows = Math.floor((bh - unit * 2) / cell)
  const litP = 0.05 + h01(k * 5) * 0.08
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = h01(k * 131 + r * 17 + c * 7)
      if (v > litP) continue
      const a = (0.22 + (v / litP) * 0.35) * (1 - haze * 0.7)
      ctx.fillStyle = withAlpha(props.config.windowColor, a)
      ctx.fillRect(x + unit * 0.8 + c * cell, top + unit * 1.4 + r * cell, unit * 1.1, unit * 1.3)
    }
  }
}

function drawRoof(ctx: Ctx, x: number, top: number, bw: number, k: number, color: string): void {
  ctx.fillStyle = color
  const v = h01(k * 3)
  if (v < 0.3) {
    ctx.fillRect(x + bw * 0.2, top - unit * 3, unit * 3, unit * 3)
    ctx.fillRect(x + bw * 0.2 - unit * 0.4, top - unit * 3.6, unit * 3.8, unit * 0.7)
  } else if (v < 0.55) {
    ctx.fillRect(x + bw * 0.5 - unit * 0.25, top - unit * (6 + h01(k * 7) * 8), unit * 0.5, unit * 14)
  } else if (v < 0.8) {
    const tw = bw * (0.35 + h01(k * 7) * 0.4)
    ctx.fillRect(x + (bw - tw) * h01(k * 17), top - unit * (3 + h01(k * 19) * 7), tw, unit * 12)
  }
  ctx.fillRect(x - unit * 0.3, top - unit * 0.8, bw + unit * 0.6, unit * 0.8)
}

function drawBuilding(ctx: Ctx, x: number, bw: number, bh: number, base: number, k: number, haze: number, w: number): void {
  const color = lerpHex(props.config.cityColor, props.config.skyColors[1] ?? props.config.cityColor, haze)
  const top = base - bh
  drawRoof(ctx, x, top, bw, k, color)
  ctx.fillStyle = color
  ctx.fillRect(x, top, bw, bh)
  drawWindows(ctx, x, top, bw, bh, k, haze)
  const rimX = x + (w * MOON_X > x + bw * 0.5 ? bw - unit * 0.35 : 0)
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.12 * (1 - haze))
  ctx.fillRect(rimX, top, unit * 0.35, bh)
}

function drawTower(ctx: Ctx, x: number, base: number): void {
  ctx.fillStyle = lerpHex(props.config.cityColor, props.config.skyColors[1] ?? props.config.cityColor, 0.6)
  let y = base
  let bw = unit * 26
  for (let i = 0; i < 16; i++) {
    const bh = unit * (6 + h01(i * 23) * 5)
    const dx = (h01(i * 29) - 0.5) * unit * 7
    ctx.fillRect(x + dx - bw * 0.5, y - bh, bw, bh)
    ctx.fillRect(x + dx + bw * 0.5 - unit, y - bh * 0.5, unit * 2.5, unit * 0.6)
    y -= bh * 0.92
    bw *= 0.93
  }
  ctx.fillRect(x - unit * 0.6, y - unit * 16, unit * 1.2, unit * 16)
}

function buildSkyline(w: number, h: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = offscreen(w, h, scale)
  if (!ctx) return c
  const base = h * HORIZON
  drawTower(ctx, w * 0.3, base - unit * 10)
  LAYERS.forEach((L, li) => {
    let x = -unit * 6
    let k = li * 1000
    while (x < w + unit * 6) {
      const bw = unit * (L.minW + h01(k * 41) * (L.maxW - L.minW))
      const bh = unit * (L.minH + Math.pow(h01(k * 43), 1.4) * (L.maxH - L.minH))
      drawBuilding(ctx, x, bw, bh, base - unit * L.lift, k, L.haze, w)
      x += bw * (0.55 + h01(k * 47) * 0.5)
      k++
    }
  })
  return c
}

function puddlePath(ctx: Ctx, p: Puddle): void {
  ctx.beginPath()
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 2
    const rr = 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(a * 3 + p.seed * 9))
    const x = p.x + Math.cos(a) * p.rx * rr
    const y = p.y + Math.sin(a) * p.ry * rr
    if (k === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function buildPuddles(w: number, h: number): Puddle[] {
  const out: Puddle[] = []
  const y0 = h * HORIZON
  for (let i = 0; i < 14; i++) {
    const u = Math.pow(h01(i * 91), 0.8)
    out.push({
      x: h01(i * 93) * w,
      y: y0 + unit * 2 + u * (h - y0 - unit * 4),
      rx: unit * (4 + u * 16) * (0.6 + h01(i * 95) * 0.8),
      ry: unit * (0.9 + u * 3.6),
      seed: h01(i * 97),
    })
  }
  return out
}

function drawLamp(ctx: Ctx, x: number, base: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - unit * 0.3, base - unit * 22, unit * 0.6, unit * 22)
  ctx.fillRect(x - unit * 0.3, base - unit * 22, unit * 3.5, unit * 0.5)
  ctx.fillRect(x + unit * 2.4, base - unit * 22, unit * 1.6, unit * 1.4)
  ctx.fillRect(x - unit * 1.2, base - unit * 1, unit * 2.4, unit * 1)
}

function buildStreet(w: number, h: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = offscreen(w, h, scale)
  if (!ctx) return c
  const y0 = h * HORIZON
  const asphalt = lerpHex(props.config.cityColor, props.config.waterColor, 0.3)
  const g = ctx.createLinearGradient(0, y0, 0, h)
  g.addColorStop(0, asphalt)
  g.addColorStop(1, lerpHex(asphalt, props.config.waterColor, 0.55))
  ctx.fillStyle = g
  ctx.fillRect(0, y0, w, h - y0)
  ctx.fillStyle = lerpHex(props.config.cityColor, props.config.moonColor, 0.14)
  ctx.fillRect(0, y0, w, unit * 1.6)
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.08)
  ctx.fillRect(0, y0, w, unit * 0.4)
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.05)
  for (let i = 0; i < 9; i++) ctx.fillRect(w * (i / 9) + unit * 2, y0 + (h - y0) * 0.55, unit * 14, unit * 0.5)
  const lamp = lerpHex(props.config.cityColor, props.config.moonColor, 0.08)
  for (let i = 0; i < 6; i++) drawLamp(ctx, w * (0.04 + i * 0.184 + h01(i * 3) * 0.05), y0 + unit * 1.6, lamp)
  return c
}

function drawSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h * HORIZON)
  const cs = props.config.skyColors
  cs.forEach((c, i) => g.addColorStop(i / Math.max(1, cs.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h * HORIZON)
}

function drawMoon(ctx: Ctx, w: number, h: number): void {
  const mx = w * MOON_X
  const my = h * MOON_Y
  const r = unit * 22
  const halo = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 3.4)
  halo.addColorStop(0, withAlpha(props.config.moonColor, 0.22))
  halo.addColorStop(0.4, withAlpha(props.config.moonColor, 0.07))
  halo.addColorStop(1, withAlpha(props.config.moonColor, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h * HORIZON)
  ctx.fillStyle = props.config.moonColor
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fill()
  const shade = lerpHex(props.config.moonColor, props.config.skyColors[0] ?? '#000000', 0.35)
  ctx.fillStyle = withAlpha(shade, 0.28)
  for (const [ox, oy, sr] of [[-0.3, -0.22, 0.26], [0.22, 0.08, 0.2], [-0.08, 0.42, 0.15], [0.44, 0.4, 0.09], [0.1, -0.5, 0.08]]) {
    ctx.beginPath()
    ctx.ellipse(mx + ox * r, my + oy * r, sr * r, sr * r * 0.8, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  const limb = ctx.createRadialGradient(mx - r * 0.2, my - r * 0.2, r * 0.4, mx, my, r)
  limb.addColorStop(0, withAlpha(shade, 0))
  limb.addColorStop(1, withAlpha(shade, 0.45))
  ctx.fillStyle = limb
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fill()
}

function cloudX(c: Cloud, w: number, t: number): number {
  const span = w + c.w
  return ((((c.x0 + t * c.speed) % span) + span) % span) - c.w
}

function drawClouds(ctx: Ctx, w: number, h: number, t: number): void {
  for (const c of clouds) ctx.drawImage(c.dark, cloudX(c, w, t), c.y, c.w, c.h)
  const lctx = litLayer?.getContext('2d')
  if (!litLayer || !lctx) return
  const r = unit * 22
  const size = r * 7
  const ox = w * MOON_X - size * 0.5
  const oy = h * MOON_Y - size * 0.5
  lctx.clearRect(0, 0, size, size)
  lctx.globalAlpha = 0.85
  for (const c of clouds) lctx.drawImage(c.lit, cloudX(c, w, t) - ox, c.y - oy, c.w, c.h)
  lctx.globalAlpha = 1
  lctx.globalCompositeOperation = 'destination-in'
  const g = lctx.createRadialGradient(size * 0.5, size * 0.5, r * 0.9, size * 0.5, size * 0.5, size * 0.5)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.15, 'rgba(0,0,0,0.5)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  lctx.fillStyle = g
  lctx.fillRect(0, 0, size, size)
  lctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(litLayer, ox, oy, size, size)
}

function drawPuddles(ctx: Ctx, w: number, t: number): void {
  const mx = w * MOON_X
  for (const p of puddles) {
    puddlePath(ctx, p)
    ctx.fillStyle = lerpHex(props.config.waterColor, props.config.moonColor, 0.06)
    ctx.fill()
    const near = 1 - Math.min(1, Math.abs(p.x - mx) / (p.rx * 1.6))
    if (near <= 0) continue
    ctx.save()
    ctx.clip()
    for (let y = p.y - p.ry; y < p.y + p.ry; y += Math.max(1, unit * 0.35)) {
      const wob = Math.sin(y * 0.6 / unit + t * 2.2 + p.seed * 9) * unit * 1.2
      const half = unit * (1.5 + near * 4) * (0.6 + 0.4 * Math.sin(y * 1.1 / unit - t * 2.8))
      ctx.fillStyle = withAlpha(props.config.moonColor, 0.35 * near)
      ctx.fillRect(mx + wob - half, y, half * 2, Math.max(1, unit * 0.2))
    }
    ctx.restore()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now, scale) {
    startTime = now
    seed = Math.floor(rand(0, 100000))
    unit = sceneUnit(w, h)
    clouds = Array.from({ length: CLOUDS }, (_, i) => buildCloud(i, w, h, scale))
    skyline = buildSkyline(w, h, scale)
    street = buildStreet(w, h, scale)
    puddles = buildPuddles(w, h)
    const size = unit * 22 * 7
    litLayer = offscreen(size, size, scale)[0]
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    drawSky(ctx, w, h)
    drawMoon(ctx, w, h)
    drawClouds(ctx, w, h, t)
    if (skyline) ctx.drawImage(skyline, 0, 0, w, h)
    if (street) ctx.drawImage(street, 0, 0, w, h)
    drawPuddles(ctx, w, t)
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="dark-hour-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.dark-hour-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  z-index: -1;
  pointer-events: none;
}
</style>
