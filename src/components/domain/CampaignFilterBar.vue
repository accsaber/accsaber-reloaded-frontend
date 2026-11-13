<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import { useCategoryStore } from '@/stores/categories'
import type { CampaignProgressFilter, CampaignTagResponse } from '@/types/api/campaigns'
import type { CampaignFilterState, CampaignSortOption } from '@/utils/campaignFilters'
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: CampaignFilterState
  tags: CampaignTagResponse[]
  sortOptions: readonly CampaignSortOption[]
  showCurated?: boolean
  showProgress?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [CampaignFilterState] }>()

const categoryStore = useCategoryStore()
const open = ref(false)

const PROGRESS_OPTIONS: { key: CampaignProgressFilter; label: string }[] = [
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
]

const TAG_GROUPS = [
  { kind: 'CATEGORY', label: 'Category' },
  { kind: 'DIFFICULTY', label: 'Tier' },
  { kind: 'THEME', label: 'Theme' },
  { kind: 'GENRE', label: 'Genre' },
] as const

const selectOptions = computed(() => props.sortOptions.map((o) => ({ value: o.key, label: o.label })))

const flags = computed(() => [
  { key: 'official' as const, label: 'Official', show: true },
  { key: 'curated' as const, label: 'Curated', show: props.showCurated },
  { key: 'loved' as const, label: 'Loved', show: true },
].filter((flag) => flag.show))

const tagGroups = computed(() =>
  TAG_GROUPS.map((group) => ({ ...group, tags: props.tags.filter((t) => t.kind === group.kind) }))
    .filter((group) => group.tags.length > 0),
)

const active = computed(() => {
  const { official, curated, loved, tagIds, progressStatus } = props.modelValue
  return official || curated || loved || tagIds.length > 0 || progressStatus.length > 0
})

function patch(changes: Partial<CampaignFilterState>) {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

function setSort(key: string) {
  const option = props.sortOptions.find((o) => o.key === key)
  if (option) patch({ sort: option.key, order: option.order })
}

function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function tagAccent(tag: CampaignTagResponse): string | undefined {
  const code = tag.categoryId ? categoryStore.getCategoryCode(tag.categoryId) : null
  return (code && categoryStore.getCategoryInfo(code)?.accent) || undefined
}
</script>

<template>
  <div class="campaign-filters">
    <BaseSelect :options="selectOptions" :model-value="modelValue.sort" @update:model-value="setSort" />

    <FilterPopover v-model:open="open">
      <template #trigger>
        <FilterButton :active="open || active" />
      </template>
      <div class="campaign-filters__panel">
        <div class="campaign-filters__section">
          <h4 class="field-label">Show Only</h4>
          <label v-for="flag in flags" :key="flag.key" class="campaign-filters__check">
            <input type="checkbox" :checked="modelValue[flag.key]"
              @change="patch({ [flag.key]: !modelValue[flag.key] })" />
            {{ flag.label }}
          </label>
          <template v-if="showProgress">
            <label v-for="option in PROGRESS_OPTIONS" :key="option.key" class="campaign-filters__check">
              <input type="checkbox" :checked="modelValue.progressStatus.includes(option.key)"
                @change="patch({ progressStatus: toggled(modelValue.progressStatus, option.key) })" />
              {{ option.label }}
            </label>
          </template>
        </div>

        <div v-for="group in tagGroups" :key="group.kind" class="campaign-filters__section">
          <h4 class="field-label">{{ group.label }}</h4>
          <div class="campaign-filters__tags">
            <label v-for="tag in group.tags" :key="tag.id" class="campaign-filters__check"
              :style="{ color: tagAccent(tag) }">
              <input type="checkbox" :checked="modelValue.tagIds.includes(tag.id)"
                @change="patch({ tagIds: toggled(modelValue.tagIds, tag.id) })" />
              {{ tag.name }}
            </label>
          </div>
        </div>
      </div>
    </FilterPopover>
  </div>
</template>

<style scoped>
.campaign-filters {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.campaign-filters__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 320px;
  max-width: 100%;
}

.campaign-filters__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.campaign-filters__section h4 {
  margin: 0 0 var(--space-xs);
}

.campaign-filters__tags {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-xs) var(--space-md);
}

.campaign-filters__check {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-primary);
  cursor: pointer;
}

.campaign-filters__check input {
  accent-color: var(--accent);
  cursor: pointer;
}

@media (max-width: 767px) {
  .campaign-filters__panel {
    width: 100%;
  }
}
</style>
