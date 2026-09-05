<script setup lang="ts">
import { useEffectCanvas, type EffectFrame } from '@/composables/useEffectCanvas'
import type { Composition } from '@/types/api/items'
import { asNumber, asString, isFieldKey, padBox, pctSize, ringAt, ringExtreme, ringGeometry, type ContentBox, type EffectMeasure, type Vec } from '@/utils/cosmetics/effects'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

type Ctx = CanvasRenderingContext2D

interface OrbConfig {
  orb: string
  core: string
  glow: string
  whirl: string
  mote: string
  sizePct: number
  minPx: number
  maxPx: number
  spinSecs: number
  streaks: number
}

function readOrb(c: Composition): OrbConfig {
  return {
    orb: asString(c.orb) ?? '#5b2fc9',
    core: asString(c.core) ?? '#1c0f3a',
    glow: asString(c.glow) ?? '#b48cff',
    whirl: asString(c.whirl) ?? '#8ad8ff',
    mote: asString(c.mote) ?? '#ffffff',
    sizePct: Math.max(4, Math.min(50, asNumber(c.sizePct) ?? 16)),
    minPx: Math.max(6, asNumber(c.minPx) ?? 10),
    maxPx: Math.max(10, asNumber(c.maxPx) ?? 70),
    spinSecs: Math.max(2, asNumber(c.spinSecs) ?? 6),
    streaks: Math.max(2, Math.min(16, Math.round(asNumber(c.streaks) ?? 7))),
  }
}

const cfg = computed(() => readOrb(props.composition))
const isTitle = computed(() => props.measure.typeKey === 'title')
const field = computed(() => isFieldKey(props.measure.typeKey))

const size = computed(() => {
  const box = props.measure.box
  if (isTitle.value) return Math.max(5, box.h * 0.75)
  return pctSize(Math.min(box.w, box.h), cfg.value.sizePct, cfg.value.minPx, cfg.value.maxPx)
})

const pad = computed(() => Math.round(size.value * 1.8))

const ring = computed(() => ringGeometry(props.measure, padBox(props.measure.box, pad.value)))

function orbAt(box: ContentBox, D: number, t: number): Vec {
  const bob = Math.sin(t * 1.2) * D * 0.12
  if (isTitle.value) return { x: box.x + box.w + D * 0.75, y: box.y + box.h * 0.45 + bob }
  if (field.value) return { x: box.x + box.w - D * 1.2, y: box.y + box.h - D * 1.2 + bob }
  const corner = ringExtreme(ring.value.outer, { x: 1, y: -1 })
  return { x: corner.p.x + corner.n.x * D * 0.25, y: corner.p.y + corner.n.y * D * 0.25 + bob }
}

function drawOrb(g: Ctx, o: Vec, D: number, t: number) {
  const c = cfg.value
  const r = D / 2
  const pulse = 1 + Math.sin(t * 2.3) * 0.06
  const glow = g.createRadialGradient(o.x, o.y, r * 0.4, o.x, o.y, r * 2.2 * pulse)
  glow.addColorStop(0, withAlpha(c.glow, 0.5))
  glow.addColorStop(1, withAlpha(c.glow, 0))
  g.fillStyle = glow
  g.beginPath()
  g.arc(o.x, o.y, r * 2.2 * pulse, 0, Math.PI * 2)
  g.fill()
  const sphere = g.createRadialGradient(o.x - r * 0.35, o.y - r * 0.35, r * 0.1, o.x, o.y, r)
  sphere.addColorStop(0, c.glow)
  sphere.addColorStop(0.55, c.orb)
  sphere.addColorStop(1, c.core)
  g.fillStyle = sphere
  g.beginPath()
  g.arc(o.x, o.y, r, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.beginPath()
  g.arc(o.x, o.y, r * 0.92, 0, Math.PI * 2)
  g.clip()
  g.lineWidth = Math.max(0.8, r * 0.16)
  g.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const a = t * (0.8 + i * 0.35) * (i % 2 === 0 ? 1 : -1) + i * 2.1
    g.strokeStyle = withAlpha(c.whirl, 0.45)
    g.beginPath()
    g.arc(o.x, o.y, r * (0.35 + i * 0.16), a, a + 1.4)
    g.stroke()
  }
  g.restore()
  g.fillStyle = withAlpha(c.mote, 0.7)
  g.beginPath()
  g.ellipse(o.x - r * 0.38, o.y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = withAlpha(c.glow, 0.7)
  g.lineWidth = Math.max(0.8, r * 0.08)
  g.beginPath()
  g.arc(o.x, o.y, r, 0, Math.PI * 2)
  g.stroke()
}

function streak(g: Ctx, pts: Vec[], width: number, alpha: number) {
  g.lineCap = 'round'
  for (const [scale, mix] of [[2.2, 0.28], [1, 1]] as Array<[number, number]>) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      if (!a || !b) continue
      const k = 1 - i / pts.length
      g.strokeStyle = withAlpha(mix === 1 ? cfg.value.mote : cfg.value.whirl, alpha * k * mix)
      g.lineWidth = Math.max(0.5, width * k * scale)
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      g.stroke()
    }
  }
}

