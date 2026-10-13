<script setup lang="ts">
defineProps<{ label: string }>()
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="stats-close" :aria-label="label" @click="emit('click')">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
</template>

<style scoped>
.stats-close {
  flex-shrink: 0;
  display: inline-flex;
  padding: var(--space-xs);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.stats-close:hover {
  color: var(--text-primary);
  border-color: var(--bg-overlay);
}
</style>
