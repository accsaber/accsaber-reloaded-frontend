<script setup lang="ts">
import { useNavbarPanel } from '@/composables/useNavbarPanel'

withDefaults(defineProps<{
  label: string
  width?: string
  triggerClass?: string
  cover?: boolean
}>(), {
  width: '420px',
  triggerClass: 'navbar__icon-btn',
})

const open = defineModel<boolean>('open', { default: false })
const { rootRef } = useNavbarPanel(open)
</script>

<template>
  <div ref="rootRef" class="navbar-popover">
    <button type="button" class="navbar-popover__trigger"
      :class="[triggerClass, { 'navbar-popover__trigger--active': open }]" :aria-label="label" :aria-expanded="open"
      @click="open = !open">
      <slot name="trigger" />
    </button>

    <Transition name="pop">
      <div v-if="open" class="navbar-popover__panel" :class="{ 'navbar-popover__panel--cover': cover }"
        :style="{ '--popover-width': width }">
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
  color: var(--navbar-text-strong);
  background: color-mix(in srgb, var(--navbar-text-strong) 10%, transparent);
}

.navbar-popover__panel {
  position: absolute;
  top: calc(100% + var(--space-xs));
  right: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  width: min(var(--popover-width), calc(100vw - var(--space-xl)));
  max-height: calc(100svh - var(--navbar-height) - var(--space-lg));
  overflow: hidden;
  background: var(--bg-elevated);
  border-radius: var(--radius-card);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  transform-origin: top right;
}

.navbar-popover__panel--cover {
  top: 0;
}

@media (max-width: 767px) {
  .navbar-popover__panel {
    position: fixed;
    top: calc(var(--navbar-height) + var(--space-xs));
    left: var(--space-md);
    right: var(--space-md);
    width: auto;
  }
}
</style>
