<script setup lang="ts">
import { useFloatingPanel } from '@/composables/useFloatingPanel'

defineProps<{
  label: string
  title: string
}>()

const {
  isOpen,
  locked,
  triggerRef,
  panelRef,
  panelStyle,
  close,
  toggle,
  onTriggerEnter,
  onTriggerLeave,
  onPanelEnter,
  onPanelLeave,
} = useFloatingPanel({ width: 260, gap: 8, hover: { openDelay: 350, closeDelay: 160 } })
</script>

<template>
  <span ref="triggerRef" class="card-popover" @mouseenter="onTriggerEnter" @mouseleave="onTriggerLeave">
    <button
      type="button"
      class="card-popover__btn"
      :class="{ 'card-popover__btn--active': isOpen }"
      :aria-expanded="isOpen"
      :aria-label="`Show ${title.toLowerCase()}`"
      @click.stop.prevent="toggle"
      @keydown.escape="close"
    >
      {{ label }}
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="card-popover">
        <div
          v-if="isOpen"
          ref="panelRef"
          class="card-popover__popup"
          :style="panelStyle"
          role="dialog"
          :aria-label="title"
          @mouseenter="onPanelEnter"
          @mouseleave="onPanelLeave"
        >
          <div class="card-popover__head">
            <span class="card-popover__title">{{ title }}</span>
            <span class="card-popover__count">{{ label }}</span>
            <button
              v-if="locked"
              type="button"
              class="card-popover__close"
              :aria-label="`Close ${title.toLowerCase()}`"
              @click.stop.prevent="close"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="card-popover__body">
            <slot />
          </div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.card-popover {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.card-popover__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 1px 6px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}

.card-popover__btn:hover,
.card-popover__btn--active {
  color: var(--card-accent, var(--accent));
  border-color: var(--card-accent, var(--accent));
}

.card-popover__btn:focus-visible {
  outline: none;
  border-color: var(--card-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--card-accent, var(--accent)) 30%, transparent);
}
</style>

<style>
.card-popover__popup {
  z-index: 10000;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
  pointer-events: auto;
}

.card-popover__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.card-popover__title {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.card-popover__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-left: auto;
}

.card-popover__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  color: var(--text-tertiary);
  cursor: pointer;
  transition:
    color 120ms ease,
    background 120ms ease;
}

.card-popover__close:hover {
  color: var(--text-primary);
  background: var(--bg-overlay);
}

.card-popover__body {
  padding: var(--space-sm);
  max-height: 260px;
  overflow-y: auto;
}

.card-popover-enter-active {
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out;
}

.card-popover-leave-active {
  transition:
    opacity 100ms ease-in,
    transform 100ms ease-in;
}

.card-popover-enter-from,
.card-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .card-popover-enter-from,
  .card-popover-leave-to {
    transform: none;
  }
}
</style>
