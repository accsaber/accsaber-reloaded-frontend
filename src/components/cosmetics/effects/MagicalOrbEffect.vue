<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/api/items'
import { asColor, asNumber, clampNumber, pctSize, readPctSizing, ringAt, ringExtreme, type ContentBox, type EffectFrame, type EffectMeasure, type PctSizing, type RingGeometry, type Vec } from '@/utils/cosmetics/effects'
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
  size: PctSizing
  spinSecs: number
  streaks: number
}

function readOrb(c: Composition): OrbConfig {
  return {
    orb: asColor(c.orb),
    core: asColor(c.core),
    glow: asColor(c.glow),
    whirl: asColor(c.whirl),
    mote: asColor(c.mote),
    size: readPctSizing(c, 'sizePct', [4, 16, 50], [6, 10], [10, 70]),
    spinSecs: Math.max(2, asNumber(c.spinSecs) ?? 6),
    streaks: Math.round(clampNumber(c.streaks, 2, 16, 7)),
  }
}

interface StreakPass {
  color: 'whirl' | 'mote'
  width: number
  alpha: number
}

const STREAK_PASSES: StreakPass[] = [
  { color: 'whirl', width: 2.2, alpha: 0.28 },
  { color: 'mote', width: 1, alpha: 1 },
]
const TRAIL = 11
const MOTES = 12

const cfg = computed(() => readOrb(props.composition))
const { isTitle, field } = useEffectSurface(() => props.measure)

const size = computed(() => {
  const box = props.measure.box
  if (isTitle.value) return Math.max(5, box.h * 0.75)
  return pctSize(Math.min(box.w, box.h), cfg.value.size)
})

const pad = computed(() => Math.round(size.value * 1.8))

const trail: Vec[] = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0 }))

interface OrbPaint {
  g: Ctx
  r: number
  cfg: OrbConfig
  glow: CanvasGradient
  sphere: CanvasGradient
}

let paint: OrbPaint | null = null

function orbPaint(g: Ctx, r: number): OrbPaint {
  const c = cfg.value
  if (paint && paint.g === g && paint.r === r && paint.cfg === c) return paint
  const glow = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2)
  glow.addColorStop(0, withAlpha(c.glow, 0.5))
  glow.addColorStop(1, withAlpha(c.glow, 0))
  const sphere = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r)
  sphere.addColorStop(0, c.glow)
  sphere.addColorStop(0.55, c.orb)
  sphere.addColorStop(1, c.core)
  paint = { g, r, cfg: c, glow, sphere }
  return paint
}

function orbAt(box: ContentBox, ring: RingGeometry, D: number, t: number): Vec {
  const bob = Math.sin(t * 1.2) * D * 0.12
  if (isTitle.value) return { x: box.x + box.w + D * 0.75, y: box.y + box.h * 0.45 + bob }
  if (field.value) return { x: box.x + box.w - D * 1.2, y: box.y + box.h - D * 1.2 + bob }
  const corner = ringExtreme(ring.outer, { x: 1, y: -1 })
  return { x: corner.p.x + corner.n.x * D * 0.25, y: corner.p.y + corner.n.y * D * 0.25 + bob }
}

