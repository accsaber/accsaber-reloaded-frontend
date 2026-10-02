<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/api/items'
import { asColor, asNumber, boxRing, clampNumber, easeIn, easeOut, geometryMemo, hostMatches, pctSize, readPctSizing, ringAt, type ContentBox, type EffectFrame, type EffectMeasure, type PctSizing, type RingGeometry, type RingPoly, type Vec } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed, watch } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

type Ctx = CanvasRenderingContext2D

interface EldritchConfig {
  color: string
  sucker: string
  rim: string
  count: number
  length: PctSizing
  intervalSecs: number
  holdSecs: number
}

function readEldritch(c: Composition): EldritchConfig {
  return {
    color: asColor(c.color),
    sucker: asColor(c.sucker),
    rim: asColor(c.rim),
    count: Math.round(clampNumber(c.count, 1, 6, 3)),
    length: readPctSizing(c, 'lengthPct', [10, 45, 120], [12, 24], [24, 320]),
    intervalSecs: Math.max(4, asNumber(c.intervalSecs) ?? 9),
    holdSecs: Math.max(0.5, asNumber(c.holdSecs) ?? 3),
  }
}

interface Tentacle {
  seed: number
  base: Vec
  heading: number
  out: Vec
  len: number
  thick: number
  curl: number
  phase: number
  mode: 'slide' | 'emerge' | 'fade'
  cycle: number
}

const SEGMENTS = 36
const EXTEND_SECS = 1.6
const RETRACT_SECS = 1.4
const CURL_WEIGHT = Array.from({ length: SEGMENTS }, (_, i) => Math.pow((i + 1) / SEGMENTS, 1.5))
const CURL_TOTAL = CURL_WEIGHT.reduce((a, b) => a + b, 0)

const cfg = computed(() => readEldritch(props.composition))
const { isTitle, field } = useEffectSurface(() => props.measure)
const liquid = computed(() => hostMatches(props.composition.liquid, props.measure.host))

const length = computed(() => {
  const box = props.measure.box
  if (isTitle.value) return Math.max(10, box.h * 2.2)
  return pctSize(Math.min(box.w, box.h), cfg.value.length)
})

const pad = computed(() => {
  if (field.value) return 0
  return Math.round(length.value * (isTitle.value ? 1.3 : 0.6))
})

const specs = geometryMemo<Tentacle[]>(4)
watch([cfg, liquid, isTitle, field], specs.clear)

const spinePts: Vec[] = Array.from({ length: SEGMENTS + 1 }, () => ({ x: 0, y: 0 }))
const spineNormals: Vec[] = Array.from({ length: SEGMENTS + 1 }, () => ({ x: 0, y: 0 }))

function titleTentacle(i: number, seed: number, box: ContentBox, L: number): Tentacle {
  const x = box.x + box.w * (0.15 + hash01(seed + 2) * 0.7)
  return {
    seed,
    base: { x, y: box.y + box.h * 1.05 },
    heading: -Math.PI / 2 + (i % 2 === 0 ? 0.35 : -0.35),
    out: { x: 0, y: 1 },
    len: L,
    thick: Math.max(2.5, box.h * 0.3),
    curl: (i % 2 === 0 ? -1 : 1) * (2.4 + hash01(seed + 4) * 0.8),
    phase: i * (cfg.value.intervalSecs / 2),
    mode: 'fade',
    cycle: 0,
  }
}

function fieldTentacle(i: number, seed: number, count: number, L: number): Tentacle {
  return {
    seed,
    base: { x: 0, y: 0 },
    heading: 0,
    out: { x: 0, y: 0 },
    len: L,
    thick: L * 0.2,
    curl: 0,
    phase: (i / count) * cfg.value.intervalSecs,
    mode: 'slide',
    cycle: -1,
  }
}

function placeOnEdge(t: Tentacle, box: ContentBox, cycle: number): void {
  const roll = t.seed + cycle * 977
  const wall = boxRing(box)
  const at = ringAt(wall, hash01(roll + 2) * wall.total)
  t.base = at.p
  t.out = at.n
  t.heading = Math.atan2(-at.n.y, -at.n.x)
  t.curl = (hash01(roll + 5) > 0.5 ? 1 : -1) * (2.2 + hash01(roll + 4) * 0.9)
  t.cycle = cycle
}

function badgeTentacle(i: number, seed: number, count: number, ring: RingGeometry, L: number): Tentacle {
  const edge = ring.inner
  const at = ringAt(edge, ((i + hash01(seed + 2) * 0.6) / count) * edge.total)
  const side = i % 2 === 0 ? 1 : -1
  const thick = L * 0.2
  const inward = Math.atan2(-at.n.y, -at.n.x)
  return {
    seed,
    base: { x: at.p.x + at.n.x * thick, y: at.p.y + at.n.y * thick },
    heading: inward + (hash01(seed + 5) - 0.5) * 0.24,
    out: at.n,
    len: liquid.value ? L * 0.85 : L,
    thick,
    curl: side * (2.2 + hash01(seed + 4) * 0.8),
    phase: (i / count) * cfg.value.intervalSecs + hash01(seed + 6),
    mode: 'emerge',
    cycle: 0,
  }
}

function tentacles(box: ContentBox, ring: RingGeometry): Tentacle[] {
  const L = length.value
  const count = isTitle.value ? Math.min(2, cfg.value.count) : cfg.value.count
  const out: Tentacle[] = []
  for (let i = 0; i < count; i++) {
    const seed = props.measure.stack * 101 + i * 13 + 7
    if (isTitle.value) out.push(titleTentacle(i, seed, box, L))
    else if (field.value) out.push(fieldTentacle(i, seed, count, L))
    else out.push(badgeTentacle(i, seed, count, ring, L))
  }
  return out
}

