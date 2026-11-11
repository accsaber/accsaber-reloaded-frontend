<script setup lang="ts">
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import { useId } from 'vue'

const props = defineProps<{
  text: string
  label?: string
  width?: number
  more?: boolean
  tag?: string
  variant?: 'inline'
}>()

const panelId = useId()

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
    :class="variant === 'inline' ? 'hint--inline' : { 'hint--tag': tag || $slots.trigger }"
    :aria-label="tag || $slots.trigger ? undefined : label ? `What ${label} does` : text"
    :aria-describedby="isOpen ? panelId : undefined"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
    @focus="open"
    @blur="locked || close()"
    @keydown.escape="close"
    @click.prevent="toggle"
  >
    <slot name="trigger">{{ tag ?? '?' }}</slot>
    <Teleport to="body">
      <Transition name="pop">
        <div
          v-if="isOpen"
          :id="panelId"
          ref="panelRef"
          class="hint__panel"
          :class="{ 'hint__panel--locked': locked }"
          :style="panelStyle"
          role="tooltip"
        >
          <slot :locked="locked">{{ text }}</slot>
          <span v-if="more && !locked" class="hint__more">Click for more</span>
        </div>
      </Transition>
    </Teleport>
  </button>
</template>

<style scoped>
.hint {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: var(--bg-overlay);
  border: none;
  border-radius: 50%;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  line-height: 1;
  cursor: help;
  transition: color var(--dur-fast) var(--ease-out);
}

.hint:hover,
.hint:focus-visible {
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
}

.hint--inline {
  display: inline;
  width: auto;
  height: auto;
  padding: 0;
  border: none;
  border-bottom: 1px dotted currentColor;
  border-radius: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: inherit;
}

.hint--inline:hover,
.hint--inline:focus-visible {
  color: inherit;
}

.hint__panel {
  z-index: 10000;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-overlay);
  border-radius: var(--radius-card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  line-height: 1.5;
  white-space: normal;
  pointer-events: none;
}

.hint__more {
  display: block;
  margin-top: var(--space-xs);
  color: var(--text-secondary);
}

.hint__panel--locked {
  pointer-events: auto;
}
</style>
