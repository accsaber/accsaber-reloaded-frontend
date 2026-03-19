<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  min: number
  max: number
  modelValue: [number, number]
  step?: number
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: [number, number]]
}>()

const step = computed(() => props.step ?? 1)

const fillLeft = computed(() => ((props.modelValue[0] - props.min) / (props.max - props.min)) * 100)
const fillRight = computed(() => ((props.modelValue[1] - props.min) / (props.max - props.min)) * 100)

function onMinInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  const clamped = Math.min(val, props.modelValue[1])
  emit('update:modelValue', [clamped, props.modelValue[1]])
}

function onMaxInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  const clamped = Math.max(val, props.modelValue[0])
  emit('update:modelValue', [props.modelValue[0], clamped])
}
</script>

<template>
  <div class="range-slider">
    <label v-if="label" class="range-slider__label">{{ label }}</label>
    <div class="range-slider__track-container">
      <div class="range-slider__track">
        <div class="range-slider__fill" :style="{ left: fillLeft + '%', width: (fillRight - fillLeft) + '%' }" />
      </div>
      <input type="range" class="range-slider__input" :min="min" :max="max" :step="step" :value="modelValue[0]"
        @input="onMinInput" />
      <input type="range" class="range-slider__input" :min="min" :max="max" :step="step" :value="modelValue[1]"
        @input="onMaxInput" />
    </div>
    <div class="range-slider__values">
      <span class="range-slider__value">{{ modelValue[0] }}</span>
      <span class="range-slider__value">{{ modelValue[1] }}</span>
    </div>
  </div>
</template>

<style scoped>
.range-slider {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.range-slider__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.range-slider__track-container {
  position: relative;
  height: 16px;
}

.range-slider__track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  transform: translateY(-50%);
}

.range-slider__fill {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
}

.range-slider__input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
  outline: none;
}

.range-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-base);
  border: 2px solid var(--accent);
  cursor: pointer;
  pointer-events: auto;
}

.range-slider__input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-base);
  border: 2px solid var(--accent);
  cursor: pointer;
  pointer-events: auto;
}

.range-slider__values {
  display: flex;
  justify-content: space-between;
}

.range-slider__value {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
