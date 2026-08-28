<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleBloodAuraSpec } from '@/types/api/items'
import { lighten } from '@/utils/color'
import { drawCreature } from '@/utils/cosmetics/eclipseCreatures'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleBloodAuraSpec
  light: boolean
}>()

const palette = computed(() => ({
  color: pickVariant(props.light, props.aura.lightColor, props.aura.color, '#b91c1c'),
  glow: pickVariant(props.light, props.aura.lightGlow, props.aura.glow, '#7f1d1d'),
  bat: pickVariant(props.light, props.aura.lightBat, props.aura.bat, '#dc2626'),
}))

const DRIP_TOP = 0.74

interface Drop {
  x: number
  born: number
  bead: number
  r: number
  vy: number
  y: number
}

interface Splat {
  x: number
  born: number
}

let rect: TitleAuraRect | null = null
let drops: Drop[] = []
let splats: Splat[] = []
let nextDrop = 0
let last = 0
let clock = 0

function heartbeat(t: number): number {
  const bpm = props.aura.bpm ?? 56
  const u = (t * bpm / 60) % 1
  const a = Math.max(0, 1 - Math.abs(u - 0.1) / 0.12)
  const b = Math.max(0, 1 - Math.abs(u - 0.32) / 0.14) * 0.6
  return Math.max(a, b)
}

function stepDrops(dt: number, r: TitleAuraRect): void {
  if (clock >= nextDrop) {
    const burst = rand(0, 1) < 0.3 ? 2 : 1
    for (let k = 0; k < burst; k++) drops.push({ x: rand(0.04, 0.96), born: clock, bead: rand(0.3, 1.2), r: rand(0.07, 0.14), vy: 0, y: 0 })
    nextDrop = clock + rand(0.2, 1.3)
  }
  for (const d of drops) {
    if (clock - d.born < d.bead) continue
    d.vy += 9 * dt
    d.y += d.vy * dt
  }
  const floor = 1.9
  for (const d of drops) {
    if (d.y >= floor) splats.push({ x: d.x, born: clock })
  }
  drops = drops.filter((d) => d.y < floor)
  splats = splats.filter((s) => clock - s.born < 0.8)
  void r
}

function drawDrop(ctx: CanvasRenderingContext2D, d: Drop, r: TitleAuraRect): void {
  const x = r.x + r.w * d.x
  const top = r.y + r.h * DRIP_TOP
  const grow = Math.min(1, (clock - d.born) / d.bead)
  const y = top + d.y * r.fs
  const rad = r.fs * d.r * grow
  const stretch = 1 + Math.min(1.5, d.vy * 0.35)
  ctx.fillStyle = palette.value.color
  if (d.y > 0.02) {
    ctx.strokeStyle = withAlpha(palette.value.color, 0.55)
    ctx.lineWidth = Math.max(0.5, rad * 0.9)
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(x, y - rad * stretch)
  ctx.quadraticCurveTo(x + rad * 1.1, y, x, y + rad)
  ctx.quadraticCurveTo(x - rad * 1.1, y, x, y - rad * stretch)
  ctx.fill()
  ctx.fillStyle = withAlpha(lighten(palette.value.color, 0.4), 0.5)
  ctx.beginPath()
  ctx.arc(x - rad * 0.3, y - rad * 0.2, rad * 0.22, 0, Math.PI * 2)
  ctx.fill()
}

function drawSplats(ctx: CanvasRenderingContext2D, r: TitleAuraRect): void {
  for (const s of splats) {
    const u = (clock - s.born) / 0.8
    const x = r.x + r.w * s.x
    const y = r.y + r.h * DRIP_TOP + 1.9 * r.fs
    ctx.fillStyle = withAlpha(palette.value.color, 0.7 * (1 - u))
    ctx.beginPath()
    ctx.ellipse(x, y, r.fs * (0.08 + u * 0.22), r.fs * (0.025 + u * 0.05), 0, 0, Math.PI * 2)
    ctx.fill()
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath()
      ctx.arc(x + k * r.fs * (0.1 + u * 0.25), y - r.fs * (u * 0.3 - u * u * 0.3), r.fs * 0.03 * (1 - u), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawBats(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const n = props.aura.bats ?? 4
  const pal = { shadow: palette.value.bat, corona: palette.value.color }
  for (let i = 0; i < n; i++) {
    const a = t * (0.5 + 0.12 * i) + (i / n) * Math.PI * 2
    const x = r.x + r.w / 2 + Math.cos(a) * (r.w / 2 + r.fs * 0.6)
    const y = r.y + r.h / 2 + Math.sin(a * 1.3 + i) * (r.h / 2 + r.fs * 0.55)
    const depth = 0.6 + 0.4 * (Math.sin(a) + 1) / 2
    drawCreature(ctx, 'bat', { x, y, s: r.fs * 0.13 * depth, t: t + i, dir: Math.cos(a) > 0 ? 1 : -1, seed: i }, pal)
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    drops = []
    splats = []
    last = now
    clock = 0
    nextDrop = 0.3
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const dt = reduced ? 0 : Math.min(0.05, (now - last) / 1000)
    last = now
    clock = reduced ? 3 : clock + dt
    const beat = heartbeat(clock)
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h / 2
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rect.w * 0.55 + rect.fs * 0.5)
    g.addColorStop(0, withAlpha(palette.value.glow, 0.12 + 0.28 * beat))
    g.addColorStop(1, withAlpha(palette.value.glow, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    if (!reduced) stepDrops(dt, rect)
    else if (drops.length === 0) drops = [{ x: 0.3, born: 0, bead: 1, r: 0.07, vy: 2, y: 0.5 }, { x: 0.7, born: 0, bead: 1, r: 0.06, vy: 0, y: 0 }]
    for (const d of drops) drawDrop(ctx, d, rect)
    drawSplats(ctx, rect)
    drawBats(ctx, rect, clock)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
