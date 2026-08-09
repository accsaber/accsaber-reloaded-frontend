<script setup lang="ts">
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
const tagsOpen = ref(false)

const PROGRESS_OPTIONS: { key: CampaignProgressFilter; label: string }[] = [
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
]

function patch(changes: Partial<CampaignFilterState>) {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

function toggled<T>(list: T[], value: T): T[] {
  const next = new Set(list)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return Array.from(next)
}

const themeTags = computed(() => props.tags.filter((t) => t.kind === 'THEME'))
const genreTags = computed(() => props.tags.filter((t) => t.kind === 'GENRE'))
const categoryTags = computed(() => props.tags.filter((t) => t.kind === 'CATEGORY'))
const difficultyTags = computed(() => props.tags.filter((t) => t.kind === 'DIFFICULTY'))

function tagAccent(tag: CampaignTagResponse): string | null {
  if (tag.kind !== 'CATEGORY' || !tag.categoryId) return null
  const code = categoryStore.getCategoryCode(tag.categoryId)
  if (!code) return null
  return categoryStore.getCategoryInfo(code)?.accent ?? null
}
</script>

<template>
  <div class="campaign-filters">
    <div class="campaign-filters__sort" role="radiogroup" aria-label="Sort campaigns">
      <button v-for="option in sortOptions" :key="option.key" type="button" role="radio"
        class="campaign-filters__sort-btn"
        :class="{ 'campaign-filters__sort-btn--active': modelValue.sort === option.key }"
        :aria-checked="modelValue.sort === option.key"
        @click="patch({ sort: option.key, order: option.order })">
        {{ option.label }}
      </button>
    </div>

    <div class="campaign-filters__right">
      <template v-if="showProgress">
        <button v-for="option in PROGRESS_OPTIONS" :key="option.key" type="button"
          class="campaign-filters__chip campaign-filters__chip--toggle"
          :class="{ 'campaign-filters__chip--active': modelValue.progressStatus.includes(option.key) }"
          @click="patch({ progressStatus: toggled(modelValue.progressStatus, option.key) })">
          {{ option.label }}
        </button>
      </template>

      <button type="button" class="campaign-filters__chip campaign-filters__chip--toggle"
        :class="{ 'campaign-filters__chip--active': modelValue.official }"
        @click="patch({ official: !modelValue.official })">
        Official only
      </button>

      <button v-if="showCurated" type="button" class="campaign-filters__chip campaign-filters__chip--toggle"
        :class="{ 'campaign-filters__chip--active': modelValue.curated }"
        @click="patch({ curated: !modelValue.curated })"
        title="Curated means rewards-eligible: well laid out rewards and clear paths. It is not a quality verdict.">
        Curated only
      </button>

      <button type="button" class="campaign-filters__chip campaign-filters__chip--toggle"
        :class="{ 'campaign-filters__chip--active': modelValue.loved }"
        @click="patch({ loved: !modelValue.loved })">
        Loved only
      </button>

      <details class="campaign-filters__tags" :open="tagsOpen"
        @toggle="tagsOpen = ($event.target as HTMLDetailsElement).open">
        <summary>
          <span>Tags</span>
          <span v-if="modelValue.tagIds.length > 0" class="campaign-filters__tags-count">
            {{ modelValue.tagIds.length }}
          </span>
        </summary>
        <div class="campaign-filters__tags-panel">
          <div v-if="categoryTags.length > 0" class="campaign-filters__chip-group">
            <span class="campaign-filters__chip-label">Category</span>
            <button v-for="tag in categoryTags" :key="tag.id" type="button"
              class="campaign-filters__chip campaign-filters__chip--category"
              :class="{ 'campaign-filters__chip--active': modelValue.tagIds.includes(tag.id) }"
              :style="{ '--chip-accent': tagAccent(tag) ?? 'var(--accent)' }"
              @click="patch({ tagIds: toggled(modelValue.tagIds, tag.id) })">
              {{ tag.name }}
            </button>
          </div>
          <div v-if="difficultyTags.length > 0" class="campaign-filters__chip-group">
            <span class="campaign-filters__chip-label">Tier</span>
            <button v-for="tag in difficultyTags" :key="tag.id" type="button" class="campaign-filters__chip"
              :class="{ 'campaign-filters__chip--active': modelValue.tagIds.includes(tag.id) }"
              @click="patch({ tagIds: toggled(modelValue.tagIds, tag.id) })">
              {{ tag.name }}
            </button>
          </div>
          <div v-if="themeTags.length > 0" class="campaign-filters__chip-group">
            <span class="campaign-filters__chip-label">Theme</span>
            <button v-for="tag in themeTags" :key="tag.id" type="button" class="campaign-filters__chip"
              :class="{ 'campaign-filters__chip--active': modelValue.tagIds.includes(tag.id) }"
              @click="patch({ tagIds: toggled(modelValue.tagIds, tag.id) })">
              {{ tag.name }}
            </button>
          </div>
          <div v-if="genreTags.length > 0" class="campaign-filters__chip-group">
            <span class="campaign-filters__chip-label">Genre</span>
            <button v-for="tag in genreTags" :key="tag.id" type="button" class="campaign-filters__chip"
              :class="{ 'campaign-filters__chip--active': modelValue.tagIds.includes(tag.id) }"
              @click="patch({ tagIds: toggled(modelValue.tagIds, tag.id) })">
              {{ tag.name }}
            </button>
          </div>
          <button v-if="modelValue.tagIds.length > 0" type="button" class="campaign-filters__clear"
            @click="patch({ tagIds: [] })">
            Clear tags
          </button>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.campaign-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.campaign-filters__right {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.campaign-filters__sort {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
}

.campaign-filters__sort-btn {
  padding: 4px 10px;
  background: transparent;
  border: none;
  border-radius: 2px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: color 120ms ease, background 120ms ease;
}

.campaign-filters__sort-btn:hover {
  color: var(--text-primary);
}

.campaign-filters__sort-btn--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.campaign-filters__tags {
  position: relative;
}

.campaign-filters__tags > summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  cursor: pointer;
  list-style: none;
  transition: color 120ms ease, border-color 120ms ease;
}

.campaign-filters__tags > summary::-webkit-details-marker {
  display: none;
}

.campaign-filters__tags > summary:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-filters__tags[open] > summary {
  color: var(--page-accent);
  border-color: var(--page-accent);
}

.campaign-filters__tags-count {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--page-accent);
  letter-spacing: 0;
  text-transform: none;
}

.campaign-filters__tags-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 10;
  min-width: 320px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.campaign-filters__chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.campaign-filters__chip-label {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-right: 4px;
}

.campaign-filters__chip {
  padding: 3px 8px;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: 2px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
  white-space: nowrap;
}

.campaign-filters__chip--toggle {
  padding: 6px 12px;
}

.campaign-filters__chip:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-filters__chip--active {
  color: var(--text-primary);
  border-color: var(--text-secondary);
  background: var(--bg-elevated);
}

.campaign-filters__chip--category.campaign-filters__chip--active {
  color: var(--chip-accent, var(--accent));
  border-color: var(--chip-accent, var(--accent));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 12%, transparent);
}

.campaign-filters__clear {
  margin-left: auto;
  padding: 4px var(--space-sm);
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.campaign-filters__clear:hover {
  color: var(--text-primary);
}
</style>
