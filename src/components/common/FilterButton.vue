<script setup lang="ts">
defineProps<{
  active?: boolean
  hasIndicator?: boolean
}>()
</script>

<template>
  <button
    type="button"
    class="filter-button"
    :class="{ 'filter-button--active': active }"
    aria-label="Toggle filters"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
    <span v-if="hasIndicator" class="filter-button__dot" />
  </button>
</template>

<style scoped>
.filter-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

.filter-button:hover {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.filter-button--active {
  border-color: var(--accent, var(--text-tertiary));
  color: var(--accent, var(--text-primary));
}

.filter-button__dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
</style>
