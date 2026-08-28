<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { type Ctx, flickerNoise, sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { darken, lerpHex } from '@/utils/color'
import { drawFallingLeaves, seedFallingLeaves, type FallingLeaf } from '@/utils/cosmetics/fallingLeaves'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import type { HarvestBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: HarvestBackdropConfig
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

interface CornLayer {
  img: HTMLCanvasElement
  h: number
  phase: number
  amp: number
}

const STATIC_T = 5
const HORIZON = 0.7
const MOON_X = 0.68
const MOON_Y = 0.6
const MOON_R = 34
const LEAVES = 16
const CLOUDS = 6
const PUFFS = 70
const CROW_PERIOD_S = 13
const CROW_CROSS_S = 4.5

let startTime = 0
let unit = 1
let seed = 0
let sky: HTMLCanvasElement | null = null
let clouds: Cloud[] = []
let lanterns: [number, number][] = []
let land: HTMLCanvasElement | null = null
let corn: CornLayer[] = []
let leaves: FallingLeaf[] = []
let nextBlink = 8
let blinkAt = -1

function h01(n: number): number {
  return hash01(seed + n)
}

function offscreen(w: number, h: number, scale: number): [HTMLCanvasElement, Ctx | null] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const ctx = c.getContext('2d')
  ctx?.setTransform(scale, 0, 0, scale, 0, 0)
  return [c, ctx]
}

function drawSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h * HORIZON)
  const cs = props.config.skyColors
  cs.forEach((c, i) => g.addColorStop(i / Math.max(1, cs.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h * HORIZON)
  if (!props.config.stars) return
  for (let i = 0; i < 90; i++) {
    const x = h01(i * 3 + 7) * w
    const y = h01(i * 5 + 9) * h * HORIZON * 0.8
    const r = unit * (0.15 + h01(i * 7 + 11) * 0.4)
    ctx.fillStyle = withAlpha(props.config.flareColor, 0.25 + h01(i * 11 + 13) * 0.5)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function wave(x: number, sd: number): number {
  return Math.sin(x * 1.7 + sd * 6.28) * 0.5 + Math.sin(x * 3.9 + sd * 12.9) * 0.3 + Math.sin(x * 8.3 + sd * 3.1) * 0.2
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
  const sd = h01(i * 31)
  const thick = ch * 0.34
  for (let k = 0; k <= PUFFS; k++) {
    const u = k / PUFFS
    const taper = Math.pow(Math.sin(u * Math.PI), 0.45)
    const torn = 0.55 + 0.45 * wave(u * 5 + i, sd + 0.3)
    const x = cw * 0.04 + u * cw * 0.92
    const y = ch * 0.5 + wave(u * 2.4, sd) * thick * 0.8 + (h01(i * 71 + k) - 0.5) * thick * 0.6
    const rx = (cw / PUFFS) * (2.6 + h01(i * 97 + k) * 2.4)
    const ry = thick * (0.4 + h01(i * 53 + k) * 0.6) * taper
    puff(ctx, x, y, rx, ry, 0.45 * torn * taper)
  }
  return c
}

function buildCloud(i: number, w: number, h: number, scale: number): Cloud {
  const cw = w * (0.35 + h01(i * 7) * 0.45)
  const ch = unit * (16 + h01(i * 11) * 18)
  const mask = cloudMask(i, cw, ch, scale)
  const top = props.config.skyColors[0] ?? props.config.farmColor
  return {
    dark: tinted(mask, lerpHex(top, props.config.farmColor, 0.45)),
    lit: tinted(mask, lerpHex(props.config.moonColor, props.config.flareColor, 0.4)),
    w: cw,
    h: ch,
    y: h * (0.04 + (i / CLOUDS) * 0.48) - ch * 0.5,
    x0: h01(i * 17) * (w + cw),
    speed: (w / 220) * (0.5 + h01(i * 19) * 0.9),
  }
}

function cloudX(c: Cloud, w: number, t: number): number {
  const span = w + c.w
  return ((((c.x0 + t * c.speed) % span) + span) % span) - c.w
}

function drawClouds(ctx: Ctx, w: number, h: number, t: number): void {
  for (const c of clouds) {
    const x = cloudX(c, w, t)
    ctx.globalAlpha = 0.8
    ctx.drawImage(c.dark, x, c.y, c.w, c.h)
    const near = 1 - Math.min(1, Math.abs(c.y + c.h * 0.5 - h * MOON_Y) / (h * 0.35))
    ctx.globalAlpha = 0.35 * near
    ctx.drawImage(c.lit, x, c.y + c.h * 0.18, c.w, c.h * 0.7)
  }
  ctx.globalAlpha = 1
}

function drawHaze(ctx: Ctx, w: number, h: number): void {
  const mx = w * MOON_X
  const my = h * MOON_Y
  const g = ctx.createRadialGradient(mx, my, MOON_R * unit, mx, my, MOON_R * unit * 4.5)
  g.addColorStop(0, withAlpha(props.config.moonColor, 0.3))
  g.addColorStop(0.5, withAlpha(props.config.moonColor, 0.08))
  g.addColorStop(1, withAlpha(props.config.moonColor, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h * HORIZON)
}

function moonPath(ctx: Ctx, w: number, h: number): void {
  ctx.beginPath()
  ctx.ellipse(w * MOON_X, h * MOON_Y, MOON_R * unit, MOON_R * unit * 0.9, 0, 0, Math.PI * 2)
}

function drawMoon(ctx: Ctx, w: number, h: number): void {
  const mx = w * MOON_X
  const my = h * MOON_Y
  const r = MOON_R * unit
  ctx.fillStyle = props.config.moonColor
  moonPath(ctx, w, h)
  ctx.fill()
  ctx.save()
  moonPath(ctx, w, h)
  ctx.clip()
  ctx.fillStyle = withAlpha(props.config.moonShade, 0.22)
  for (const [ox, oy, sr] of [[-0.55, -0.35, 0.2], [0.5, -0.5, 0.16], [0.62, 0.3, 0.14], [-0.2, 0.62, 0.18], [0.15, -0.72, 0.09]]) {
    ctx.beginPath()
    ctx.ellipse(mx + ox * r, my + oy * r, sr * r, sr * r * 0.85, 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  const limb = ctx.createRadialGradient(mx - r * 0.2, my - r * 0.25, r * 0.4, mx, my, r)
  limb.addColorStop(0, withAlpha(props.config.moonShade, 0))
  limb.addColorStop(1, withAlpha(props.config.moonShade, 0.4))
  ctx.fillStyle = limb
  ctx.fillRect(mx - r, my - r, r * 2, r * 2)
  ctx.restore()
}

function carvedFace(ctx: Ctx, mx: number, my: number, r: number): void {
  ctx.beginPath()
  for (const sgn of [-1, 1]) {
    ctx.moveTo(mx + sgn * r * 0.1, my - r * 0.04)
    ctx.lineTo(mx + sgn * r * 0.2, my - r * 0.2)
    ctx.lineTo(mx + sgn * r * 0.54, my - r * 0.34)
    ctx.lineTo(mx + sgn * r * 0.5, my - r * 0.12)
    ctx.lineTo(mx + sgn * r * 0.34, my - r * 0.02)
    ctx.closePath()
  }
  ctx.moveTo(mx, my + r * 0.02)
  ctx.lineTo(mx + r * 0.08, my + r * 0.16)
  ctx.lineTo(mx - r * 0.08, my + r * 0.16)
  ctx.closePath()
  const top = [[-0.62, 0.26], [-0.46, 0.2], [-0.38, 0.32], [-0.24, 0.2], [-0.12, 0.34], [0.02, 0.2], [0.14, 0.32], [0.28, 0.2], [0.4, 0.3], [0.52, 0.2], [0.64, 0.24]]
  const bottom = [[0.56, 0.4], [0.42, 0.62], [0.3, 0.48], [0.14, 0.66], [-0.02, 0.5], [-0.18, 0.66], [-0.32, 0.5], [-0.46, 0.58], [-0.58, 0.4]]
  const pts = top.concat(bottom)
  pts.forEach(([px, py], i) => {
    const x = mx + (px ?? 0) * r
    const y = my + (py ?? 0) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
}

function drawCarving(ctx: Ctx, w: number, h: number): void {
  if (!props.config.face) return
  ctx.fillStyle = withAlpha(props.config.moonShade, 0.85)
  carvedFace(ctx, w * MOON_X, h * MOON_Y, MOON_R * unit)
  ctx.fill()
}

function drawFlare(ctx: Ctx, w: number, h: number, flare: number): void {
  if (!props.config.face || flare <= 0) return
  const mx = w * MOON_X
  const my = h * MOON_Y
  const r = MOON_R * unit
  ctx.save()
  moonPath(ctx, w, h)
  ctx.clip()
  {
    const g = ctx.createRadialGradient(mx, my + r * 0.1, r * 0.2, mx, my + r * 0.1, r * 1.1)
    g.addColorStop(0, withAlpha(props.config.flareColor, 0.35 * flare))
    g.addColorStop(1, withAlpha(props.config.flareColor, 0))
    ctx.fillStyle = g
    ctx.fillRect(mx - r, my - r, r * 2, r * 2)
  }
  ctx.fillStyle = withAlpha(props.config.flareColor, 0.9 * flare)
  carvedFace(ctx, mx, my, r)
  ctx.fill()
  ctx.restore()
}

function hill(ctx: Ctx, w: number, h: number, base: number, amp: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += unit * 2) {
    const u = x / w
    const y = base - amp * (0.5 + 0.5 * Math.sin(u * 5.1 + s) * Math.sin(u * 2.3 + s * 2))
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
}

function drawBarn(ctx: Ctx, x: number, base: number, color: string): void {
  const u = unit
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, base)
  ctx.lineTo(x, base - u * 10)
  ctx.lineTo(x + u * 3, base - u * 14)
  ctx.lineTo(x + u * 9, base - u * 17)
  ctx.lineTo(x + u * 15, base - u * 14)
  ctx.lineTo(x + u * 18, base - u * 10)
  ctx.lineTo(x + u * 18, base)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(x + u * 21, base - u * 22, u * 6, u * 22)
  ctx.beginPath()
  ctx.arc(x + u * 24, base - u * 22, u * 3, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.35)
  ctx.fillRect(x + u * 7.5, base - u * 6, u * 3, u * 4)
}

function drawHouse(ctx: Ctx, x: number, base: number, color: string): void {
  const u = unit
  ctx.fillStyle = color
  ctx.fillRect(x, base - u * 9, u * 14, u * 9)
  ctx.beginPath()
  ctx.moveTo(x - u, base - u * 9)
  ctx.lineTo(x + u * 7, base - u * 15)
  ctx.lineTo(x + u * 15, base - u * 9)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(x + u * 10, base - u * 14.5, u * 1.6, u * 4)
  ctx.fillRect(x - u * 1, base - u * 3.2, u * 16, u * 0.4)
  ctx.fillStyle = withAlpha(props.config.flareColor, 0.55)
  ctx.fillRect(x + u * 3, base - u * 6.5, u * 2.2, u * 2.6)
  ctx.fillRect(x + u * 9, base - u * 6.5, u * 2.2, u * 2.6)
}

function drawWaterTower(ctx: Ctx, x: number, base: number, color: string): void {
  const u = unit
  ctx.fillStyle = color
  for (const dx of [-3, 3]) ctx.fillRect(x + dx * u - u * 0.3, base - u * 16, u * 0.6, u * 16)
  ctx.fillRect(x - u * 3.5, base - u * 9, u * 7, u * 0.4)
  ctx.fillRect(x - u * 3.5, base - u * 4.5, u * 7, u * 0.4)
  ctx.beginPath()
  ctx.moveTo(x - u * 4.5, base - u * 16)
  ctx.lineTo(x + u * 4.5, base - u * 16)
  ctx.lineTo(x + u * 4, base - u * 23)
  ctx.lineTo(x - u * 4, base - u * 23)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x - u * 5, base - u * 23)
  ctx.lineTo(x, base - u * 26.5)
  ctx.lineTo(x + u * 5, base - u * 23)
  ctx.closePath()
  ctx.fill()
}

function drawLanternPost(ctx: Ctx, x: number, base: number, color: string): void {
  const u = unit
  ctx.fillStyle = color
  ctx.fillRect(x - u * 0.35, base - u * 11, u * 0.7, u * 11)
  ctx.fillRect(x - u * 0.35, base - u * 11, u * 3.2, u * 0.5)
  ctx.fillRect(x + u * 2.5, base - u * 10.6, u * 0.25, u * 1.2)
  ctx.fillRect(x + u * 1.7, base - u * 9.5, u * 1.9, u * 0.5)
  ctx.fillRect(x + u * 1.5, base - u * 9, u * 2.3, u * 2.6)
  ctx.fillRect(x + u * 1.7, base - u * 6.4, u * 1.9, u * 0.4)
  ctx.fillStyle = withAlpha(props.config.flareColor, 0.85)
  ctx.fillRect(x + u * 1.9, base - u * 8.6, u * 1.5, u * 1.9)
}

function drawLanternGlow(ctx: Ctx, x: number, y: number, t: number, k: number): void {
  const flick = 0.75 + flickerNoise(t + k * 3.1, 1.4) * 0.25
  const r = unit * 9 * flick
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, withAlpha(props.config.flareColor, 0.4 * flick))
  g.addColorStop(0.35, withAlpha(props.config.flareColor, 0.12 * flick))
  g.addColorStop(1, withAlpha(props.config.flareColor, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function drawWindmill(ctx: Ctx, x: number, base: number, color: string, angle: number): void {
  const u = unit
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - u * 3, base)
  ctx.lineTo(x - u * 0.8, base - u * 30)
  ctx.lineTo(x + u * 0.8, base - u * 30)
  ctx.lineTo(x + u * 3, base)
  ctx.closePath()
  ctx.fill()
  for (let i = 1; i < 6; i++) ctx.fillRect(x - u * (3 - i * 0.4), base - u * i * 5, u * (6 - i * 0.8), u * 0.35)
  ctx.save()
  ctx.translate(x, base - u * 30)
  ctx.rotate(angle)
  ctx.strokeStyle = color
  ctx.lineWidth = u * 0.5
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -u * 11)
    ctx.stroke()
    ctx.fillRect(-u * 1.6, -u * 11, u * 1.6, u * 8)
  }
  ctx.restore()
}

function drawFence(ctx: Ctx, w: number, base: number, color: string): void {
  ctx.fillStyle = color
  for (let x = 0; x < w; x += unit * 4.5) ctx.fillRect(x, base - unit * 3.2, unit * 0.5, unit * 3.4)
  ctx.fillRect(0, base - unit * 2.6, w, unit * 0.3)
  ctx.fillRect(0, base - unit * 1.4, w, unit * 0.3)
  for (const px of [0.42, 0.9]) {
    ctx.fillRect(w * px, base - unit * 16, unit * 0.5, unit * 16)
    ctx.fillRect(w * px - unit * 2.5, base - unit * 15, unit * 5.5, unit * 0.4)
  }
}

function drawScarecrow(ctx: Ctx, x: number, base: number, color: string): void {
  const u = unit
  ctx.fillStyle = withAlpha('#000000', 0.35)
  ctx.beginPath()
  ctx.ellipse(x, base, u * 4, u * 1.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillRect(x - u * 0.6, base - u * 22, u * 1.2, u * 22.5)
  ctx.fillRect(x - u * 2.2, base - u * 3.2, u * 4.4, u * 0.7)
  ctx.fillRect(x - u * 8, base - u * 16.5, u * 16, u * 0.8)
  ctx.beginPath()
  ctx.moveTo(x - u * 3.5, base - u * 16)
  ctx.lineTo(x + u * 3.5, base - u * 16)
  ctx.lineTo(x + u * 4.6, base - u * 7)
  ctx.lineTo(x + u * 3.4, base - u * 5.4)
  ctx.lineTo(x + u * 2, base - u * 6.6)
  ctx.lineTo(x + u * 0.6, base - u * 5)
  ctx.lineTo(x - u * 1, base - u * 6.4)
  ctx.lineTo(x - u * 2.6, base - u * 5.2)
  ctx.lineTo(x - u * 4.6, base - u * 7)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = u * 0.3
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(x - u * 3 + i * u * 1.2, base - u * 6)
    ctx.lineTo(x - u * 3.4 + i * u * 1.3 + (i % 2 ? u * 0.5 : -u * 0.4), base - u * 3.6)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(x, base - u * 19.5, u * 2.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x - u * 4.5, base - u * 21.6, u * 9, u * 0.7)
  ctx.fillRect(x - u * 2.4, base - u * 25, u * 4.8, u * 3.6)
  ctx.strokeStyle = color
  ctx.lineWidth = u * 0.3
  for (const sx of [-8, 8]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(x + u * sx, base - u * 16.2)
      ctx.lineTo(x + u * (sx + i * 0.9 + (sx < 0 ? -1.6 : 1.6)), base - u * (16.2 - 1.8 - Math.abs(i) * 0.4))
      ctx.stroke()
    }
  }
}

function cornStalk(ctx: Ctx, x: number, base: number, hgt: number, k: number): void {
  const u = unit
  ctx.lineWidth = u * 0.8
  ctx.beginPath()
  ctx.moveTo(x, base)
  ctx.lineTo(x + (h01(k * 3) - 0.5) * u, base - hgt)
  ctx.stroke()
  for (let i = 0; i < 3; i++) {
    const ly = base - hgt * (0.3 + i * 0.22)
    const dir = i % 2 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(x, ly)
    ctx.quadraticCurveTo(x + dir * u * 2.2, ly - u * 1.2, x + dir * u * (3.2 + h01(k * 7 + i)), ly + u * 1.4)
    ctx.stroke()
  }
  ctx.lineWidth = u * 0.2
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(x, base - hgt)
    ctx.lineTo(x + i * u * 0.9, base - hgt - u * (2.2 - Math.abs(i) * 0.4))
    ctx.stroke()
  }
}

function buildCorn(w: number, h: number, scale: number, li: number): CornLayer {
  const hgt = unit * (30 + li * 12)
  const lh = hgt + unit * 8
  const [c, ctx] = offscreen(w, lh, scale)
  const color = lerpHex(props.config.fieldColor, props.config.skyColors[2] ?? props.config.fieldColor, 0.12 + (2 - li) * 0.2)
  if (ctx) {
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    let k = li * 5000
    for (let x = -unit * 2; x < w + unit * 2; x += unit * (2.4 + h01(k * 13) * 1.4)) {
      cornStalk(ctx, x, lh, hgt * (0.75 + h01(k * 17) * 0.35), k)
      k++
    }
    if (li === 2) {
      for (const [ex, es] of [[0.6, 1.15], [0.86, 1.3]]) {
        ctx.save()
        ctx.translate(w * (ex ?? 0), lh - unit * 1.2)
        ctx.scale(es ?? 1, es ?? 1)
        drawScarecrow(ctx, 0, 0, darken(color, 0.45))
        ctx.restore()
        for (let i = 0; i < 4; i++) cornStalk(ctx, w * (ex ?? 0) + (i - 1.5) * unit * 3.6, lh, hgt * 0.5, k + 300 + i)
      }
      const sx = w * 0.3
      ctx.save()
      ctx.translate(sx, lh - unit * 1.2)
      ctx.scale(1.6, 1.6)
      drawScarecrow(ctx, 0, 0, darken(color, 0.5))
      ctx.restore()
      ctx.strokeStyle = color
      for (let i = 0; i < 7; i++) {
        const fx = sx + (i - 3) * unit * 3.4 + (h01(k * 7 + i) - 0.5) * unit * 2
        cornStalk(ctx, fx, lh, hgt * (0.5 + h01(k * 9 + i) * 0.25), k + i)
      }
    }
  }
  return { img: c, h: lh, phase: h01(li * 91) * 6.28, amp: 0.03 + li * 0.012 }
}

function buildSky(w: number, h: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = offscreen(w, h, scale)
  if (!ctx) return c
  drawSky(ctx, w, h)
  drawHaze(ctx, w, h)
  drawMoon(ctx, w, h)
  drawCarving(ctx, w, h)
  return c
}

function buildLand(w: number, h: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = offscreen(w, h, scale)
  if (!ctx) return c
  const base = h * HORIZON
  const far = lerpHex(props.config.farmColor, props.config.skyColors[0] ?? props.config.farmColor, 0.5)
  hill(ctx, w, h, base - unit * 4, unit * 16, 0.3, far)
  hill(ctx, w, h, base + unit * 1, unit * 9, 2.1, lerpHex(props.config.farmColor, props.config.skyColors[0] ?? props.config.farmColor, 0.25))
  ctx.fillStyle = props.config.farmColor
  ctx.fillRect(0, base, w, h - base)
  drawBarn(ctx, w * 0.12, base + unit * 0.5, props.config.farmColor)
  drawHouse(ctx, w * 0.36, base + unit * 0.8, props.config.farmColor)
  drawWaterTower(ctx, w * 0.84, base + unit * 0.6, props.config.farmColor)
  drawFence(ctx, w, base + unit * 2, props.config.farmColor)
  lanterns = [0.05, 0.27, 0.5, 0.71, 0.95].map((lx, i) => [w * lx, base + unit * (3 + (i % 2) * 2)])
  for (const [lx, ly] of lanterns) drawLanternPost(ctx, lx, ly, props.config.farmColor)
  return c
}

function crowWing(ctx: Ctx, f: number): void {
  ctx.moveTo(0, -0.1)
  ctx.quadraticCurveTo(-0.45, -0.35 - 0.4 * f, -1.05, -0.15 - 0.75 * f)
  ctx.quadraticCurveTo(-0.7, 0.05 - 0.35 * f, -0.35, 0.12 - 0.1 * f)
  ctx.lineTo(0, 0.18)
  ctx.closePath()
}

function drawCrow(ctx: Ctx, x: number, y: number, s: number, flap: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s * 1.6, s * 1.6)
  ctx.fillStyle = props.config.crowColor
  ctx.beginPath()
  crowWing(ctx, flap)
  ctx.fill()
  ctx.save()
  ctx.scale(-1, 1)
  ctx.beginPath()
  crowWing(ctx, flap)
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(0.05, 0.05, 0.42, 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-0.35, 0.02)
  ctx.lineTo(-0.7, -0.08)
  ctx.lineTo(-0.7, 0.16)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0.42, 0)
  ctx.lineTo(0.68, -0.02)
  ctx.lineTo(0.42, 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawCrows(ctx: Ctx, w: number, h: number, t: number): void {
  const n = Math.floor(t / CROW_PERIOD_S)
  const phase = t - n * CROW_PERIOD_S
  if (phase >= CROW_CROSS_S) return
  const u = phase / CROW_CROSS_S
  const count = 3 + Math.floor(h01(n * 3) * 3)
  const maxLag = (count - 1) * 0.045
  for (let i = 0; i < count; i++) {
    const lag = i * 0.045
    const x = -unit * 8 + (u * (1 + maxLag) - lag) * (w + unit * 16)
    const y = h * (MOON_Y - 0.12) + Math.abs(i - (count - 1) / 2) * unit * 5 + Math.sin(t * 1.4 + i) * unit * 2
    drawCrow(ctx, x, y, unit * (1.6 + h01(n * 7 + i) * 0.6), Math.sin(t * 20 + i * 1.3))
  }
}

function drawCorn(ctx: Ctx, w: number, h: number, t: number): void {
  for (const layer of corn) {
    const skew = Math.sin(t * 0.7 + layer.phase) * layer.amp
    ctx.save()
    ctx.translate(0, h - layer.h)
    ctx.transform(1, 0, skew, 1, -skew * layer.h, 0)
    ctx.drawImage(layer.img, 0, 0, w, layer.h)
    ctx.restore()
  }
}

function flareLevel(t: number): number {
  if (blinkAt < 0 && t >= nextBlink) blinkAt = t
  if (blinkAt < 0) return 0
  const u = (t - blinkAt) / 1.4
  if (u >= 1) {
    blinkAt = -1
    nextBlink = t + rand(12, 20)
    return 0
  }
  return u < 0.25 ? u / 0.25 : u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now, scale) {
    startTime = now
    seed = Math.floor(rand(0, 100000))
    unit = sceneUnit(w, h)
    sky = buildSky(w, h, scale)
    clouds = Array.from({ length: CLOUDS }, (_, i) => buildCloud(i, w, h, scale))
    land = buildLand(w, h, scale)
    corn = [0, 1, 2].map((li) => buildCorn(w, h, scale, li))
    leaves = seedFallingLeaves({ count: LEAVES, colors: props.config.leafColors, unit, w, h, seed: h01 })
    nextBlink = rand(6, 12)
    blinkAt = -1
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    if (sky) ctx.drawImage(sky, 0, 0, w, h)
    drawFlare(ctx, w, h, reduced ? 0 : flareLevel(t))
    drawClouds(ctx, w, h, t)
    if (!reduced) drawCrows(ctx, w, h, t)
    if (land) ctx.drawImage(land, 0, 0, w, h)
    lanterns.forEach(([lx, ly], k) => drawLanternGlow(ctx, lx + unit * 2.65, ly - unit * 7.7, t, k))
    const wm = lerpHex(props.config.farmColor, props.config.skyColors[0] ?? props.config.farmColor, 0.1)
    drawWindmill(ctx, w * 0.58, h * HORIZON + unit * 1.5, wm, props.config.windmill ? t * 0.5 : 0.4)
    drawCorn(ctx, w, h, t)
    if (!reduced) drawFallingLeaves(ctx, leaves, w, h, unit, t)
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="harvest-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.harvest-backdrop {
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
