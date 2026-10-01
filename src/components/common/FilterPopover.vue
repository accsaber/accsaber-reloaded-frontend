<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const sheet = useMediaQuery('(max-width: 767px)')
const containerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (containerRef.value?.contains(target) || panelRef.value?.contains(target)) return
  emit('update:open', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:open', false)
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="containerRef" class="filter-popover">
    <div class="filter-popover__trigger" @click.stop="$emit('update:open', !open)">
      <slot name="trigger" />
    </div>
    <Teleport to="body" :disabled="!sheet">
      <Transition name="backdrop">
        <div v-if="open && sheet" class="filter-popover__backdrop" />
      </Transition>
      <Transition :name="sheet ? 'sheet' : 'popover'">
        <div
          v-if="open"
          ref="panelRef"
          class="filter-popover__panel"
          :class="{ 'filter-popover__panel--sheet': sheet }"
          :role="sheet ? 'dialog' : undefined"
          :aria-modal="sheet ? 'true' : undefined"
          aria-label="Filters"
        >
          <div v-if="sheet" class="filter-popover__sheet-head">
            <span class="filter-popover__sheet-title">Filters</span>
            <button
              type="button"
              class="filter-popover__close"
              aria-label="Close filters"
              @click="$emit('update:open', false)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.filter-popover {
  position: relative;
  display: inline-block;
}

.filter-popover__trigger {
  cursor: pointer;
}

.filter-popover__panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-sm);
  z-index: 100;
  min-width: 240px;
  max-height: min(65vh, 560px);
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.filter-popover__panel--sheet {
  position: fixed;
  top: auto;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  z-index: 1001;
  min-width: 0;
  max-height: 85dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: var(--radius-modal) var(--radius-modal) 0 0;
  border-bottom: none;
  padding: 0 var(--space-md) calc(var(--space-lg) + env(safe-area-inset-bottom));
  box-shadow: none;
}

.filter-popover__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
}

.filter-popover__sheet-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  padding: var(--space-sm) 0;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--bg-overlay);
}

.filter-popover__sheet-title {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.filter-popover__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: calc(-1 * var(--space-sm));
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  cursor: pointer;
}

.filter-popover__close:hover {
  color: var(--text-primary);
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.sheet-enter-active {
  transition: transform 200ms ease-out;
}

.sheet-leave-active {
  transition: transform 150ms ease-in;
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 150ms ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .popover-enter-active,
  .popover-leave-active,
  .sheet-enter-active,
  .sheet-leave-active,
  .backdrop-enter-active,
  .backdrop-leave-active {
    transition: none;
  }
}
</style>
