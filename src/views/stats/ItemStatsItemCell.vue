<script setup lang="ts">
import ItemPreview from '@/components/domain/ItemPreview.vue'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ItemResponse } from '@/types/api/items'
import { rarityClass } from '@/utils/items'

defineProps<{
  item: ItemResponse | null
  serial?: number | null
}>()

const itemTypeStore = useItemTypeStore()
</script>

<template>
  <div class="item-cell">
    <span class="item-cell__frame" :class="item && rarityClass(item.rarity)">
      <ItemPreview v-if="item" :item="item" icon />
    </span>
    <div class="item-cell__info">
      <span class="item-cell__name" :class="item && rarityClass(item.rarity)">{{ item?.name }}</span>
      <span class="caption item-cell__meta">
        <span v-if="item">{{ itemTypeStore.typeLabel(item.typeKey) }}</span>
        <span v-if="serial != null">#{{ serial }}</span>
      </span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.item-cell {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.item-cell__frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--bg-base);
  border: 1px solid var(--rarity-color, var(--text-tertiary));
  border-radius: var(--radius-card);
  overflow: hidden;
}

.item-cell__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-cell__name {
  font-weight: 500;
  line-height: 1.25;
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
  gap: var(--space-sm);
  line-height: 1.15;
}
</style>
