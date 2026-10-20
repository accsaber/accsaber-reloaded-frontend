<script setup lang="ts">
import { clamp, clamp01 } from '@/utils/math'
import { computed } from 'vue'

const accuracy = defineModel<number>({ required: true })

const WHOLE_STOPS: Array<{ at: number, value: number }> = [
  { at: 0, value: 0 },
  { at: 1 / 6, value: 50 },
  { at: 2 / 6, value: 80 },
  { at: 3 / 6, value: 90 },
  { at: 1, value: 100 },
]
const WHOLE_TRACK = 1000

function segmentFor(pick: (stop: { at: number, value: number }) => number, target: number) {
  let seg = 0
  while (seg < WHOLE_STOPS.length - 2 && target > pick(WHOLE_STOPS[seg + 1])) seg++
  return { a: WHOLE_STOPS[seg], b: WHOLE_STOPS[seg + 1] }
}

function trackToWhole(pos: number): number {
  const t = clamp01(pos / WHOLE_TRACK)
  const { a, b } = segmentFor((s) => s.at, t)
  const frac = b.at > a.at ? (t - a.at) / (b.at - a.at) : 0
  return Math.round(a.value + (b.value - a.value) * frac)
}

function wholeToTrack(whole: number): number {
  const v = clamp(whole, 0, 100)
  const { a, b } = segmentFor((s) => s.value, v)
  const frac = b.value > a.value ? (v - a.value) / (b.value - a.value) : 0
  return Math.round((a.at + (b.at - a.at) * frac) * WHOLE_TRACK)
}

const WHOLE_TICKS = `linear-gradient(to right, ${WHOLE_STOPS.slice(1, -1).flatMap(({ at }) => {
  const mark = `${(at * 100).toFixed(4)}%`
  return [
    `transparent calc(${mark} - 1px)`,
    `var(--bg-base) calc(${mark} - 1px)`,
    `var(--bg-base) ${mark}`,
    `transparent ${mark}`,
  ]
}).join(', ')})`

const hundredths = computed(() => Math.round(clamp01(accuracy.value) * 10000))
const whole = computed(() => Math.floor(hundredths.value / 100))

const decimal = computed({
  get: () => hundredths.value % 100,
  set: (value: number) => { accuracy.value = (whole.value * 100 + value) / 10000 },
})

const wholeTrack = computed({
  get: () => wholeToTrack(whole.value),
  set: (pos: number) => {
    const next = trackToWhole(pos)
    accuracy.value = next >= 100 ? 1 : (next * 100 + decimal.value) / 10000
  },
})
</script>

<template>
  <div class="acc-slider">
    <label class="acc-slider__row">
      <span class="acc-slider__label">Whole %</span>
      <input v-model.number="wholeTrack" type="range" class="acc-slider__input"
        :style="{ backgroundImage: WHOLE_TICKS }" min="0" :max="WHOLE_TRACK" step="1" />
    </label>
    <label class="acc-slider__row">
      <span class="acc-slider__label">Decimal</span>
      <input v-model.number="decimal" type="range" class="acc-slider__input" min="0" :max="whole >= 100 ? 0 : 99"
        step="1" :disabled="whole >= 100" />
    </label>
  </div>
</template>

<style scoped>
.acc-slider {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.acc-slider__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.acc-slider__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  width: 52px;
  flex-shrink: 0;
}

.acc-slider__input {
  flex: 1;
  height: 4px;
  appearance: none;
  background: var(--bg-overlay);
  border-radius: var(--radius-xs);
  outline: none;
  cursor: pointer;
}

.acc-slider__input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.acc-slider__input::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent, var(--text-primary));
  border: 2px solid var(--bg-elevated);
  cursor: pointer;
  transition: transform 100ms ease;
}

.acc-slider__input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.acc-slider__input:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}

.acc-slider__input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent, var(--text-primary));
  border: 2px solid var(--bg-elevated);
  cursor: pointer;
}
</style>
