<script setup lang="ts">
import { useEffectCanvas, type EffectFrame } from '@/composables/useEffectCanvas'
import type { Composition } from '@/types/api/items'
import { useThemeStore } from '@/stores/theme'
import { activeEvents, asNumber, asString, easeIn, easeOut, isFieldKey, padBox, pctSize, ringAt, ringGeometry, type ContentBox, type CycleEvent, type EffectMeasure, type Vec } from '@/utils/cosmetics/effects'
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

interface ClawConfig {
  color: string
  rim: string
  count: number
  intervalSecs: number
  sizePct: number
  minPx: number
  maxPx: number
  openSecs: number
  holdSecs: number
  closeSecs: number
}

function readClaws(c: Composition, light: boolean): ClawConfig {
  return {
    color: light ? asString(c.lightColor) ?? '#1a0808' : asString(c.color) ?? '#4a1010',
    rim: asString(c.rim) ?? '#ff4d3a',
    count: Math.max(2, Math.min(5, Math.round(asNumber(c.count) ?? 3))),
    intervalSecs: Math.max(1.5, asNumber(c.intervalSecs) ?? 5),
    sizePct: Math.max(10, Math.min(120, asNumber(c.sizePct) ?? 45)),
    minPx: Math.max(8, asNumber(c.minPx) ?? 14),
    maxPx: Math.max(14, asNumber(c.maxPx) ?? 360),
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

const light = computed(() => (props.measure.host?.base ?? themeStore.resolvedBase) === 'light')
const cfg = computed(() => readClaws(props.composition, light.value))
const isTitle = computed(() => props.measure.typeKey === 'title')
const field = computed(() => isFieldKey(props.measure.typeKey))
const life = computed(() => cfg.value.openSecs + cfg.value.holdSecs + cfg.value.closeSecs)

const pad = computed(() => Math.round(Math.min(props.measure.box.w, props.measure.box.h) * 0.1) + 2)

const ring = computed(() => ringGeometry(props.measure, padBox(props.measure.box, pad.value)))

function badgeSpot(seed: number): Vec {
  const r = ring.value
  if (hash01(seed + 7) < 0.45) return ringAt(r.band, hash01(seed + 8) * r.band.total).p
  const xs = r.inner.pts.map((q) => q.x)
  const ys = r.inner.pts.map((q) => q.y)
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  const w = Math.max(...xs) - x0
  const h = Math.max(...ys) - y0
  return { x: x0 + w * (0.15 + hash01(seed + 1) * 0.7), y: y0 + h * (0.15 + hash01(seed + 2) * 0.7) }
}

function woundFor(seed: number, box: ContentBox): Wound {
  const c = cfg.value
  const minD = Math.min(box.w, box.h)
  const inner = isTitle.value ? 0.2 : 0.1
  const spot = !isTitle.value && !field.value ? badgeSpot(seed) : null
  const cx = spot ? spot.x : box.x + box.w * (inner + hash01(seed + 1) * (1 - inner * 2))
  const cy = spot ? spot.y : isTitle.value ? box.y + box.h * 0.5 : box.y + box.h * (inner + hash01(seed + 2) * (1 - inner * 2))
  const tilt = (15 + hash01(seed + 3) * 40) * (Math.PI / 180)
  const angle = hash01(seed + 4) > 0.5 ? tilt : -tilt
  const L = isTitle.value ? box.w * 0.45 : pctSize(minD, c.sizePct, c.minPx, c.maxPx) * (0.7 + hash01(seed + 5) * 0.35)
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

function lens(g: Ctx, len: number, wmax: number, shift: number, reveal: number, widthF: number) {
  const n = 16
  const top: Array<[number, number]> = []
  const bottom: Array<[number, number]> = []
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * reveal
    const w = wmax * widthF * Math.pow(Math.sin(Math.PI * u), 0.8)
    const x = -len / 2 + u * len + shift
    top.push([x, -w])
    bottom.unshift([x, w])
  }
  g.beginPath()
  top.concat(bottom).forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
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

function drawFrame(f: EffectFrame) {
  const seed0 = props.measure.stack * 101 + 31
  const interval = cfg.value.intervalSecs
  let events: CycleEvent[]
  if (f.reduced) events = [{ k: 0, age: cfg.value.openSecs + 0.3, seed: seed0 }]
  else {
    events = activeEvents(f.t, interval, life.value, seed0)
    if (field.value) events = events.concat(activeEvents(f.t + interval / 2, interval, life.value, seed0 + 503))
  }
  for (const ev of events) drawWound(f.g, woundFor(ev.seed, f.box), stateAt(ev.age))
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
