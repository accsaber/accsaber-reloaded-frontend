<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/api/items'
import { asColor, asNumber, clampNumber, easeOut, geometryMemo, pctSize, readPctSizing, ringAt, type ContentBox, type EffectFrame, type EffectMeasure, type PctSizing, type RingGeometry, type RingPoly, type Vec } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed, watch } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

type Ctx = CanvasRenderingContext2D

interface BrambleConfig {
  color: string
  highlight: string
  leaf: string
  leafDark: string
  berry: string
  count: number
  cycleSecs: number
  length: PctSizing
}

function readBrambles(c: Composition, light: boolean): BrambleConfig {
  return {
    color: asColor(light ? c.lightColor : c.color),
    highlight: asColor(light ? c.lightHighlight : c.highlight),
    leaf: asColor(c.leaf),
    leafDark: asColor(c.leafDark),
    berry: asColor(c.berry),
    count: Math.round(clampNumber(c.count, 1, 8, 4)),
    cycleSecs: Math.max(6, asNumber(c.cycleSecs) ?? 16),
    length: readPctSizing(c, 'lengthPct', [10, 90, 200], [10, 30], [30, 520]),
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
const THORN_EVERY = 4
const LEAF_EVERY = 7

const { isTitle, field, light } = useEffectSurface(() => props.measure)
const cfg = computed(() => readBrambles(props.composition, light.value))

const vines = geometryMemo<Vine>()
watch([cfg, isTitle, field], vines.clear)

const pad = computed(() => {
  const box = props.measure.box
  return Math.round(isTitle.value ? box.h * 0.6 : Math.min(box.w, box.h) * 0.14)
})

function walkPoly(ring: RingGeometry): RingPoly {
  return isTitle.value || field.value ? ring.outer : ring.band
}

interface VineSpec {
  start: number
  dir: number
  len: number
  amp: number
  width: number
  thorn: number
  leaf: number
}

function vineSpec(i: number, seed: number, box: ContentBox, poly: RingPoly): VineSpec {
  const c = cfg.value
  const minD = Math.min(box.w, box.h)
  const P = poly.total
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
    const len = pctSize(minD, c.length, 0.4)
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
    len: pctSize(minD, c.length, 0.45),
    amp: Math.max(2, minD * 0.03),
    width: Math.max(1.2, Math.min(4.5, minD * 0.024)),
    thorn: Math.max(2, minD * 0.05),
    leaf: Math.max(3, minD * 0.09),
  }
}

function buildVine(spec: VineSpec, seed: number, poly: RingPoly): Vine {
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
    const leaf = i > 2 && i < STEPS - 1 && (i + 3) % LEAF_EVERY === 0
    const thorn = !leaf && i > 1 && i < STEPS - 1 && i % THORN_EVERY === 0
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
  const alpha = g.globalAlpha
  g.globalAlpha = alpha * 0.75
  g.beginPath()
  g.moveTo(nd.p.x, nd.p.y)
  g.lineTo(tipX, tipY)
  g.stroke()
  g.globalAlpha = alpha
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

function drawFrame(f: EffectFrame): boolean {
  const c = cfg.value
  const count = isTitle.value ? 2 : c.count
  const seed0 = props.measure.stack * 101 + 11
  const poly = walkPoly(f.ring)
  let drew = false
  for (let i = 0; i < count; i++) {
    const phase = (i / count) * c.cycleSecs * 0.45 + hash01(seed0 + i * 3) * 2
    const k = Math.floor((f.t + phase) / c.cycleSecs)
    const u = f.reduced ? 0.6 : ((f.t + phase) % c.cycleSecs) / c.cycleSecs
    if (u >= 0.9) continue
    const seed = seed0 + i * 37 + k * 131
    const vine = vines.get(f.ring, seed, () => buildVine(vineSpec(i, seed, f.box, poly), seed, poly))
    const wither = u > 0.74 ? (u - 0.74) / 0.16 : 0
    const progress = u < 0.42 ? easeOut(u / 0.42) : 1 - wither * wither * 0.35
    drawVine(f.g, vine, progress, 1 - wither * wither, wither)
    drew = true
  }
  return drew
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
