<script setup lang="ts">
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import { useItemModifierStore } from '@/stores/itemModifiers'
import type { ItemModifierRef } from '@/types/api/items'
import { modifierAccentHex } from '@/utils/items'
import { computed, onMounted, useId } from 'vue'

const props = defineProps<{
  modifier: ItemModifierRef
}>()

const modifierStore = useItemModifierStore()

const color = computed(() => modifierAccentHex(props.modifier))

const description = computed(() => modifierStore.byKey.get(props.modifier.key)?.description ?? null)

const tipId = useId()

const { isOpen, triggerRef, panelRef, panelStyle, open, close, onTriggerEnter, onTriggerLeave } = useFloatingPanel({
  maxWidth: 200,
  side: 'above',
  align: 'center',
  gap: 6,
  hover: { openDelay: 0, closeDelay: 0 },
})

const chipStyle = computed(() => (color.value ? { color: color.value } : undefined))

onMounted(() => {
  modifierStore.fetchModifiers()
})
</script>

<template>
  <span
    ref="triggerRef"
    class="modifier-chip"
    :class="{ 'modifier-chip--described': description }"
    :style="chipStyle"
    :tabindex="description ? 0 : undefined"
    :aria-describedby="isOpen ? tipId : undefined"
    @mouseenter="description && onTriggerEnter()"
    @mouseleave="onTriggerLeave"
    @focus="open"
    @blur="close"
  >
    {{ modifier.name }}
    <Teleport to="body">
      <span v-if="isOpen" :id="tipId" ref="panelRef" class="modifier-chip__tip" :style="panelStyle" role="tooltip">
        {{ description }}
      </span>
    </Teleport>
  </span>
</template>

<style scoped>
.modifier-chip {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
}

.modifier-chip--described {
  cursor: help;
}

.modifier-chip--described:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
}

.modifier-chip__tip {
  z-index: 10000;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 400;
  line-height: 1.4;
  white-space: normal;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
</style>
