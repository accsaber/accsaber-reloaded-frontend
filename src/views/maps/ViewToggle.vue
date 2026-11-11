<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'

export type ViewMode = 'grid' | 'list' | 'batch'

const model = defineModel<ViewMode>({ required: true })

const VIEWS = [
  { key: 'grid', label: 'Grid' },
  { key: 'list', label: 'List' },
  { key: 'batch', label: 'Batches' },
]

const ICON_PATHS: Record<string, string[]> = {
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  batch: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
}
</script>

<template>
  <BaseTabs class="view-toggle" :model-value="model" :tabs="VIEWS" variant="segmented" label="View mode"
    @update:model-value="model = $event as ViewMode">
    <template #tab="{ tab }">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path v-for="d in ICON_PATHS[tab.key]" :key="d" :d="d" />
      </svg>
      {{ tab.label }}
    </template>
  </BaseTabs>
</template>

<style scoped>
.view-toggle :deep(.base-tabs__tab) {
  gap: var(--space-xs);
}
</style>
