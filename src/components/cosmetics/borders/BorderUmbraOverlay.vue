<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorderColorValue, BorderUmbraOverlaySpec } from '@/types/api/items'
import { lighten } from '@/utils/color'
import { easeOut } from '@/utils/cosmetics/effects'
import { eclipsePhase, type EclipsePhase } from '@/utils/cosmetics/eclipseCycle'
import { overlaySpace, withAlpha, type OverlaySpace } from '@/utils/cosmetics/overlayCanvas'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{
  overlay: BorderUmbraOverlaySpec
  avatarUrl?: string | null
  color?: BorderColorValue | null
}>()

const MARGIN = 20
const CENTER = 50
const STATIC_T = 10.5

function radius(): number {
  return props.overlay.radius ?? 44
}

function moonColor(): string {
  return props.overlay.moon ?? '#0a0812'
}

function corona(): string {
  return props.overlay.corona ?? '#f2b552'
}

function prominence(): string {
  return props.overlay.prominence ?? '#ff6a3a'
}

function moonX(ph: EclipsePhase, t: number): number {
  const T = Math.max(12, props.overlay.intervalS ?? 18)
  const dir = Math.floor(t / T) % 2 === 0 ? 1 : -1
  const k = ph.cover < 0.5 ? 2 * ph.cover * ph.cover : 1 - Math.pow(-2 * ph.cover + 2, 2) / 2
  return CENTER - dir * (1 - k) * radius() * 1.9
}

function moonAlpha(ph: EclipsePhase, t: number): number {
  const enter = easeOut(Math.min(1, ph.cover * 2.2))
  const phase = 0.5 + 0.38 * (0.5 + 0.5 * Math.sin(t * 1.1))
  return enter * (1 - ph.tot) + phase * ph.tot
}

function drawCoronaGlow(ctx: Ctx, sp: OverlaySpace, level: number): void {
  const R = radius()
  const cx = sp.toX(CENTER)
  const cy = sp.toY(CENTER)
  const g = ctx.createRadialGradient(cx, cy, R * sp.s * 0.96, cx, cy, R * sp.s * 1.7)
  g.addColorStop(0, withAlpha(corona(), 0.55 * level))
  g.addColorStop(0.45, withAlpha(corona(), 0.16 * level))
  g.addColorStop(1, withAlpha(corona(), 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, R * sp.s * 1.7, 0, Math.PI * 2)
  ctx.fill()
}

function drawStreamers(ctx: Ctx, sp: OverlaySpace, t: number, level: number): void {
  const R = radius()
  const n = props.overlay.streamers ?? 14
  const lenMul = props.overlay.streamerLen ?? 1
  const cx = sp.toX(CENTER)
  const cy = sp.toY(CENTER)
  ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.sin(t * 0.35 + i) * 0.05
    const wobble = 0.75 + 0.25 * Math.sin(t * 1.2 + i * 2.1)
    const len = R * sp.s * (0.22 + hash01(i * 7) * 0.4) * wobble * lenMul * (props.overlay.annular ? 0.5 : 1)
    const x0 = cx + Math.cos(a) * R * sp.s * 0.98
    const y0 = cy + Math.sin(a) * R * sp.s * 0.98
    const x1 = x0 + Math.cos(a) * len
    const y1 = y0 + Math.sin(a) * len
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, withAlpha(corona(), 0.8 * level))
    g.addColorStop(1, withAlpha(corona(), 0))
    ctx.strokeStyle = g
    ctx.lineWidth = Math.max(0.8, R * sp.s * 0.05 * (0.6 + hash01(i * 3) * 0.6))
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(x0 + Math.cos(a + 0.25) * len * 0.5, y0 + Math.sin(a + 0.25) * len * 0.5, x1, y1)
    ctx.stroke()
  }
}

function drawPlumes(ctx: Ctx, sp: OverlaySpace, t: number, level: number): void {
  if (!props.overlay.plumes || props.overlay.annular) return
  const R = radius()
  const cx = sp.toX(CENTER)
  const cy = sp.toY(CENTER)
  for (const base of [-Math.PI / 2, Math.PI / 2]) {
    const a = base + Math.sin(t * 0.5 + base) * 0.08
    const len = R * sp.s * (0.85 + 0.12 * Math.sin(t * 0.8 + base))
    const x0 = cx + Math.cos(a) * R * sp.s * 0.98
    const y0 = cy + Math.sin(a) * R * sp.s * 0.98
    const x1 = x0 + Math.cos(a) * len
    const y1 = y0 + Math.sin(a) * len
    const px = -Math.sin(a)
    const py = Math.cos(a)
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, withAlpha(corona(), 0.55 * level))
    g.addColorStop(1, withAlpha(corona(), 0))
    ctx.fillStyle = g
    const wdt = R * sp.s * 0.18
    ctx.beginPath()
    ctx.moveTo(x0 + px * wdt, y0 + py * wdt)
    ctx.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5 + px * wdt * 1.6, y0 + Math.sin(a) * len * 0.5 + py * wdt * 1.6, x1, y1)
    ctx.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5 - px * wdt * 1.6, y0 + Math.sin(a) * len * 0.5 - py * wdt * 1.6, x0 - px * wdt, y0 - py * wdt)
    ctx.closePath()
    ctx.fill()
  }
}

