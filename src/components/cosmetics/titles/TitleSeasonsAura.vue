<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleSeasonKey, TitleSeasonsAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleSeasonsAuraSpec
  light: boolean
}>()

interface Particle {
  x: number
  y: number
  speed: number
  phase: number
  size: number
  spin: number
}

const SEASONS: TitleSeasonKey[] = ['spring', 'summer', 'autumn', 'winter']
const STATIC_T = 3

let rect: TitleAuraRect | null = null
let particles: Particle[] = []

function seasonColor(key: TitleSeasonKey): string {
  if (key === 'spring') return pickVariant(props.light, props.aura.lightSpring, props.aura.spring, '#f9a8d4')
  if (key === 'summer') return pickVariant(props.light, props.aura.lightSummer, props.aura.summer, '#d9f99d')
  if (key === 'autumn') return pickVariant(props.light, props.aura.lightAutumn, props.aura.autumn, '#f59e0b')
  return pickVariant(props.light, props.aura.lightWinter, props.aura.winter, '#e0f2fe')
}

function seedParticles(): void {
  particles = Array.from({ length: 14 }, () => ({
    x: rand(0, 1),
    y: rand(0, 1),
    speed: rand(0.06, 0.16),
    phase: rand(0, 6.28),
    size: rand(0.09, 0.16),
    spin: rand(1.5, 4),
  }))
}

function activeSeasons(t: number): { key: TitleSeasonKey; alpha: number }[] {
  const locked = props.aura.season && props.aura.season !== 'cycle' ? props.aura.season : null
  if (locked) return [{ key: locked, alpha: 1 }]
  const seasonS = props.aura.seasonS ?? 7
  const total = seasonS * 4
  const u = (t % total) / seasonS
  const idx = Math.floor(u) % 4
  const frac = u - Math.floor(u)
  const fade = 0.18
  const out: { key: TitleSeasonKey; alpha: number }[] = []
  if (frac < fade) {
    out.push({ key: SEASONS[(idx + 3) % 4], alpha: 1 - frac / fade })
    out.push({ key: SEASONS[idx], alpha: frac / fade })
  } else {
    out.push({ key: SEASONS[idx], alpha: 1 })
  }
  return out
}

function drawPetal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ang: number, color: string, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.fillStyle = withAlpha(color, a)
  ctx.beginPath()
  ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ang: number, color: string, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.fillStyle = withAlpha(color, a)
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.quadraticCurveTo(s, 0, 0, s)
  ctx.quadraticCurveTo(-s, 0, 0, -s)
  ctx.fill()
  ctx.restore()
}

function drawFlake(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ang: number, color: string, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.strokeStyle = withAlpha(color, a)
  ctx.lineWidth = Math.max(0.5, s * 0.2)
  for (let k = 0; k < 3; k++) {
    ctx.rotate(Math.PI / 3)
    ctx.beginPath()
    ctx.moveTo(-s, 0)
    ctx.lineTo(s, 0)
    ctx.stroke()
  }
  ctx.restore()
}

function drawFirefly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, phase: number, color: string, a: number): void {
  const blink = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + phase * 4))
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.4)
  g.addColorStop(0, withAlpha(color, 0.7 * a * blink))
  g.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - s * 2.4, y - s * 2.4, s * 4.8, s * 4.8)
  ctx.fillStyle = withAlpha(color, a * blink)
  ctx.beginPath()
  ctx.arc(x, y, s * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    seedParticles()
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const r = rect
    const t = reduced ? STATIC_T : now / 1000
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    for (const { key, alpha } of activeSeasons(t)) {
      const color = seasonColor(key)
      for (const [pi, p] of particles.entries()) {
        const s = r.fs * p.size
        const fallY = ((p.y + t * p.speed) % 1.3) - 0.15
        const y = r.y + (r.h + r.fs * 1.2) * fallY
        const drift = Math.sin(t * 0.8 + p.phase) * r.fs * 0.35
        const x = r.x + r.w * p.x + drift
        const ang = t * p.spin + p.phase
        const a = alpha * 0.8
        if (key === 'spring') drawPetal(ctx, x, y, s, ang, color, a)
        else if (key === 'autumn') drawLeaf(ctx, x, y, s * 1.2, ang * 0.6, color, a)
        else if (key === 'winter') drawFlake(ctx, x, y, s, ang * 0.4, color, a)
        else if (pi % 2 === 0) {
          const fx = r.x + r.w * ((p.x + Math.sin(t * 0.5 + p.phase) * 0.14 + 1) % 1)
          const fy = r.y + r.h * ((p.y + Math.cos(t * 0.4 + p.phase) * 0.12 + 1) % 1)
          drawFirefly(ctx, fx, fy, s, t, p.phase, color, a)
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