function drawBadgeWhirl(g: Ctx, D: number, t: number, orb: Vec) {
  const c = cfg.value
  const band = ring.value.band
  const P = band.total
  for (let i = 0; i < c.streaks; i++) {
    const head = ((t / c.spinSecs + i / c.streaks) % 1) * P
    const pts: Vec[] = []
    for (let k = 0; k < 11; k++) pts.push(ringAt(band, head - (k / 10) * P * 0.1).p)
    const near = 1 - Math.min(1, Math.hypot((pts[0]?.x ?? 0) - orb.x, (pts[0]?.y ?? 0) - orb.y) / (D * 3)) * 0.4
    streak(g, pts, D * 0.26, 0.95 * near)
  }
  drawMotes(g, (m, u) => {
    const { p, n } = ringAt(band, ((t / (c.spinSecs * 1.4) + u) % 1) * P)
    const off = Math.sin(t * 2 + m) * D * 0.25
    return { x: p.x + n.x * off, y: p.y + n.y * off }
  }, D, t)
}

function drawTitleWhirl(g: Ctx, box: ContentBox, D: number, t: number) {
  const c = cfg.value
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const rx = box.w * 0.55 + D * 0.5
  const ry = box.h * 0.75
  const at = (a: number): Vec => ({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
  for (let i = 0; i < c.streaks; i++) {
    const head = (t / c.spinSecs + i / c.streaks) * Math.PI * 2
    const pts: Vec[] = []
    for (let k = 0; k < 11; k++) pts.push(at(head - (k / 10) * 0.7))
    streak(g, pts, D * 0.26, 0.9)
  }
  drawMotes(g, (m, u) => at((t / (c.spinSecs * 1.4) + u) * Math.PI * 2 + Math.sin(t + m) * 0.2), D, t)
}

function drawFieldWhirl(g: Ctx, D: number, t: number, orb: Vec) {
  const c = cfg.value
  for (let i = 0; i < c.streaks; i++) {
    const phi = (t / c.spinSecs + i / c.streaks) % 1
    const pts: Vec[] = []
    for (let k = 0; k < 9; k++) {
      const q = Math.max(0, phi - (k / 8) * 0.05)
      const r = D * (0.7 + q * 3.5)
      const a = -q * Math.PI * 4 + i * 2.1 + t * 0.5
      pts.push({ x: orb.x + Math.cos(a) * r, y: orb.y + Math.sin(a) * r })
    }
    streak(g, pts, D * 0.24 * (1 - phi), 0.9 * (1 - phi))
  }
  drawMotes(g, (m, u) => {
    const q = (t / (c.spinSecs * 1.6) + u) % 1
    const r = D * (0.8 + q * 3.2)
    const a = -q * Math.PI * 3 + m * 1.7
    return { x: orb.x + Math.cos(a) * r, y: orb.y + Math.sin(a) * r }
  }, D, t)
}

function drawMotes(g: Ctx, place: (m: number, u: number) => Vec, D: number, t: number) {
  const c = cfg.value
  for (let m = 0; m < 12; m++) {
    const u = m / 12 + hash01(m * 7) * 0.05
    const p = place(m, u)
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + m * 1.9)
    g.fillStyle = withAlpha(c.mote, 0.35 + tw * 0.5)
    g.beginPath()
    g.arc(p.x, p.y, Math.max(0.6, D * 0.05 * (0.6 + tw * 0.6)), 0, Math.PI * 2)
    g.fill()
  }
}

function drawFrame(f: EffectFrame) {
  const D = size.value
  const t = f.reduced ? 0 : f.t
  const orb = orbAt(f.box, D, t)
  if (isTitle.value) drawTitleWhirl(f.g, f.box, D, t)
  else if (field.value) drawFieldWhirl(f.g, D, t, orb)
  else drawBadgeWhirl(f.g, D, t, orb)
  drawOrb(f.g, orb, D, t)
}

const { canvasRef, canvasStyle } = useEffectCanvas(() => props.measure, () => pad.value, drawFrame)
</script>

<template>
  <div class="comp-fx-region">
    <canvas ref="canvasRef" class="comp-fx-canvas" :style="canvasStyle" aria-hidden="true"></canvas>
  </div>
</template>

<style scoped>
.comp-fx-region {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.comp-fx-canvas {
  position: absolute;
  display: block;
  max-width: none;
  max-height: none;
}
</style>
