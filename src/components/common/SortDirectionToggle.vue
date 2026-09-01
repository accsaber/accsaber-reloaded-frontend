<script setup lang="ts">
import type { SortDirection } from '@/types/display'

defineProps<{
  direction?: SortDirection
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button class="sort-dir" type="button"
    :aria-label="direction === 'asc' ? 'Sort descending' : 'Sort ascending'"
    :title="direction === 'asc' ? 'Ascending' : 'Descending'"
    @click="$emit('toggle')">
    <svg v-if="direction === 'asc'" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
    <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 3V11M7 11L3.5 7.5M7 11L10.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
  </button>
</template>

<style scoped>
.sort-dir {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  flex-shrink: 0;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  background: var(--bg-base);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}

.sort-dir:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}
</style>
