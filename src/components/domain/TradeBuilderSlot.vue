<script setup lang="ts">
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import type { UserItemResponse } from '@/types/api/items'

defineProps<{
  userItem: UserItemResponse
  quantity: number
  stackMax: number
  stackable: boolean
}>()

const emit = defineEmits<{
  remove: [linkId: string]
  'update:quantity': [linkId: string, value: number]
}>()

function onInput(linkId: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update:quantity', linkId, value)
}
</script>

<template>
  <InventoryItemCell
    :user-item="userItem"
    :selected="true"
    @select="emit('remove', userItem.linkId)"
  />
  <label
    v-if="stackable && stackMax > 1"
    class="trade-slot-qty"
  >
    <span class="trade-slot-qty__label">QTY</span>
    <input
      type="number"
      class="trade-slot-qty__input"
      min="1"
      :max="stackMax"
      :value="quantity"
      @input="onInput(userItem.linkId, $event)"
    />
    <span class="trade-slot-qty__max">/ {{ stackMax }}</span>
  </label>
</template>

<style scoped>
.trade-slot-qty {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  z-index: 2;
}

.trade-slot-qty__label {
  color: var(--text-tertiary);
  letter-spacing: 0.08em;
}

.trade-slot-qty__input {
  width: 32px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
}

.trade-slot-qty__input::-webkit-outer-spin-button,
.trade-slot-qty__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.trade-slot-qty__max {
  color: var(--text-tertiary);
}
</style>
