<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import { BASIS_TABS, type SortBasis } from './useScenarioSort'

defineProps<{
  basis: SortBasis
}>()

defineEmits<{
  change: [basis: string]
}>()
</script>

<template>
  <span class="sort-basis">
    <span class="field-label">Sort By</span>
    <BaseTabs variant="segmented" label="Sort by" :tabs="BASIS_TABS" :model-value="basis" @update:model-value="$emit('change', $event)" />
  </span>
</template>

<style scoped>
.sort-basis {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}
</style>
