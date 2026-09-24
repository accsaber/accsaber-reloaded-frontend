<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/api/items'
import { activeEvents, asColor, asNumber, boxRing, easeOut, pctSize, readPctSizing, ringAt, type ContentBox, type EffectFrame, type EffectMeasure, type PctSizing, type RingGeometry, type Vec } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { lerpHex } from '@/utils/color'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

type Ctx = CanvasRenderingContext2D

interface BashConfig {
  color: string
  dark: string
  stem: string
  splat: string
  pip: string
  intervalSecs: number
  size: PctSizing
}

function readBash(c: Composition): BashConfig {
  return {
    color: asColor(c.color),
    dark: asColor(c.dark),
    stem: asColor(c.stem),
    splat: asColor(c.splat),
    pip: asColor(c.pip),
    intervalSecs: Math.max(1.5, asNumber(c.intervalSecs) ?? 4),
    size: readPctSizing(c, 'sizePct', [5, 26, 60], [6, 10], [10, 90]),
  }
}

interface Throw {
  start: Vec
  target: Vec
  out: Vec
  spin: number
}

const FLIGHT = 0.45
const SPLAT = 3.6
const LIFE = FLIGHT + SPLAT
const THROW_REACH = 1.8
const DRY_STEPS = 16
const LOBES: Array<[number, number]> = [[-0.2, 0.2], [0.2, 0.2], [0, 0.19]]

const cfg = computed(() => readBash(props.composition))
const { isTitle, field } = useEffectSurface(() => props.measure)

const size = computed(() => {
  const box = props.measure.box
  if (isTitle.value) return Math.max(6, box.h * 0.9)
  return pctSize(Math.min(box.w, box.h), cfg.value.size)
})

const pad = computed(() => (field.value ? 0 : Math.round(size.value * 2)))

const dryRamp = computed(() => {
  const c = cfg.value
  return Array.from({ length: DRY_STEPS + 1 }, (_, i) => {
    const dry = i / DRY_STEPS
    return { base: lerpHex(c.splat, c.dark, dry * 0.6), pulp: lerpHex(c.color, c.dark, dry * 0.45) }
  })
})

function aimFrom(start: Vec, target: Vec, spin: number): Throw {
  const d = Math.hypot(start.x - target.x, start.y - target.y) || 1
  return { start, target, out: { x: (start.x - target.x) / d, y: (start.y - target.y) / d }, spin }
}

function throwFor(seed: number, box: ContentBox, ring: RingGeometry, D: number): Throw {
  const spin = (hash01(seed + 9) > 0.5 ? 1 : -1) * (6 + hash01(seed + 10) * 4)
  if (isTitle.value) {
    const tx = box.x + box.w * (0.1 + hash01(seed + 1) * 0.8)
    const side = hash01(seed + 2) > 0.5 ? 1 : -1
    return aimFrom({ x: tx - side * D * 1.6, y: box.y - D * THROW_REACH }, { x: tx, y: box.y + box.h * 0.55 }, spin)
  }
  if (field.value) {
    const wall = boxRing(box)
    const edge = ringAt(wall, hash01(seed + 3) * wall.total)
    const depth = (0.1 + hash01(seed + 2) * 0.8) * (Math.abs(edge.n.x) * box.w + Math.abs(edge.n.y) * box.h)
    const drift = (hash01(seed + 4) - 0.5) * D * 3
    const target = { x: edge.p.x - edge.n.x * depth, y: edge.p.y - edge.n.y * depth }
    const start = { x: edge.p.x + edge.n.x * D * 2.2 + edge.t.x * drift, y: edge.p.y + edge.n.y * D * 2.2 + edge.t.y * drift }
    return aimFrom(start, target, spin)
  }
  const hit = ringAt(ring.band, hash01(seed + 1) * ring.band.total)
  const out = hit.n
  return { start: { x: hit.p.x + out.x * D * THROW_REACH, y: hit.p.y + out.y * D * THROW_REACH }, target: hit.p, out, spin }
}

