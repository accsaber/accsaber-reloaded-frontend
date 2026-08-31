<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleBloqsAuraSpec } from '@/types/api/items'
import { darken } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleBloqsAuraSpec
  light: boolean
}>()

interface Bloq {
  born: number
  y: number
  speed: number
  isLeft: boolean
  sliceU: number
  slicedAt: number
  arrow: number
}

interface Score {
  born: number
  x: number
  y: number
}

const STATIC_T = 3
const SLICE_FADE = 0.65
const EXT_EM = 9

let rect: TitleAuraRect | null = null
let bloqs: Bloq[] = []
let scores: Score[] = []
let nextAt = 0

function textRect(canvas: HTMLCanvasElement): TitleAuraRect {
  const r = titleAuraRect(canvas)
  return { ...r, w: r.w - EXT_EM * r.fs }
}

function leftColor(): string {
  return pickVariant(props.light, props.aura.lightLeft, props.aura.left, '#ef4444')
}

function rightColor(): string {
  return pickVariant(props.light, props.aura.lightRight, props.aura.right, '#3b82f6')
}

function streakColor(): string {
  return pickVariant(props.light, props.aura.lightStreak, props.aura.streak, '#ffffff')
}

function scoreColor(): string {
  return pickVariant(props.light, props.aura.lightScore, props.aura.score, '#e0f2fe')
}

function spawn(now: number): Bloq {
  return {
    born: now,
    y: rand(0.12, 0.85),
    speed: rand(13, 19),
    isLeft: Math.random() < 0.5,
    sliceU: rand(0.1, 0.9),
    slicedAt: -1,
    arrow: Math.floor(rand(0, 4)),
  }
}

function bloqX(b: Bloq, t: number, r: TitleAuraRect): number {
  return r.x + r.w + (EXT_EM + 0.8) * r.fs - (t - b.born) * b.speed * r.fs
}

function sliceX(b: Bloq, r: TitleAuraRect): number {
  return r.x + r.w * b.sliceU
}

function drawArrow(ctx: CanvasRenderingContext2D, s: number, arrow: number, alpha: number): void {
  ctx.save()
  ctx.rotate((arrow * Math.PI) / 2)
  ctx.fillStyle = withAlpha('#ffffff', alpha)
  ctx.beginPath()
  ctx.moveTo(0, s * 0.26)
  ctx.lineTo(-s * 0.24, -s * 0.1)
  ctx.lineTo(s * 0.24, -s * 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawBloqBody(ctx: CanvasRenderingContext2D, s: number, color: string, alpha: number, arrow: number): void {
  const r2 = s * 0.16
  ctx.fillStyle = withAlpha(darken(color, 0.25), alpha)
  ctx.beginPath()
  ctx.roundRect(-s / 2, -s / 2, s, s, r2)
  ctx.fill()
  ctx.fillStyle = withAlpha(color, alpha)
  ctx.beginPath()
  ctx.roundRect(-s / 2, -s / 2, s, s * 0.88, r2)
  ctx.fill()
  drawArrow(ctx, s, arrow, alpha * 0.95)
}

function drawBloq(ctx: CanvasRenderingContext2D, b: Bloq, t: number, r: TitleAuraRect): void {
  const color = b.isLeft ? leftColor() : rightColor()
  const s = r.fs * 0.78
  const x = b.slicedAt < 0 ? bloqX(b, t, r) : sliceX(b, r)
  const y = r.y + r.h * b.y
  const cutAngle = (b.arrow * Math.PI) / 2 + Math.PI / 2
  if (b.slicedAt < 0) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.sin(t * 1.4 + b.born) * 0.1)
    drawBloqBody(ctx, s, color, 0.95, b.arrow)
    ctx.restore()
    return
  }
  const age = t - b.slicedAt
  const u = Math.min(1, age / SLICE_FADE)
  const sep = s * 0.5 * u
  const alpha = 0.95 * (1 - u)
  for (const half of [-1, 1]) {
    ctx.save()
    ctx.translate(
      x + Math.cos(cutAngle) * sep * half,
      y + Math.sin(cutAngle) * sep * half + u * u * s * 0.9,
    )
    ctx.rotate(half * u * 0.7)
    ctx.beginPath()
    const px = Math.cos(cutAngle + Math.PI / 2) * s
    const py = Math.sin(cutAngle + Math.PI / 2) * s
    ctx.moveTo(-px, -py)
    ctx.lineTo(px, py)
    ctx.lineTo(px + Math.cos(cutAngle) * s * half, py + Math.sin(cutAngle) * s * half)
    ctx.lineTo(-px + Math.cos(cutAngle) * s * half, -py + Math.sin(cutAngle) * s * half)
    ctx.closePath()
    ctx.clip()
    drawBloqBody(ctx, s, color, alpha, b.arrow)
    ctx.restore()
  }
  if (age < 0.16) {
    const k = Math.sin((age / 0.16) * Math.PI)
    const px = Math.cos(cutAngle + Math.PI / 2) * s * 0.95
    const py = Math.sin(cutAngle + Math.PI / 2) * s * 0.95
    ctx.strokeStyle = withAlpha(streakColor(), k)
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.2, r.fs * 0.09)
    ctx.beginPath()
    ctx.moveTo(x - px, y - py)
    ctx.lineTo(x + px, y + py)
    ctx.stroke()
  }
}

