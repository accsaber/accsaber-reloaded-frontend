<script setup lang="ts">
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimeline } from '@/composables/useTimeline'
import ColossusBorderFill from '@/components/domain/ColossusBorderFill.vue'
import CosmicBorderFill from '@/components/domain/CosmicBorderFill.vue'
import DominionBorderFill from '@/components/domain/DominionBorderFill.vue'
import GroveBorderFill from '@/components/domain/GroveBorderFill.vue'
import StolenFlameBorderFill from '@/components/domain/StolenFlameBorderFill.vue'
import PrismBorderFill from '@/components/domain/PrismBorderFill.vue'
import RegaliaBorderFill from '@/components/domain/RegaliaBorderFill.vue'
import ToonBorderFill from '@/components/domain/ToonBorderFill.vue'
import type {
  BorderColorStateValue,
  BorderColorValue,
  BorderShapePathValue,
  BorderShapeStateValue,
  BorderShapeValue,
  ColossusFill,
  CosmicFill,
  DominionFill,
  GroveFill,
  StolenFlameFill,
  PrismFill,
  Gradient,
  RegaliaFill,
  ToonFill,
} from '@/types/api/items'
import {
  fillToCss,
  gradientToCss,
  interpolateBorderColorState,
  isAnimated,
  lerpPoints,
  pickInterpolatedState,
  pointsToPathD,
  sampleShapeStates,
} from '@/utils/items'
import { randBetween as rand } from '@/utils/random'
import { computed, ref, watch } from 'vue'
import PixelBorderRenderer from './PixelBorderRenderer.vue'

const props = defineProps<{
  shape: BorderShapeValue | null
  color: BorderColorValue | null
}>()

const reducedMotion = useReducedMotion()

const isPixelShape = computed(() => props.shape?.renderMode === 'pixel')

const colorIsConic = computed(() => props.color?.states?.[0]?.fill?.type === 'conic')

const cosmicFill = computed<CosmicFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'cosmic' ? fill : null
})

const toonFill = computed<ToonFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'toon' ? fill : null
})

const prismFill = computed<PrismFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'prism' ? fill : null
})

const groveFill = computed<GroveFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'grove' ? fill : null
})

const regaliaFill = computed<RegaliaFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'regalia' ? fill : null
})

const colossusFill = computed<ColossusFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'colossus' ? fill : null
})

const stolenFlameFill = computed<StolenFlameFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'stolenflame' ? fill : null
})

const dominionFill = computed<DominionFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'dominion' ? fill : null
})

const canvasFillActive = computed(() =>
  !!cosmicFill.value || !!toonFill.value || !!prismFill.value
  || !!groveFill.value || !!regaliaFill.value || !!colossusFill.value
  || !!stolenFlameFill.value || !!dominionFill.value,
)

const rimStyle = computed<{ stroke: string; width: number; opacity: number } | null>(() => {
  if (cosmicFill.value) return { stroke: cosmicFill.value.star, width: 0.8, opacity: 0.45 }
  if (toonFill.value) return { stroke: toonFill.value.line, width: 1.4, opacity: 1 }
  if (prismFill.value) return { stroke: prismFill.value.edge, width: 0.9, opacity: 0.5 }
  if (groveFill.value) return { stroke: groveFill.value.firefly, width: 0.8, opacity: 0.45 }
  if (regaliaFill.value) return { stroke: regaliaFill.value.core ?? '#ffffff', width: 0.9, opacity: 0.55 }
  if (colossusFill.value) return { stroke: colossusFill.value.seam, width: 0.9, opacity: 0.5 }
  if (stolenFlameFill.value) return { stroke: stolenFlameFill.value.flame, width: 0.9, opacity: 0.5 }
  if (dominionFill.value) return { stroke: dominionFill.value.body ?? '#ffffff', width: 0.9, opacity: 0.65 }
  return null
})

