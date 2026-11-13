<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'

defineProps<{
  controls: { label: string; run: () => void; d: string; dot?: boolean }[]
}>()
</script>

<template>
  <div class="stage-controls">
    <IconButton v-for="c in controls" :key="c.label" :label="c.label" @click="c.run">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path :d="c.d" />
        <circle v-if="c.dot" cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </IconButton>
  </div>
</template>

<style scoped>
.stage-controls {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}
</style>
