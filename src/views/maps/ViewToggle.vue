<script setup lang="ts">
type ViewMode = 'grid' | 'list' | 'batch'

defineProps<{ modelValue: ViewMode }>()
const emit = defineEmits<{ 'update:modelValue': [value: ViewMode] }>()

const VIEWS: { key: ViewMode; label: string; aria: string; paths: string[] }[] = [
  {
    key: 'grid',
    label: 'Grid',
    aria: 'Grid view',
    paths: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  },
  {
    key: 'list',
    label: 'List',
    aria: 'List view',
    paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  },
  {
    key: 'batch',
    label: 'Batches',
    aria: 'Batch view',
    paths: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  },
]
</script>

<template>
  <div class="view-toggle" role="radiogroup" aria-label="View mode">
    <button v-for="view in VIEWS" :key="view.key" class="view-toggle__btn"
      :class="{ 'view-toggle__btn--active': modelValue === view.key }" :aria-label="view.aria"
      @click="emit('update:modelValue', view.key)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path v-for="d in view.paths" :key="d" :d="d" />
      </svg>
      <span class="view-toggle__label">{{ view.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.view-toggle {
  display: flex;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  overflow: hidden;
}

.view-toggle__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.view-toggle__label {
  font-size: var(--text-caption);
  font-weight: 500;
}

.view-toggle__btn:hover {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.view-toggle__btn--active {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
</style>