function drawScore(ctx: CanvasRenderingContext2D, sc: Score, t: number, r: TitleAuraRect): void {
  const u = (t - sc.born) / 1.1
  if (u < 0 || u > 1) return
  const a = u < 0.15 ? u / 0.15 : Math.pow(1 - (u - 0.15) / 0.85, 1.3)
  ctx.font = `700 ${(r.fs * 0.52).toFixed(1)}px 'DM Sans', sans-serif`
  ctx.textAlign = 'center'
  ctx.fillStyle = withAlpha(scoreColor(), a)
  ctx.fillText('115', sc.x, sc.y - u * r.fs * 0.9)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? textRect(canvasRef.value) : null
    const t = now / 1000
    bloqs = [spawn(t - 0.25)]
    scores = []
    nextAt = t + 0.4
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const r = rect
    const t = reduced ? STATIC_T : now / 1000
    if (reduced) {
      for (const [k, ex] of [2.2, 5.4].entries()) {
        ctx.save()
        ctx.translate(r.x + r.w + ex * r.fs, r.y + r.h * 0.4)
        drawBloqBody(ctx, r.fs * 0.78, k === 0 ? leftColor() : rightColor(), 0.95, k)
        ctx.restore()
      }
      drawScore(ctx, { born: t - 0.35, x: r.x + r.w * 0.5, y: r.y }, t, r)
      return
    }
    if (t >= nextAt && bloqs.length < 6) {
      bloqs.push(spawn(t))
      nextAt = t + ((props.aura.intervalMs ?? 850) / 1000) * rand(0.5, 1.3)
    }
    for (const b of bloqs) {
      if (b.slicedAt < 0 && bloqX(b, t, r) <= sliceX(b, r)) {
        b.slicedAt = t
        scores.push({ born: t, x: sliceX(b, r), y: r.y + r.h * b.y - r.fs * 0.5 })
      }
    }
    bloqs = bloqs.filter((b) => (b.slicedAt < 0 ? bloqX(b, t, r) > r.x - 2 * r.fs : t - b.slicedAt < SLICE_FADE))
    scores = scores.filter((sc) => t - sc.born < 1.1)
    for (const b of bloqs) drawBloq(ctx, b, t, r)
    for (const sc of scores) drawScore(ctx, sc, t, r)
  },
})
</script>

<template>
  <canvas ref="canvas" class="bloqs-canvas" aria-hidden="true" />
</template>

<style scoped>
.bloqs-canvas {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: calc(100% + 9em) !important;
}
</style>
