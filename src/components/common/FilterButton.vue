<script setup lang="ts">
import BaseButton from './BaseButton.vue'

defineProps<{
  active?: boolean
}>()
</script>

<template>
  <BaseButton class="filter-button" type="button" :variant="active ? 'primary' : 'default'" aria-label="Toggle filters">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
    <span class="filter-button__label">Filters</span>
  </BaseButton>
</template>

<style scoped>
.filter-button.base-button--primary {
  border-color: var(--page-accent, var(--accent));
  color: var(--page-accent, var(--accent));
}

@media (max-width: 639px) {
  .filter-button__label {
    display: none;
  }
}
</style>
