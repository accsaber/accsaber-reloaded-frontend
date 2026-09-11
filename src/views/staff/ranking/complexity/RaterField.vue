<script setup lang="ts">
import { formatFixed } from '@/utils/formatters'
import HintTooltip from './HintTooltip.vue'
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

const decimals = computed(() => {
  if (props.kind === 'count') return 0
  if (props.kind === 'share') return 3
  if (props.kind === 'nudge') return 2
  return 3
})

const range = ref<FieldRange>(fieldRange(props.kind, props.live, props.modelValue))

const typed = ref(formatFixed(props.modelValue, decimals.value))

watch(() => props.live, (live) => {
  range.value = fieldRange(props.kind, live, props.modelValue)
})

watch(() => props.modelValue, (value) => {
  if (Number(typed.value) !== value) typed.value = formatFixed(value, decimals.value)
  if (value < range.value.min || value > range.value.max) {
    range.value = fieldRange(props.kind, props.live, value)
  }
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

const changed = computed(() => Math.abs(props.modelValue - props.live) > 1e-9)
</script>

<template>
  <div class="rater-field" :class="{ 'rater-field--changed': changed }">
    <span class="rater-field__label">
      {{ label }}
      <HintTooltip :text="hint" :label="label" />
    </span>
    <input class="rater-field__slider" type="range" :min="range.min" :max="range.max"
      :step="range.step" :value="modelValue" :aria-label="label" @input="slide($event, false)"
      @change="slide($event, true)" />
    <input class="rater-field__value" type="text" inputmode="decimal" :value="typed"
      :aria-label="`${label} value`" @input="type(($event.target as HTMLInputElement).value)"
      @change="commit(($event.target as HTMLInputElement).value)"
      @blur="commit(($event.target as HTMLInputElement).value)"
      @keyup.enter="commit(($event.target as HTMLInputElement).value)" />
  </div>
</template>

<style scoped>
.rater-field {
  display: grid;
  grid-template-columns: minmax(96px, 132px) minmax(80px, 1fr) 86px;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.rater-field__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.rater-field--changed .rater-field__label {
  color: var(--text-primary);
}

.rater-field__slider {
  width: 100%;
  min-width: 0;
  height: 18px;
  accent-color: var(--page-accent, var(--accent));
  cursor: pointer;
}

.rater-field__value {
  width: 100%;
  padding: 3px var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  text-align: right;
  outline: none;
}

.rater-field--changed .rater-field__value {
  border-color: color-mix(in srgb, var(--page-accent, var(--accent)) 45%, var(--bg-overlay));
}

.rater-field__value:focus {
  border-color: var(--page-accent, var(--accent));
}
</style>
