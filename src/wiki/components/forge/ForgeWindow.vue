<script setup lang="ts">
import { computed } from 'vue'

export interface ForgeWindowMarker {
  value: number
  label: string
  muted?: boolean
}

const props = defineProps<{
  min: number
  max: number
  windowMin: number
  windowMax: number
  markers?: ForgeWindowMarker[]
  axisLabel: string
  empty?: boolean
  integer?: boolean
}>()

const span = computed(() => Math.max(0.0001, props.max - props.min))

function toPercent(value: number): number {
  return Math.max(0, Math.min(100, ((value - props.min) / span.value) * 100))
}

const windowStart = computed(() => toPercent(Math.max(props.windowMin, props.min)))
const windowWidth = computed(() =>
  Math.max(0, toPercent(Math.min(props.windowMax, props.max)) - windowStart.value),
)

const ticks = computed(() => {
  if (props.integer) {
    const first = Math.ceil(props.min)
    const last = Math.floor(props.max)
    const stride = Math.max(1, Math.ceil((last - first) / 6))
    const out: { value: number; percent: number }[] = []
    for (let value = first; value <= last; value += stride) {
      out.push({ value, percent: toPercent(value) })
    }
    return out
  }
  const count = 4
  return Array.from({ length: count + 1 }, (_, i) => {
    const value = props.min + (span.value * i) / count
    return { value, percent: (i / count) * 100 }
  })
})

const placedMarkers = computed(() => {
  const placed = (props.markers ?? [])
    .filter((m) => m.value >= props.min && m.value <= props.max)
    .map((m) => ({ ...m, percent: toPercent(m.value), raised: false }))
    .sort((a, b) => a.percent - b.percent)
  const kept = placed.filter(
    (m) =>
      !(m.muted && placed.some((o) => !o.muted && Math.abs(o.percent - m.percent) < 1)),
  )
  for (let i = 1; i < kept.length; i++) {
    if (kept[i].percent - kept[i - 1].percent < 14 && !kept[i - 1].raised) {
      kept[i].raised = true
    }
  }
  return kept
})

const formatTick = (value: number) =>
  props.integer || Math.abs(value) >= 100
    ? Math.round(value).toLocaleString()
    : value.toFixed(1)
</script>

<template>
  <div class="window">
    <div class="window__track" :class="{ 'window__track--empty': empty }">
      <span
        v-if="!empty && windowWidth > 0"
        class="window__band"
        :style="{ left: `${windowStart}%`, width: `${windowWidth}%` }"
      />
      <span
        v-for="tick in ticks"
        :key="tick.value"
        class="window__tick"
        :style="{ left: `${tick.percent}%` }"
      />
      <span
        v-for="marker in placedMarkers"
        :key="marker.label"
        class="window__marker"
        :class="{ 'window__marker--muted': marker.muted, 'window__marker--raised': marker.raised }"
        :style="{ left: `${marker.percent}%` }"
      >
        <span class="window__marker-label">{{ marker.label }}</span>
      </span>
    </div>
    <div class="window__scale">
      <span
        v-for="tick in ticks"
        :key="tick.value"
        class="window__scale-value"
        :style="{ left: `${tick.percent}%` }"
      >
        {{ formatTick(tick.value) }}
      </span>
    </div>
    <p class="window__axis">{{ axisLabel }}</p>
  </div>
</template>

<style scoped>
.window {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 28px;
}

.window__track {
  position: relative;
  height: 46px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: var(--bg-base);
}

.window__track--empty {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--error) 50%, var(--bg-overlay));
}

.window__band {
  position: absolute;
  top: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-left: 1px solid var(--accent);
  border-right: 1px solid var(--accent);
}

.window__tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--bg-overlay);
}

.window__marker {
  position: absolute;
  top: -4px;
  bottom: -1px;
  width: 2px;
  transform: translateX(-50%);
  background: var(--text-primary);
}

.window__marker--muted {
  width: 1px;
  background: var(--text-tertiary);
}

.window__marker-label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 3px);
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-secondary);
}

.window__marker--muted .window__marker-label {
  color: var(--text-tertiary);
}

.window__marker--raised .window__marker-label {
  bottom: calc(100% + 15px);
}

.window__scale {
  position: relative;
  height: 12px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-tertiary);
}

.window__scale-value {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.window__scale-value:first-child {
  transform: none;
}

.window__scale-value:last-child {
  transform: translateX(-100%);
}

.window__axis {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
