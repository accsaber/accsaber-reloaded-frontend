<script setup lang="ts">
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimeline } from '@/composables/useTimeline'
import { fillRenderer } from '@/components/cosmetics/borders/fillRenderers'
import type { ShapeTrace } from '@/utils/cosmetics/shapeTrace'
import type {
  BorderColorStateValue,
  BorderColorValue,
  BorderShapePathValue,
  BorderShapeStateValue,
  BorderShapeValue,
} from '@/types/cosmetics/border'
import type { Gradient } from '@/types/cosmetics/common'
import {
  interpolateBorderColorState,
  isAnimated,
  isCanvasFill,
  pickInterpolatedState,
} from '@/utils/cosmetics/interpolate'
import { shapeTracks, trackPathD } from '@/utils/cosmetics/shapeMorph'
import { DEFAULT_AVATAR_MASK } from '@/utils/avatarBox'
import { easeInOut, ringFrom, ringPathD } from '@/utils/cosmetics/effects'
import { outerWall, shapeFrameBounds, shapeFrameMargin, shapeRing, type FrameBounds } from '@/utils/shapeSilhouette'
import { computed, useTemplateRef } from 'vue'
import DominionEcho from '@/components/cosmetics/borders/DominionEcho.vue'
import PixelBorderRenderer from '@/components/cosmetics/borders/PixelBorderRenderer.vue'
import { clamp } from '@/utils/math'

const props = defineProps<{
  shape: BorderShapeValue | null
  color: BorderColorValue | null
}>()

const reducedMotion = useReducedMotion()

const DEFAULT_RING_D
  = 'M6,0 L94,0 Q100,0 100,6 L100,94 Q100,100 94,100 L6,100 Q0,100 0,94 L0,6 Q0,0 6,0 Z'

const DEFAULT_RING_SHAPE: BorderShapeValue = {
  viewBox: '0 0 100 100',
  states: [{ atMs: 0, paths: [{ d: DEFAULT_RING_D, fill: 'currentColor' }] }],
}

const canvasFill = computed(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill && isCanvasFill(fill) ? fill : null
})

const shape = computed<BorderShapeValue | null>(() =>
  props.shape ?? (props.color && !canvasFill.value ? DEFAULT_RING_SHAPE : null),
)

const isPixelShape = computed(() => shape.value?.renderMode === 'pixel')


const canvasFillActive = computed(() => !!canvasFill.value)

const cosmicFill = computed(() => (canvasFill.value?.type === 'cosmic' ? canvasFill.value : null))
const dominionFill = computed(() => (canvasFill.value?.type === 'dominion' ? canvasFill.value : null))

const fillView = computed(() => {
  const fill = canvasFill.value
  if (!fill) return null
  const renderer = fillRenderer(fill)
  const attrs: Record<string, unknown> = { fill }
  if (renderer.margin) attrs.margin = fillMargin.value
  if (fill.type === 'cosmic') attrs.sink = cosmicSink.value
  if (renderer.trace) attrs.trace = fillTrace.value
  return { component: renderer.component, attrs, key: `${JSON.stringify(fill)}:${renderer.margin ? fillMargin.value : 0}` }
})

const fillAura = computed(() => {
  const view = fillView.value
  const aura = canvasFill.value ? fillRenderer(canvasFill.value).aura : undefined
  return view && aura ? { component: aura, attrs: view.attrs, key: `aura:${view.key}` } : null
})

const rimStyle = computed(() => (canvasFill.value ? fillRenderer(canvasFill.value).rim(canvasFill.value) : null))

const cosmicSink = computed<{ x: number; y: number; r: number } | null>(() => {
  const overlay = shape.value?.overlay
  if (!cosmicFill.value || overlay?.type !== 'blackhole' || !overlay.enabled) return null
  if (overlay.suction?.fillType !== 'cosmic') return null
  const f = frameBox.value
  return { x: ((50 - f.x) / f.w) * 100, y: ((100 - f.y) / f.h) * 100, r: (8.8 * 100) / f.w }
})

const shapeFxActive = computed(
  () =>
    !reducedMotion.value
    && !isPixelShape.value
    && !!shape.value?.glisten?.enabled,
)

const needsTimeline = computed(
  () =>
    isAnimated(props.color)
    || isAnimated(shape.value)
    || shapeFxActive.value
)

