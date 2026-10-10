<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean
  position?: 'bottom-left' | 'bottom-right' | 'right'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const containerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const coords = ref({ top: 0, left: 0 })

const VIEWPORT_MARGIN = 8
const GAP = 4

function place() {
  const container = containerRef.value
  const panel = panelRef.value
  if (!container || !panel) return
  const r = container.getBoundingClientRect()
  const w = panel.offsetWidth
  const position = props.position ?? 'bottom-left'
  const left = position === 'bottom-right' ? r.right - w : position === 'right' ? r.right + GAP : r.left
  const maxLeft = window.innerWidth - VIEWPORT_MARGIN - w
  coords.value = {
    top: position === 'right' ? r.top : r.bottom + GAP,
    left: Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft)),
  }
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    emit('update:open', false)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:open', false)
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    nextTick(place)
  } else {
    document.removeEventListener('click', onClickOutside)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', place, true)
})
</script>

<template>
  <div ref="containerRef" class="base-dropdown">
    <div class="base-dropdown__trigger" @click="$emit('update:open', !open)">
      <slot name="trigger" />
    </div>
    <Transition name="dropdown">
      <div v-if="open" ref="panelRef" class="base-dropdown__panel"
        :style="{ top: `${coords.top}px`, left: `${coords.left}px` }">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.base-dropdown {
  position: relative;
  display: inline-block;
}

.base-dropdown__trigger {
  cursor: pointer;
}

.base-dropdown__panel {
  position: fixed;
  z-index: 100;
  min-width: 180px;
  max-width: calc(100vw - 16px);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {

  .dropdown-enter-active,
  .dropdown-leave-active {
    transition: none;
  }
}
</style>
