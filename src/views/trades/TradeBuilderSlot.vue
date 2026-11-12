<script setup lang="ts">
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import type { UserItemResponse } from '@/types/api/items'

defineProps<{
  userItem: UserItemResponse
  quantity: number
  stackMax: number
}>()

defineEmits<{
  remove: []
  'update:quantity': [value: number]
}>()
</script>

<template>
  <div class="trade-slot">
    <InventoryItemCell :user-item="{ ...userItem, quantity }" selected @select="$emit('remove')" />
    <div v-if="userItem.item.stackable && stackMax > 1" class="trade-slot__stepper">
      <button type="button" class="trade-slot__step pressable" aria-label="One less" :disabled="quantity <= 1"
        @click="$emit('update:quantity', quantity - 1)">
        −
      </button>
      <span class="trade-slot__count">{{ quantity }}/{{ stackMax }}</span>
      <button type="button" class="trade-slot__step pressable" aria-label="One more" :disabled="quantity >= stackMax"
        @click="$emit('update:quantity', quantity + 1)">
        +
      </button>
    </div>
  </div>
</template>

<style scoped>
.trade-slot {
  --step: 20px;
  position: relative;
}

.trade-slot__stepper {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-base);
  border-radius: 0 0 var(--radius-card) var(--radius-card);
}

.trade-slot__step {
  width: var(--step);
  height: var(--step);
  padding: 0;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font: inherit;
  line-height: 1;
  cursor: pointer;
}

.trade-slot__step:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.trade-slot__count {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