const cosmicSink = computed<{ x: number; y: number; r: number } | null>(() => {
  const overlay = props.shape?.overlay
  if (!cosmicFill.value || overlay?.type !== 'blackhole' || !overlay.enabled) return null
  if (overlay.suction?.fillType !== 'cosmic') return null
  return { x: 50, y: 100, r: 8.8 }
})

const shapeFxActive = computed(
  () =>
    !reducedMotion.value
    && !isPixelShape.value
    && (!!props.shape?.glisten?.enabled || !!props.shape?.sparkles?.enabled),
)

const needsTimeline = computed(
  () =>
    isAnimated(props.color)
    || (colorIsConic.value && isAnimated(props.shape))
    || isAnimated(props.shape)
    || shapeFxActive.value
    || (!!dominionFill.value && !reducedMotion.value),
)

const { tMs } = useTimeline({ active: () => needsTimeline.value })

const colorState = computed<BorderColorStateValue | null>(() => {
  const cv = props.color
  if (!cv) return null
  return pickInterpolatedState(
    { states: cv.states, durationMs: cv.durationMs, loop: cv.loop },
    tMs.value,
    interpolateBorderColorState,
  )
})

const effectiveGradient = computed<Gradient | null>(() => {
  const fill = colorState.value?.fill
  if (!fill) return null
  if (fill.type === 'linear' || fill.type === 'radial' || fill.type === 'conic') return fill
  if (fill.type === 'pixel_metal') {
    return {
      type: 'linear',
      angleDeg: 135,
      stops: [
        { atPct: 0, hex: fill.highlight },
        { atPct: 50, hex: fill.base },
        { atPct: 100, hex: fill.shadow },
      ],
    }
  }
  return null
})

const colorIsSvgGradient = computed(() => {
  const eg = effectiveGradient.value
  return eg?.type === 'linear' || eg?.type === 'radial'
})

const solidColor = computed<string | null>(() => {
  const fill = colorState.value?.fill
  if (fill && fill.type === 'solid') return fill.hex
  return null
})

const vbBounds = computed(() => {
  const vb = props.shape?.viewBox ?? '0 0 100 100'
  const parts = vb.split(/[\s,]+/).map(Number)
  const valid = parts.length === 4 && parts.every((n) => Number.isFinite(n))
  const [minX, minY, w, h] = valid ? parts : [0, 0, 100, 100]
  return { minX, minY, w, h }
})

const linearGradAttrs = computed(() => {
  const { minX, minY, w, h } = vbBounds.value
  const g = effectiveGradient.value
  const angle = g && g.type === 'linear' ? g.angleDeg : 0
  return {
    x1: minX,
    y1: minY + h / 2,
    x2: minX + w,
    y2: minY + h / 2,
    transform: `rotate(${angle} ${minX + w / 2} ${minY + h / 2})`,
  }
})

const radialGradAttrs = computed(() => {
  const { minX, minY, w, h } = vbBounds.value
  const g = effectiveGradient.value
  const cxPct = g && g.type === 'radial' ? (g.centerXPct ?? 50) : 50
  const cyPct = g && g.type === 'radial' ? (g.centerYPct ?? 50) : 50
  const rPct = g && g.type === 'radial' ? (g.radiusPct ?? 50) : 50
  return {
    cx: minX + (w * cxPct) / 100,
    cy: minY + (h * cyPct) / 100,
    r: (Math.min(w, h) * rPct) / 100,
  }
})

const sortedShapeStates = computed<BorderShapeStateValue[]>(() => {
  const sv = props.shape
  if (!sv) return []
  return [...sv.states].sort((a, b) => a.atMs - b.atMs)
})

const basePaths = computed(() => sortedShapeStates.value[0]?.paths ?? [])

const SHAPE_SAMPLES = 100

const sampledStates = computed<Array<Array<[number, number][]>> | null>(() => {
  const states = sortedShapeStates.value
  if (states.length < 2) return null
  try {
    return sampleShapeStates(states, SHAPE_SAMPLES)
  } catch {
    return null
  }
})

