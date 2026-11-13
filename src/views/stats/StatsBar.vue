<script setup lang="ts">
import { plural } from './statsFormat'

defineProps<{
  count?: number
  noun?: string
}>()
</script>

<template>
  <div class="stats-bar">
    <slot />
    <span class="caption stats-bar__count">{{ count ? plural(count, noun ?? 'record') : '' }}</span>
  </div>
</template>

<style scoped>
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  min-height: var(--control-h);
}

.stats-bar__count {
  margin-left: auto;
  white-space: nowrap;
}
</style>
