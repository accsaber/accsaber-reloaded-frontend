<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  text: string
  label: string
}>()

const PANEL_WIDTH = 240
const PANEL_HEIGHT = 108
const MARGIN = 12

const open = ref(false)
const flipX = ref(false)
const flipY = ref(false)
const trigger = ref<HTMLElement | null>(null)

function boundsFor(el: HTMLElement): DOMRect {
  let node = el.parentElement
  while (node) {
    const style = getComputedStyle(node)
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      return node.getBoundingClientRect()
    }
    node = node.parentElement
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
}

function show() {
  const el = trigger.value
  if (el) {
    const rect = el.getBoundingClientRect()
    const bounds = boundsFor(el)
    flipX.value = rect.left + PANEL_WIDTH > bounds.right - MARGIN
    flipY.value = rect.top - PANEL_HEIGHT < bounds.top + MARGIN
  }
  open.value = true
}
</script>

<template>
  <span class="hint">
    <button ref="trigger" type="button" class="hint__trigger" :aria-label="`What ${label} does`"
      @mouseenter="show" @mouseleave="open = false" @focus="show" @blur="open = false"
      @click.prevent>
      ?
    </button>
    <span v-if="open" class="hint__panel" role="tooltip"
      :class="{ 'hint__panel--end': flipX, 'hint__panel--below': flipY }">
      {{ text }}
    </span>
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

.hint__panel--end {
  left: auto;
  right: -4px;
}

.hint__panel--below {
  bottom: auto;
  top: calc(100% + 6px);
}
</style>
