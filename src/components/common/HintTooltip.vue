<script setup lang="ts">
import { useFloatingPanel } from '@/composables/useFloatingPanel'

defineProps<{
  text: string
  label?: string
}>()

const { isOpen, triggerRef, panelRef, panelStyle, open, close, onTriggerEnter, onTriggerLeave } =
  useFloatingPanel({
    maxWidth: 240,
    side: 'above',
    align: 'start',
    gap: 6,
    hover: { openDelay: 0, closeDelay: 0 },
  })
</script>

<template>
  <button
    v-if="text"
    ref="triggerRef"
    type="button"
    class="hint"
    :aria-label="label ? `What ${label} does` : text"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
    @focus="open"
    @blur="close"
    @keydown.escape="close"
    @click.prevent
  >
    ?
    <Teleport to="body">
      <span v-if="isOpen" ref="panelRef" class="hint__panel" :style="panelStyle" role="tooltip">
        {{ text }}
      </span>
    </Teleport>
  </button>
</template>

<style scoped>
.hint {
  display: inline-flex;
  flex-shrink: 0;
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
  text-transform: none;
  letter-spacing: 0;
  cursor: help;
}

.hint:hover,
.hint:focus-visible {
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.hint__panel {
  z-index: 10000;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  line-height: 1.5;
  white-space: normal;
  pointer-events: none;
}
</style>
