<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleCoronaAuraSpec } from '@/types/api/items'
import { eclipsePeriod, eclipsePhase, type EclipsePhase } from '@/utils/cosmetics/eclipseCycle'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleCoronaAuraSpec
  light: boolean
}>()

type Ctx = CanvasRenderingContext2D

const STATIC_T = 10.5

let rect: TitleAuraRect | null = null

function color(): string {
  return pickVariant(props.light, props.aura.lightColor, props.aura.color, '#f2b552')
}

function prominence(): string {
  return props.aura.prominence ?? '#ff6a3a'
}

interface Rim {
  cx: number
  cy: number
  rx: number
  ry: number
}

function rimOf(r: TitleAuraRect): Rim {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, rx: r.w / 2 + r.fs * 0.25, ry: r.h / 2 + r.fs * 0.08 }
}

function onRim(rim: Rim, a: number, k = 1): [number, number] {
  return [rim.cx + Math.cos(a) * rim.rx * k, rim.cy + Math.sin(a) * rim.ry * k]
}

function drawGlow(ctx: Ctx, rim: Rim, fs: number, level: number): void {
  ctx.save()
  ctx.translate(rim.cx, rim.cy)
  ctx.scale(rim.rx + fs * 0.9, rim.ry + fs * 0.9)
  const g = ctx.createRadialGradient(0, 0, 0.55, 0, 0, 1)
  g.addColorStop(0, withAlpha(color(), 0.42 * level))
  g.addColorStop(0.5, withAlpha(color(), 0.14 * level))
  g.addColorStop(1, withAlpha(color(), 0))
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

function drawStreamers(ctx: Ctx, rim: Rim, fs: number, t: number, level: number): void {
  const n = props.aura.streamers ?? 14
  const lenMul = props.aura.streamerLen ?? 1
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.sin(t * 0.4 + i) * 0.04
    const wobble = 0.75 + 0.25 * Math.sin(t * 1.1 + i * 2.3)
    const len = fs * (0.45 + hash01(i * 7) * 0.7) * wobble * lenMul
    const [x0, y0] = onRim(rim, a, 0.98)
    const [x1, y1] = onRim(rim, a, 1)
    const dx = x1 - rim.cx
    const dy = y1 - rim.cy
    const d = Math.hypot(dx, dy) || 1
    const ex = x0 + (dx / d) * len
    const ey = y0 + (dy / d) * len
    const g = ctx.createLinearGradient(x0, y0, ex, ey)
    g.addColorStop(0, withAlpha(color(), 0.75 * level))
    g.addColorStop(1, withAlpha(color(), 0))
    ctx.strokeStyle = g
    ctx.lineWidth = Math.max(0.8, fs * 0.09 * (0.6 + hash01(i * 3) * 0.6))
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(x0 + (dx / d) * len * 0.5 - (dy / d) * len * 0.12, y0 + (dy / d) * len * 0.5 + (dx / d) * len * 0.12, ex, ey)
    ctx.stroke()
  }
}

function drawPlumes(ctx: Ctx, rim: Rim, fs: number, t: number, level: number): void {
  if (!props.aura.plumes || props.aura.annular) return
  ctx.lineCap = 'round'
  for (const base of [Math.PI, 0]) {
    const sway = Math.sin(t * 0.5 + base) * 0.05
    for (let i = 0; i < 7; i++) {
      const spread = (i / 6 - 0.5) * 0.9
      const a = base + spread + sway
      const bend = spread * 0.45
      const [x0, y0] = onRim(rim, a, 0.98)
      const len = fs * (0.8 + hash01(i * 5 + (base > 0 ? 40 : 0)) * 0.7) * (0.85 + 0.15 * Math.sin(t * 1.4 + i * 1.3 + base))
      const dir = base === 0 ? 1 : -1
      const x1 = x0 + dir * Math.cos(bend) * len
      const y1 = y0 + Math.sin(a + bend) * len * 0.6
      const fade = 1 - Math.abs(spread) * 0.8
      for (const [wMul, aMul] of [[3, 0.14], [1, 0.7]] as Array<[number, number]>) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0, withAlpha(color(), aMul * fade * level))
        g.addColorStop(0.55, withAlpha(color(), aMul * 0.5 * fade * level))
        g.addColorStop(1, withAlpha(color(), 0))
        ctx.strokeStyle = g
        ctx.lineWidth = Math.max(0.5, fs * 0.05 * wMul)
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.quadraticCurveTo(x0 + dir * len * 0.5, y0 + (y1 - y0) * 0.35, x1, y1)
        ctx.stroke()
      }
    }
  }
}

