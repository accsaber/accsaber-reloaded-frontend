<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
}>()

const open = ref(false)
</script>

<template>
  <div class="collapsible">
    <button class="collapsible__header" @click="open = !open">
      <h3 class="collapsible__title field-label">{{ title }}</h3>
      <svg class="collapsible__chevron" :class="{ 'collapsible__chevron--open': open }" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    <div v-if="open" class="collapsible__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.collapsible {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  margin-bottom: var(--space-lg);
  overflow: hidden;
}

.collapsible__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 120ms ease;
}

.collapsible__header:hover {
  background: var(--bg-elevated);
}

.collapsible__title {
  margin: 0;
}

.collapsible__chevron {
  color: var(--text-tertiary);
  transition: transform 150ms ease;
  flex-shrink: 0;
}

.collapsible__chevron--open {
  transform: rotate(180deg);
}

.collapsible__body {
  padding: var(--space-md) var(--space-lg) var(--space-lg);
}
</style>
