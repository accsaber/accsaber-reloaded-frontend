<script setup lang="ts">
import { useEffectCanvas, type EffectFrame } from '@/composables/useEffectCanvas'
import type { Composition } from '@/types/api/items'
import { asNumber, asString, easeIn, easeOut, hostMatches, isFieldKey, padBox, pctSize, ringAt, ringGeometry, type ContentBox, type EffectMeasure, type Vec } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

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
  lengthPct: number
  minPx: number
  maxPx: number
  intervalSecs: number
  holdSecs: number
}

function readEldritch(c: Composition): EldritchConfig {
  return {
    color: asString(c.color) ?? '#221532',
    sucker: asString(c.sucker) ?? '#c96bd9',
    rim: asString(c.rim) ?? '#8a63e0',
    count: Math.max(1, Math.min(6, Math.round(asNumber(c.count) ?? 3))),
    lengthPct: Math.max(10, Math.min(120, asNumber(c.lengthPct) ?? 45)),
    minPx: Math.max(12, asNumber(c.minPx) ?? 24),
    maxPx: Math.max(24, asNumber(c.maxPx) ?? 320),
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
}

const SEGMENTS = 36
const EXTEND_SECS = 1.6
const RETRACT_SECS = 1.4
const CURL_WEIGHT = Array.from({ length: SEGMENTS }, (_, i) => Math.pow((i + 1) / SEGMENTS, 1.5))
const CURL_TOTAL = CURL_WEIGHT.reduce((a, b) => a + b, 0)

const cfg = computed(() => readEldritch(props.composition))
const isTitle = computed(() => props.measure.typeKey === 'title')
const field = computed(() => isFieldKey(props.measure.typeKey))
const liquid = computed(() => hostMatches(props.composition.liquid, props.measure.host))

const length = computed(() => {
  const box = props.measure.box
  if (isTitle.value) return Math.max(10, box.h * 2.2)
  return pctSize(Math.min(box.w, box.h), cfg.value.lengthPct, cfg.value.minPx, cfg.value.maxPx)
})

const pad = computed(() => Math.round(length.value * 1.3))

const ring = computed(() => ringGeometry(props.measure, padBox(props.measure.box, pad.value)))

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
  }
}

function fieldTentacle(i: number, seed: number, box: ContentBox, L: number): Tentacle {
  const edge = (i + Math.floor(hash01(seed + 1) * 4)) % 4
  const along = 0.15 + hash01(seed + 2) * 0.7
  const base = edge === 0 ? { x: box.x + box.w * along, y: box.y }
    : edge === 1 ? { x: box.x + box.w, y: box.y + box.h * along }
      : edge === 2 ? { x: box.x + box.w * along, y: box.y + box.h }
        : { x: box.x, y: box.y + box.h * along }
  const out = edge === 0 ? { x: 0, y: -1 } : edge === 1 ? { x: 1, y: 0 } : edge === 2 ? { x: 0, y: 1 } : { x: -1, y: 0 }
  return {
    seed,
    base,
    heading: Math.atan2(-out.y, -out.x),
    out,
    len: L,
    thick: L * 0.2,
    curl: (hash01(seed + 5) > 0.5 ? 1 : -1) * (2.2 + hash01(seed + 4) * 0.9),
    phase: (i / Math.max(1, cfg.value.count)) * cfg.value.intervalSecs,
    mode: 'slide',
  }
}

function badgeTentacle(i: number, seed: number, count: number, _box: ContentBox, L: number): Tentacle {
  const wall = ring.value.outer
  const at = ringAt(wall, ((i + hash01(seed + 2) * 0.6) / count) * wall.total)
  const side = i % 2 === 0 ? 1 : -1
  const thick = L * 0.2
  const inward = Math.atan2(-at.n.y, -at.n.x)
  return {
    seed,
    base: { x: at.p.x - at.n.x * thick * 0.7, y: at.p.y - at.n.y * thick * 0.7 },
    heading: inward + (hash01(seed + 5) - 0.5) * 0.24,
    out: at.n,
    len: liquid.value ? L * 0.85 : L,
    thick,
    curl: side * (2.2 + hash01(seed + 4) * 0.8),
    phase: (i / count) * cfg.value.intervalSecs + hash01(seed + 6),
    mode: 'emerge',
  }
}

