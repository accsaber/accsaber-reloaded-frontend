<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleHoardAuraSpec } from '@/types/api/items'
import { darken, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleHoardAuraSpec
  light: boolean
}>()

type TreasureKind = 'coin' | 'gem' | 'goblet' | 'crown'

interface Treasure {
  x: number
  y: number
  rot: number
  size: number
  kind: TreasureKind
  gemIdx: number
}

interface Drop {
  born: number
  x: number
  targetY: number
  kind: TreasureKind
  gemIdx: number
}

interface Puff {
  born: number
  x: number
}

const STATIC_T = 3
const DROP_S = 0.85
const BREATH_S = 1.2
const EYES_S = 3.4

let rect: TitleAuraRect | null = null
let pile: Treasure[] = []
let drop: Drop | null = null
let puffs: Puff[] = []
let nextDropAt = 0
let nextPuffAt = 0
let breathAt = -10
let breathSeed = 0
let nextBreathAt = 0
let eyesAt = -10
let eyesSeed = 0
let nextEyesAt = 0

function coin(): string {
  return pickVariant(props.light, props.aura.lightCoin, props.aura.coin, '#f2c94c')
}

function rim(): string {
  return pickVariant(props.light, props.aura.lightRim, props.aura.rim, '#a16207')
}

function smoke(): string {
  return pickVariant(props.light, props.aura.lightSmoke, props.aura.smoke, '#8c87a3')
}

function flame(): string {
  return pickVariant(props.light, props.aura.lightFlame, props.aura.flame, '#ff8a3d')
}

function eye(): string {
  return pickVariant(props.light, props.aura.lightEye, props.aura.eye, '#fbbf24')
}

function gemColors(): string[] {
  return pickVariant(props.light, props.aura.lightGems, props.aura.gems, ['#e11d48', '#2563eb', '#8b5cf6'])
}

