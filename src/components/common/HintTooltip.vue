<script setup lang="ts">
import { useFloatingPanel } from '@/composables/useFloatingPanel'

const props = defineProps<{
  text: string
  label?: string
  width?: number
  more?: boolean
  tag?: string
}>()

const { isOpen, locked, triggerRef, panelRef, panelStyle, open, close, toggle, onTriggerEnter, onTriggerLeave } =
  useFloatingPanel({
    maxWidth: props.width ?? 240,
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
    :class="{ 'hint--tag': tag }"
    :aria-label="label ? `What ${label} does` : text"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
    @focus="open"
    @blur="locked || close()"
    @keydown.escape="close"
    @click.prevent="toggle"
  >
    {{ tag ?? '?' }}
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="hint__panel"
        :class="{ 'hint__panel--locked': locked }"
        :style="panelStyle"
        role="tooltip"
      >
        <slot :locked="locked">{{ text }}</slot>
        <span v-if="more && !locked" class="hint__more">Click for more</span>
      </div>
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

.hint--tag {
  width: auto;
  height: auto;
  padding: 1px var(--space-xs);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
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

.hint__more {
  display: block;
  margin-top: var(--space-xs);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--bg-overlay);
  font-size: 0.625rem;
  color: var(--text-tertiary);
}

.hint__panel--locked {
  pointer-events: auto;
}
</style>
