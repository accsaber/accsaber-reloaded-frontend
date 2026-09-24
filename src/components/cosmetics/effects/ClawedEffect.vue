<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/api/items'
import { activeEvents, asColor, asNumber, clampNumber, easeIn, easeOut, geometryMemo, pctSize, polyBounds, readPctSizing, ringAt, type ContentBox, type CycleEvent, type EffectFrame, type EffectMeasure, type PctSizing, type RingGeometry, type Vec } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed, watch } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

type Ctx = CanvasRenderingContext2D

interface ClawConfig {
  color: string
  rim: string
  count: number
  intervalSecs: number
  size: PctSizing
  openSecs: number
  holdSecs: number
  closeSecs: number
}

function readClaws(c: Composition, light: boolean): ClawConfig {
  return {
    color: asColor(light ? c.lightColor : c.color),
    rim: asColor(c.rim),
    count: Math.round(clampNumber(c.count, 2, 5, 3)),
    intervalSecs: Math.max(1.5, asNumber(c.intervalSecs) ?? 5),
    size: readPctSizing(c, 'sizePct', [10, 45, 120], [8, 14], [14, 360]),
    openSecs: Math.max(0.1, asNumber(c.openSecs) ?? 0.25),
    holdSecs: Math.max(0.2, asNumber(c.holdSecs) ?? 1.4),
    closeSecs: Math.max(0.2, asNumber(c.closeSecs) ?? 0.9),
  }
}

interface Wound {
  cx: number
  cy: number
  angle: number
  wmax: number
  claws: Array<{ len: number; shift: number; y: number }>
}

interface WoundState {
  reveal: number
  widthF: number
  rimA: number
  cutA: number
}

const LENS_STEPS = 16

const { isTitle, field, light } = useEffectSurface(() => props.measure)
const cfg = computed(() => readClaws(props.composition, light.value))
const life = computed(() => cfg.value.openSecs + cfg.value.holdSecs + cfg.value.closeSecs)

const pad = computed(() => Math.round(Math.min(props.measure.box.w, props.measure.box.h) * 0.1) + 2)

const wounds = geometryMemo<Wound>()
watch(cfg, wounds.clear)

function badgeSpot(ring: RingGeometry, seed: number): Vec {
  if (hash01(seed + 7) < 0.45) return ringAt(ring.band, hash01(seed + 8) * ring.band.total).p
  const b = polyBounds(ring.inner)
  return { x: b.x + b.w * (0.15 + hash01(seed + 1) * 0.7), y: b.y + b.h * (0.15 + hash01(seed + 2) * 0.7) }
}

function woundFor(seed: number, box: ContentBox, ring: RingGeometry): Wound {
  const c = cfg.value
  const minD = Math.min(box.w, box.h)
  const inner = isTitle.value ? 0.2 : 0.1
  const spot = !isTitle.value && !field.value ? badgeSpot(ring, seed) : null
  const cx = spot ? spot.x : box.x + box.w * (inner + hash01(seed + 1) * (1 - inner * 2))
  const cy = spot ? spot.y : isTitle.value ? box.y + box.h * 0.5 : box.y + box.h * (inner + hash01(seed + 2) * (1 - inner * 2))
  const tilt = (15 + hash01(seed + 3) * 40) * (Math.PI / 180)
  const angle = hash01(seed + 4) > 0.5 ? tilt : -tilt
  const L = isTitle.value ? box.w * 0.45 : pctSize(minD, c.size) * (0.7 + hash01(seed + 5) * 0.35)
  const gap = isTitle.value ? box.h * 0.28 : L * 0.11
  const wmax = isTitle.value ? Math.max(0.8, box.h * 0.07) : Math.max(1, L * 0.028)
  const claws = []
  for (let k = 0; k < c.count; k++) {
    const ks = seed * 7 + k
    claws.push({ len: L * (0.82 + hash01(ks + 3) * 0.18), shift: (hash01(ks + 4) - 0.5) * L * 0.12, y: (k - (c.count - 1) / 2) * gap })
  }
  return { cx, cy, angle, wmax, claws }
}

function stateAt(age: number): WoundState {
  const c = cfg.value
  if (age < c.openSecs) return { reveal: easeOut(age / c.openSecs), widthF: 1, rimA: 1, cutA: 0.95 }
  const holdEnd = c.openSecs + c.holdSecs
  if (age < holdEnd) return { reveal: 1, widthF: 1, rimA: 1 - 0.5 * ((age - c.openSecs) / c.holdSecs), cutA: 0.95 }
  const k = easeIn((age - holdEnd) / c.closeSecs)
  return { reveal: 1, widthF: 1 - k, rimA: 0.5 * (1 - k), cutA: 0.95 * (1 - k * 0.5) }
}

function lensX(len: number, shift: number, u: number): number {
  return -len / 2 + u * len + shift
}

function lensW(wmax: number, widthF: number, u: number): number {
  return wmax * widthF * Math.pow(Math.sin(Math.PI * u), 0.8)
}

function lens(g: Ctx, len: number, wmax: number, shift: number, reveal: number, widthF: number) {
  g.beginPath()
  for (let i = 0; i <= LENS_STEPS; i++) {
    const u = (i / LENS_STEPS) * reveal
    const x = lensX(len, shift, u)
    const y = -lensW(wmax, widthF, u)
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  for (let i = LENS_STEPS; i >= 0; i--) {
    const u = (i / LENS_STEPS) * reveal
    g.lineTo(lensX(len, shift, u), lensW(wmax, widthF, u))
  }
  g.closePath()
}

function drawWound(g: Ctx, w: Wound, st: WoundState) {
  g.save()
  g.translate(w.cx, w.cy)
  g.rotate(w.angle)
  for (const cl of w.claws) {
    g.save()
    g.translate(0, cl.y)
    lens(g, cl.len, w.wmax, cl.shift, st.reveal, st.widthF)
    g.globalAlpha = st.cutA
    g.fillStyle = cfg.value.color
    g.fill()
    g.globalAlpha = st.rimA * 0.9
    g.strokeStyle = cfg.value.rim
    g.lineWidth = Math.max(0.6, w.wmax * 0.5)
    g.lineJoin = 'round'
    g.stroke()
    g.restore()
  }
  g.globalAlpha = 1
  g.restore()
}

function drawFrame(f: EffectFrame): boolean {
  const seed0 = props.measure.stack * 101 + 31
  const interval = cfg.value.intervalSecs
  let events: CycleEvent[]
  if (f.reduced) events = [{ age: cfg.value.openSecs + 0.3, seed: seed0 }]
  else {
    events = activeEvents(f.t, interval, life.value, seed0)
    if (field.value) events = events.concat(activeEvents(f.t + interval / 2, interval, life.value, seed0 + 503))
  }
  for (const ev of events) drawWound(f.g, wounds.get(f.ring, ev.seed, () => woundFor(ev.seed, f.box, f.ring)), stateAt(ev.age))
  return events.length > 0
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
