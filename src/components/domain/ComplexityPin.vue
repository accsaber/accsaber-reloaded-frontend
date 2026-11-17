<script setup lang="ts">
import { PIN_HINT } from '@/utils/complexity'
</script>

<template>
  <span class="complexity-pin" role="img" :aria-label="PIN_HINT" :title="PIN_HINT">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 17v5" />
      <path
        d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  </span>
</template>

<style scoped>
.complexity-pin {
  display: inline-flex;
  flex: none;
  color: var(--text-secondary);
  cursor: help;
}
</style>
