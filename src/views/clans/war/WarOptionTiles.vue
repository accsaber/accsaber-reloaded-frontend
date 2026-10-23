<script setup lang="ts">
export interface WarOption {
  key: string
  label: string
  note?: string
  disabled?: boolean
}

defineProps<{
  options: WarOption[]
  modelValue: string
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [key: string]
}>()
</script>

<template>
  <div class="war-tiles" role="radiogroup" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.key"
      type="button"
      role="radio"
      class="war-tiles__tile"
      :class="{ 'war-tiles__tile--active': modelValue === option.key }"
      :aria-checked="modelValue === option.key"
      :disabled="disabled || option.disabled"
      @click="emit('update:modelValue', option.key)"
    >
      <span>{{ option.label }}</span>
      <span v-if="option.note" class="war-tiles__note">{{ option.note }}</span>
    </button>
  </div>
</template>

<style scoped>
.war-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--space-sm);
}

.war-tiles__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  font-weight: 600;
  text-align: center;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.war-tiles__tile:hover:not(:disabled) {
  border-color: var(--text-tertiary);
}

.war-tiles__tile--active {
  color: var(--page-accent, var(--accent));
  border-color: var(--page-accent, var(--accent));
}

.war-tiles__tile:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.war-tiles__note {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-tertiary);
}
</style>
