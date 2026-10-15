<script setup lang="ts">
import { useFloatingPanel } from '@/composables/useFloatingPanel'

const props = defineProps<{
  position?: 'bottom-left' | 'bottom-right'
}>()

const open = defineModel<boolean>('open', { required: true })

const { triggerRef, panelRef, panelStyle } = useFloatingPanel({
  model: open,
  width: 'auto',
  gap: 4,
  align: () => (props.position === 'bottom-right' ? 'end' : 'start'),
})
</script>

<template>
  <div ref="triggerRef" class="base-dropdown">
    <div class="base-dropdown__trigger" @click="open = !open">
      <slot name="trigger" />
    </div>
    <Transition name="dropdown">
      <div v-if="open" ref="panelRef" class="base-dropdown__panel" :style="panelStyle">
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
