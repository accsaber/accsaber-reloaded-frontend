<script setup lang="ts">
import type { TableColumn } from '@/types/display';

defineProps<{
  columns: TableColumn[]
  row: Record<string, unknown>
  clickable?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <div class="card-fallback" :class="{ 'card-fallback--clickable': clickable }" role="button"
    :tabindex="clickable ? 0 : undefined" @click="clickable && $emit('click')"
    @keydown.enter="clickable && $emit('click')">
    <div v-for="col in columns" :key="col.key" class="card-fallback__field">
      <span class="card-fallback__label">{{ col.label }}</span>
      <span class="card-fallback__value" :class="{ 'card-fallback__value--mono': col.mono }">
        <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
          {{ row[col.key] }}
        </slot>
      </span>
    </div>
  </div>
</template>

<style scoped>
.card-fallback {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.card-fallback--clickable {
  cursor: pointer;
  transition: border-color 120ms ease;
}

.card-fallback--clickable:hover {
  border-color: var(--text-tertiary);
}

.card-fallback__field {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-md);
}

.card-fallback__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.card-fallback__value {
  font-size: var(--text-body);
  color: var(--text-primary);
  text-align: right;
}

.card-fallback__value--mono {
  font-family: var(--font-mono);
}
</style>
