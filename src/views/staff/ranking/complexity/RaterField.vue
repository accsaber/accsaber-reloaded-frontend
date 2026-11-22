<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import { formatFixed } from '@/utils/formatters'
import { countFloor, fieldRange, type FieldKind, type FieldRange } from './tuning'
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps<{
  label: string
  hint: string
  kind: FieldKind
  live: number
  modelValue: number
  deferred?: boolean
  plain?: boolean
  end?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const DECIMALS: Record<FieldKind, number> = { count: 0, threshold: 0, percent: 0, intercept: 3, slope: 3 }
const SAME = 1e-9

const decimals = computed(() => DECIMALS[props.kind])
const range = ref<FieldRange>(fieldRange(props.kind, props.live, props.modelValue))
const typed = ref(formatFixed(props.modelValue, decimals.value))

watch(() => props.live, (live) => {
  range.value = fieldRange(props.kind, live, props.modelValue)
})

watch(() => props.modelValue, (value) => {
  if (Number(typed.value) !== value) typed.value = formatFixed(value, decimals.value)
  if (value < range.value.min || value > range.value.max) range.value = fieldRange(props.kind, props.live, value)
})

function commit(raw: string) {
  typed.value = raw
  const parsed = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(parsed)) return
  const floor = countFloor(props.kind)
  const value = floor == null ? parsed : Math.max(floor, Math.round(parsed))
  if (value !== parsed) typed.value = formatFixed(value, decimals.value)
  emit('update:modelValue', value)
}

async function settle(raw: string) {
  commit(raw)
  await nextTick()
  typed.value = formatFixed(props.modelValue, decimals.value)
}

function type(raw: string) {
  if (props.deferred) typed.value = raw
  else commit(raw)
}

function slide(event: Event, settled: boolean) {
  const parsed = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(parsed)) return
  typed.value = formatFixed(parsed, decimals.value)
  if (settled || !props.deferred) emit('update:modelValue', parsed)
}

const changed = computed(() => Math.abs(props.modelValue - props.live) > SAME)
</script>

<template>
  <div class="rater-field" :class="{ 'rater-field--changed': changed, 'rater-field--plain': plain }">
    <span class="rater-field__label">
      {{ label }}
      <HintTooltip :text="hint" :label="label" />
    </span>
    <input v-if="!plain" class="slider rater-field__slider" type="range" :min="range.min" :max="range.max" :step="range.step"
      :value="modelValue" :aria-label="label" @input="slide($event, false)" @change="slide($event, true)" />
    <span v-if="end" class="rater-field__end">{{ end }}</span>
    <input v-else class="inline-edit rater-field__value" type="text" inputmode="decimal" :value="typed"
      :aria-label="`${label} value`" @input="type(($event.target as HTMLInputElement).value)"
      @change="settle(($event.target as HTMLInputElement).value)"
      @keyup.enter="settle(($event.target as HTMLInputElement).value)" />
  </div>
</template>

<style scoped>
.rater-field {
  display: grid;
  grid-template-columns: 220px minmax(80px, 1fr) 72px;
  align-items: center;
  align-content: center;
  gap: var(--space-md);
  min-width: 0;
  height: var(--rater-row-h);
}

.rater-field--plain {
  grid-template-columns: minmax(0, 1fr) 72px;
}

.rater-field__end {
  color: var(--text-secondary);
  text-align: right;
  white-space: nowrap;
}

.rater-field--changed .rater-field__end {
  font-weight: 600;
  color: var(--text-primary);
}

.rater-field__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-secondary);
}

.rater-field--changed .rater-field__label {
  font-weight: 600;
  color: var(--text-primary);
}

.rater-field__slider {
  width: 100%;
  min-width: 0;
}

.rater-field__value {
  width: 100%;
  font: inherit;
  font-family: var(--font-mono);
  color: var(--text-primary);
  text-align: right;
}

.rater-field--changed .rater-field__value {
  border-bottom-color: var(--page-accent, var(--accent));
}

@media (max-width: 767px) {
  .rater-field {
    grid-template-columns: minmax(0, 1fr) 72px;
    gap: var(--space-xs) var(--space-md);
  }

  .rater-field__slider {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
