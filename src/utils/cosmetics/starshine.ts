import type { StarshineGlint } from '@/types/cosmetics/border'
import { sparkle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { randBetween as rand } from '@/utils/random'

export interface Glint {
  period: number
  offset: number
  size: number
  seed: number
}

const TAU = Math.PI * 2
const GLINT_SHOWN = 0.45

export function glitterLevel(t: number, rate: number, phase: number, gap: number, width: number): { lit: number; twinkle: number; alpha: number } {
  const lit = Math.max(0, 1 - Math.min(gap, 1 - gap) / width)
  const twinkle = Math.max(0, Math.sin(t * rate + phase)) ** 3
  return { lit, twinkle, alpha: Math.min(1, 0.15 + twinkle * 0.85 + lit) }
}

export function makeGlints(count: number, size: [number, number]): Glint[] {
  return Array.from({ length: count }, (_, i) => ({
    period: rand(3.6, 6.8),
    offset: rand(0, 7),
    size: rand(...size),
    seed: i * 17.3 + 1,
  }))
}

export function glintPhase(g: Glint, t: number): { cycle: number; u: number } | null {
  const cycles = (t + g.offset) / g.period
  const cycle = Math.floor(cycles)
  const u = (cycles - cycle) / GLINT_SHOWN
  return u < 1 ? { cycle, u } : null
}

function snowflake(ctx: Ctx, r: number): void {
  ctx.lineWidth = Math.max(0.6, r * 0.12)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let arm = 0; arm < 6; arm++) {
    const a = (arm / 6) * TAU
    const x = Math.cos(a)
    const y = Math.sin(a)
    ctx.moveTo(0, 0)
    ctx.lineTo(x * r, y * r)
    for (const side of [-1, 1]) {
      const b = a + side * 0.9
      ctx.moveTo(x * r * 0.58, y * r * 0.58)
      ctx.lineTo(x * r * 0.58 + Math.cos(b) * r * 0.3, y * r * 0.58 + Math.sin(b) * r * 0.3)
    }
  }
  ctx.stroke()
}

function bubble(ctx: Ctx, r: number): void {
  ctx.lineWidth = Math.max(0.6, r * 0.14)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.8, 0, TAU)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.5, Math.PI * 1.1, Math.PI * 1.45)
  ctx.stroke()
}

export function drawGlint(ctx: Ctx, shape: StarshineGlint, x: number, y: number, r: number, turn: number): void {
  if (r <= 0) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  if (shape === 'snowflake') snowflake(ctx, r)
  else if (shape === 'bubble') bubble(ctx, r)
  else {
    sparkle(ctx, 0, 0, r)
    ctx.rotate(Math.PI / 4)
    sparkle(ctx, 0, 0, r * 0.45)
  }
  ctx.restore()
}
