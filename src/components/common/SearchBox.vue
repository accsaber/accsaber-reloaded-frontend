<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  debounce?: number
}>(), {
  modelValue: '',
  placeholder: 'Search...',
  debounce: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue)
let timeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.modelValue, (val) => {
  if (val !== localValue.value) {
    localValue.value = val
  }
})

function onInput(e: Event) {
  localValue.value = (e.target as HTMLInputElement).value
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => {
    emit('update:modelValue', localValue.value)
  }, props.debounce)
}

onUnmounted(() => {
  if (timeout) clearTimeout(timeout)
})
</script>

<template>
  <div class="search-box" :class="{ 'search-box--has-value': localValue }">
    <svg class="search-box__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      class="search-box__input"
      type="text"
      :value="localValue"
      :placeholder="placeholder"
      @input="onInput"
    />
    <button
      v-if="localValue"
      class="search-box__clear"
      aria-label="Clear search"
      @click="localValue = ''; emit('update:modelValue', '')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-base);
  transition: border-color 120ms ease-in;
  min-width: 0;
}

.search-box:focus-within {
  border-color: var(--accent);
}

.search-box__icon {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.search-box__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  min-width: 0;
}

.search-box__input::placeholder {
  color: var(--text-tertiary);
}

.search-box__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 2px;
  border: none;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.search-box__clear:hover {
  color: var(--text-primary);
}
</style>
