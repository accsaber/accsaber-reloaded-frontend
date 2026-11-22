<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleStormAuraSpec } from '@/types/cosmetics/title'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'

const props = defineProps<{
  aura: TitleStormAuraSpec
  light: boolean
}>()

const palette = pigments(props.aura, props.light, { arc: '#dbeafe', glow: '#60a5fa' })

interface Arc {
  pts: [number, number][]
  born: number
  life: number
  width: number
}

let arcs: Arc[] = []
let nextArcAt = 0
let cycleStart = 0

function jaggedPath(x1: number, y1: number, x2: number, y2: number, wobble: number): [number, number][] {
  const n = 7
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const off = i === 0 || i === n ? 0 : rand(-wobble, wobble)
    pts.push([x1 + (x2 - x1) * u + off, y1 + (y2 - y1) * u + off * 0.6])
  }
  return pts
}

function spawnArc(now: number, r: TitleAuraRect, strike: boolean): void {
  const y = r.y + r.h * rand(0.15, 0.85)
  const x1 = r.x + r.w * rand(0, 0.6)
  const x2 = x1 + r.w * rand(0.15, 0.4)
  const pts = strike
    ? jaggedPath(r.x + r.w * rand(0.2, 0.8), 0, r.x + r.w * rand(0.2, 0.8), r.y + r.h * 0.5, r.fs * 0.5)
    : jaggedPath(x1, y, x2, y + rand(-r.fs * 0.3, r.fs * 0.3), r.fs * 0.18)
  arcs.push({ pts, born: now, life: strike ? 160 : rand(60, 110), width: strike ? r.fs * 0.14 : r.fs * 0.06 })
}

function drawArc(ctx: CanvasRenderingContext2D, a: Arc, alpha: number): void {
  for (const pass of [0, 1]) {
    ctx.strokeStyle = withAlpha(pass ? palette.arc : palette.glow, pass ? alpha : alpha * 0.45)
    ctx.lineWidth = pass ? Math.max(1, a.width) : Math.max(2, a.width * 3)
    ctx.beginPath()
    a.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
    ctx.stroke()
  }
}

useTitleAura({
  additive: () => !props.light,
  init(_rect, now) {
    nextArcAt = now
    cycleStart = now
  },
  layout() {
    arcs = []
  },
  draw(ctx, { rect: r, now, reduced, w, h }) {
    const interval = props.aura.intervalMs ?? 4200
    const c = reduced ? 0.6 : ((now - cycleStart) % interval) / interval
    if (!reduced && now - cycleStart >= interval) cycleStart += interval
    const strike = c > 0.93
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const charge = Math.pow(c, 2)
    const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 0, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.55 + r.fs)
    g.addColorStop(0, withAlpha(palette.glow, (strike ? 0.55 : 0.22 * charge)))
    g.addColorStop(1, withAlpha(palette.glow, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    if (!reduced && now >= nextArcAt) {
      spawnArc(now, r, strike)
      nextArcAt = now + (strike ? 40 : rand(90, 260) / (0.3 + charge))
    }
    if (reduced && arcs.length === 0) spawnArc(now, r, false)
    arcs = arcs.filter((a) => reduced || now - a.born < a.life)
    for (const a of arcs) drawArc(ctx, a, reduced ? 0.8 : 1 - (now - a.born) / a.life)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