function drawProminences(ctx: Ctx, rim: Rim, fs: number, t: number, level: number): void {
  ctx.strokeStyle = withAlpha(prominence(), 0.85 * level)
  ctx.lineWidth = Math.max(0.6, fs * 0.05)
  ctx.lineCap = 'round'
  const count = props.aura.prominences ?? 3
  for (let i = 0; i < count; i++) {
    const a = 0.6 + (i / count) * Math.PI * 2 + Math.sin(t * 0.3 + i) * 0.1
    const [x, y] = onRim(rim, a, 1)
    const r = fs * (0.12 + 0.05 * Math.sin(t * 1.7 + i))
    ctx.beginPath()
    ctx.arc(x, y, r, a + Math.PI * 0.8, a + Math.PI * 2.2)
    ctx.stroke()
  }
}

function drawFireRing(ctx: Ctx, rim: Rim, fs: number, t: number, level: number): void {
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.4)
  ctx.strokeStyle = withAlpha(color(), 0.95 * level)
  ctx.lineWidth = Math.max(1, fs * 0.09 * pulse)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(rim.cx, rim.cy, rim.rx, rim.ry, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = withAlpha('#ffffff', 0.5 * level * pulse)
  ctx.lineWidth = Math.max(0.5, fs * 0.03)
  ctx.beginPath()
  ctx.ellipse(rim.cx, rim.cy, rim.rx, rim.ry, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function drawRing(ctx: Ctx, r: TitleAuraRect, ph: EclipsePhase, t: number): void {
  if (ph.flash <= 0.5) return
  const k = (ph.flash - 0.5) * 2
  const cycle = Math.floor(t / eclipsePeriod(props.aura.intervalS))
  const x = r.x + r.w * (0.1 + hash01(cycle * 17 + 3) * 0.8)
  const y = r.y + r.h * 0.5
  const rad = r.fs * (0.9 + k * 0.6)
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
  g.addColorStop(0, withAlpha('#ffffff', 0.95 * k))
  g.addColorStop(0.3, withAlpha(color(), 0.5 * k))
  g.addColorStop(1, withAlpha(color(), 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, rad, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha('#ffffff', 0.8 * k)
  ctx.lineWidth = Math.max(0.6, r.fs * 0.04)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI + 0.3
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(a) * rad * 1.3, y - Math.sin(a) * rad * 1.3)
    ctx.lineTo(x + Math.cos(a) * rad * 1.3, y + Math.sin(a) * rad * 1.3)
    ctx.stroke()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? STATIC_T : now / 1000
    const ph = eclipsePhase(t, props.aura.intervalS)
    const level = ph.tot
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    if (level > 0) {
      const rim = rimOf(rect)
      drawGlow(ctx, rim, rect.fs, level * (props.aura.annular ? 0.5 : 1))
      if (props.aura.annular) drawFireRing(ctx, rim, rect.fs, t, level)
      else {
        drawStreamers(ctx, rim, rect.fs, t, level)
        drawPlumes(ctx, rim, rect.fs, t, level)
        drawProminences(ctx, rim, rect.fs, t, level)
      }
    }
    if (!reduced) drawRing(ctx, rect, ph, t)
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
