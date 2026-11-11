<script setup lang="ts">
import type { ChartToggle } from '@/types/display'

defineProps<{
  toggles: ChartToggle[]
  active: string[]
  label: string
}>()

defineEmits<{ select: [key: string] }>()
</script>

<template>
  <div class="chart-toggles" role="group" :aria-label="label">
    <button v-for="toggle in toggles" :key="toggle.key" type="button" class="chart-toggles__btn pressable"
      :class="{ 'chart-toggles__btn--active': active.includes(toggle.key) }"
      :aria-pressed="active.includes(toggle.key)"
      :style="toggle.color ? { '--toggle-color': toggle.color } : undefined" @click="$emit('select', toggle.key)">
      {{ toggle.label }}
    </button>
  </div>
</template>

<style scoped>
.chart-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  width: fit-content;
  max-width: 100%;
  padding: 2px;
  background: var(--bg-surface);
  border-radius: var(--radius-btn);
}

.chart-toggles__btn {
  padding: var(--space-xs) var(--space-sm);
  border: none;
  border-radius: calc(var(--radius-btn) - 2px);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.chart-toggles__btn:hover {
  color: var(--text-primary);
}

.chart-toggles__btn--active {
  background: var(--bg-overlay);
  color: var(--toggle-color, var(--text-primary));
}
</style>
