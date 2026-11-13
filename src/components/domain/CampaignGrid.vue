<script setup lang="ts" generic="T extends object">
import SwapList from '@/components/common/SwapList.vue'

defineProps<{
  items: T[]
  itemKey: (item: T) => string | number
  loading?: boolean
  refreshing?: boolean
}>()
</script>

<template>
  <SwapList class="campaign-grid" :items="items" :item-key="itemKey" :loading="loading"
    :refreshing="refreshing" :placeholders="8">
    <template #placeholder>
      <div class="campaign-grid__ghost card-ghost placeholder" aria-hidden="true" />
    </template>
    <template #default="{ item, swap }">
      <slot :item="item" :swap="swap" />
    </template>
  </SwapList>
</template>

<style scoped>
.campaign-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}

.campaign-grid__ghost {
  --ghost-body: 208px;
}

@media (max-width: 767px) {
  .campaign-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-sm);
  }

  .campaign-grid__ghost {
    --ghost-body: 0px;
    height: 170px;
  }

  .campaign-grid__ghost::before {
    display: none;
  }
}
</style>