const frameRef = useTemplateRef<Element>('frame')
const { tMs } = useTimeline({ active: () => needsTimeline.value, el: frameRef })

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
  if (fill.type === 'linear' || fill.type === 'radial') return fill
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
  const vb = shape.value?.viewBox ?? '0 0 100 100'
  const parts = vb.split(/[\s,]+/).map(Number)
  const valid = parts.length === 4 && parts.every((n) => Number.isFinite(n))
  const [minX, minY, w, h] = valid ? parts : [0, 0, 100, 100]
  return { minX, minY, w, h }
})

const linearGradAttrs = computed(() => {
  const { x, y, w, h } = frameBox.value
  const g = effectiveGradient.value
  const rad = ((g && g.type === 'linear' ? g.angleDeg : 180) * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2
  const cx = x + w / 2
  const cy = y + h / 2
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half }
})

const radialGradAttrs = computed(() => {
  const { x, y, w, h } = frameBox.value
  const g = effectiveGradient.value
  const cxPct = g && g.type === 'radial' ? (g.centerXPct ?? 50) : 50
  const cyPct = g && g.type === 'radial' ? (g.centerYPct ?? 50) : 50
  const rPct = g && g.type === 'radial' ? (g.radiusPct ?? 50) : 50
  return {
    cx: x + (w * cxPct) / 100,
    cy: y + (h * cyPct) / 100,
    r: (Math.min(w, h) * rPct) / 100,
  }
})

const sortedShapeStates = computed<BorderShapeStateValue[]>(() => {
  const sv = shape.value
  if (!sv) return []
  return [...sv.states].sort((a, b) => a.atMs - b.atMs)
})

const basePaths = computed(() => sortedShapeStates.value[0]?.paths ?? [])

const SHAPE_SAMPLES = 100

const tracks = computed(() => {
  const states = sortedShapeStates.value
  if (states.length < 2) return null
  try {
    return shapeTracks(states, SHAPE_SAMPLES)
  } catch {
    return null
  }
})

interface ShapeBracket {
  idxA: number
  idxB: number
  localT: number
}