function drawProminences(ctx: Ctx, sp: OverlaySpace, t: number, level: number): void {
  const R = radius()
  const cx = sp.toX(CENTER)
  const cy = sp.toY(CENTER)
  ctx.strokeStyle = withAlpha(prominence(), 0.9 * level)
  ctx.lineWidth = Math.max(0.8, R * sp.s * 0.035)
  ctx.lineCap = 'round'
  const count = props.overlay.prominences ?? 4
  for (let i = 0; i < count; i++) {
    const a = 0.4 + (i / Math.max(1, count)) * Math.PI * 2 + Math.sin(t * 0.3 + i) * 0.1
    const x = cx + Math.cos(a) * R * sp.s * 1.0
    const y = cy + Math.sin(a) * R * sp.s * 1.0
    const r = R * sp.s * (0.07 + 0.03 * Math.sin(t * 1.5 + i))
    ctx.beginPath()
    ctx.arc(x, y, r, a + Math.PI * 0.75, a + Math.PI * 2.25)
    ctx.stroke()
  }
}

function drawFlares(ctx: Ctx, sp: OverlaySpace, t: number, level: number): void {
  if (!props.overlay.flares) return
  const R = radius() * sp.s
  const cx = sp.toX(CENTER)
  const cy = sp.toY(CENTER)
  for (let k = 0; k < 3; k++) {
    const slot = Math.floor(t / 0.9 + k * 0.33)
    const local = ((t / 0.9 + k * 0.33) % 1)
    const a = hash01(slot * 13 + k * 7) * Math.PI * 2
    const pulse = Math.sin(local * Math.PI)
    const x = cx + Math.cos(a) * R * 1.02
    const y = cy + Math.sin(a) * R * 1.02
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.18 * pulse + 0.01)
    g.addColorStop(0, withAlpha('#ffffff', 0.9 * pulse * level))
    g.addColorStop(0.4, withAlpha(corona(), 0.5 * pulse * level))
    g.addColorStop(1, withAlpha(corona(), 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R * 0.18 * pulse + 0.01, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawMoon(ctx: Ctx, sp: OverlaySpace, mx: number, alpha: number): void {
  const R = radius() * (props.overlay.annular ? 0.86 : 1.03)
  const x = sp.toX(mx)
  const y = sp.toY(CENTER)
  const r = R * sp.s
  if (alpha <= 0.01 || Math.abs(mx - CENTER) > radius() * 2.2) return
  ctx.globalAlpha = alpha
  ctx.fillStyle = moonColor()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha(lighten(moonColor(), 0.35), 0.35)
  for (let i = 0; i < 4; i++) {
    const a = hash01(i * 11) * Math.PI * 2
    const d = r * (0.2 + hash01(i * 5) * 0.55)
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.05 + hash01(i * 3) * 0.08), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = withAlpha(lighten(moonColor(), 0.6), 0.45)
  ctx.lineWidth = Math.max(0.6, r * 0.02)
  ctx.beginPath()
  ctx.arc(x, y, r - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawBeads(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, mx: number): void {
  if (ph.flash <= 0 || ph.flash > 0.5) return
  const k = ph.flash * 2
  const R = radius()
  const cx = sp.toX(CENTER)
  const cy = sp.toY(CENTER)
  const side = mx <= CENTER ? 1 : -1
  ctx.fillStyle = withAlpha('#ffffff', 0.95 * k)
  for (let i = 0; i < 5; i++) {
    const a = (side > 0 ? 0 : Math.PI) + (i - 2) * 0.26
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * R * sp.s, cy + Math.sin(a) * R * sp.s, R * sp.s * (0.02 + hash01(i * 9) * 0.02) * (1 + k), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawDiamondRing(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, t: number): void {
  if (ph.flash <= 0.5) return
  const k = (ph.flash - 0.5) * 2
  const T = Math.max(12, props.overlay.intervalS ?? 18)
  const dir = Math.floor(t / T) % 2 === 0 ? 1 : -1
  const R = radius() * sp.s
  const a = dir > 0 ? Math.PI : 0
  const x = sp.toX(CENTER) + Math.cos(a) * R
  const y = sp.toY(CENTER)
  const rad = R * (0.35 + 0.3 * k)
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
  g.addColorStop(0, withAlpha('#ffffff', k))
  g.addColorStop(0.35, withAlpha(corona(), 0.6 * k))
  g.addColorStop(1, withAlpha(corona(), 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, rad, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha('#ffffff', 0.85 * k)
  ctx.lineWidth = Math.max(0.6, R * 0.02)
  for (let i = 0; i < 6; i++) {
    const ra = (i / 6) * Math.PI + 0.2
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(ra) * rad * 1.4, y - Math.sin(ra) * rad * 1.4)
    ctx.lineTo(x + Math.cos(ra) * rad * 1.4, y + Math.sin(ra) * rad * 1.4)
    ctx.stroke()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    const sp = overlaySpace(w, h, MARGIN)
    const t = reduced ? STATIC_T : now / 1000
    const ph = eclipsePhase(t, props.overlay.intervalS)
    const mx = moonX(ph, t)
    const level = props.overlay.annular ? ph.tot * 0.8 : ph.tot
    if (level > 0) {
      drawCoronaGlow(ctx, sp, level)
      drawStreamers(ctx, sp, t, level)
      drawPlumes(ctx, sp, t, level)
      drawProminences(ctx, sp, t, level)
      if (!reduced) drawFlares(ctx, sp, t, level)
    }
    drawMoon(ctx, sp, mx, reduced ? 0.7 : moonAlpha(ph, t))
    if (!reduced) {
      drawBeads(ctx, sp, ph, mx)
      drawDiamondRing(ctx, sp, ph, t)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="border-umbra" aria-hidden="true" />
</template>

<style scoped>
.border-umbra {
  position: absolute;
  inset: -20%;
  width: 140%;
  height: 140%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
