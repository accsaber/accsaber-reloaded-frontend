<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  text: string
  label: string
}>()

const open = ref(false)
</script>

<template>
  <span class="hint">
    <button type="button" class="hint__trigger" :aria-label="`What ${label} does`"
      @mouseenter="open = true" @mouseleave="open = false" @focus="open = true" @blur="open = false"
      @click.prevent>
      ?
    </button>
    <span v-if="open" class="hint__panel" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.hint {
  position: relative;
  display: inline-flex;
}

.hint__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  padding: 0;
  background: none;
  border: 1px solid var(--bg-overlay);
  border-radius: 50%;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  line-height: 1;
  cursor: help;
}

.hint__trigger:hover,
.hint__trigger:focus-visible {
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.hint__panel {
  position: absolute;
  bottom: calc(100% + 6px);
  left: -4px;
  z-index: 10;
  width: max-content;
  max-width: 240px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  white-space: normal;
}
</style>
