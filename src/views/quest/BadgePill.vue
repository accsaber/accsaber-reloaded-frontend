<script setup lang="ts">
defineProps<{
  label: string
  color?: string
}>()
</script>

<template>
  <span class="badge-pill" :style="{ '--pill-color': color ?? 'var(--accent)' }">
    {{ label }}
  </span>
</template>

<style scoped>
.badge-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-sm);
  border: 1px solid var(--pill-color);
  border-radius: var(--radius-pill);
  color: var(--pill-color);
  font-size: var(--text-caption);
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
}
</style>
