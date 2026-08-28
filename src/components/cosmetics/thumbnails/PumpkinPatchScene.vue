<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { PumpkinPatchScene } from '@/types/api/items'
import { darken, lerpHex, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{ scene: PumpkinPatchScene }>()

type Pt = [number, number]

interface Pumpkin {
  x: number
  y: number
  r: number
  tilt: number
  face: number
}

const COUNT = 120
const HORIZON = 0.5
const MOON: Pt = [0.7, 0.24]
const MOON_R = 15
const LIT = 3

let seed = 0
let pumpkins: Pumpkin[] = []
let lit: Pumpkin[] = []
let base: HTMLCanvasElement | null = null
let slices: HTMLCanvasElement[] = []

function h01(n: number): number {
  return hash01(seed + n)
}

function noise(t: number, k: number): number {
  return 0.5 + 0.5 * Math.sin(t * 7.3 * k + 1.7) * Math.sin(t * 3.1 * k + 0.4)
}

function buildPumpkins(w: number, h: number, s: number): Pumpkin[] {
  const out: Pumpkin[] = []
  for (let i = 0; i < COUNT; i++) {
    const u = Math.pow(h01(i * 3), 1.1)
    const y = h * (HORIZON + 0.015 + u * 0.53)
    const r = s * (1.6 + u * 12.5) * (0.8 + h01(i * 5) * 0.4)
    out.push({ x: h01(i * 7) * (w + r * 2) - r, y, r, tilt: (h01(i * 11) - 0.5) * 0.3, face: -1 })
  }
  out.sort((a, b) => a.y - b.y)
  const clear = (p: Pumpkin, i: number) => out.slice(i + 1).every((q) => Math.hypot(q.x - p.x, q.y - p.y) > (p.r + q.r) * 0.8)
  const open = out.filter((p, i) => p.r > s * 6 && p.x > p.r && p.x < w - p.r && clear(p, i))
  const near = open.length >= LIT ? open : out.filter((p) => p.r > s * 6 && p.x > 0 && p.x < w)
  for (let k = 0; k < LIT && near.length; k++) {
    const p = near.splice(Math.floor(h01(k * 13) * near.length), 1)[0]
    if (p) p.face = k
  }
  return out
}

function drawSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, props.scene.skyTop)
  g.addColorStop(1, props.scene.skyBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function drawMoon(ctx: Ctx, w: number, h: number, s: number): void {
  const [mx, my] = [w * MOON[0], h * MOON[1]]
  const r = MOON_R * s
  const halo = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 4)
  halo.addColorStop(0, withAlpha(props.scene.moon, 0.2))
  halo.addColorStop(0.4, withAlpha(props.scene.moon, 0.06))
  halo.addColorStop(1, withAlpha(props.scene.moon, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = props.scene.moon
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha(darken(props.scene.moon, 0.25), 0.3)
  for (const [ox, oy, sr] of [[-0.3, -0.2, 0.28], [0.25, 0.1, 0.2], [-0.05, 0.42, 0.14]]) {
    ctx.beginPath()
    ctx.ellipse(mx + ox * r, my + oy * r, sr * r, sr * r * 0.85, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function branch(ctx: Ctx, x: number, y: number, ang: number, len: number, wdt: number, depth: number, k: number): void {
  const ex = x + Math.cos(ang) * len
  const ey = y + Math.sin(ang) * len
  ctx.lineWidth = Math.max(0.6, wdt)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + Math.cos(ang + 0.3) * len * 0.5, y + Math.sin(ang + 0.3) * len * 0.5, ex, ey)
  ctx.stroke()
  if (depth === 0) return
  const n = 2 + (h01(k * 17) < 0.5 ? 1 : 0)
  for (let i = 0; i < n; i++) {
    const spread = (h01(k * 19 + i * 7) - 0.5) * 1.5
    branch(ctx, ex, ey, ang + spread, len * (0.55 + h01(k * 23 + i) * 0.25), wdt * 0.62, depth - 1, k * 31 + i + 1)
  }
}

function drawTrees(ctx: Ctx, w: number, h: number, s: number): void {
  ctx.strokeStyle = darken(props.scene.ground, 0.4)
  ctx.lineCap = 'round'
  const trunks: [number, number, number][] = [[0.8, 82, 5], [0.06, 66, 5], [0.32, 40, 4], [0.5, 30, 4], [0.96, 48, 4], [0.62, 26, 3], [0.18, 24, 3]]
  trunks.forEach(([tx, len, depth], i) => {
    const x = w * tx
    const y = h * (HORIZON + 0.03)
    const top = y - len * s * 0.42
    ctx.lineWidth = s * (1 + len * 0.02)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + (0.5 - tx) * s * 3, (y + top) * 0.5, x + (0.5 - tx) * s * 8, top)
    ctx.stroke()
    branch(ctx, x + (0.5 - tx) * s * 8, top, -Math.PI / 2 + (0.5 - tx) * 0.7, len * s * 0.42, s * (0.8 + len * 0.016), depth, i * 101 + 1)
  })
}

function drawGround(ctx: Ctx, w: number, h: number, s: number): void {
  const g = ctx.createLinearGradient(0, h * HORIZON, 0, h)
  g.addColorStop(0, lerpHex(props.scene.ground, props.scene.skyBottom, 0.35))
  g.addColorStop(1, props.scene.ground)
  ctx.fillStyle = g
  ctx.fillRect(0, h * HORIZON, w, h * (1 - HORIZON))
  ctx.strokeStyle = withAlpha(darken(props.scene.ground, 0.5), 0.6)
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9
    const y = h * (HORIZON + u * u * 0.5)
    ctx.lineWidth = Math.max(0.5, s * 0.5 * u)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y + Math.sin(i * 2.1) * s * 2)
    ctx.stroke()
  }
}

function drawVine(ctx: Ctx, p: Pumpkin, k: number): void {
  const dir = h01(k * 29) < 0.5 ? -1 : 1
  ctx.strokeStyle = darken(props.scene.vine, 0.25)
  ctx.lineWidth = Math.max(0.5, p.r * 0.06)
  ctx.beginPath()
  ctx.moveTo(p.x, p.y + p.r * 0.6)
  ctx.quadraticCurveTo(p.x + dir * p.r * 1.2, p.y + p.r * 0.9, p.x + dir * p.r * 2.2, p.y + p.r * 0.55)
  ctx.stroke()
  ctx.fillStyle = withAlpha(darken(props.scene.vine, 0.15), 0.85)
  ctx.beginPath()
  ctx.ellipse(p.x + dir * p.r * 1.5, p.y + p.r * 0.78, p.r * 0.26, p.r * 0.13, dir * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

function drawPumpkin(ctx: Ctx, p: Pumpkin, w: number, h: number): void {
  const sc = props.scene
  const r = p.r
  const far = 1 - Math.min(1, (p.y / h - HORIZON) / 0.5)
  ctx.fillStyle = withAlpha('#000000', 0.45)
  ctx.beginPath()
  ctx.ellipse(p.x, p.y + r * 0.72, r * 1.1, r * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.tilt)
  ctx.fillStyle = p.face >= 0 ? sc.pumpkinLit : lerpHex(sc.pumpkin, sc.skyBottom, far * 0.55)
  ctx.beginPath()
  ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.clip()
  const moonSide = w * MOON[0] > p.x ? 1 : -1
  const g = ctx.createLinearGradient(-r * moonSide, 0, r * moonSide, 0)
  g.addColorStop(0, withAlpha(darken(sc.pumpkin, 0.5), 0.6))
  g.addColorStop(0.55, withAlpha(sc.pumpkin, 0))
  g.addColorStop(1, withAlpha(lighten(sc.pumpkin, 0.3), 0.45))
  ctx.fillStyle = g
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.strokeStyle = withAlpha(darken(sc.pumpkin, 0.55), 0.55)
  ctx.lineWidth = Math.max(0.5, r * 0.07)
  for (const f of [-0.62, -0.22, 0.22, 0.62]) {
    ctx.beginPath()
    ctx.ellipse(f * r * 0.55, 0, Math.abs(f) * r * 0.5 + r * 0.25, r * 0.8, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
  ctx.strokeStyle = darken(sc.vine, 0.3)
  ctx.lineWidth = Math.max(0.7, r * 0.13)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.74)
  ctx.quadraticCurveTo(r * 0.06, -r * 0.98, r * 0.2, -r * 1.02)
  ctx.stroke()
  ctx.restore()
}

function facePath(ctx: Ctx, p: Pumpkin): void {
  const r = p.r
  const k = p.face
  ctx.beginPath()
  if (k === 0) {
    ctx.moveTo(-r * 0.55, -r * 0.05)
    ctx.lineTo(-r * 0.15, -r * 0.05)
    ctx.lineTo(-r * 0.35, -r * 0.42)
    ctx.moveTo(r * 0.15, -r * 0.05)
    ctx.lineTo(r * 0.55, -r * 0.05)
    ctx.lineTo(r * 0.35, -r * 0.42)
  } else {
    ctx.moveTo(-r * 0.5, -r * 0.35)
    ctx.lineTo(-r * 0.15, -r * 0.1)
    ctx.lineTo(-r * 0.55, -r * 0.05)
    ctx.moveTo(r * 0.5, -r * 0.35)
    ctx.lineTo(r * 0.15, -r * 0.1)
    ctx.lineTo(r * 0.55, -r * 0.05)
  }
  ctx.moveTo(-r * 0.6, r * 0.2)
  const teeth = k === 2 ? 3 : 5
  for (let i = 0; i <= teeth; i++) {
    const u = i / teeth
    ctx.lineTo(-r * 0.6 + u * r * 1.2, r * (0.2 + (i % 2 ? 0.28 : 0.12)))
  }
  ctx.lineTo(r * 0.5, r * 0.5)
  ctx.lineTo(-r * 0.5, r * 0.5)
  ctx.closePath()
}

function drawFace(ctx: Ctx, p: Pumpkin, t: number): void {
  const flick = 0.55 + noise(t + p.face * 3, 2.1) * 0.45
  const glow = ctx.createRadialGradient(p.x, p.y, p.r * 0.3, p.x, p.y, p.r * 3)
  glow.addColorStop(0, withAlpha(props.scene.candle, 0.28 * flick))
  glow.addColorStop(1, withAlpha(props.scene.candle, 0))
  ctx.fillStyle = glow
  ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6)
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.tilt)
  ctx.fillStyle = withAlpha(props.scene.candle, 0.7 + flick * 0.3)
  facePath(ctx, p)
  ctx.fill()
  ctx.restore()
}

function drawMist(ctx: Ctx, w: number, h: number, s: number, t: number): void {
  for (let i = 0; i < 3; i++) {
    const y = h * (HORIZON + 0.04 + i * 0.07)
    const x = ((t * s * (3 + i * 2) + i * w * 0.4) % (w * 1.5)) - w * 0.25
    const g = ctx.createRadialGradient(x, y, 0, x, y, w * 0.45)
    g.addColorStop(0, withAlpha(props.scene.moon, 0.09))
    g.addColorStop(1, withAlpha(props.scene.moon, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, y - s * 12, w, s * 24)
  }
}

function layer(w: number, h: number, scale: number): [HTMLCanvasElement, Ctx | null] {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * scale)
  c.height = Math.ceil(h * scale)
  const ctx = c.getContext('2d')
  ctx?.setTransform(scale, 0, 0, scale, 0, 0)
  return [c, ctx]
}

function drawRange(ctx: Ctx, from: number, to: number, w: number, h: number, s: number): void {
  for (let k = from; k < to; k++) {
    const p = pumpkins[k]
    if (!p) continue
    if (p.r > s * 5 && h01(k * 37) < 0.3) drawVine(ctx, p, k)
    drawPumpkin(ctx, p, w, h)
  }
}

function buildBase(w: number, h: number, s: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = layer(w, h, scale)
  if (!ctx) return c
  drawSky(ctx, w, h)
  drawMoon(ctx, w, h, s)
  drawGround(ctx, w, h, s)
  drawTrees(ctx, w, h, s)
  drawRange(ctx, 0, pumpkins.length, w, h, s)
  return c
}

function buildSlices(w: number, h: number, s: number, scale: number): HTMLCanvasElement[] {
  const idx = pumpkins.map((p, k) => (p.face >= 0 ? k : -1)).filter((k) => k >= 0)
  return idx.map((k, i) => {
    const [c, ctx] = layer(w, h, scale)
    if (ctx) drawRange(ctx, k + 1, idx[i + 1] !== undefined ? (idx[i + 1] ?? 0) + 1 : pumpkins.length, w, h, s)
    return c
  })
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _now, scale) {
    seed = Math.floor(rand(0, 100000))
    const s = Math.min(w, h) / 110
    pumpkins = buildPumpkins(w, h, s)
    lit = pumpkins.filter((p) => p.face >= 0)
    base = buildBase(w, h, s, scale)
    slices = buildSlices(w, h, s, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 3 : now / 1000
    const s = Math.min(w, h) / 110
    ctx.clearRect(0, 0, w, h)
    if (base) ctx.drawImage(base, 0, 0, w, h)
    drawMist(ctx, w, h, s, t)
    lit.forEach((p, i) => {
      drawFace(ctx, p, t)
      const slice = slices[i]
      if (slice) ctx.drawImage(slice, 0, 0, w, h)
    })
  },
})
</script>

<template>
  <canvas ref="canvas" class="pumpkin-patch-scene" aria-hidden="true" />
</template>

<style scoped>
.pumpkin-patch-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
