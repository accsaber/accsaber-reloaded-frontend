<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import type { MilestoneSort } from '@/types/api/milestones'
import type { Tab } from '@/types/display'
import { computed } from 'vue'

const props = defineProps<{
  loggedIn?: boolean
  completedCount: number
}>()

const filter = defineModel<string>('filter', { required: true })
const sort = defineModel<MilestoneSort>('sort', { required: true })

const tabs = computed<Tab[]>(() => [
  { key: 'all', label: 'All' },
  { key: 'completed', label: `Completed ${props.completedCount}` },
])

const sortOptions = computed(() => [
  { value: 'tier', label: 'Tier' },
  { value: 'completions', label: 'Most Completed' },
  ...(props.loggedIn
    ? [
        { value: 'completedAt', label: 'Recently Completed' },
        { value: 'progress', label: 'Progress' },
      ]
    : []),
])
</script>

<template>
  <BaseTabs v-if="loggedIn" v-model="filter" class="milestone-list-controls__filter" variant="segmented"
    label="Filter" :tabs="tabs" />
  <BaseSelect class="milestone-list-controls__sort" :model-value="sort" :options="sortOptions"
    @update:model-value="sort = $event as MilestoneSort" />
</template>

<style scoped>
.milestone-list-controls__filter {
  flex: none;
}

.milestone-list-controls__sort {
  min-width: 0;
}
</style>
