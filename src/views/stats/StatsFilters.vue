<script setup lang="ts">
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import type { ChartToggle } from '@/types/display'
import { computed, ref } from 'vue'

export interface StatsFilterGroup {
  key: string
  label: string
  options: ChartToggle[]
  selected: string[]
}

const props = defineProps<{
  groups: StatsFilterGroup[]
  active?: boolean
}>()

const emit = defineEmits<{ change: [key: string, selected: string[]] }>()

const open = ref(false)
const anyActive = computed(() => props.active || props.groups.some((g) => g.selected.length > 0))

function toggle(group: StatsFilterGroup, value: string) {
  emit(
    'change',
    group.key,
    group.selected.includes(value) ? group.selected.filter((v) => v !== value) : [...group.selected, value],
  )
}
</script>

<template>
  <FilterPopover v-model:open="open">
    <template #trigger>
      <FilterButton :active="open || anyActive" />
    </template>
    <div class="stats-filters">
      <div v-for="group in groups" :key="group.key" class="stats-filters__group">
        <h4 class="field-label">{{ group.label }}</h4>
        <ChartToggleGroup :toggles="group.options" :active="group.selected" :label="group.label"
          @select="toggle(group, $event)" />
      </div>
      <slot />
    </div>
  </FilterPopover>
</template>

<style scoped>
.stats-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 340px;
  max-width: 100%;
}

.stats-filters__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.stats-filters__group h4 {
  margin: 0;
}

@media (max-width: 767px) {
  .stats-filters {
    width: 100%;
  }
}
</style>