function tentacles(box: ContentBox): Tentacle[] {
  const L = length.value
  const count = isTitle.value ? Math.min(2, cfg.value.count) : cfg.value.count
  const out: Tentacle[] = []
  for (let i = 0; i < count; i++) {
    const seed = props.measure.stack * 101 + i * 13 + 7
    if (isTitle.value) out.push(titleTentacle(i, seed, box, L))
    else if (field.value) out.push(fieldTentacle(i, seed, box, L))
    else out.push(badgeTentacle(i, seed, count, box, L))
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

function spine(t: Tentacle, tSec: number, ext: number): Vec[] {
  const slide = t.mode === 'slide' ? (1 - ext) * t.len * 1.15 : 0
  let x = t.base.x + t.out.x * slide
  let y = t.base.y + t.out.y * slide
  const pts: Vec[] = [{ x, y }]
  let a = t.heading
  const n = t.mode === 'emerge' ? Math.max(2, Math.round(SEGMENTS * ext)) : SEGMENTS
  const step = t.len / SEGMENTS
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / SEGMENTS
    a += (t.curl * (CURL_WEIGHT[i] ?? 0)) / CURL_TOTAL + Math.sin(tSec * 1.3 + u * 6 + t.seed) * 0.03
    x += Math.cos(a) * step
    y += Math.sin(a) * step
    pts.push({ x, y })
  }
  return pts
}

function widthAt(t: Tentacle, i: number): number {
  return t.thick * (1 - (i / SEGMENTS) * 0.86) * 0.5
}

function normals(pts: Vec[]): Vec[] {
  return pts.map((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)] ?? p
    const r = pts[Math.max(0, i - 1)] ?? p
    const dx = q.x - r.x
    const dy = q.y - r.y
    const d = Math.hypot(dx, dy) || 1
    return { x: -dy / d, y: dx / d }
  })
}

function drawTentacle(g: Ctx, t: Tentacle, pts: Vec[], reduced: boolean, tSec: number, alpha = 1) {
  const ns = normals(pts)
  const side = Math.sign(t.curl) || 1
  g.globalAlpha = alpha
  g.fillStyle = cfg.value.color
  g.beginPath()
  pts.forEach((p, i) => {
    const w = widthAt(t, i)
    const nn = ns[i] ?? { x: 0, y: 0 }
    if (i === 0) g.moveTo(p.x + nn.x * w, p.y + nn.y * w)
    else g.lineTo(p.x + nn.x * w, p.y + nn.y * w)
  })
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    const nn = ns[i]
    if (!p || !nn) continue
    const w = widthAt(t, i)
    g.lineTo(p.x - nn.x * w, p.y - nn.y * w)
  }
  g.closePath()
  g.fill()
  g.strokeStyle = cfg.value.rim
  g.globalAlpha = alpha * 0.55
  g.lineWidth = Math.max(0.8, t.thick * 0.06)
  g.beginPath()
  pts.forEach((p, i) => {
    const w = widthAt(t, i)
    const nn = ns[i]
    if (!nn) return
    const x = p.x - nn.x * w * side
    const y = p.y - nn.y * w * side
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  })
  g.stroke()
  g.globalAlpha = alpha
  g.fillStyle = cfg.value.sucker
  for (let i = 3; i < pts.length - 2; i += 3) {
    const p = pts[i]
    const nn = ns[i]
    if (!p || !nn) continue
    const w = widthAt(t, i)
    const pulse = reduced ? 1 : 0.85 + Math.sin(tSec * 3 + i) * 0.15
    g.beginPath()
    g.arc(p.x + nn.x * w * side * 0.55, p.y + nn.y * w * side * 0.55, Math.max(0.6, w * 0.32 * pulse), 0, Math.PI * 2)
    g.fill()
  }
}

function drawDrips(g: Ctx, t: Tentacle, pts: Vec[], tSec: number) {
  g.fillStyle = cfg.value.sucker
  for (let k = 0; k < 3; k++) {
    const seed = t.seed * 7 + k * 31
    const period = 1.4 + hash01(seed) * 1.2
    const fall = ((tSec + hash01(seed + 1) * period) % period) / period
    const p = pts[Math.min(pts.length - 1, Math.round(8 + hash01(seed + 2) * (pts.length - 10)))]
    if (!p) continue
    g.globalAlpha = 1 - fall
    g.beginPath()
    g.arc(p.x, p.y + fall * fall * t.len * 0.5, Math.max(0.8, t.thick * 0.12) * (1 - fall * 0.3), 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

function drawFrame(f: EffectFrame) {
  for (const t of tentacles(f.box)) {
    const ext = f.reduced ? 1 : extension(t, f.t)
    if (ext <= 0.02) continue
    const pts = spine(t, f.reduced ? 0 : f.t, ext)
    const grown = t.mode === 'emerge' ? { ...t, thick: t.thick * Math.min(1, ext * 2.5) } : t
    drawTentacle(f.g, grown, pts, f.reduced, f.t, t.mode === 'fade' ? ext : 1)
    if (t.mode === 'emerge' && liquid.value && ext >= 1 && !f.reduced) drawDrips(f.g, t, pts, f.t)
  }
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