function seedPile(): void {
  pile = []
  let k = 0
  for (let row = 0; row < 3; row++) {
    const count = 7 - row * 2
    for (let c = 0; c < count; c++) {
      k++
      const kind: TreasureKind = row === 2 && c === 0 ? 'crown' : k % 5 === 2 ? 'gem' : k % 7 === 4 ? 'goblet' : 'coin'
      pile.push({
        x: 0.5 + (c - (count - 1) / 2) * 0.09 + rand(-0.015, 0.015),
        y: row,
        rot: rand(-0.3, 0.3),
        size: rand(0.9, 1.1),
        kind,
        gemIdx: k % 3,
      })
    }
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, r: TitleAuraRect, size: number, a: number): void {
  const rx = r.fs * 0.24 * size
  const ry = rx * 0.42
  ctx.fillStyle = withAlpha(rim(), a)
  ctx.beginPath()
  ctx.ellipse(0, ry * 0.35, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha(coin(), a)
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(darken(coin(), 0.25), a * 0.8)
  ctx.lineWidth = Math.max(0.5, r.fs * 0.03)
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function drawGem(ctx: CanvasRenderingContext2D, r: TitleAuraRect, size: number, a: number, color: string): void {
  const s = r.fs * 0.16 * size
  ctx.fillStyle = withAlpha(darken(color, 0.3), a)
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.lineTo(s * 0.8, 0)
  ctx.lineTo(0, s * 0.8)
  ctx.lineTo(-s * 0.8, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = withAlpha(lighten(color, 0.15), a)
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.lineTo(s * 0.8, 0)
  ctx.lineTo(0, 0)
  ctx.closePath()
  ctx.fill()
}

function drawGoblet(ctx: CanvasRenderingContext2D, r: TitleAuraRect, size: number, a: number): void {
  const s = r.fs * 0.24 * size
  ctx.fillStyle = withAlpha(coin(), a)
  ctx.beginPath()
  ctx.moveTo(-s * 0.5, -s * 0.85)
  ctx.quadraticCurveTo(-s * 0.42, -s * 0.15, 0, -s * 0.1)
  ctx.quadraticCurveTo(s * 0.42, -s * 0.15, s * 0.5, -s * 0.85)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(-s * 0.06, -s * 0.12, s * 0.12, s * 0.42)
  ctx.beginPath()
  ctx.ellipse(0, s * 0.34, s * 0.3, s * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(darken(coin(), 0.3), a * 0.8)
  ctx.lineWidth = Math.max(0.5, r.fs * 0.025)
  ctx.beginPath()
  ctx.moveTo(-s * 0.44, -s * 0.62)
  ctx.quadraticCurveTo(0, -s * 0.5, s * 0.44, -s * 0.62)
  ctx.stroke()
}

function drawCrown(ctx: CanvasRenderingContext2D, r: TitleAuraRect, size: number, a: number): void {
  const s = r.fs * 0.28 * size
  ctx.fillStyle = withAlpha(coin(), a)
  ctx.beginPath()
  ctx.moveTo(-s * 0.6, 0)
  ctx.lineTo(-s * 0.6, -s * 0.35)
  ctx.lineTo(-s * 0.3, -s * 0.1)
  ctx.lineTo(0, -s * 0.55)
  ctx.lineTo(s * 0.3, -s * 0.1)
  ctx.lineTo(s * 0.6, -s * 0.35)
  ctx.lineTo(s * 0.6, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(-s * 0.6, 0, s * 1.2, s * 0.16)
  const gems = gemColors()
  for (const [gi, gx] of [-0.38, 0, 0.38].entries()) {
    ctx.fillStyle = withAlpha(gems[gi % gems.length], a)
    ctx.beginPath()
    ctx.arc(gx * s, s * 0.08, s * 0.07, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawTreasure(ctx: CanvasRenderingContext2D, tr: Treasure, r: TitleAuraRect, x: number, y: number, rot: number, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  if (tr.kind === 'coin') drawCoin(ctx, r, tr.size, a)
  else if (tr.kind === 'gem') drawGem(ctx, r, tr.size, a, gemColors()[tr.gemIdx % gemColors().length])
  else if (tr.kind === 'goblet') drawGoblet(ctx, r, tr.size, a)
  else drawCrown(ctx, r, tr.size, a)
  ctx.restore()
}

function drawBreath(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const u = (t - breathAt) / BREATH_S
  if (u < 0 || u > 1) return
  const env = Math.sin(u * Math.PI)
  const fromLeft = hash01(breathSeed * 13 + 2) < 0.5
  const y0 = r.y + r.h * 0.16
  const reach = Math.min(1, u * 2.2) * r.w * 0.85
  const x0 = fromLeft ? r.x - r.fs * 0.6 : r.x + r.w + r.fs * 0.6
  const dir = fromLeft ? 1 : -1
  ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
  const jets = 13
  for (let k = 0; k < jets; k++) {
    const frac = k / (jets - 1)
    const x = x0 + dir * reach * frac
    const flick = 0.7 + 0.3 * Math.sin(t * 21 + k * 2.4)
    const s = r.fs * (0.16 + frac * 0.34) * env * flick
    if (s < 0.5) continue
    const y = y0 + Math.sin(t * 9 + k * 1.6) * r.fs * 0.09 - frac * r.fs * 0.22
    const c = frac < 0.3 ? lighten(flame(), 0.45) : flame()
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2)
    g.addColorStop(0, withAlpha(c, 0.5 * env))
    g.addColorStop(1, withAlpha(c, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4)
    ctx.fillStyle = withAlpha(c, 0.85 * env)
    ctx.beginPath()
    ctx.moveTo(x, y - s)
    ctx.quadraticCurveTo(x + s * 0.8, y - s * 0.2, x, y + s * 0.55)
    ctx.quadraticCurveTo(x - s * 0.8, y - s * 0.2, x, y - s)
    ctx.fill()
  }
  for (let k = 0; k < 6; k++) {
    const eu = (u + k * 0.13) % 1
    const x = x0 + dir * reach * hash01(breathSeed * 7 + k * 3)
    const y = y0 - eu * r.fs * 0.9
    ctx.fillStyle = withAlpha(flame(), (1 - eu) * env * 0.8)
    ctx.beginPath()
    ctx.arc(x, y, Math.max(0.5, r.fs * 0.045), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}

function drawEyes(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const u = (t - eyesAt) / EYES_S
  if (u < 0 || u > 1) return
  let a = 1
  if (u < 0.14) a = u / 0.14
  else if (u > 0.85) a = (1 - u) / 0.15
  const blinkU = (u - 0.5) / 0.06
  const blink = blinkU >= 0 && blinkU <= 1 ? Math.sin(blinkU * Math.PI) : 0
  const cx = r.x + r.w * (0.32 + hash01(eyesSeed * 11 + 4) * 0.36)
  const cy = r.y - r.fs * 0.35
  const ew = r.fs * 0.42
  const eh = r.fs * 0.24 * (1 - blink * 0.92)
  const gap = r.fs * 0.78
  const track = Math.sin(t * 0.9 + eyesSeed) * ew * 0.22
  for (const side of [-1, 1]) {
    const ex = cx + side * gap * 0.5
    const g = ctx.createRadialGradient(ex, cy, 0, ex, cy, ew * 1.8)
    g.addColorStop(0, withAlpha(eye(), 0.3 * a))
    g.addColorStop(1, withAlpha(eye(), 0))
    ctx.fillStyle = g
    ctx.fillRect(ex - ew * 1.8, cy - ew * 1.8, ew * 3.6, ew * 3.6)
    ctx.fillStyle = withAlpha(eye(), 0.92 * a)
    ctx.beginPath()
    ctx.moveTo(ex - ew / 2, cy)
    ctx.quadraticCurveTo(ex, cy - eh, ex + ew / 2, cy)
    ctx.quadraticCurveTo(ex, cy + eh, ex - ew / 2, cy)
    ctx.fill()
    if (eh > r.fs * 0.03) {
      ctx.fillStyle = withAlpha('#0a0a10', 0.95 * a)
      ctx.beginPath()
      ctx.ellipse(ex + track, cy, ew * 0.055, eh * 0.85, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    seedPile()
    const t = now / 1000
    nextDropAt = t + rand(1, props.aura.dropEveryS ?? 5)
    nextPuffAt = t + rand(2, 7)
    nextBreathAt = t + rand(2, props.aura.breatheEveryS ?? 8)
    nextEyesAt = t + rand(3.5, props.aura.eyesEveryS ?? 11)
    breathAt = -10
    eyesAt = -10
    drop = null
    puffs = []
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const r = rect
    const t = reduced ? STATIC_T : now / 1000
    const baseY = r.y + r.h + r.fs * 0.75
    if (reduced) {
      eyesAt = t - EYES_S * 0.3
      eyesSeed = 1
    }
    for (const p of pile) {
      drawTreasure(ctx, p, r, r.x + r.w * p.x, baseY - p.y * r.fs * 0.22, p.rot, 0.9)
    }
    if (!reduced) {
      if (!drop && t >= nextDropAt) {
        const kind: TreasureKind = Math.random() < 0.35 ? 'gem' : 'coin'
        drop = { born: t, x: rand(0.32, 0.68), targetY: baseY - rand(0, 2) * r.fs * 0.22, kind, gemIdx: Math.floor(rand(0, 3)) }
        nextDropAt = t + (props.aura.dropEveryS ?? 5) * rand(0.7, 1.5)
      }
      if (drop) {
        const u = (t - drop.born) / DROP_S
        if (u >= 1.6) {
          pile.push({ x: drop.x, y: rand(0, 1.6), rot: rand(-0.3, 0.3), size: 1, kind: drop.kind, gemIdx: drop.gemIdx })
          if (pile.length > 24) pile.splice(0, 1)
          drop = null
        } else {
          const x = r.x + r.w * drop.x
          const fall = Math.min(1, u)
          const y = (r.y - r.fs * 1.2) + (drop.targetY - (r.y - r.fs * 1.2)) * fall * fall
          const bounce = u > 1 ? Math.abs(Math.sin((u - 1) * Math.PI * 1.6)) * Math.exp(-(u - 1) * 4) * r.fs * 0.3 : 0
          drawTreasure(ctx, { x: 0, y: 0, rot: (t - drop.born) * 6, size: 1, kind: drop.kind, gemIdx: drop.gemIdx }, r, x, y - bounce, (t - drop.born) * 6, 1)
          if (u > 1 && u < 1.3) {
            const k = Math.sin(((u - 1) / 0.3) * Math.PI)
            ctx.strokeStyle = withAlpha('#ffffff', k * 0.9)
            ctx.lineWidth = Math.max(0.6, r.fs * 0.05)
            const gs = r.fs * 0.3 * k
            ctx.beginPath()
            ctx.moveTo(x - gs, drop.targetY)
            ctx.lineTo(x + gs, drop.targetY)
            ctx.moveTo(x, drop.targetY - gs)
            ctx.lineTo(x, drop.targetY + gs)
            ctx.stroke()
          }
        }
      }
      puffs = puffs.filter((p) => t - p.born < 3.4)
      if (t >= nextPuffAt) {
        puffs.push({ born: t, x: rand(0.12, 0.3) })
        nextPuffAt = t + rand(4, 9)
      }
      if (t >= nextBreathAt) {
        breathAt = t
        breathSeed = Math.floor(t)
        nextBreathAt = t + (props.aura.breatheEveryS ?? 8) * rand(0.75, 1.4)
      }
      if (t >= nextEyesAt) {
        eyesAt = t
        eyesSeed = Math.floor(t)
        nextEyesAt = t + (props.aura.eyesEveryS ?? 11) * rand(0.8, 1.4)
      }
    }
    for (const p of puffs) {
      const u = (t - p.born) / 3.4
      if (u < 0 || u > 1) continue
      const x = r.x + r.w * p.x + Math.sin(t * 1.1 + p.born) * r.fs * 0.2
      const y = baseY - r.fs * 0.4 - u * r.fs * 1.6
      const a = Math.sin(u * Math.PI) * 0.3
      ctx.fillStyle = withAlpha(smoke(), a)
      ctx.beginPath()
      ctx.arc(x, y, r.fs * (0.14 + u * 0.24), 0, Math.PI * 2)
      ctx.fill()
    }
    drawBreath(ctx, r, t)
    drawEyes(ctx, r, t)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
