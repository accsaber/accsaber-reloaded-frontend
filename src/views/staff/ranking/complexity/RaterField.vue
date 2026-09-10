<script setup lang="ts">
import { formatFixed } from '@/utils/formatters'
import HintTooltip from './HintTooltip.vue'
import { fieldRange, type FieldKind } from './tuning'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  label: string
  hint: string
  kind: FieldKind
  live: number
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const range = computed(() => fieldRange(props.kind, props.live, props.modelValue))

const decimals = computed(() => {
  if (props.kind === 'count') return 0
  if (props.kind === 'share') return 3
  if (props.kind === 'nudge') return 2
  return 3
})

const typed = ref(formatFixed(props.modelValue, decimals.value))

watch(() => props.modelValue, (value) => {
  if (Number(typed.value) !== value) typed.value = formatFixed(value, decimals.value)
})

function commit(raw: string) {
  typed.value = raw
  const parsed = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(parsed)) return
  emit('update:modelValue', parsed)
}

function slide(event: Event) {
  const parsed = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(parsed)) return
  typed.value = formatFixed(parsed, decimals.value)
  emit('update:modelValue', parsed)
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
      :step="range.step" :value="modelValue" :aria-label="label" @input="slide" />
    <input class="rater-field__value" type="text" inputmode="decimal" :value="typed"
      :aria-label="`${label} value`" @input="commit(($event.target as HTMLInputElement).value)" />
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
