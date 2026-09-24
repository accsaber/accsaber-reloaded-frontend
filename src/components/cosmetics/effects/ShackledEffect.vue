<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/api/items'
import { asColor, asNumber, clampNumber, easeIn, easeOut, geometryMemo, polyBounds, ringSpan, type ContentBox, type EffectFrame, type EffectMeasure, type RingGeometry, type Vec } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed, watch } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

type Ctx = CanvasRenderingContext2D

interface ChainConfig {
  color: string
  highlight: string
  count: number
  cycleSecs: number
  holdSecs: number
}

function readChains(c: Composition): ChainConfig {
  return {
    color: asColor(c.color),
    highlight: asColor(c.highlight),
    count: Math.round(clampNumber(c.count, 1, 8, 3)),
    cycleSecs: Math.max(4, asNumber(c.cycleSecs) ?? 9),
    holdSecs: Math.max(0.5, asNumber(c.holdSecs) ?? 3),
  }
}

interface Link {
  p: Vec
  rot: number
  flat: boolean
}

interface Chain {
  links: Link[]
  buildDt: number
  fadeDt: number
  fadeStart: number
  cycle: number
}

const cfg = computed(() => readChains(props.composition))
const { isTitle, field } = useEffectSurface(() => props.measure)

const chains = geometryMemo<Chain>()
watch(cfg, chains.clear)

const linkLen = computed(() => {
  const box = props.measure.box
  if (isTitle.value) return Math.max(2.5, box.h * 0.22)
  const minD = Math.min(box.w, box.h)
  return field.value ? Math.max(5, Math.min(20, minD * 0.03)) : Math.max(4, Math.min(12, minD * 0.055))
})

const pad = computed(() => Math.round(linkLen.value * 2.5))

function chainFor(seed: number, box: ContentBox, ring: RingGeometry, link: number): Chain {
  const badge = !isTitle.value && !field.value
  const bounds = badge ? polyBounds(ring.outer) : box
  const y = isTitle.value ? box.y + box.h * 0.5 : bounds.y + bounds.h * (0.12 + hash01(seed + 1) * 0.76)
  const sag = isTitle.value ? 0 : link * (0.4 + hash01(seed + 2) * 1.2)
  const span = badge ? ringSpan(ring.outer, y) : null
  const x0 = (span ? span.x0 : box.x) - link * 0.6
  const x1 = (span ? span.x1 : box.x + box.w) + link * 0.6
  const n = Math.max(2, Math.ceil((x1 - x0) / (link * 0.78)))
  const links: Link[] = []
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    const px = x0 + (x1 - x0) * u
    const py = y + sag * 4 * u * (1 - u)
    const slope = (sag * 4 * (1 - 2 * u)) / (x1 - x0)
    links.push({ p: { x: px, y: py }, rot: Math.atan(slope), flat: i % 2 === 0 })
  }
  const buildDt = Math.min(0.07, 1.6 / n)
  const fadeDt = Math.min(0.06, 1.4 / n)
  const fadeStart = n * buildDt + cfg.value.holdSecs
  return { links, buildDt, fadeDt, fadeStart, cycle: Math.max(cfg.value.cycleSecs, fadeStart + n * fadeDt + 1) }
}

function drawLink(g: Ctx, l: Link, link: number, alpha: number, dropY: number) {
  g.save()
  g.globalAlpha = alpha
  g.translate(l.p.x, l.p.y + dropY)
  g.rotate(l.rot)
  g.lineWidth = Math.max(0.8, link * 0.18)
  if (l.flat) {
    g.strokeStyle = cfg.value.color
    g.beginPath()
    g.ellipse(0, 0, link * 0.5, link * 0.3, 0, 0, Math.PI * 2)
    g.stroke()
    g.strokeStyle = cfg.value.highlight
    g.globalAlpha = alpha * 0.7
    g.beginPath()
    g.ellipse(0, 0, link * 0.5, link * 0.3, 0, Math.PI * 1.05, Math.PI * 1.7)
    g.stroke()
  } else {
    g.strokeStyle = cfg.value.highlight
    g.beginPath()
    g.ellipse(0, 0, link * 0.5, link * 0.13, 0, 0, Math.PI * 2)
    g.stroke()
  }
  g.restore()
}

function drawChain(g: Ctx, ch: Chain, local: number, link: number, reduced: boolean): boolean {
  let drew = false
  ch.links.forEach((l, i) => {
    if (reduced) {
      drawLink(g, l, link, 1, 0)
      drew = true
      return
    }
    const a = Math.max(0, Math.min(1, (local - i * ch.buildDt) / 0.2))
    if (a <= 0) return
    const f = Math.max(0, Math.min(1, (local - (ch.fadeStart + i * ch.fadeDt)) / 0.3))
    if (f >= 1) return
    const dropY = (1 - easeOut(a)) * -link * 1.4 + easeIn(f) * link * 0.8
    drawLink(g, l, link, a * (1 - f), dropY)
    drew = true
  })
  return drew
}

function drawFrame(f: EffectFrame): boolean {
  const link = linkLen.value
  const count = isTitle.value ? 1 : cfg.value.count
  const seed0 = props.measure.stack * 101 + 41
  let drew = false
  for (let c = 0; c < count; c++) {
    const probeSeed = seed0 + c * 53
    const T = chains.get(f.ring, probeSeed, () => chainFor(probeSeed, f.box, f.ring, link)).cycle
    const phase = (c / count) * T + hash01(seed0 + c * 7) * 1.5
    const k = Math.floor((f.t + phase) / T)
    const local = (f.t + phase) % T
    const seed = probeSeed + k * 131
    const chain = chains.get(f.ring, seed, () => chainFor(seed, f.box, f.ring, link))
    if (drawChain(f.g, chain, local, link, f.reduced)) drew = true
  }
  return drew
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
