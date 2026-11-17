<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import { formatFixed } from '@/utils/formatters'
import { fieldRange, type FieldKind, type FieldRange } from './tuning'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  label: string
  hint: string
  kind: FieldKind
  live: number
  modelValue: number
  deferred?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const DECIMALS: Record<FieldKind, number> = { count: 0, share: 3, nudge: 2, intercept: 3, slope: 3 }
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
  emit('update:modelValue', parsed)
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
  <div class="rater-field" :class="{ 'rater-field--changed': changed }">
    <span class="rater-field__label">
      {{ label }}
      <HintTooltip :text="hint" :label="label" />
    </span>
    <input class="slider rater-field__slider" type="range" :min="range.min" :max="range.max" :step="range.step"
      :value="modelValue" :aria-label="label" @input="slide($event, false)" @change="slide($event, true)" />
    <input class="inline-edit rater-field__value" type="text" inputmode="decimal" :value="typed"
      :aria-label="`${label} value`" @input="type(($event.target as HTMLInputElement).value)"
      @change="commit(($event.target as HTMLInputElement).value)"
      @keyup.enter="commit(($event.target as HTMLInputElement).value)" />
  </div>
</template>

<style scoped>
.rater-field {
  display: grid;
  grid-template-columns: 220px minmax(80px, 1fr) 72px;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  height: var(--control-h);
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
    height: auto;
    gap: var(--space-xs) var(--space-md);
    padding: var(--space-sm) 0;
  }

  .rater-field__slider {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