function drawOrb(g: Ctx, o: Vec, D: number, t: number) {
  const c = cfg.value
  const r = D / 2
  const pulse = 1 + Math.sin(t * 2.3) * 0.06
  const { glow, sphere } = orbPaint(g, r)
  g.save()
  g.translate(o.x, o.y)
  g.save()
  g.scale(pulse, pulse)
  g.fillStyle = glow
  g.beginPath()
  g.arc(0, 0, r * 2.2, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.fillStyle = sphere
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.beginPath()
  g.arc(0, 0, r * 0.92, 0, Math.PI * 2)
  g.clip()
  g.lineWidth = Math.max(0.8, r * 0.16)
  g.lineCap = 'round'
  g.strokeStyle = c.whirl
  g.globalAlpha = 0.45
  for (let i = 0; i < 3; i++) {
    const a = t * (0.8 + i * 0.35) * (i % 2 === 0 ? 1 : -1) + i * 2.1
    g.beginPath()
    g.arc(0, 0, r * (0.35 + i * 0.16), a, a + 1.4)
    g.stroke()
  }
  g.restore()
  g.fillStyle = c.mote
  g.globalAlpha = 0.7
  g.beginPath()
  g.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = c.glow
  g.lineWidth = Math.max(0.8, r * 0.08)
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.stroke()
  g.restore()
}

function streak(g: Ctx, count: number, width: number, alpha: number) {
  g.lineCap = 'round'
  for (const pass of STREAK_PASSES) {
    g.strokeStyle = cfg.value[pass.color]
    for (let i = 1; i < count; i++) {
      const a = trail[i - 1]
      const b = trail[i]
      const k = 1 - i / count
      g.globalAlpha = alpha * k * pass.alpha
      g.lineWidth = Math.max(0.5, width * k * pass.width)
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      g.stroke()
    }
  }
  g.globalAlpha = 1
}

function setTrail(i: number, p: Vec) {
  trail[i].x = p.x
  trail[i].y = p.y
}

function drawBadgeWhirl(g: Ctx, ring: RingGeometry, D: number, t: number, orb: Vec) {
  const c = cfg.value
  const band = ring.band
  const P = band.total
  for (let i = 0; i < c.streaks; i++) {
    const head = ((t / c.spinSecs + i / c.streaks) % 1) * P
    for (let k = 0; k < TRAIL; k++) setTrail(k, ringAt(band, head - (k / (TRAIL - 1)) * P * 0.1).p)
    const near = 1 - Math.min(1, Math.hypot(trail[0].x - orb.x, trail[0].y - orb.y) / (D * 3)) * 0.4
    streak(g, TRAIL, D * 0.26, 0.95 * near)
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
    for (let k = 0; k < TRAIL; k++) setTrail(k, at(head - (k / (TRAIL - 1)) * 0.7))
    streak(g, TRAIL, D * 0.26, 0.9)
  }
  drawMotes(g, (m, u) => at((t / (c.spinSecs * 1.4) + u) * Math.PI * 2 + Math.sin(t + m) * 0.2), D, t)
}

function drawFieldWhirl(g: Ctx, D: number, t: number, orb: Vec) {
  const c = cfg.value
  const steps = 9
  for (let i = 0; i < c.streaks; i++) {
    const phi = (t / c.spinSecs + i / c.streaks) % 1
    for (let k = 0; k < steps; k++) {
      const q = Math.max(0, phi - (k / (steps - 1)) * 0.05)
      const r = D * (0.7 + q * 3.5)
      const a = -q * Math.PI * 4 + i * 2.1 + t * 0.5
      setTrail(k, { x: orb.x + Math.cos(a) * r, y: orb.y + Math.sin(a) * r })
    }
    streak(g, steps, D * 0.24 * (1 - phi), 0.9 * (1 - phi))
  }
  drawMotes(g, (m, u) => {
    const q = (t / (c.spinSecs * 1.6) + u) % 1
    const r = D * (0.8 + q * 3.2)
    const a = -q * Math.PI * 3 + m * 1.7
    return { x: orb.x + Math.cos(a) * r, y: orb.y + Math.sin(a) * r }
  }, D, t)
}

function drawMotes(g: Ctx, place: (m: number, u: number) => Vec, D: number, t: number) {
  g.fillStyle = cfg.value.mote
  for (let m = 0; m < MOTES; m++) {
    const u = m / MOTES + hash01(m * 7) * 0.05
    const p = place(m, u)
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + m * 1.9)
    g.globalAlpha = 0.35 + tw * 0.5
    g.beginPath()
    g.arc(p.x, p.y, Math.max(0.6, D * 0.05 * (0.6 + tw * 0.6)), 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

function drawFrame(f: EffectFrame) {
  const D = size.value
  const t = f.reduced ? 0 : f.t
  const orb = orbAt(f.box, f.ring, D, t)
  if (isTitle.value) drawTitleWhirl(f.g, f.box, D, t)
  else if (field.value) drawFieldWhirl(f.g, D, t, orb)
  else drawBadgeWhirl(f.g, f.ring, D, t, orb)
  drawOrb(f.g, orb, D, t)
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
