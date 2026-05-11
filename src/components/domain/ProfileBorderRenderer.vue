<script setup lang="ts">
import { useTimeline } from '@/composables/useTimeline'
import type {
  BorderColorStateValue,
  BorderColorValue,
  BorderShapePathValue,
  BorderShapeStateValue,
  BorderShapeValue,
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
import { computed } from 'vue'

const props = defineProps<{
  shape: BorderShapeValue | null
  color: BorderColorValue | null
}>()

const colorIsConic = computed(() => props.color?.states?.[0]?.fill?.type === 'conic')

const needsTimeline = computed(
  () =>
    isAnimated(props.color)
    || (colorIsConic.value && isAnimated(props.shape))
    || isAnimated(props.shape),
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

const colorIsGradient = computed(
  () => colorState.value?.fill.type !== 'solid' && colorState.value?.fill != null,
)

const colorIsSvgGradient = computed(() => {
  const t = colorState.value?.fill.type
  return t === 'linear' || t === 'radial'
})

const solidColor = computed<string | null>(() => {
  const fill = colorState.value?.fill
  if (fill && fill.type === 'solid') return fill.hex
  return null
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
  if (states.length === 1) return states[0].paths.map((p) => p.d)
  const samples = sampledStates.value
  if (!samples) return states[0].paths.map((p) => p.d)
  const bracket = currentShapeBracket()
  if (!bracket) return states[0].paths.map((p) => p.d)
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

void colorIsGradient

const conicMaskStyle = computed<Record<string, string> | undefined>(() => {
  if (!colorIsConic.value) return undefined
  if (!colorState.value || colorState.value.fill.type !== 'conic') return undefined
  const lerped = lerpedPaths.value
  const reference = basePaths.value
  if (!lerped || reference.length === 0) return undefined
  const viewBox = props.shape?.viewBox ?? '0 0 100 100'
  const inner = reference
    .map((p, i) => {
      const d = lerped[i] ?? p.d
      const stroke = p.stroke && p.stroke !== 'currentColor' && p.stroke !== 'inherit' ? p.stroke : 'white'
      const fill = p.fill && p.fill !== 'currentColor' && p.fill !== 'inherit' ? p.fill : 'none'
      const sw = p.strokeWidth ?? 1
      return `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" stroke-linecap="${p.strokeLinecap ?? 'butt'}" stroke-linejoin="${p.strokeLinejoin ?? 'miter'}" ${p.transform ? `transform="${p.transform}"` : ''} />`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none">${inner}</svg>`
  const mask = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
  return {
    background: gradientToCss(colorState.value.fill),
    maskImage: mask,
    webkitMaskImage: mask,
    maskSize: '100% 100%',
    webkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    webkitMaskRepeat: 'no-repeat',
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
</script>

<template>
  <div
    v-if="basePaths.length && colorIsConic"
    class="profile-border__conic"
    :style="conicMaskStyle"
    aria-hidden="true"
  ></div>
  <svg
    v-else-if="basePaths.length"
    class="profile-border__shape"
    :viewBox="shape?.viewBox ?? '0 0 100 100'"
    preserveAspectRatio="none"
    :style="{ color: svgColor }"
    aria-hidden="true"
  >
    <defs v-if="colorIsSvgGradient && colorState">
      <linearGradient
        v-if="colorState.fill.type === 'linear'"
        :id="gradientId"
        gradientUnits="objectBoundingBox"
        :gradientTransform="`rotate(${colorState.fill.angleDeg} 0.5 0.5)`"
      >
        <stop
          v-for="(s, i) in colorState.fill.stops"
          :key="i"
          :offset="`${s.atPct}%`"
          :stop-color="s.hex"
        />
      </linearGradient>
      <radialGradient
        v-else-if="colorState.fill.type === 'radial'"
        :id="gradientId"
        gradientUnits="objectBoundingBox"
        :cx="(colorState.fill.centerXPct ?? 50) / 100"
        :cy="(colorState.fill.centerYPct ?? 50) / 100"
        :r="(colorState.fill.radiusPct ?? 50) / 100"
      >
        <stop
          v-for="(s, i) in colorState.fill.stops"
          :key="i"
          :offset="`${s.atPct}%`"
          :stop-color="s.hex"
        />
      </radialGradient>
    </defs>
    <path
      v-for="(p, i) in basePaths"
      :key="i"
      :d="lerpedPaths?.[i] ?? p.d"
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
