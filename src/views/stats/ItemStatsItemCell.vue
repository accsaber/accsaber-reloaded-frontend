<script setup lang="ts">
import ItemPreview from '@/components/domain/ItemPreview.vue'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ItemResponse } from '@/types/api/items'
import { rarityClass } from '@/utils/items'

defineProps<{
  item: ItemResponse | null
  serial?: number | null
  small?: boolean
}>()

const itemTypeStore = useItemTypeStore()
</script>

<template>
  <span class="item-cell__frame" :class="[item && rarityClass(item.rarity), { 'item-cell__frame--sm': small }]">
    <ItemPreview v-if="item" :item="item" icon />
  </span>
  <div class="item-cell__info">
    <span class="item-cell__name" :class="item && rarityClass(item.rarity)">{{ item?.name }}</span>
    <span class="item-cell__meta">
      <span v-if="item" class="item-cell__type">{{ itemTypeStore.typeLabel(item.typeKey) }}</span>
      <span v-if="serial != null" class="item-cell__serial">#{{ serial }}</span>
    </span>
  </div>
</template>

<style scoped>
.item-cell__frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: var(--bg-base);
  border: 1px solid var(--rarity-color, var(--text-tertiary));
  border-radius: var(--radius-card);
  overflow: hidden;
}

.item-cell__frame--sm {
  width: 30px;
  height: 30px;
}

.item-cell__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.item-cell__name {
  font-weight: 500;
  color: var(--rarity-color, var(--text-primary));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-cell__name.rarity--common {
  --rarity-color: var(--text-primary);
}

.item-cell__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.item-cell__type {
  text-transform: capitalize;
}

.item-cell__serial {
  font-family: var(--font-mono);
}
</style>