function easeInOutLocal(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

interface ShapeBracket {
  idxA: number
  idxB: number
  localT: number
}

function currentShapeBracket(): ShapeBracket | null {
  const sv = props.shape
  const states = sortedShapeStates.value
  if (!sv || states.length === 0) return null
  if (states.length === 1) return { idxA: 0, idxB: 0, localT: 0 }
  const lastAt = states[states.length - 1].atMs
  const total = sv.durationMs ?? lastAt
  if (total <= 0) return { idxA: 0, idxB: 0, localT: 0 }
  const loop = sv.loop ?? 'loop'
  let t: number
  const tNow = tMs.value
  if (loop === 'once') t = Math.min(Math.max(tNow, 0), total)
  else if (loop === 'pingpong') {
    const cycles = Math.floor(tNow / total)
    const inCycle = tNow - cycles * total
    t = cycles % 2 === 0 ? inCycle : total - inCycle
  } else t = ((tNow % total) + total) % total

  if (loop === 'loop' && t > lastAt) {
    const range = total - lastAt
    return {
      idxA: states.length - 1,
      idxB: 0,
      localT: range > 0 ? (t - lastAt) / range : 0,
    }
  }
  for (let i = 0; i < states.length - 1; i++) {
    if (t >= states[i].atMs && t <= states[i + 1].atMs) {
      const range = states[i + 1].atMs - states[i].atMs
      return { idxA: i, idxB: i + 1, localT: range > 0 ? (t - states[i].atMs) / range : 0 }
    }
  }
  if (t <= states[0].atMs) return { idxA: 0, idxB: 0, localT: 0 }
  return { idxA: states.length - 1, idxB: states.length - 1, localT: 0 }
}

const lerpedPaths = computed<string[] | null>(() => {
  const states = sortedShapeStates.value
  if (states.length === 0) return null
  if (states.length === 1) return (states[0].paths ?? []).map((p) => p.d)
  const samples = sampledStates.value
  if (!samples) return (states[0].paths ?? []).map((p) => p.d)
  const bracket = currentShapeBracket()
  if (!bracket) return (states[0].paths ?? []).map((p) => p.d)
  if (bracket.idxA === bracket.idxB) {
    return samples[bracket.idxA].map(pointsToPathD)
  }
  const a = samples[bracket.idxA]
  const b = samples[bracket.idxB]
  const eased = easeInOutLocal(bracket.localT)
  const pathCount = Math.min(a.length, b.length)
  const out: string[] = []
  for (let pi = 0; pi < pathCount; pi++) {
    out.push(pointsToPathD(lerpPoints(a[pi], b[pi], eased)))
  }
  return out
})

let gradientIdCounter = 0
const gradientId = `pbr-grad-${++gradientIdCounter}-${Math.random().toString(36).slice(2, 8)}`
const clipId = `pbr-clip-${gradientIdCounter}-${Math.random().toString(36).slice(2, 8)}`
const glistenGradId = `pbr-glint-${gradientIdCounter}-${Math.random().toString(36).slice(2, 8)}`

const glistenBand = computed(() => {
  const g = props.shape?.glisten
  if (!g?.enabled || reducedMotion.value) return null
  const interval = g.intervalMs ?? 5000
  const duration = g.durationMs ?? 900
  const cyclePos = tMs.value % interval
  if (cyclePos > duration) return null
  const progress = cyclePos / duration
  const { minX, minY, w, h } = vbBounds.value
  const diag = Math.hypot(w, h)
  const bandW = ((g.bandPctOfDiagonal ?? 18) / 100) * diag
  const startX = minX - 60 - bandW
  const endX = minX + w + 60
  return {
    x: startX + (endX - startX) * progress,
    y: minY - 60,
    width: bandW,
    height: h + 120,
    transform: `rotate(22 ${minX + w / 2} ${minY + h / 2})`,
  }
})

const SHAPE_STAR_D = 'M0,-5 Q0.9,-0.9 5,0 Q0.9,0.9 0,5 Q-0.9,0.9 -5,0 Q-0.9,-0.9 0,-5 Z'

interface ShapeSparkle {
  id: number
  bornAt: number
  x: number
  y: number
  size: number
  rot: number
}

let shapeSparkleId = 0
let nextShapeSparkleAt = -1
const activeShapeSparkles = ref<ShapeSparkle[]>([])

watch(() => props.shape, () => {
  activeShapeSparkles.value = []
  nextShapeSparkleAt = -1
})

watch(tMs, (now) => {
  const spec = props.shape?.sparkles
  if (!spec?.enabled || reducedMotion.value || isPixelShape.value) return
  const fade = spec.fadeMs ?? 900
  if (nextShapeSparkleAt < 0) nextShapeSparkleAt = now
  if (now >= nextShapeSparkleAt) {
    const { minX, minY, w, h } = vbBounds.value
    activeShapeSparkles.value.push({
      id: ++shapeSparkleId,
      bornAt: now,
      x: rand(minX - 15, minX + w + 15),
      y: rand(minY - 35, minY + h + 20),
      size: (spec.sizePx ?? 4) * rand(0.8, 1.4),
      rot: rand(0, 90),
    })
    nextShapeSparkleAt = now + (1000 / (spec.perSecond ?? 2)) * rand(0.5, 1.5)
  }
  if (activeShapeSparkles.value.some((s) => now - s.bornAt >= fade)) {
    activeShapeSparkles.value = activeShapeSparkles.value.filter((s) => now - s.bornAt < fade)
  }
})

function shapeSparkleOpacity(s: ShapeSparkle): number {
  const fade = props.shape?.sparkles?.fadeMs ?? 900
  const p = Math.min(1, (tMs.value - s.bornAt) / fade)
  return Math.sin(Math.PI * p)
}

function shapeSparkleTransform(s: ShapeSparkle): string {
  const fade = props.shape?.sparkles?.fadeMs ?? 900
  const p = Math.min(1, (tMs.value - s.bornAt) / fade)
  const k = (s.size / 10) * (0.6 + 0.5 * Math.sin(Math.PI * p))
  return `translate(${s.x} ${s.y}) rotate(${s.rot}) scale(${k})`
}

const fallbackColor = 'currentColor'
const svgColor = computed(() => solidColor.value ?? fallbackColor)

function pathStrokeRef(p: BorderShapePathValue): string | undefined {
  const stroke = p.stroke
  if (!stroke) return undefined
  if (colorIsSvgGradient.value && (stroke === 'currentColor' || stroke === 'inherit')) {
    return `url(#${gradientId})`
  }
  return stroke
}

function pathFillRef(p: BorderShapePathValue): string | undefined {
  const fill = p.fill
  if (!fill) return 'none'
  if (colorIsSvgGradient.value && (fill === 'currentColor' || fill === 'inherit')) {
    return `url(#${gradientId})`
  }
  return fill
}

const conicMaskId = `pbr-kmask-${Math.random().toString(36).slice(2, 9)}`

interface MaskPathEntry {
  d: string
  fill: string
  stroke: string
  strokeWidth: number
  strokeLinecap: 'butt' | 'round' | 'square'
  strokeLinejoin: 'miter' | 'round' | 'bevel'
  transform?: string
}

const conicMaskPaths = computed<MaskPathEntry[]>(() => {
  if (!colorIsConic.value) return []
  const lerped = lerpedPaths.value
  const reference = basePaths.value
  if (!lerped || reference.length === 0) return []
  return reference.map((p, i) => ({
    d: lerped[i] ?? p.d,
    stroke: p.stroke && p.stroke !== 'currentColor' && p.stroke !== 'inherit' ? p.stroke : 'white',
    fill: p.fill && p.fill !== 'currentColor' && p.fill !== 'inherit' ? p.fill : 'none',
    strokeWidth: p.strokeWidth ?? 1,
    strokeLinecap: (p.strokeLinecap ?? 'butt') as MaskPathEntry['strokeLinecap'],
    strokeLinejoin: (p.strokeLinejoin ?? 'miter') as MaskPathEntry['strokeLinejoin'],
    transform: p.transform,
  }))
})

const conicMaskTransform = computed(() => {
  const { minX, minY, w, h } = vbBounds.value
  return `scale(${1 / w} ${1 / h}) translate(${-minX} ${-minY})`
})

const conicMaskStyle = computed<Record<string, string> | undefined>(() => {
  if (!colorIsConic.value) return undefined
  if (!colorState.value || colorState.value.fill.type !== 'conic') return undefined
  if (conicMaskPaths.value.length === 0) return undefined
  return {
    background: gradientToCss(colorState.value.fill),
    mask: `url(#${conicMaskId})`,
    WebkitMask: `url(#${conicMaskId})`,
  }
})

const DEFAULT_RING_D
  = 'M6,0 L94,0 Q100,0 100,6 L100,94 Q100,100 94,100 L6,100 Q0,100 0,94 L0,6 Q0,0 6,0 Z'

function isThemedRef(ref: string | undefined): boolean {
  return ref === 'currentColor' || ref === 'inherit'
}

const decorationPaths = computed(() => {
  if (!props.shape) return []
  const lerped = lerpedPaths.value
  return basePaths.value
    .map((p, i) => ({ path: p, d: lerped?.[i] ?? p.d }))
    .filter(({ path }) => {
      const paintedFill = !!path.fill && path.fill !== 'none' && !isThemedRef(path.fill)
      const paintedStroke = !!path.stroke && path.stroke !== 'none' && !isThemedRef(path.stroke)
      return paintedFill || paintedStroke
    })
})

const rimPaths = computed(() => {
  if (!props.shape || !rimStyle.value) return []
  const lerped = lerpedPaths.value
  return basePaths.value
    .map((p, i) => ({ path: p, d: lerped?.[i] ?? p.d }))
    .filter(({ path }) =>
      (!!path.fill && isThemedRef(path.fill)) || (!!path.stroke && isThemedRef(path.stroke)),
    )
})

const cosmicViewBox = computed(() => {
  const { minX, minY, w, h } = vbBounds.value
  const mx = w * 0.25
  const my = h * 0.25
  return `${minX - mx} ${minY - my} ${w + mx * 2} ${h + my * 2}`
})

const cosmicMaskId = `pbr-cmask-${Math.random().toString(36).slice(2, 9)}`

const cosmicMaskPaths = computed<MaskPathEntry[] | null>(() => {
  if (!canvasFillActive.value) return null
  if (!props.shape || basePaths.value.length === 0) return null
  const lerped = lerpedPaths.value
  return basePaths.value.map((p, i) => ({
    d: lerped?.[i] ?? p.d,
    stroke: p.stroke && p.stroke !== 'none' ? 'white' : 'none',
    fill: p.fill && p.fill !== 'none' ? 'white' : 'none',
    strokeWidth: p.strokeWidth ?? 1,
    strokeLinecap: (p.strokeLinecap ?? 'butt') as MaskPathEntry['strokeLinecap'],
    strokeLinejoin: (p.strokeLinejoin ?? 'miter') as MaskPathEntry['strokeLinejoin'],
    transform: p.transform,
  }))
})

const cosmicMaskTransform = computed(() => {
  const { minX, minY, w, h } = vbBounds.value
  const mx = w * 0.25
  const my = h * 0.25
  const vbW = w + mx * 2
  const vbH = h + my * 2
  return `scale(${1 / vbW} ${1 / vbH}) translate(${-(minX - mx)} ${-(minY - my)})`
})

const cosmicMaskStyle = computed<Record<string, string> | undefined>(() => {
  if (!canvasFillActive.value) return undefined
  return {
    mask: `url(#${cosmicMaskId})`,
    WebkitMask: `url(#${cosmicMaskId})`,
  }
})

const ringStyle = computed<Record<string, string> | undefined>(() => {
  if (props.shape) return undefined
  const fill = colorState.value?.fill
  if (!fill) return undefined
  return {
    background: fillToCss(fill),
  }
})

function echoWin(c: number, a: number, b: number): number {
  return c >= a && c < b ? (c - a) / (b - a) : -1
}

function echoDir(i: number, n: number): [number, number] {
  const ang = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2
  return [Math.cos(ang), Math.sin(ang)]
}

const echoPaths = computed<{ d: string; transform?: string }[]>(() => {
  if (rimPaths.value.length) {
    return rimPaths.value.map((e) => ({ d: e.d, transform: e.path.transform }))
  }
  return [{ d: DEFAULT_RING_D }]
})

const dominionEcho = computed<{ ghosts: { dx: number; dy: number; color: string; opacity: number }[] } | null>(() => {
  const fill = dominionFill.value
  if (!fill || reducedMotion.value) return null
  const interval = (fill.intervalS ?? 5) * 1000
  const micro = (fill.microS ?? 1.9) * 1000
  const t = tMs.value
  const c = (t % interval) / interval
  const split = echoWin(c, 0.6, 0.72)
  const hold = echoWin(c, 0.72, 0.82)
  const fuse = echoWin(c, 0.82, 0.92)
  const flash = echoWin(c, 0.92, 1)
  let amt = 0
  if (split >= 0) amt = 1 - Math.pow(1 - split, 3)
  else if (hold >= 0) amt = 1
  else if (fuse >= 0) amt = 1 - Math.pow(fuse, 2)
  const colors = fill.colors
  const { w, h } = vbBounds.value
  const unit = Math.max(w, h) / 100
  const ghosts: { dx: number; dy: number; color: string; opacity: number }[] = []
  if (amt > 0.02) {
    for (let i = 0; i < colors.length; i++) {
      const d = echoDir(i, colors.length)
      const wob = Math.sin((t / 1000) * 3.1 + i * 2.2) * 1.6 * amt
      ghosts.push({
        dx: (d[0] * 7 * amt + wob * d[1]) * unit,
        dy: (d[1] * 7 * amt + wob * d[0]) * unit,
        color: colors[i],
        opacity: 0.7,
      })
    }
  } else if (flash < 0 && colors.length > 1) {
    const mc = (t % micro) / micro
    const tb = echoWin(mc, 0.72, 0.94)
    if (tb >= 0) {
      const ta = Math.sin(tb * Math.PI)
      ghosts.push(
        { dx: 2.6 * ta * unit, dy: -1.4 * ta * unit, color: colors[0], opacity: 0.6 * ta },
        { dx: -2.6 * ta * unit, dy: 1.4 * ta * unit, color: colors[colors.length - 1], opacity: 0.6 * ta },
      )
    }
  }
  const flashAlpha = flash >= 0 ? Math.sin(flash * Math.PI) : 0
  if (flashAlpha > 0.02) {
    ghosts.push({ dx: 0, dy: 0, color: fill.body ?? '#ffffff', opacity: flashAlpha })
  }
  return ghosts.length > 0 ? { ghosts } : null
})
</script>

<template>
  <PixelBorderRenderer
    v-if="isPixelShape && shape"
    :shape="shape"
    :color="color"
  />
  <template v-else-if="canvasFillActive && cosmicMaskStyle">
  <div
    class="profile-border__cosmic"
    :style="cosmicMaskStyle"
    aria-hidden="true"
  >
    <svg class="profile-border__mask-defs" aria-hidden="true">
      <defs>
        <mask
          :id="cosmicMaskId"
          mask-type="alpha"
          maskUnits="objectBoundingBox"
          maskContentUnits="objectBoundingBox"
          x="0"
          y="0"
          width="1"
          height="1"
        >
          <g :transform="cosmicMaskTransform">
            <template v-if="cosmicMaskPaths">
              <path
                v-for="(entry, i) in cosmicMaskPaths"
                :key="i"
                :d="entry.d"
                :fill="entry.fill"
                :stroke="entry.stroke"
                :stroke-width="entry.strokeWidth"
                :stroke-linecap="entry.strokeLinecap"
                :stroke-linejoin="entry.strokeLinejoin"
                :transform="entry.transform"
              />
            </template>
            <path v-else :d="DEFAULT_RING_D" fill="white" />
          </g>
        </mask>
      </defs>
    </svg>
    <CosmicBorderFill v-if="cosmicFill" :fill="cosmicFill" :sink="cosmicSink" />
    <ToonBorderFill v-else-if="toonFill" :fill="toonFill" />
    <PrismBorderFill v-else-if="prismFill" :fill="prismFill" />
    <GroveBorderFill v-else-if="groveFill" :fill="groveFill" />
    <RegaliaBorderFill v-else-if="regaliaFill" :fill="regaliaFill" />
    <ColossusBorderFill v-else-if="colossusFill" :fill="colossusFill" />
    <StolenFlameBorderFill v-else-if="stolenFlameFill" :fill="stolenFlameFill" />
    <DominionBorderFill v-else-if="dominionFill" :fill="dominionFill" />
    <svg
      v-if="rimPaths.length || decorationPaths.length"
      class="profile-border__cosmic-decor"
      :viewBox="cosmicViewBox"
      preserveAspectRatio="none"
    >
      <g v-if="rimStyle">
        <path
          v-for="(entry, i) in rimPaths"
          :key="i"
          :d="entry.d"
          fill="none"
          :stroke="rimStyle.stroke"
          :stroke-width="rimStyle.width"
          :stroke-opacity="rimStyle.opacity"
          stroke-linejoin="round"
          :transform="entry.path.transform"
        />
      </g>
      <path
        v-for="(entry, i) in decorationPaths"
        :key="`d${i}`"
        :d="entry.d"
        :class="{ 'pbr-twinkle': entry.path.twinkle }"
        :style="entry.path.twinkle ? { animationDelay: `${(i % 4) * 0.6}s` } : undefined"
        :fill="entry.path.fill && entry.path.fill !== 'none' && !isThemedRef(entry.path.fill) ? entry.path.fill : 'none'"
        :fill-opacity="entry.path.fillOpacity"
        :stroke="entry.path.stroke && entry.path.stroke !== 'none' && !isThemedRef(entry.path.stroke) ? entry.path.stroke : 'none'"
        :stroke-width="entry.path.strokeWidth"
        :stroke-opacity="entry.path.strokeOpacity"
        :stroke-linecap="entry.path.strokeLinecap"
        :stroke-linejoin="entry.path.strokeLinejoin"
        :transform="entry.path.transform"
      />
    </svg>
  </div>
  <svg
    v-if="dominionEcho"
    class="profile-border__echo"
    :viewBox="cosmicViewBox"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g
      v-for="(gh, gi) in dominionEcho.ghosts"
      :key="gi"
      :transform="`translate(${gh.dx} ${gh.dy})`"
      :opacity="gh.opacity"
    >
      <path
        v-for="(entry, i) in echoPaths"
        :key="i"
        :d="entry.d"
        fill="none"
        :stroke="gh.color"
        stroke-width="1.6"
        stroke-linejoin="round"
        :transform="entry.transform"
      />
    </g>
  </svg>
  </template>
  <div
    v-else-if="basePaths.length && colorIsConic"
    class="profile-border__conic"
    :style="conicMaskStyle"
    aria-hidden="true"
  >
    <svg class="profile-border__mask-defs" aria-hidden="true">
      <defs>
        <mask
          :id="conicMaskId"
          mask-type="alpha"
          maskUnits="objectBoundingBox"
          maskContentUnits="objectBoundingBox"
          x="0"
          y="0"
          width="1"
          height="1"
        >
          <g :transform="conicMaskTransform">
            <path
              v-for="(entry, i) in conicMaskPaths"
              :key="i"
              :d="entry.d"
              :fill="entry.fill"
              :stroke="entry.stroke"
              :stroke-width="entry.strokeWidth"
              :stroke-linecap="entry.strokeLinecap"
              :stroke-linejoin="entry.strokeLinejoin"
              :transform="entry.transform"
            />
          </g>
        </mask>
      </defs>
    </svg>
  </div>
  <svg
    v-else-if="basePaths.length"
    class="profile-border__shape"
    :viewBox="shape?.viewBox ?? '0 0 100 100'"
    preserveAspectRatio="none"
    :style="{ color: svgColor }"
    aria-hidden="true"
  >
    <defs v-if="colorIsSvgGradient && effectiveGradient">
      <linearGradient
        v-if="effectiveGradient.type === 'linear'"
        :id="gradientId"
        gradientUnits="userSpaceOnUse"
        :x1="linearGradAttrs.x1"
        :y1="linearGradAttrs.y1"
        :x2="linearGradAttrs.x2"
        :y2="linearGradAttrs.y2"
        :gradientTransform="linearGradAttrs.transform"
      >
        <stop
          v-for="(s, i) in effectiveGradient.stops"
          :key="i"
          :offset="`${s.atPct}%`"
          :stop-color="s.hex"
        />
      </linearGradient>
      <radialGradient
        v-else-if="effectiveGradient.type === 'radial'"
        :id="gradientId"
        gradientUnits="userSpaceOnUse"
        :cx="radialGradAttrs.cx"
        :cy="radialGradAttrs.cy"
        :r="radialGradAttrs.r"
      >
        <stop
          v-for="(s, i) in effectiveGradient.stops"
          :key="i"
          :offset="`${s.atPct}%`"
          :stop-color="s.hex"
        />
      </radialGradient>
    </defs>
    <defs v-if="shapeFxActive">
      <clipPath :id="clipId">
        <path
          v-for="(p, i) in basePaths"
          :key="i"
          :d="lerpedPaths?.[i] ?? p.d"
          :transform="p.transform"
        />
      </clipPath>
      <linearGradient :id="glistenGradId" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0" />
        <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.55" />
        <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path
      v-for="(p, i) in basePaths"
      :key="i"
      :d="lerpedPaths?.[i] ?? p.d"
      :class="{ 'pbr-twinkle': p.twinkle }"
      :style="p.twinkle ? { animationDelay: `${(i % 4) * 0.6}s` } : undefined"
      :stroke="pathStrokeRef(p)"
      :stroke-width="p.strokeWidth"
      :stroke-linecap="p.strokeLinecap"
      :stroke-linejoin="p.strokeLinejoin"
      :stroke-dasharray="p.strokeDasharray"
      :stroke-opacity="p.strokeOpacity"
      :fill="pathFillRef(p)"
      :fill-opacity="p.fillOpacity"
      :transform="p.transform"
    />
    <g v-if="glistenBand" :clip-path="`url(#${clipId})`">
      <rect
        :x="glistenBand.x"
        :y="glistenBand.y"
        :width="glistenBand.width"
        :height="glistenBand.height"
        :transform="glistenBand.transform"
        :fill="`url(#${glistenGradId})`"
      />
    </g>
    <g v-if="shapeFxActive && activeShapeSparkles.length" :clip-path="`url(#${clipId})`">
      <path
        v-for="s in activeShapeSparkles"
        :key="s.id"
        :d="SHAPE_STAR_D"
        fill="#ffffff"
        :opacity="shapeSparkleOpacity(s)"
        :transform="shapeSparkleTransform(s)"
      />
    </g>
  </svg>
  <div v-else-if="ringStyle" class="profile-border__ring" :style="ringStyle"></div>
</template>

<style scoped>
.profile-border__shape,
.profile-border__conic {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.profile-border__cosmic {
  position: absolute;
  inset: -25%;
  width: 150%;
  height: 150%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}

.profile-border__mask-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.profile-border__cosmic-decor {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}

.profile-border__echo {
  position: absolute;
  inset: -25%;
  width: 150%;
  height: 150%;
  max-width: none;
  max-height: none;
  overflow: visible;
  pointer-events: none;
}

.pbr-twinkle {
  animation: pbr-twinkle 2.4s ease-in-out infinite;
}

@keyframes pbr-twinkle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pbr-twinkle {
    animation: none;
  }
}

.profile-border__shape {
  overflow: visible;
}

.profile-border__ring {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-avatar);
  pointer-events: none;
}
</style>
