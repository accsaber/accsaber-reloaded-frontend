<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  fn: (x: number, param: number) => number
  xMin: number
  xMax: number
  xLabel: string
  yLabel: string
  formatX: (v: number) => string
  formatY: (v: number) => string
  initialX: number
  paramLabel?: string
  paramMin?: number
  paramMax?: number
  paramStep?: number
  initialParam?: number
  formatXTick?: (v: number) => string
  formatYTick?: (v: number) => string
}>()

const WIDTH = 640
const HEIGHT = 300
const PAD = { left: 52, right: 36, top: 16, bottom: 34 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom
const SAMPLES = 160

const x = ref(props.initialX)
const param = ref(props.initialParam ?? props.paramMin ?? 0)

const hasParam = computed(() => props.paramLabel !== undefined)

const yMax = computed(() => props.fn(props.xMax, props.paramMax ?? param.value))

function toSvgX(value: number): number {
  return PAD.left + ((value - props.xMin) / (props.xMax - props.xMin)) * PLOT_W
}

function toSvgY(value: number): number {
  return PAD.top + PLOT_H - (value / yMax.value) * PLOT_H
}

const curvePath = computed(() => {
  const parts: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const xv = props.xMin + (i / SAMPLES) * (props.xMax - props.xMin)
    const yv = props.fn(xv, param.value)
    parts.push(`${i === 0 ? 'M' : 'L'}${toSvgX(xv).toFixed(1)},${toSvgY(yv).toFixed(1)}`)
  }
  return parts.join(' ')
})

const pointY = computed(() => props.fn(x.value, param.value))
const pointSvgX = computed(() => toSvgX(x.value))
const pointSvgY = computed(() => toSvgY(pointY.value))

const xTicks = computed(() =>
  Array.from({ length: 5 }, (_, i) => props.xMin + (i / 4) * (props.xMax - props.xMin)),
)

const yTicks = computed(() =>
  Array.from({ length: 4 }, (_, i) => (i / 3) * yMax.value),
)

const tickX = computed(() => props.formatXTick ?? props.formatX)
const tickY = computed(() => props.formatYTick ?? props.formatY)

const svgRef = ref<SVGSVGElement | null>(null)
let dragging = false

function clamp(value: number): number {
  return Math.min(props.xMax, Math.max(props.xMin, value))
}

function updateFromPointer(event: PointerEvent) {
  const svg = svgRef.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / rect.width
  const svgX = ratio * WIDTH
  x.value = clamp(props.xMin + ((svgX - PAD.left) / PLOT_W) * (props.xMax - props.xMin))
}

function onPointerDown(event: PointerEvent) {
  dragging = true
  updateFromPointer(event)
  if (event.isTrusted) svgRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (dragging) updateFromPointer(event)
}

function onPointerUp() {
  dragging = false
}

function onKeydown(event: KeyboardEvent) {
  const fine = (props.xMax - props.xMin) / 100
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    x.value = clamp(x.value - fine)
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    x.value = clamp(x.value + fine)
  } else if (event.key === 'Home') {
    x.value = props.xMin
  } else if (event.key === 'End') {
    x.value = props.xMax
  } else {
    return
  }
  event.preventDefault()
}
</script>

<template>
  <figure class="explorer">
    <div class="explorer__readouts">
      <div class="explorer__readout">
        <span class="explorer__readout-label">{{ xLabel }}</span>
        <span class="explorer__readout-value">{{ formatX(x) }}</span>
      </div>
      <div class="explorer__readout">
        <span class="explorer__readout-label">{{ yLabel }}</span>
        <span class="explorer__readout-value explorer__readout-value--accent">
          {{ formatY(pointY) }}
        </span>
      </div>
      <label v-if="hasParam" class="explorer__param">
        <span class="explorer__readout-label">{{ paramLabel }}</span>
        <input
          v-model.number="param"
          type="range"
          :min="paramMin"
          :max="paramMax"
          :step="paramStep ?? 1"
        />
        <span class="explorer__param-value">{{ param }}</span>
      </label>
    </div>

    <svg
      ref="svgRef"
      class="explorer__chart"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <line
        v-for="tick in yTicks"
        :key="`y${tick}`"
        class="explorer__grid"
        :x1="PAD.left"
        :x2="WIDTH - PAD.right"
        :y1="toSvgY(tick)"
        :y2="toSvgY(tick)"
      />
      <text
        v-for="tick in yTicks"
        :key="`yl${tick}`"
        class="explorer__tick"
        :x="PAD.left - 8"
        :y="toSvgY(tick) + 4"
        text-anchor="end"
      >
        {{ tickY(tick) }}
      </text>
      <text
        v-for="tick in xTicks"
        :key="`xl${tick}`"
        class="explorer__tick"
        :x="toSvgX(tick)"
        :y="HEIGHT - PAD.bottom + 22"
        text-anchor="middle"
      >
        {{ tickX(tick) }}
      </text>

      <path class="explorer__curve" :d="curvePath" />

      <line
        class="explorer__guide"
        :x1="pointSvgX"
        :x2="pointSvgX"
        :y1="pointSvgY"
        :y2="HEIGHT - PAD.bottom"
      />
      <g
        class="explorer__handle"
        role="slider"
        tabindex="0"
        :aria-label="xLabel"
        :aria-valuemin="xMin"
        :aria-valuemax="xMax"
        :aria-valuenow="x"
        :aria-valuetext="`${formatX(x)}, ${formatY(pointY)} ${yLabel}`"
        @keydown="onKeydown"
      >
        <circle :cx="pointSvgX" :cy="pointSvgY" r="14" fill="transparent" />
        <circle class="explorer__point" :cx="pointSvgX" :cy="pointSvgY" r="6" />
      </g>
    </svg>
    <figcaption class="explorer__hint">Drag the point or use arrow keys.</figcaption>
  </figure>
</template>

<style scoped>
.explorer {
  margin: 0 0 var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  padding: var(--space-md);
}

.explorer__readouts {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}

.explorer__readout {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.explorer__readout-label {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.explorer__readout-value {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  color: var(--text-primary);
}

.explorer__readout-value--accent {
  color: var(--accent);
}

.explorer__param {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: auto;
  min-width: 160px;
}

.explorer__param input {
  accent-color: var(--accent);
}

.explorer__param-value {
  font-family: var(--font-mono);
  font-size: var(--text-stat-inline);
  color: var(--text-primary);
}

.explorer__chart {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
  touch-action: none;
}

.explorer__grid {
  stroke: var(--chart-grid);
  stroke-width: 1;
}

.explorer__tick {
  fill: var(--chart-text);
  font-family: var(--font-sans);
  font-size: 12px;
}

.explorer__curve {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.5;
  stroke-linejoin: round;
}

.explorer__guide {
  stroke: var(--text-tertiary);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.explorer__handle {
  cursor: grab;
  outline: none;
}

.explorer__point {
  fill: var(--accent);
  stroke: var(--bg-surface);
  stroke-width: 2;
}

.explorer__handle:focus-visible .explorer__point {
  stroke: var(--text-primary);
}

.explorer__hint {
  margin-top: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
