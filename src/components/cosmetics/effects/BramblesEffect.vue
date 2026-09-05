<script setup lang="ts">
import { useEffectCanvas, type EffectFrame } from '@/composables/useEffectCanvas'
import type { Composition } from '@/types/api/items'
import { useThemeStore } from '@/stores/theme'
import { asNumber, asString, easeOut, isFieldKey, padBox, pctSize, ringAt, ringGeometry, type ContentBox, type EffectMeasure, type RingPoly, type Vec } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

const themeStore = useThemeStore()

type Ctx = CanvasRenderingContext2D

interface BrambleConfig {
  color: string
  highlight: string
  leaf: string
  leafDark: string
  berry: string
  count: number
  cycleSecs: number
  lengthPct: number
  minPx: number
  maxPx: number
  thornEvery: number
  leafEvery: number
}

function readBrambles(c: Composition, light: boolean): BrambleConfig {
  return {
    color: light ? asString(c.lightColor) ?? '#2a1d14' : asString(c.color) ?? '#4a3626',
    highlight: light ? asString(c.lightHighlight) ?? '#6b4f3a' : asString(c.highlight) ?? '#8a6a4a',
    leaf: asString(c.leaf) ?? '#5d7a3a',
    leafDark: asString(c.leafDark) ?? '#3c5226',
    berry: asString(c.berry) ?? '#8c1d2e',
    count: Math.max(1, Math.min(8, Math.round(asNumber(c.count) ?? 4))),
    cycleSecs: Math.max(6, asNumber(c.cycleSecs) ?? 16),
    lengthPct: Math.max(10, Math.min(200, asNumber(c.lengthPct) ?? 90)),
    minPx: Math.max(10, asNumber(c.minPx) ?? 30),
    maxPx: Math.max(30, asNumber(c.maxPx) ?? 520),
    thornEvery: Math.max(2, Math.min(8, Math.round(asNumber(c.thornEvery) ?? 4))),
    leafEvery: Math.max(3, Math.min(12, Math.round(asNumber(c.leafEvery) ?? 7))),
  }
}

interface Node {
  p: Vec
  n: Vec
  t: Vec
  side: number
  thorn: boolean
  leaf: boolean
  berry: boolean
  scale: number
}

interface Vine {
  nodes: Node[]
  width: number
  thorn: number
  leaf: number
}

const STEPS = 36

const light = computed(() => (props.measure.host?.base ?? themeStore.resolvedBase) === 'light')
const cfg = computed(() => readBrambles(props.composition, light.value))
const isTitle = computed(() => props.measure.typeKey === 'title')
const field = computed(() => isFieldKey(props.measure.typeKey))

const pad = computed(() => {
  const box = props.measure.box
  return Math.round(isTitle.value ? box.h * 0.6 : Math.min(box.w, box.h) * 0.14)
})

const ring = computed(() => ringGeometry(props.measure, padBox(props.measure.box, pad.value)))
const walkPoly = computed<RingPoly>(() => (isTitle.value || field.value ? ring.value.outer : ring.value.band))

interface VineSpec {
  start: number
  dir: number
  len: number
  amp: number
  width: number
  thorn: number
  leaf: number
}

function vineSpec(i: number, seed: number, box: ContentBox): VineSpec {
  const c = cfg.value
  const minD = Math.min(box.w, box.h)
  const P = walkPoly.value.total
  if (isTitle.value) {
    return {
      start: i === 0 ? box.w * 0.15 : box.w + box.h + box.w * 0.15,
      dir: 1,
      len: box.w * 0.7,
      amp: box.h * 0.1,
      width: Math.max(0.8, box.h * 0.07),
      thorn: Math.max(1.5, box.h * 0.2),
      leaf: Math.max(2, box.h * 0.32),
    }
  }
  if (field.value) {
    const len = pctSize(minD, c.lengthPct * 0.4, c.minPx, c.maxPx)
    const corner = [0, box.w, box.w + box.h, 2 * box.w + box.h][i % 4] ?? 0
    return {
      start: corner + (hash01(seed) - 0.5) * minD * 0.1,
      dir: hash01(seed + 1) > 0.5 ? 1 : -1,
      len,
      amp: Math.max(3, len * 0.08),
      width: Math.max(1, Math.min(4.5, len * 0.02)),
      thorn: Math.max(2, len * 0.07),
      leaf: Math.max(3, len * 0.11),
    }
  }
  const count = c.count
  return {
    start: (i / count) * P + hash01(seed) * (P / count) * 0.5,
    dir: hash01(seed + 1) > 0.5 ? 1 : -1,
    len: pctSize(minD, c.lengthPct * 0.45, c.minPx, c.maxPx),
    amp: Math.max(2, minD * 0.03),
    width: Math.max(1.2, Math.min(4.5, minD * 0.024)),
    thorn: Math.max(2, minD * 0.05),
    leaf: Math.max(3, minD * 0.09),
  }
}

