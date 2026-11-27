<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { useStackPointer } from '@/composables/useStackPointer'
import type { BorderOverlayHost, BorderPondOverlaySpec } from '@/types/cosmetics/border'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { enterUnitSpace, frameDelta, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { clamp01, smoothstep01 } from '@/utils/math'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<BorderOverlayHost & { overlay: BorderPondOverlaySpec }>()

interface Drop {
  x: number
  y: number
  at: number
}

interface Pad {
  angle: number
  dist: number
  r: number
  notch: number
  flower: number
}

const MARGIN = 20
const TAU = Math.PI * 2
const POOL = { x: 50, y: 50, r: 38 }
const DEEP = '#06203a'
const COINS_MAX = 6
const COIN = { fallS: 0.55, sinkS: 0.9, drop: 16, r: 2.4 }
const RIPPLE = { s: 4.6, reach: 58, rings: 3, gap: 0.5, push: 1.6, width: 5 }
const IDLE_EVERY_S = 7
const PADS: Pad[] = [
  { angle: 2.45, dist: 27, r: 8.6, notch: 0.6, flower: 0.6 },
  { angle: 2.02, dist: 31.5, r: 5.4, notch: 3.9, flower: 0 },
  { angle: 2.97, dist: 31.5, r: 4.8, notch: 5.2, flower: 0 },
  { angle: -0.78, dist: 29, r: 6.6, notch: 2.5, flower: 0.5 },
  { angle: -0.28, dist: 32.5, r: 4, notch: 1.2, flower: 0 },
]

let coins: Drop[] = []
let ripples: Drop[] = []
let clock = 0
let last = 0
let idleLap = -1

function front(drop: Drop, k: number): { radius: number; fade: number } | null {
  const u = (clock - drop.at - k * RIPPLE.gap) / RIPPLE.s
  if (u <= 0 || u >= 1) return null
  return { radius: RIPPLE.reach * (1 - (1 - u) * (1 - u)), fade: (1 - u) * (1 - u) }
}

function drawRipple(ctx: Ctx, drop: Drop): void {
  for (let k = 0; k < RIPPLE.rings; k++) {
    const f = front(drop, k)
    if (!f) continue
    ctx.lineWidth = 1.5
    ctx.strokeStyle = withAlpha(DEEP, 0.34 * f.fade)
    ctx.beginPath()
    ctx.arc(drop.x, drop.y, f.radius + 1.3, 0, TAU)
    ctx.stroke()
    ctx.lineWidth = 1.1
    ctx.strokeStyle = withAlpha(props.overlay.glint, 0.6 * f.fade)
    ctx.beginPath()
    ctx.arc(drop.x, drop.y, f.radius, 0, TAU)
    ctx.stroke()
  }
}

function pushed(x: number, y: number): { x: number; y: number } {
  let dx = 0
  let dy = 0
  for (const drop of ripples) {
    const d = Math.hypot(x - drop.x, y - drop.y) || 1
    for (let k = 0; k < RIPPLE.rings; k++) {
      const f = front(drop, k)
      if (!f) continue
      const near = clamp01(1 - Math.abs(d - f.radius) / RIPPLE.width)
      const lift = RIPPLE.push * f.fade * near * near
      dx += ((x - drop.x) / d) * lift
      dy += ((y - drop.y) / d) * lift
    }
  }
  return { x: x + dx, y: y + dy }
}

function drawCaustics(ctx: Ctx): void {
  ctx.strokeStyle = withAlpha(props.overlay.glint, 0.07)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  for (let k = 0; k < 5; k++) {
    ctx.beginPath()
    for (let s = 0; s <= 16; s++) {
      const x = POOL.x - POOL.r + (POOL.r * 2 * s) / 16
      const y = POOL.y + (k - 2) * 15 + Math.sin(x * 0.11 + clock * 0.5 + k * 1.9) * 3.2 + Math.sin(x * 0.05 - clock * 0.3 + k) * 2
      if (s) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
  }
}

function drawWater(ctx: Ctx): void {
  const g = ctx.createRadialGradient(POOL.x, POOL.y, POOL.r * 0.35, POOL.x, POOL.y, POOL.r)
  g.addColorStop(0, withAlpha(props.overlay.water, 0.04))
  g.addColorStop(0.65, withAlpha(props.overlay.water, 0.14))
  g.addColorStop(1, withAlpha(props.overlay.water, 0.46))
  ctx.fillStyle = g
  ctx.fillRect(POOL.x - POOL.r, POOL.y - POOL.r, POOL.r * 2, POOL.r * 2)
}

function drawFlower(ctx: Ctx, size: number): void {
  const o = props.overlay
  for (const [count, reach, tint] of [[8, 1, o.flower], [6, 0.66, o.glint]] as const) {
    ctx.fillStyle = tint
    ctx.globalAlpha = tint === o.glint ? 0.55 : 1
    for (let p = 0; p < count; p++) {
      ctx.save()
      ctx.rotate((p / count) * TAU + reach)
      ctx.beginPath()
      ctx.ellipse(size * reach * 0.55, 0, size * reach * 0.55, size * reach * 0.24, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = o.flowerCore
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.2, 0, TAU)
  ctx.fill()
}

function drawPad(ctx: Ctx, pad: Pad, i: number, still: boolean): void {
  const o = props.overlay
  const bob = still ? 0 : 1
  const home = {
    x: POOL.x + Math.cos(pad.angle) * pad.dist + Math.sin(clock * 0.5 + i * 1.7) * 0.5 * bob,
    y: POOL.y + Math.sin(pad.angle) * pad.dist + Math.cos(clock * 0.4 + i * 2.3) * 0.5 * bob,
  }
  const at = pushed(home.x, home.y)
  ctx.save()
  ctx.translate(at.x, at.y)
  ctx.rotate(pad.notch + Math.sin(clock * 0.3 + i) * 0.07 * bob + (at.x - home.x) * 0.08)
  ctx.fillStyle = o.pad
  ctx.strokeStyle = o.padShade
  ctx.lineWidth = 0.6
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, pad.r, 0.26, TAU - 0.26)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  for (let v = 1; v < 6; v++) {
    const a = 0.26 + ((TAU - 0.52) * v) / 6
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * pad.r * 0.82, Math.sin(a) * pad.r * 0.82)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
  if (pad.flower) {
    ctx.translate(-pad.r * 0.3, 0)
    drawFlower(ctx, pad.r * pad.flower)
  }
  ctx.restore()
}

function drawCoin(ctx: Ctx, drop: Drop, falling: boolean): void {
  const age = clock - drop.at
  const fall = clamp01(age / COIN.fallS)
  if (falling !== fall < 1) return
  const sunk = smoothstep01((age - COIN.fallS) / COIN.sinkS)
  const flip = fall < 1 ? Math.abs(Math.cos(age * 16)) : 1
  const r = COIN.r * (1 - 0.22 * sunk)
  ctx.globalAlpha = smoothstep01(age / 0.15) * (1 - 0.4 * sunk)
  ctx.fillStyle = props.overlay.coin
  ctx.beginPath()
  ctx.ellipse(drop.x, drop.y - (1 - fall * fall) * COIN.drop, r, Math.max(0.4, r * 0.8 * flip), 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
}

function step(): void {
  const press = pointer.takePress()
  if (press) {
    const x = 50 + press.x * 100
    const y = 50 + press.y * 100
    if (Math.hypot(x - POOL.x, y - POOL.y) < POOL.r - 3) {
      coins.push({ x, y, at: clock })
      ripples.push({ x, y, at: clock + COIN.fallS })
      if (coins.length > COINS_MAX) coins.shift()
    }
  }
  const lap = Math.floor(clock / IDLE_EVERY_S)
  if (lap !== idleLap) {
    idleLap = lap
    const a = hash01(lap * 13 + 1) * TAU
    const d = hash01(lap * 7 + 5) * POOL.r * 0.55
    ripples.push({ x: POOL.x + Math.cos(a) * d, y: POOL.y + Math.sin(a) * d, at: clock + 0.6 })
  }
  ripples = ripples.filter((r) => clock - r.at < RIPPLE.s + RIPPLE.rings * RIPPLE.gap)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const pointer = useStackPointer(canvasRef, MARGIN, () => props.overlay.hover !== false)

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    coins = []
    ripples = []
    last = nowMs
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    clock += frameDelta(now, last, reduced)
    last = now
    if (!reduced) step()
    ctx.save()
    enterUnitSpace(ctx, w, h, MARGIN)
    ctx.save()
    ctx.beginPath()
    ctx.arc(POOL.x, POOL.y, POOL.r, 0, TAU)
    ctx.clip()
    for (const c of coins) drawCoin(ctx, c, false)
    drawWater(ctx)
    if (!reduced) drawCaustics(ctx)
    for (const r of ripples) drawRipple(ctx, r)
    ctx.restore()
    PADS.forEach((pad, i) => drawPad(ctx, pad, i, reduced))
    for (const c of coins) drawCoin(ctx, c, true)
    ctx.restore()
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
