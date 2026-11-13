<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import ItemHoldersPanel from './ItemHoldersPanel.vue'

defineProps<{
  itemId: string
  itemName: string
  ownerCount: number
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
} = useFloatingPanel({ width: 320, maxHeight: 560, gap: 8, hover: { openDelay: 350, closeDelay: 160 } })

function setPanel(panel: unknown) {
  panelRef.value = (panel as { $el?: HTMLElement } | null)?.$el ?? null
}
</script>

<template>
  <span ref="triggerRef" class="holders-tip" @mouseenter="onTriggerEnter" @mouseleave="onTriggerLeave">
    <IconButton :label="`Who owns ${itemName}`" :aria-expanded="isOpen" @click.stop.prevent="toggle"
      @keydown.escape="close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
      </svg>
    </IconButton>

    <Teleport to="body">
      <Transition name="pop">
        <KeepAlive>
          <ItemHoldersPanel v-if="isOpen" :ref="setPanel" :item-id="itemId" :owner-count="ownerCount"
            :locked="locked" :style="panelStyle" @close="close" @mouseenter="onPanelEnter"
            @mouseleave="onPanelLeave" />
        </KeepAlive>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.holders-tip {
  display: inline-flex;
  flex: none;
}
</style>