function buildVine(spec: VineSpec, seed: number): Vine {
  const c = cfg.value
  const poly = walkPoly.value
  const nodes: Node[] = []
  const step = spec.len / STEPS
  let offset = 0
  let drift = 0
  for (let i = 0; i <= STEPS; i++) {
    drift += (hash01(seed + i * 3) - 0.5) * spec.amp * 0.5
    drift *= 0.82
    offset = Math.max(-spec.amp, Math.min(spec.amp, offset + drift))
    const { p, n, t } = ringAt(poly, spec.start + spec.dir * i * step)
    const tt = { x: t.x * spec.dir, y: t.y * spec.dir }
    const leaf = i > 2 && i < STEPS - 1 && (i + 3) % c.leafEvery === 0
    const thorn = !leaf && i > 1 && i < STEPS - 1 && i % c.thornEvery === 0
    nodes.push({
      p: { x: p.x + n.x * offset, y: p.y + n.y * offset },
      n,
      t: tt,
      side: Math.floor(i / 2) % 2 === 0 ? 1 : -1,
      thorn,
      leaf,
      berry: leaf && hash01(seed + i * 11) > 0.72,
      scale: 0.7 + hash01(seed + i * 5) * 0.5,
    })
  }
  return { nodes, width: spec.width, thorn: spec.thorn, leaf: spec.leaf }
}

function drawStem(g: Ctx, v: Vine, progress: number, alpha: number) {
  const reach = progress * STEPS
  const full = Math.floor(reach)
  const drawPass = (color: string, scale: number, passAlpha: number, shift: number) => {
    g.strokeStyle = color
    g.globalAlpha = alpha * passAlpha
    g.lineCap = 'round'
    for (let i = 1; i <= Math.min(STEPS, full + 1); i++) {
      const a = v.nodes[i - 1]
      const b = v.nodes[i]
      if (!a || !b) break
      const frac = i <= full ? 1 : reach - full
      const nx = a.n.x * v.width * shift
      const ny = a.n.y * v.width * shift
      g.lineWidth = Math.max(0.5, v.width * (1 - 0.65 * (i / STEPS)) * scale)
      g.beginPath()
      g.moveTo(a.p.x + nx, a.p.y + ny)
      g.lineTo(a.p.x + nx + (b.p.x - a.p.x) * frac, a.p.y + ny + (b.p.y - a.p.y) * frac)
      g.stroke()
    }
  }
  drawPass(cfg.value.color, 1, 1, 0)
  drawPass(cfg.value.highlight, 0.32, 0.55, 0.22)
}

function drawThorn(g: Ctx, v: Vine, nd: Node, s: number) {
  const len = v.thorn * nd.scale * s
  const bx = nd.p.x - nd.t.x * v.width * 0.7
  const by = nd.p.y - nd.t.y * v.width * 0.7
  const ex = nd.p.x + nd.t.x * v.width * 0.7
  const ey = nd.p.y + nd.t.y * v.width * 0.7
  const tipX = nd.p.x + nd.n.x * nd.side * len + nd.t.x * len * 0.5
  const tipY = nd.p.y + nd.n.y * nd.side * len + nd.t.y * len * 0.5
  g.fillStyle = cfg.value.color
  g.beginPath()
  g.moveTo(bx, by)
  g.quadraticCurveTo(bx + nd.n.x * nd.side * len * 0.55, by + nd.n.y * nd.side * len * 0.55, tipX, tipY)
  g.quadraticCurveTo(ex + nd.n.x * nd.side * len * 0.25 + nd.t.x * len * 0.2, ey + nd.n.y * nd.side * len * 0.25 + nd.t.y * len * 0.2, ex, ey)
  g.closePath()
  g.fill()
}