function drawPumpkin(g: Ctx, x: number, y: number, D: number, rot: number) {
  const c = cfg.value
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.fillStyle = c.dark
  g.beginPath()
  g.ellipse(0, 0, D * 0.5, D * 0.42, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = c.color
  for (const [ox, rx] of LOBES) {
    g.beginPath()
    g.ellipse(ox * D, 0, rx * D, D * 0.39, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = c.stem
  g.beginPath()
  g.roundRect(-D * 0.06, -D * 0.56, D * 0.12, D * 0.2, D * 0.03)
  g.fill()
  g.fillStyle = 'rgba(255, 255, 255, 0.28)'
  g.beginPath()
  g.ellipse(-D * 0.16, -D * 0.2, D * 0.1, D * 0.06, -0.5, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

function stainPath(g: Ctx, cx: number, cy: number, R: number, seed: number, lobes = 9) {
  g.beginPath()
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2
    const r = R * (0.62 + hash01(seed + (i % lobes) * 5) * 0.55)
    const px = cx + Math.cos(a) * r
    const py = cy + Math.sin(a) * r
    if (i === 0) g.moveTo(px, py)
    else {
      const am = a - Math.PI / lobes
      const rm = R * (0.5 + hash01(seed + i * 3) * 0.3)
      g.quadraticCurveTo(cx + Math.cos(am) * rm, cy + Math.sin(am) * rm, px, py)
    }
  }
  g.closePath()
}

interface SplatLook {
  base: string
  pulp: string
  alpha: number
  dry: number
}

function splatLook(tau: number): SplatLook {
  const dry = Math.max(0, Math.min(1, (tau - 1.6) / 1.4))
  const tone = dryRamp.value[Math.round(dry * DRY_STEPS)] ?? dryRamp.value[0]
  return {
    base: tone?.base ?? cfg.value.splat,
    pulp: tone?.pulp ?? cfg.value.color,
    alpha: tau > SPLAT - 0.6 ? Math.max(0, (SPLAT - tau) / 0.6) : 1,
    dry,
  }
}

function drawStain(g: Ctx, t: Vec, R: number, seed: number, look: SplatLook) {
  g.globalAlpha = look.alpha * 0.92
  g.fillStyle = look.base
  stainPath(g, t.x, t.y, R, seed)
  g.fill()
  for (let i = 0; i < 6; i++) {
    const s = seed + 70 + i * 9
    const a = hash01(s) * Math.PI * 2
    const d = R * (1.05 + hash01(s + 1) * 0.55)
    const r = R * (0.06 + hash01(s + 2) * 0.1)
    g.beginPath()
    g.arc(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, r, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = look.alpha * 0.95
  g.fillStyle = look.pulp
  stainPath(g, t.x + R * 0.08, t.y - R * 0.05, R * 0.58, seed + 5, 7)
  g.fill()
  g.strokeStyle = look.pulp
  g.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const s = seed + 90 + i * 7
    const a = hash01(s) * Math.PI * 2
    const l = R * (0.7 + hash01(s + 1) * 0.5)
    g.lineWidth = Math.max(1, R * (0.1 + hash01(s + 2) * 0.08))
    g.beginPath()
    g.moveTo(t.x + Math.cos(a) * R * 0.3, t.y + Math.sin(a) * R * 0.3)
    g.quadraticCurveTo(t.x + Math.cos(a + 0.4) * l * 0.6, t.y + Math.sin(a + 0.4) * l * 0.6, t.x + Math.cos(a) * l, t.y + Math.sin(a) * l)
    g.stroke()
  }
}

function drawPips(g: Ctx, t: Vec, R: number, seed: number, look: SplatLook) {
  g.globalAlpha = look.alpha
  for (let i = 0; i < 6; i++) {
    const s = seed + 120 + i * 11
    const a = hash01(s) * Math.PI * 2
    const d = R * (0.15 + hash01(s + 1) * 0.6)
    const rot = hash01(s + 2) * Math.PI
    const rx = Math.max(1, R * 0.11)
    g.save()
    g.translate(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d)
    g.rotate(rot)
    g.fillStyle = cfg.value.pip
    g.beginPath()
    g.moveTo(-rx, 0)
    g.quadraticCurveTo(0, -rx * 0.75, rx, 0)
    g.quadraticCurveTo(0, rx * 0.75, -rx, 0)
    g.fill()
    g.fillStyle = look.base
    g.beginPath()
    g.arc(rx * 0.45, 0, rx * 0.18, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
}

function drawDrips(g: Ctx, t: Vec, R: number, tau: number, D: number, seed: number, look: SplatLook) {
  if (tau < 0.2) return
  g.globalAlpha = look.alpha * 0.9
  g.fillStyle = look.base
  for (let d = 0; d < 3; d++) {
    const s = seed + 40 + d * 7
    const x = t.x + (hash01(s) - 0.5) * R * 1.3
    const maxLen = R * (1 + hash01(s + 1) * 0.9)
    const len = Math.min(maxLen, (tau - 0.2) * D * (0.35 + hash01(s + 3) * 0.2) * (1 - look.dry * 0.3))
    const w0 = R * (0.12 + hash01(s + 2) * 0.1)
    const w1 = w0 * 0.35
    const top = t.y + R * 0.35
    const n = 8
    g.beginPath()
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const wob = Math.sin(u * 5 + s) * w0 * 0.25
      g.lineTo(x + wob - (w0 + (w1 - w0) * u) / 2, top + len * u)
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n
      const wob = Math.sin(u * 5 + s) * w0 * 0.25
      g.lineTo(x + wob + (w0 + (w1 - w0) * u) / 2, top + len * u)
    }
    g.closePath()
    g.fill()
    const dropR = w1 * (1.4 + Math.min(1, len / maxLen) * 1.1)
    g.beginPath()
    g.ellipse(x + Math.sin(5 + s) * w0 * 0.25, top + len + dropR * 0.4, dropR, dropR * 1.2, 0, 0, Math.PI * 2)
    g.fill()
  }
}

function drawSplat(g: Ctx, th: Throw, tau: number, D: number, seed: number) {
  const look = splatLook(tau)
  const R = D * 0.75 * easeOut(tau / 0.12) * (1 - look.dry * 0.08)
  drawStain(g, th.target, R, seed, look)
  drawPips(g, th.target, R, seed, look)
  drawDrips(g, th.target, R, tau, D, seed, look)
  if (tau < 0.9) drawChunks(g, th, tau, D, seed)
  g.globalAlpha = 1
}

function drawChunks(g: Ctx, th: Throw, tau: number, D: number, seed: number) {
  const c = cfg.value
  const base = Math.atan2(th.out.y, th.out.x)
  g.globalAlpha = 1 - tau / 0.9
  for (let i = 0; i < 10; i++) {
    const s = seed + 60 + i * 13
    const phi = base + (hash01(s) - 0.5) * 2.6
    const v = D * (1.4 + hash01(s + 1) * 1.6)
    const px = th.target.x + Math.cos(phi) * v * tau
    const py = th.target.y + Math.sin(phi) * v * tau + D * 3 * tau * tau
    const r = D * (0.09 + hash01(s + 2) * 0.12)
    g.fillStyle = hash01(s + 3) > 0.3 ? c.color : c.dark
    g.save()
    g.translate(px, py)
    g.rotate(phi + tau * 8)
    stainPath(g, 0, 0, r, s, 6)
    g.fill()
    g.restore()
  }
}

function drawFrame(f: EffectFrame): boolean {
  const D = size.value
  const seed0 = props.measure.stack * 101 + 23
  const events = f.reduced ? [{ age: FLIGHT + 0.6, seed: seed0 }] : activeEvents(f.t, cfg.value.intervalSecs, LIFE, seed0)
  for (const ev of events) {
    const th = throwFor(ev.seed, f.box, f.ring, D)
    if (ev.age < FLIGHT) {
      const u = ev.age / FLIGHT
      const px = th.start.x + (th.target.x - th.start.x) * u - th.out.y * Math.sin(Math.PI * u) * D * 0.5
      const py = th.start.y + (th.target.y - th.start.y) * u + th.out.x * Math.sin(Math.PI * u) * D * 0.5
      drawPumpkin(f.g, px, py, D, u * th.spin)
    } else {
      drawSplat(f.g, th, ev.age - FLIGHT, D, ev.seed)
    }
  }
  return events.length > 0
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
