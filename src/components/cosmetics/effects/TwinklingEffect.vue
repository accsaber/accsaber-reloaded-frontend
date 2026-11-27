<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/cosmetics/effects'
import { asNumber, clampNumber, geometryMemo, pctSize, readPctSizing, ringAt, seededCount, seededPick, type ContentBox, type EffectFrame, type EffectProps, type PctSizing, type RingGeometry } from '@/utils/cosmetics/effects'
import { hash01 } from '@/utils/random'
import { computed, watch } from 'vue'

const props = defineProps<EffectProps>()

interface TwinkleConfig {
  colors: string[]
  count: number
  size: PctSizing
  driftPct: number
  driftSecs: number
  twinkleSecs: number
  halo: number
}

interface Light {
  x: number
  y: number
  color: string
  size: number
  phase: number
}

const TAU = Math.PI * 2
const HALO_SCALE = 2.6
const FALLBACK = '#ffe66d'

function readTwinkle(c: Composition): TwinkleConfig {
  const seed = asNumber(c.seed) ?? 0
  const palette = Array.isArray(c.palette) ? c.palette.filter((v): v is string => typeof v === 'string') : []
  return {
    colors: palette.length ? seededPick(palette, seed, seededCount(c.tones, [1, 3], hash01(seed * 7 + 3))) : [FALLBACK],
    count: seededCount(c.count, [3, 6], hash01(seed * 11 + 5)),
    size: readPctSizing(c, 'sizePct', [0.3, 1.2, 10], [0.5, 0.8], [1, 1.8]),
    driftPct: clampNumber(c.driftPct, 0, 30, 5),
    driftSecs: Math.max(2, asNumber(c.driftSecs) ?? 9),
    twinkleSecs: Math.max(1, asNumber(c.twinkleSecs) ?? 4),
    halo: clampNumber(c.halo, 0, 1, 0.18),
  }
}

const { field } = useEffectSurface(() => props.measure)
const cfg = computed(() => readTwinkle(props.composition))

function driftOf(box: ContentBox): number {
  return Math.min(box.w, box.h) * (cfg.value.driftPct / 100)
}

const pad = computed(() => {
  if (field.value) return 0
  const b = props.measure.box
  return Math.ceil(driftOf(b) * 2.2 + pctSize(Math.min(b.w, b.h), cfg.value.size) * HALO_SCALE + 2)
})

const lights = geometryMemo<Light[]>()
watch(cfg, lights.clear)

function place(box: ContentBox, ring: RingGeometry): Light[] {
  const c = cfg.value
  const seed = (asNumber(props.composition.seed) ?? 0) * 17 + props.measure.stack * 101
  const size = pctSize(Math.min(box.w, box.h), c.size)
  const out = driftOf(box) * 0.7
  return Array.from({ length: c.count }, (_, i) => {
    const s = seed + i * 29
    const at = ringAt(ring.outer, ((i + hash01(s + 1) * 0.7) / c.count) * ring.outer.total)
    return {
      x: field.value ? box.x + box.w * hash01(s + 2) : at.p.x + at.n.x * out,
      y: field.value ? box.y + box.h * hash01(s + 3) : at.p.y + at.n.y * out,
      color: c.colors[i % c.colors.length],
      size: size * (0.8 + hash01(s + 4) * 0.4),
      phase: hash01(s + 5) * TAU,
    }
  })
}

function drawFrame(f: EffectFrame): boolean {
  const c = cfg.value
  const { g } = f
  const t = f.reduced ? 0 : f.t
  const drift = driftOf(f.box)
  const pace = TAU / c.driftSecs
  for (const light of lights.get(f.ring, 1, () => place(f.box, f.ring))) {
    const x = light.x + (Math.sin(t * pace + light.phase) + 0.5 * Math.sin(t * pace * 0.43 + light.phase * 2.1)) * drift * 0.66
    const y = light.y + (Math.cos(t * pace * 0.81 + light.phase * 1.3) + 0.5 * Math.sin(t * pace * 0.37 + light.phase)) * drift * 0.66
    const lit = 0.45 + 0.55 * Math.sin((t * TAU) / c.twinkleSecs + light.phase * 3) ** 2
    g.fillStyle = light.color
    g.globalAlpha = c.halo * lit
    g.beginPath()
    g.arc(x, y, light.size * HALO_SCALE, 0, TAU)
    g.fill()
    g.globalAlpha = lit
    g.beginPath()
    g.arc(x, y, light.size, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1
  return true
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