function drawLeaf(g: Ctx, v: Vine, nd: Node, s: number, droop: number) {
  const len = v.leaf * nd.scale * s
  const base = Math.atan2(nd.n.y * nd.side, nd.n.x * nd.side)
  const lean = Math.atan2(nd.t.y, nd.t.x)
  let ang = base + (lean - base) * 0.35
  ang += (Math.PI / 2 - ang) * droop * 0.7
  const ax = Math.cos(ang)
  const ay = Math.sin(ang)
  const px = -ay
  const py = ax
  const tipX = nd.p.x + ax * len
  const tipY = nd.p.y + ay * len
  const mx = nd.p.x + ax * len * 0.5
  const my = nd.p.y + ay * len * 0.5
  g.fillStyle = cfg.value.leaf
  g.beginPath()
  g.moveTo(nd.p.x, nd.p.y)
  g.quadraticCurveTo(mx + px * len * 0.38, my + py * len * 0.38, tipX, tipY)
  g.quadraticCurveTo(mx - px * len * 0.38, my - py * len * 0.38, nd.p.x, nd.p.y)
  g.closePath()
  g.fill()
  g.strokeStyle = cfg.value.leafDark
  g.lineWidth = Math.max(0.5, v.width * 0.3)
  g.globalAlpha *= 0.75
  g.beginPath()
  g.moveTo(nd.p.x, nd.p.y)
  g.lineTo(tipX, tipY)
  g.stroke()
  g.globalAlpha /= 0.75
  if (nd.berry) {
    const r = Math.max(1, v.width * 0.9 * s)
    const bx = nd.p.x - ax * r * 0.6 + px * r * 1.6
    const by = nd.p.y - ay * r * 0.6 + py * r * 1.6
    g.fillStyle = cfg.value.berry
    g.beginPath()
    g.arc(bx, by, r, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(255, 255, 255, 0.5)'
    g.beginPath()
    g.arc(bx - r * 0.3, by - r * 0.3, r * 0.3, 0, Math.PI * 2)
    g.fill()
  }
}

function drawVine(g: Ctx, v: Vine, progress: number, alpha: number, droop: number) {
  drawStem(g, v, progress, alpha)
  g.globalAlpha = alpha
  const reach = progress * STEPS
  v.nodes.forEach((nd, i) => {
    if (!nd.thorn && !nd.leaf) return
    const s = easeOut((reach - i) / 1.5)
    if (s <= 0) return
    if (nd.thorn) drawThorn(g, v, nd, s)
    else drawLeaf(g, v, nd, s, droop)
  })
  g.globalAlpha = 1
}

function drawFrame(f: EffectFrame) {
  const c = cfg.value
  const count = isTitle.value ? 2 : c.count
  const seed0 = props.measure.stack * 101 + 11
  for (let i = 0; i < count; i++) {
    const phase = (i / count) * c.cycleSecs * 0.45 + hash01(seed0 + i * 3) * 2
    const k = Math.floor((f.t + phase) / c.cycleSecs)
    const u = f.reduced ? 0.6 : ((f.t + phase) % c.cycleSecs) / c.cycleSecs
    if (u >= 0.9) continue
    const seed = seed0 + i * 37 + k * 131
    const vine = buildVine(vineSpec(i, seed, f.box), seed)
    const wither = u > 0.74 ? (u - 0.74) / 0.16 : 0
    const progress = u < 0.42 ? easeOut(u / 0.42) : 1 - wither * wither * 0.35
    drawVine(f.g, vine, progress, 1 - wither * wither, wither)
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
