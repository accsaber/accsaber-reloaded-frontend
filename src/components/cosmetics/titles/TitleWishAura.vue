<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleWishAuraSpec } from '@/types/cosmetics/title'
import { flickerNoise, sparkle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { drawFlame, glowDot } from '@/utils/cosmetics/flame'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { drawTitleHalo, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { clamp01, smoothstep01 } from '@/utils/math'
import { hash01 } from '@/utils/random'

const props = defineProps<{
  aura: TitleWishAuraSpec
  light: boolean
}>()

const TAU = Math.PI * 2
const DEFAULTS = {
  star: { color: '#ffd76a', glow: '#fff6cf' },
  candle: { color: '#ff9a3c', glow: '#ffe9a8' },
  lantern: { color: '#ff8a3c', glow: '#ffd9a0' },
  coin: { color: '#e0aa3a', glow: '#bfe6ff' },
}
const STAR = { everyS: 7, crossS: 3.6, specks: 18, fadeS: 3.4, twinkles: 10 }
const CANDLE = { everyS: 9, outAt: 6.4, darkAt: 6.9, relightAt: 8 }
const LANTERN = { count: 7, riseS: 11 }
const COIN = { everyS: 5, dropS: 1.2, sinkS: 0.7, rippleS: 2.8, waves: 5, glints: 7, splashS: 0.7 }

const ink = pigments(props.aura, props.light, DEFAULTS[props.aura.kind])
const every = props.aura.everyS
let wickX = 0

function capTop(r: TitleAuraRect): number {
  return r.y + r.h * 0.5 - r.fs * 0.45
}

function drawTwinkles(ctx: Ctx, r: TitleAuraRect, t: number): void {
  for (let i = 0; i < STAR.twinkles; i++) {
    const lit = Math.sin(t * (0.7 + hash01(i * 5 + 2) * 0.9) + i * 2.4)
    if (lit <= 0) continue
    const x = r.x - r.fs * 0.5 + (r.w + r.fs) * hash01(i * 13 + 1)
    const above = hash01(i * 7 + 3) < 0.6
    const y = above ? capTop(r) - r.fs * (0.05 + 0.35 * hash01(i * 11 + 4)) : capTop(r) + r.fs * (0.92 + 0.2 * hash01(i * 11 + 4))
    ctx.fillStyle = withAlpha(i % 3 ? ink.color : ink.glow, 0.85 * lit)
    sparkle(ctx, x, y, r.fs * (0.08 + 0.1 * hash01(i * 17 + 6)) * lit)
  }
}

function drawStar(ctx: Ctx, r: TitleAuraRect, t: number): void {
  drawTwinkles(ctx, r, t)
  const span = every ?? STAR.everyS
  const lap = Math.floor(t / span)
  const u = (t - lap * span) / STAR.crossS
  const x0 = r.x - r.fs * 0.8
  const reach = r.w + r.fs * 1.6
  const at = (p: number) => ({ x: x0 + reach * p, y: capTop(r) - r.fs * (0.12 + 0.24 * Math.sin(Math.PI * p)) })
  const rest = r.y + r.h * 0.5 - r.fs * 0.36
  for (let i = 0; i < STAR.specks; i++) {
    const born = (i + 0.5) / STAR.specks
    const age = (u - (1 - Math.sqrt(1 - born))) * STAR.crossS
    if (age <= 0 || age >= STAR.fadeS) continue
    const p = at(born)
    const drift = (hash01(lap * 31 + i * 7) - 0.5) * r.fs * 0.5
    const y = Math.min(rest + hash01(i * 13 + 5) * r.fs * 0.3, p.y + age * r.fs * (0.35 + 0.3 * hash01(i * 3 + 1)))
    const size = r.fs * (0.05 + 0.04 * hash01(i * 17 + lap))
    ctx.fillStyle = withAlpha(i % 3 ? ink.color : ink.glow, 0.95 * (1 - age / STAR.fadeS))
    ctx.fillRect(p.x + drift * smoothstep01(age / 2), y, size, size)
  }
  if (u >= 1) return
  const p = at(1 - (1 - u) * (1 - u))
  const shown = Math.sqrt(Math.sin(Math.PI * u))
  glowDot(ctx, p.x, p.y, r.fs * 0.8, ink.color, 0.4 * shown)
  ctx.fillStyle = withAlpha(ink.glow, shown)
  sparkle(ctx, p.x, p.y, r.fs * 0.36)
}

function drawCandle(ctx: Ctx, r: TitleAuraRect, t: number): void {
  const span = every ?? CANDLE.everyS
  const cyc = t % span
  const x = r.x + wickX
  const y = r.y + r.h * 0.5 - r.fs * 0.42
  const blown = smoothstep01((cyc - CANDLE.outAt) / (CANDLE.darkAt - CANDLE.outAt))
  const relit = smoothstep01((cyc - CANDLE.relightAt) / (span - CANDLE.relightAt))
  const strength = cyc < CANDLE.relightAt ? 1 - blown : relit
  drawTitleHalo(ctx, r, ink.glow, ink.color, strength * (0.75 + 0.25 * flickerNoise(t * 0.6, 2.3)))
  const smoke = cyc - CANDLE.darkAt
  if (smoke > 0 && smoke < 2) {
    for (let k = 0; k < 3; k++) {
      const s = smoke - k * 0.3
      if (s <= 0) continue
      ctx.fillStyle = withAlpha(ink.glow, 0.32 * Math.sin(Math.PI * clamp01(s / 1.7)))
      ctx.beginPath()
      ctx.arc(x + Math.sin(s * 2.2 + k) * r.fs * 0.12, y - s * r.fs * 0.5, r.fs * (0.06 + s * 0.05), 0, TAU)
      ctx.fill()
    }
  }
  drawFlame(ctx, { deep: ink.color, core: ink.glow, blend: props.light ? 'source-over' : 'lighter' }, t, x, y, r.fs * 0.3, strength, 1, blown * (1 - blown) * 5)
}

function drawLanterns(ctx: Ctx, r: TitleAuraRect, t: number): void {
  drawTitleHalo(ctx, r, ink.glow, ink.color, 0.6 + 0.15 * Math.sin(t * 0.7))
  const rise = every ?? LANTERN.riseS
  for (let i = 0; i < LANTERN.count; i++) {
    const turn = t / rise + i / LANTERN.count + hash01(i * 19) * 0.1
    const u = turn % 1
    const seed = Math.floor(turn) * 7 + i * 3
    const size = r.fs * (0.34 + 0.14 * hash01(seed + 2))
    const x = r.x + r.w * (0.04 + 0.92 * hash01(seed)) + Math.sin(t * 0.5 + i * 1.7) * r.fs * 0.22
    const y = r.y + r.h * 0.6 - Math.pow(u, 0.9) * (r.h * 0.6 + r.fs * 0.85)
    const shown = smoothstep01(u / 0.15) * (1 - smoothstep01((u - 0.7) / 0.3))
    glowDot(ctx, x, y, size * 2.2, ink.color, 0.32 * shown)
    ctx.globalAlpha = shown
    ctx.fillStyle = ink.color
    ctx.beginPath()
    ctx.moveTo(x - size * 0.42, y - size * 0.6)
    ctx.lineTo(x + size * 0.42, y - size * 0.6)
    ctx.lineTo(x + size * 0.3, y + size * 0.55)
    ctx.lineTo(x - size * 0.3, y + size * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = ink.glow
    ctx.fillRect(x - size * 0.24, y + size * 0.1, size * 0.48, size * 0.42)
    ctx.globalAlpha = 1
  }
}

function drawPool(ctx: Ctx, r: TitleAuraRect, t: number, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = withAlpha(ink.glow, 0.17)
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU)
  ctx.fill()
  ctx.lineWidth = Math.max(1, r.fs * 0.045)
  ctx.lineCap = 'round'
  for (let k = 0; k < COIN.waves; k++) {
    const lane = -0.7 + (1.4 * k) / (COIN.waves - 1)
    const half = rx * Math.sqrt(1 - lane * lane) * 0.92
    ctx.strokeStyle = withAlpha(ink.glow, 0.5 - 0.06 * k)
    ctx.beginPath()
    for (let s = 0; s <= 28; s++) {
      const u = s / 28
      const lift = Math.sin(u * 11 + t * (1.2 + 0.25 * k) * (k % 2 ? -1 : 1) + k * 1.7) * r.fs * 0.045 * Math.sin(Math.PI * u)
      if (s) ctx.lineTo(cx - half + half * 2 * u, cy + ry * lane + lift)
      else ctx.moveTo(cx - half + half * 2 * u, cy + ry * lane + lift)
    }
    ctx.stroke()
  }
  for (let i = 0; i < COIN.glints; i++) {
    const lit = Math.sin(t * (1 + hash01(i * 5 + 1)) + i * 2.1)
    if (lit <= 0) continue
    const lane = (hash01(i * 7 + 2) - 0.5) * 1.5
    const reach = rx * Math.sqrt(1 - lane * lane) * 0.85
    ctx.fillStyle = withAlpha('#ffffff', 0.85 * lit)
    sparkle(ctx, cx + (hash01(i * 13 + 3) - 0.5) * 2 * reach, cy + ry * lane, r.fs * 0.1 * lit)
  }
}

function drawCoin(ctx: Ctx, r: TitleAuraRect, t: number): void {
  const cx = r.x + r.w * 0.5
  const cy = capTop(r) + r.fs * 0.86
  const rx = r.w * 0.56 + r.fs * 0.35
  const ry = r.fs * 0.4
  drawPool(ctx, r, t, cx, cy, rx, ry)
  const span = every ?? COIN.everyS
  const lap = Math.floor(t / span)
  const cyc = t - lap * span
  const x = cx + (hash01(lap * 11 + 3) - 0.5) * rx * 1.1
  const wet = cyc - COIN.dropS
  if (wet > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU)
    ctx.clip()
    for (let k = 0; k < 3; k++) {
      const u = (wet - k * 0.4) / COIN.rippleS
      if (u <= 0 || u >= 1) continue
      const reach = rx * 0.9 * (1 - (1 - u) * (1 - u))
      ctx.strokeStyle = withAlpha('#ffffff', 0.75 * (1 - u) * (1 - u))
      ctx.lineWidth = Math.max(1, r.fs * 0.06)
      ctx.beginPath()
      ctx.ellipse(x, cy, reach, Math.max(1, reach * 0.3), 0, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
    const s = wet / COIN.splashS
    if (s < 1) {
      ctx.fillStyle = withAlpha(ink.glow, 0.9 * (1 - s))
      for (const side of [-1, 0, 1]) {
        ctx.beginPath()
        ctx.arc(x + side * r.fs * 0.22 * s, cy - Math.sin(Math.PI * s) * r.fs * (0.3 + 0.12 * Math.abs(side)), r.fs * 0.045, 0, TAU)
        ctx.fill()
      }
    }
  }
  const sunk = clamp01(wet / COIN.sinkS)
  if (sunk >= 1) return
  const fall = clamp01(cyc / COIN.dropS)
  const rad = r.fs * 0.2
  ctx.globalAlpha = smoothstep01(cyc / 0.3) * (1 - sunk)
  ctx.fillStyle = ink.color
  ctx.beginPath()
  ctx.ellipse(x, cy - (1 - fall * fall) * r.fs * 1.5 + sunk * r.fs * 0.12, Math.max(0.6, rad * Math.abs(Math.cos(cyc * 7))), rad, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
}

const PAINTERS = { star: drawStar, candle: drawCandle, lantern: drawLanterns, coin: drawCoin }

const canvasRef = useTitleAura({
  staticT: 2.2,
  layout(rect) {
    const el = canvasRef.value
    const ctx = el?.getContext('2d')
    if (!el || !ctx || props.aura.kind !== 'candle') return
    const style = getComputedStyle(el)
    const shown = (text: string) => (style.textTransform === 'uppercase' ? text.toUpperCase() : text)
    const before = shown(props.aura.before ?? '')
    ctx.save()
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${rect.fs}px ${style.fontFamily}`
    wickX = ctx.measureText(before).width + (parseFloat(style.letterSpacing) || 0) * before.length + ctx.measureText(shown(props.aura.glyph ?? 'i')).width / 2
    ctx.restore()
  },
  draw(ctx, { rect, t }) {
    PAINTERS[props.aura.kind](ctx, rect, t)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