function extension(t: Tentacle, tSec: number): number {
  const T = cfg.value.intervalSecs
  const local = (tSec + t.phase) % T
  if (local < EXTEND_SECS) return easeOut(local / EXTEND_SECS)
  const holdEnd = EXTEND_SECS + cfg.value.holdSecs
  if (local < holdEnd) return 1
  if (local < holdEnd + RETRACT_SECS) return 1 - easeIn((local - holdEnd) / RETRACT_SECS)
  return 0
}

function spine(t: Tentacle, tSec: number, ext: number): number {
  const slide = t.mode === 'slide' ? (1 - ext) * t.len * 1.15 : 0
  let x = t.base.x + t.out.x * slide
  let y = t.base.y + t.out.y * slide
  spinePts[0].x = x
  spinePts[0].y = y
  let a = t.heading
  const n = t.mode === 'emerge' ? Math.max(2, Math.round(SEGMENTS * ext)) : SEGMENTS
  const step = t.len / SEGMENTS
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / SEGMENTS
    a += (t.curl * (CURL_WEIGHT[i] ?? 0)) / CURL_TOTAL + Math.sin(tSec * 1.3 + u * 6 + t.seed) * 0.03
    x += Math.cos(a) * step
    y += Math.sin(a) * step
    spinePts[i + 1].x = x
    spinePts[i + 1].y = y
  }
  return n + 1
}

function widthAt(thick: number, i: number): number {
  return thick * (1 - (i / SEGMENTS) * 0.86) * 0.5
}

function fillNormals(count: number): void {
  for (let i = 0; i < count; i++) {
    const q = spinePts[Math.min(count - 1, i + 1)]
    const r = spinePts[Math.max(0, i - 1)]
    const dx = q.x - r.x
    const dy = q.y - r.y
    const d = Math.hypot(dx, dy) || 1
    spineNormals[i].x = -dy / d
    spineNormals[i].y = dx / d
  }
}

function tracePath(g: Ctx, count: number, thick: number, sign: number, reverse: boolean): void {
  for (let j = 0; j < count; j++) {
    const i = reverse ? count - 1 - j : j
    const p = spinePts[i]
    const nn = spineNormals[i]
    const w = widthAt(thick, i) * sign
    if (j === 0 && !reverse) g.moveTo(p.x + nn.x * w, p.y + nn.y * w)
    else g.lineTo(p.x + nn.x * w, p.y + nn.y * w)
  }
}

function drawTentacle(g: Ctx, t: Tentacle, count: number, thick: number, reduced: boolean, tSec: number, alpha: number) {
  fillNormals(count)
  const side = Math.sign(t.curl) || 1
  g.globalAlpha = alpha
  g.fillStyle = cfg.value.color
  g.beginPath()
  tracePath(g, count, thick, 1, false)
  tracePath(g, count, thick, -1, true)
  g.closePath()
  g.fill()
  g.strokeStyle = cfg.value.rim
  g.globalAlpha = alpha * 0.55
  g.lineWidth = Math.max(0.8, thick * 0.06)
  g.beginPath()
  tracePath(g, count, thick, -side, false)
  g.stroke()
  g.globalAlpha = alpha
  g.fillStyle = cfg.value.sucker
  for (let i = 3; i < count - 2; i += 3) {
    const p = spinePts[i]
    const nn = spineNormals[i]
    const w = widthAt(thick, i)
    const pulse = reduced ? 1 : 0.85 + Math.sin(tSec * 3 + i) * 0.15
    g.beginPath()
    g.arc(p.x + nn.x * w * side * 0.55, p.y + nn.y * w * side * 0.55, Math.max(0.6, w * 0.32 * pulse), 0, Math.PI * 2)
    g.fill()
  }
}

function drawDrips(g: Ctx, t: Tentacle, count: number, tSec: number) {
  g.fillStyle = cfg.value.sucker
  for (let k = 0; k < 3; k++) {
    const seed = t.seed * 7 + k * 31
    const period = 1.4 + hash01(seed) * 1.2
    const fall = ((tSec + hash01(seed + 1) * period) % period) / period
    const p = spinePts[Math.min(count - 1, Math.round(8 + hash01(seed + 2) * (count - 10)))]
    g.globalAlpha = 1 - fall
    g.beginPath()
    g.arc(p.x, p.y + fall * fall * t.len * 0.5, Math.max(0.8, t.thick * 0.12) * (1 - fall * 0.3), 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

function clipToEdge(g: Ctx, edge: RingPoly): void {
  g.beginPath()
  edge.pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)))
  g.closePath()
  g.clip()
}

function drawFrame(f: EffectFrame): boolean {
  let drew = false
  const badge = !isTitle.value && !field.value
  if (badge) {
    f.g.save()
    clipToEdge(f.g, f.ring.inner)
  }
  for (const t of specs.get(f.ring, 0, () => tentacles(f.box, f.ring))) {
    if (t.mode === 'slide') {
      const cycle = f.reduced ? 0 : Math.floor((f.t + t.phase) / cfg.value.intervalSecs)
      if (cycle !== t.cycle) placeOnEdge(t, f.box, cycle)
    }
    const ext = f.reduced ? 1 : extension(t, f.t)
    if (ext <= 0.02) continue
    const count = spine(t, f.reduced ? 0 : f.t, ext)
    const thick = t.mode === 'emerge' ? t.thick * Math.min(1, ext * 2.5) : t.thick
    drawTentacle(f.g, t, count, thick, f.reduced, f.t, t.mode === 'fade' ? ext : 1)
    if (t.mode === 'emerge' && liquid.value && ext >= 1 && !f.reduced) drawDrips(f.g, t, count, f.t)
    drew = true
  }
  if (badge) f.g.restore()
  f.g.globalAlpha = 1
  return drew
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
