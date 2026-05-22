<script setup lang="ts">
import ItemPreview from '@/components/domain/ItemPreview.vue'
import type { ItemResponse } from '@/types/api/items'

defineProps<{
  item: ItemResponse
  selected?: boolean
  iconSize?: number
}>()
</script>

<template>
  <div class="card-face__icon" :style="iconSize ? { width: `${iconSize}px`, height: `${iconSize}px` } : undefined">
    <ItemPreview :item="item" :selected="selected" />
  </div>
  <div class="card-face__name">{{ item.name }}</div>
  <div class="card-face__rarity">{{ item.rarity }}</div>
</template>

<style scoped>
.card-face__icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-face__name {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-face__rarity {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--rarity-color, var(--text-tertiary));
  font-weight: 600;
}
</style>
