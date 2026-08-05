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
    <button v-for="toggle in toggles" :key="toggle.key" type="button" class="chart-toggles__btn" :class="{
      'chart-toggles__btn--active': active.includes(toggle.key),
      'chart-toggles__btn--swatch': !!toggle.color,
    }" :aria-pressed="active.includes(toggle.key)"
      :style="toggle.color ? { '--toggle-color': toggle.color } : undefined" @click="$emit('select', toggle.key)">
      <span v-if="toggle.color" class="chart-toggles__swatch" />
      {{ toggle.label }}
    </button>
  </div>
</template>

<style scoped>
.chart-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.chart-toggles__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.chart-toggles__btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.chart-toggles__btn--active {
  border-color: var(--toggle-color, var(--accent));
  color: var(--toggle-color, var(--accent));
}

.chart-toggles__btn--active.chart-toggles__btn--swatch {
  color: var(--text-primary);
}

.chart-toggles__swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  border: 1px solid var(--toggle-color);
  background: transparent;
  transition: background-color 120ms ease;
}

.chart-toggles__btn--active .chart-toggles__swatch {
  background: var(--toggle-color);
}
</style>
