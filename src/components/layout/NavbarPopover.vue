<script setup lang="ts">
import { useClickOutside } from '@/composables/useClickOutside'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
  label: string
  width: string
}>()

const open = defineModel<boolean>('open', { default: false })
const rootRef = ref<HTMLElement | null>(null)
const route = useRoute()

useClickOutside(rootRef, open, () => { open.value = false })
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <div ref="rootRef" class="navbar-popover">
    <button type="button" class="navbar__icon-btn navbar-popover__trigger"
      :class="{ 'navbar-popover__trigger--active': open }" :aria-label="label" :aria-expanded="open"
      @click="open = !open">
      <slot name="trigger" />
    </button>

    <Transition name="navbar-popover">
      <div v-if="open" class="navbar-popover__panel" :style="{ '--popover-width': width }">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.navbar-popover {
  position: relative;
}

.navbar-popover__trigger {
  position: relative;
}

.navbar-popover__trigger--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.navbar-popover__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  width: min(var(--popover-width), calc(100vw - 32px));
  max-height: calc(100vh - var(--navbar-height) - 24px);
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.navbar-popover-enter-active,
.navbar-popover-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.navbar-popover-enter-from,
.navbar-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 600px) {
  .navbar-popover__panel {
    position: fixed;
    top: calc(var(--navbar-height) + 4px);
    left: var(--space-md);
    right: var(--space-md);
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .navbar-popover-enter-active,
  .navbar-popover-leave-active {
    transition: none;
  }
}
</style>
