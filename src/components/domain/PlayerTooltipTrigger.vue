<script setup lang="ts">
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import type { UserRefDisplay } from '@/types/display'
import { defineAsyncComponent } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

const loadCard = () => import('@/components/domain/PlayerTooltipCard.vue')
const PlayerTooltipCard = defineAsyncComponent(loadCard)

defineProps<{
  user: UserRefDisplay
  to?: RouteLocationRaw
}>()

const { isOpen, triggerRef, panelRef, panelStyle, onTriggerEnter, onTriggerLeave, onPanelEnter, onPanelLeave } =
  useFloatingPanel({ width: 'auto', gap: 8, hover: { openDelay: 800, closeDelay: 200 } })

function onEnter() {
  void loadCard()
  onTriggerEnter()
}
</script>

<template>
  <component :is="to ? RouterLink : 'span'" ref="triggerRef" :to="to" class="tooltip-trigger"
    @mouseenter="onEnter" @mouseleave="onTriggerLeave">
    <slot />
    <Teleport to="body">
      <Transition name="tooltip">
        <div v-if="isOpen" ref="panelRef" class="tooltip-trigger__popup" :style="panelStyle"
          @mouseenter="onPanelEnter" @mouseleave="onPanelLeave">
          <PlayerTooltipCard :user="user" />
        </div>
      </Transition>
    </Teleport>
  </component>
</template>

<style scoped>
.tooltip-trigger {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}
</style>

<style>
.tooltip-trigger__popup {
  z-index: 10000;
  pointer-events: auto;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
}

.tooltip-enter-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.tooltip-leave-active {
  transition: opacity 100ms ease-in, transform 100ms ease-in;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