function currentShapeBracket(): ShapeBracket | null {
  const sv = shape.value
  const states = sortedShapeStates.value
  if (!sv || states.length === 0) return null
  if (states.length === 1) return { idxA: 0, idxB: 0, localT: 0 }
  const lastAt = states[states.length - 1].atMs
  const total = sv.durationMs ?? lastAt
  if (total <= 0) return { idxA: 0, idxB: 0, localT: 0 }
  const loop = sv.loop ?? 'loop'
  let t: number
  const tNow = tMs.value
  if (loop === 'once') t = clamp(tNow, 0, total)
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

let heldPaths: string[] | null = null

const lerpedPaths = computed<string[] | null>(() => {
  const states = sortedShapeStates.value
  if (states.length === 0) return null
  if (states.length === 1) return (states[0].paths ?? []).map((p) => p.d)
  const list = tracks.value
  const bracket = currentShapeBracket()
  if (!list || !bracket) return (states[0].paths ?? []).map((p) => p.d)
  const { idxA, idxB } = bracket
  const eased = idxA === idxB ? 0 : easeInOut(bracket.localT)
  const next = list.map((track) => trackPathD(track, idxA, idxB, eased))
  if (heldPaths && next.length === heldPaths.length && next.every((d, i) => d === heldPaths![i])) return heldPaths
  heldPaths = next
  return next
})

let gradientIdCounter = 0
const gradientId = `pbr-grad-${++gradientIdCounter}-${Math.random().toString(36).slice(2, 8)}`
const clipId = `pbr-clip-${gradientIdCounter}-${Math.random().toString(36).slice(2, 8)}`
const glistenGradId = `pbr-glint-${gradientIdCounter}-${Math.random().toString(36).slice(2, 8)}`

const glistenBand = computed(() => {
  const g = shape.value?.glisten
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

interface MaskPathEntry {
  d: string
  fill: string
  stroke: string
  strokeWidth: number
  strokeLinecap: 'butt' | 'round' | 'square'
  strokeLinejoin: 'miter' | 'round' | 'bevel'
  transform?: string
}

function isThemedRef(ref: string | undefined): boolean {
  return ref === 'currentColor' || ref === 'inherit'
}

const decorationPaths = computed(() => {
  if (!shape.value) return []
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
  if (!shape.value || !rimStyle.value) return []
  const lerped = lerpedPaths.value
  return basePaths.value
    .map((p, i) => ({ path: p, d: lerped?.[i] ?? p.d }))
    .filter(({ path }) =>
      (!!path.fill && isThemedRef(path.fill)) || (!!path.stroke && isThemedRef(path.stroke)),
    )
})

const frameBox = computed<FrameBounds>(() => {
  if (shape.value) return shapeFrameBounds(shape.value)
  const { minX, minY, w, h } = vbBounds.value
  return { x: minX, y: minY, w, h }
})

const fillMargin = computed(() => shapeFrameMargin(shape.value))

const cosmicBox = computed<FrameBounds>(() => {
  const f = frameBox.value
  const mx = (f.w * fillMargin.value) / 100
  const my = (f.h * fillMargin.value) / 100
  return { x: f.x - mx, y: f.y - my, w: f.w + mx * 2, h: f.h + my * 2 }
})

const cosmicViewBox = computed(() => {
  const { x, y, w, h } = cosmicBox.value
  return `${x} ${y} ${w} ${h}`
})

const cosmicHostStyle = computed<Record<string, string>>(() => {
  const vb = vbBounds.value
  const c = cosmicBox.value
  return {
    left: `${((c.x - vb.minX) / vb.w) * 100}%`,
    top: `${((c.y - vb.minY) / vb.h) * 100}%`,
    width: `${(c.w / vb.w) * 100}%`,
    height: `${(c.h / vb.h) * 100}%`,
  }
})

const fillTrace = computed<ShapeTrace | null>(() => {
  const mode = canvasFill.value ? fillRenderer(canvasFill.value).trace : undefined
  if (!mode || (mode === 'shape' && !shape.value)) return null
  const ds = shape.value
    ? basePaths.value
        .filter((p) => p.trace !== false && !p.transform && ((!!p.fill && isThemedRef(p.fill)) || (!!p.stroke && isThemedRef(p.stroke))))
        .map((p) => p.d)
    : [DEFAULT_RING_D]
  if (!ds.length) return null
  if (mode !== 'wall') return { ds, viewBox: cosmicViewBox.value }
  const vb = vbBounds.value
  const wall = ringFrom(outerWall(shapeRing(shape.value)), { x: vb.minX, y: vb.minY, w: vb.w, h: vb.h }).outer
  return { ds, viewBox: cosmicViewBox.value, wall: ringPathD(wall), hole: shape.value?.avatarMask ?? DEFAULT_AVATAR_MASK }
})

const cosmicMaskId = `pbr-cmask-${Math.random().toString(36).slice(2, 9)}`

const cosmicMaskPaths = computed<MaskPathEntry[] | null>(() => {
  if (!canvasFillActive.value) return null
  if (!shape.value || basePaths.value.length === 0) return null
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
  const { x, y, w, h } = cosmicBox.value
  return `scale(${1 / w} ${1 / h}) translate(${-x} ${-y})`
})

const cosmicMaskStyle = computed<Record<string, string> | undefined>(() => {
  if (!canvasFillActive.value) return undefined
  return {
    ...cosmicHostStyle.value,
    mask: `url(#${cosmicMaskId})`,
    WebkitMask: `url(#${cosmicMaskId})`,
  }
})

const echoPaths = computed<{ d: string; transform?: string }[]>(() => {
  if (rimPaths.value.length) {
    return rimPaths.value.map((e) => ({ d: e.d, transform: e.path.transform }))
  }
  return [{ d: DEFAULT_RING_D }]
})

const echoUnit = computed(() => Math.max(vbBounds.value.w, vbBounds.value.h) / 100)
</script>

<template>
  <PixelBorderRenderer
    v-if="isPixelShape && shape"
    :shape="shape"
    :color="color"
  />
  <template v-else-if="canvasFillActive && cosmicMaskStyle">
  <div
    ref="frame"
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
    <component :is="fillView.component" v-if="fillView" :key="fillView.key" v-bind="fillView.attrs" />
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
  <DominionEcho
    v-if="dominionFill"
    class="profile-border__echo"
    :style="cosmicHostStyle"
    :fill="dominionFill"
    :paths="echoPaths"
    :view-box="cosmicViewBox"
    :unit="echoUnit"
  />
  <component
    :is="fillAura.component"
    v-if="fillAura"
    :key="fillAura.key"
    class="profile-border__echo"
    :style="cosmicHostStyle"
    v-bind="fillAura.attrs"
  />
  </template>
  <svg
    v-else-if="basePaths.length"
    ref="frame"
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
  </svg>
</template>

<style scoped>
.profile-border__shape {
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
</style>
