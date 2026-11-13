<script setup lang="ts">
import { getDifficulties } from '@/api/maps'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import IconButton from '@/components/common/IconButton.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { pickCoverUrl } from '@/utils/media'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useCategoryStore } from '@/stores/categories'
import type { ImportCampaignMapRequest } from '@/types/api/campaigns'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { QUEUE_STATUSES } from '@/utils/constants'
import { computed, onMounted, ref, watch } from 'vue'
import MapFilterSidebar from '@/components/domain/MapFilterSidebar.vue'
import CampaignGlobalMapSearch from '@/components/domain/CampaignGlobalMapSearch.vue'
import { parseApiError } from '@/api/client'

export interface FixedMapFilters {
  categoryId?: string | null
  complexityMin?: number | null
  complexityMax?: number | null
}

const props = withDefaults(
  defineProps<{
    title: string
    commitLabel: (count: number) => string
    loading?: boolean
    globalSubmit?: (ids: ImportCampaignMapRequest) => Promise<{ attached: boolean }>
    initialGenreSlugs?: string[]
    usedDifficultyIds?: string[]
    usedLabel?: string
    usedTitle?: string
    disableUsed?: boolean
    blockedLabel?: (diff: PublicMapDifficultyResponse) => string | null
    initialMulti?: boolean
    modeToggle?: boolean
    rankedOnly?: boolean
    limit?: number
    fixedFilters?: FixedMapFilters
  }>(),
  { usedDifficultyIds: () => [], usedLabel: 'Already added', usedTitle: '', modeToggle: true },
)

const emit = defineEmits<{
  close: []
  pick: [difficulties: PublicMapDifficultyResponse[]]
}>()

const categoryStore = useCategoryStore()

const PAGE_SIZE = 12

const source = ref<'system' | 'global'>('system')

type StatusFilterKey = 'RANKED' | 'QUEUE'
const STATUS_TABS = [
  { key: 'RANKED', label: 'Ranked' },
  { key: 'QUEUE', label: 'In Queue' },
]
const SOURCE_TABS = [
  { key: 'system', label: 'This System' },
  { key: 'global', label: 'Global (BeatSaver)' },
]
const MODE_TABS = [
  { key: 'single', label: 'Single' },
  { key: 'multi', label: 'Multiple' },
]
const statusFilter = ref<StatusFilterKey>('RANKED')

const searchRef = ref<InstanceType<typeof SearchBox> | null>(null)
const query = ref('')
const debounced = useDebouncedRef(query, 220)
const page = ref(1)
const totalPages = ref(1)
const results = ref<PublicMapDifficultyResponse[]>([])
const fetching = ref(false)
const err = ref<string | null>(null)

const filtersOpen = ref(false)
const selectedCategory = ref<string | null>(null)
const complexityRange = ref<[number, number]>([0, 20])

const multi = ref(props.initialMulti ?? false)
const staged = ref<PublicMapDifficultyResponse[]>([])

const stagedIds = computed(() => new Set(staged.value.map((d) => d.id)))

const usedIds = computed(() => new Set(props.usedDifficultyIds))

const atLimit = computed(() => props.limit !== undefined && staged.value.length >= props.limit)

const hasActiveFilters = computed(
  () =>
    selectedCategory.value !== null ||
    complexityRange.value[0] > 0 ||
    complexityRange.value[1] < 20,
)

watch([debounced, selectedCategory, complexityRange, statusFilter], () => {
  page.value = 1
})

async function search() {
  fetching.value = true
  err.value = null
  try {
    const params: Record<string, unknown> = {
      page: page.value - 1,
      size: PAGE_SIZE,
      status: statusFilter.value === 'RANKED' ? 'RANKED' : QUEUE_STATUSES,
      search: debounced.value || undefined,
      sort: statusFilter.value === 'RANKED' ? 'rankedAt,desc' : 'createdAt,desc',
    }
    const fixed = props.fixedFilters
    if (fixed) {
      if (fixed.categoryId) params.categoryId = fixed.categoryId
      if (fixed.complexityMin != null) params.complexityMin = fixed.complexityMin
      if (fixed.complexityMax != null) params.complexityMax = fixed.complexityMax
    } else {
      if (selectedCategory.value) {
        params.categoryId = categoryStore.getCategoryId(selectedCategory.value)
      }
      if (complexityRange.value[0] > 0) {
        params.complexityMin = complexityRange.value[0]
      }
      if (complexityRange.value[1] < 20) {
        params.complexityMax = complexityRange.value[1]
      }
    }
    const data = await getDifficulties(params as never)
    results.value = data.content
    totalPages.value = data.totalPages || 1
    if (page.value > totalPages.value) page.value = totalPages.value
  } catch (e) {
    err.value = parseApiError(e, 'Search failed').message
    results.value = []
    totalPages.value = 1
  } finally {
    fetching.value = false
  }
}

onMounted(() => {
  void search()
  searchRef.value?.$el.querySelector('input')?.focus()
})

watch([debounced, page, selectedCategory, complexityRange, statusFilter, () => props.fixedFilters], () => {
  if (source.value === 'system') void search()
})

function categoryOf(diff: PublicMapDifficultyResponse) {
  const code = categoryStore.getCategoryCode(diff.categoryId) ?? 'overall'
  return { name: categoryStore.getCategoryInfo(code)?.name ?? code, accent: categoryStore.getAccent(code) }
}

const characteristicHint = computed(() => (diff: PublicMapDifficultyResponse) => {
  if (!diff.characteristic) return null
  if (diff.characteristic.toLowerCase() === 'standard') return null
  return diff.characteristic
})

function setMulti(value: boolean) {
  multi.value = value
  if (!value) staged.value = []
}

function rowDisabled(diff: PublicMapDifficultyResponse): boolean {
  if (props.loading) return true
  if (props.disableUsed && usedIds.value.has(diff.id)) return true
  if (props.blockedLabel?.(diff)) return true
  return multi.value && atLimit.value && !stagedIds.value.has(diff.id)
}

function rowClick(diff: PublicMapDifficultyResponse) {
  if (rowDisabled(diff)) return
  if (!multi.value) {
    emit('pick', [diff])
    return
  }
  if (stagedIds.value.has(diff.id)) {
    staged.value = staged.value.filter((d) => d.id !== diff.id)
  } else {
    staged.value = [...staged.value, diff]
  }
}

function removeStaged(id: string) {
  staged.value = staged.value.filter((d) => d.id !== id)
}

function commit() {
  if (staged.value.length === 0) return
  emit('pick', staged.value)
}
</script>

<template>
  <BaseModal :open="true" :title="title" max-width="900px" @close="emit('close')">
    <div class="map-picker" :class="{ 'map-picker--multi': multi && source === 'system' }">
      <BaseTabs
        v-if="globalSubmit"
        class="map-picker__tabs"
        variant="segmented"
        label="Map source"
        :tabs="SOURCE_TABS"
        :model-value="source"
        @update:model-value="source = $event as typeof source"
      />

      <Transition name="fade" mode="out-in">
      <div v-if="source === 'system'" class="map-picker__system">
      <div class="map-picker__head">
        <SearchBox
          ref="searchRef"
          v-model="query"
          class="map-picker__search"
          placeholder="Search song, artist, or mapper"
          :debounce="0"
        />
        <FilterButton
          v-if="!fixedFilters"
          :active="filtersOpen || hasActiveFilters"
          @click="filtersOpen = !filtersOpen"
        />
        <BaseTabs
          v-if="!rankedOnly"
          variant="segmented"
          label="Map status"
          :tabs="STATUS_TABS"
          :model-value="statusFilter"
          @update:model-value="statusFilter = $event as StatusFilterKey"
        />
        <BaseTabs
          v-if="modeToggle"
          variant="segmented"
          label="Selection mode"
          :tabs="MODE_TABS"
          :model-value="multi ? 'multi' : 'single'"
          @update:model-value="setMulti($event === 'multi')"
        />
      </div>

      <div v-if="filtersOpen && !fixedFilters" class="map-picker__filters">
        <MapFilterSidebar
          :selected-category="selectedCategory"
          :complexity-range="complexityRange"
          @update:selected-category="selectedCategory = $event"
          @update:complexity-range="complexityRange = $event"
        />
      </div>

      <div class="map-picker__panes">
        <section class="map-picker__pane">
          <header class="map-picker__pane-head">
            <span class="field-label">Available</span>
            <span v-if="!multi" class="caption">Click a map to add it</span>
          </header>

          <p v-if="err" class="caption map-picker__error" role="alert">{{ err }}</p>

          <p v-if="!fetching && results.length === 0" class="map-picker__empty">
            No maps match that search.
          </p>

          <SwapList v-else as="ul" class="map-picker__list" :items="results" :item-key="(diff) => diff.id"
            :loading="fetching && results.length === 0" :refreshing="fetching && results.length > 0"
            :placeholders="PAGE_SIZE">
            <template #placeholder>
              <li class="map-picker__ghost placeholder">
                <SkeletonLoader height="100%" />
              </li>
            </template>
            <template #default="{ item: diff, swap }">
            <li v-bind="swap">
              <button
                type="button"
                class="map-picker__row"
                :class="{ 'map-picker__row--staged': multi && stagedIds.has(diff.id) }"
                :disabled="rowDisabled(diff)"
                @click="rowClick(diff)"
              >
                <span class="map-picker__cover">
                  <img v-if="pickCoverUrl(diff)" :src="pickCoverUrl(diff)" :alt="diff.songName" loading="lazy" />
                </span>
                <span class="map-picker__meta">
                  <SongTitle class="map-picker__title" :name="diff.songName"
                    :sub-name="diff.songSubName" />
                  <span class="map-picker__sub">
                    <span>{{ diff.songAuthor }}</span>
                    <span class="map-picker__sep" aria-hidden="true">·</span>
                    <span>{{ diff.mapAuthor }}</span>
                  </span>
                </span>
                <span class="map-picker__trailing">
                  <span class="map-picker__diff">
                    <span v-if="blockedLabel?.(diff)" class="map-picker__used">{{ blockedLabel(diff) }}</span>
                    <span v-else-if="usedIds.has(diff.id)" class="map-picker__used" :title="usedTitle">
                      {{ usedLabel }}
                    </span>
                    <span class="map-picker__cat" :style="{ color: categoryOf(diff).accent }">
                      {{ categoryOf(diff).name }}
                    </span>
                    <DifficultyBadge :difficulty="diff.difficulty" />
                    <span v-if="characteristicHint(diff)" class="map-picker__char">
                      {{ characteristicHint(diff) }}
                    </span>
                    <ComplexityBadge v-if="diff.complexity != null" :complexity="diff.complexity" />
                  </span>
                  <span
                    v-if="multi"
                    class="map-picker__check"
                    :class="{ 'map-picker__check--on': stagedIds.has(diff.id) }"
                    aria-hidden="true"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </span>
              </button>
            </li>
            </template>
          </SwapList>

          <div class="map-picker__pagination">
            <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages"
              @update:page="page = $event" />
          </div>
        </section>

        <Transition name="fade">
        <section v-if="multi" class="map-picker__pane map-picker__pane--selected">
          <header class="map-picker__pane-head">
            <span class="field-label">
              Selected
              <span class="map-picker__pane-count">{{ staged.length }}<template v-if="limit !== undefined">/{{ limit }}</template></span>
            </span>
            <button
              v-if="staged.length > 0"
              type="button"
              class="map-picker__clear"
              @click="staged = []"
            >
              Clear
            </button>
          </header>

          <ul v-if="staged.length > 0" class="map-picker__staged-list">
            <li v-for="d in staged" :key="d.id" class="map-picker__staged">
              <span class="map-picker__cover map-picker__cover--sm">
                <img v-if="pickCoverUrl(d)" :src="pickCoverUrl(d)" :alt="d.songName" loading="lazy" />
              </span>
              <span class="map-picker__staged-meta">
                <SongTitle class="map-picker__staged-title" :name="d.songName"
                  :sub-name="d.songSubName" />
                <span class="map-picker__staged-sub">{{ d.songAuthor }}</span>
              </span>
              <DifficultyBadge :difficulty="d.difficulty" />
              <IconButton icon="close" label="Remove from selection" @click="removeStaged(d.id)" />
            </li>
          </ul>
          <p v-else class="map-picker__staged-empty">
            Pick maps on the left, then add them all at once.
          </p>
        </section>
        </Transition>
      </div>
      </div>

      <div v-else-if="globalSubmit" class="map-picker__system map-picker__system--scroll">
        <CampaignGlobalMapSearch mode="add" :submit="globalSubmit" :initial-genre-slugs="initialGenreSlugs" />
      </div>
      </Transition>
    </div>

    <template v-if="multi && source === 'system'" #footer>
      <BaseButton @click="emit('close')">Cancel</BaseButton>
      <BaseButton
        variant="primary"
        :disabled="staged.length === 0"
        :loading="loading"
        @click="commit"
      >
        {{ commitLabel(staged.length) }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.map-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: min(860px, 100%);
  height: min(70vh, 600px);
}

.map-picker--multi {
  height: calc(min(70vh, 600px) - var(--control-h) - var(--space-md) * 2 - 1px);
}

.map-picker__system {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.map-picker__system--scroll {
  overflow-y: auto;
}

.map-picker__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  flex: 0 0 auto;
}

.map-picker__search {
  flex: 1;
  min-width: 0;
}

.map-picker__tabs {
  align-self: flex-start;
}

.map-picker__filters {
  flex: 0 0 auto;
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-btn);
}

.map-picker__panes {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

.map-picker--multi .map-picker__panes {
  grid-template-columns: 1.5fr 1fr;
}

.map-picker__pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
}

.map-picker__pane--selected {
  padding-left: var(--space-md);
  border-left: 1px solid var(--bg-overlay);
}

.map-picker__pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  flex: 0 0 auto;
}

.map-picker__pane-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--page-accent, var(--accent));
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 14%, transparent);
  border-radius: var(--radius-pill);
}

.map-picker__clear {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
}

.map-picker__clear:hover {
  color: var(--error);
}

.map-picker__error {
  color: var(--error);
}

.map-picker__ghost {
  flex-shrink: 0;
  height: 62px;
}

.map-picker__empty,
.map-picker__staged-empty {
  margin: var(--space-md) 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.5;
}

.map-picker__list,
.map-picker__staged-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
}

.map-picker__list::-webkit-scrollbar,
.map-picker__staged-list::-webkit-scrollbar {
  width: 5px;
}

.map-picker__list::-webkit-scrollbar-thumb,
.map-picker__staged-list::-webkit-scrollbar-thumb {
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.map-picker__list li,
.map-picker__staged-list li {
  margin: 0;
}

.map-picker__row {
  width: 100%;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition:
    background var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.map-picker__row:hover {
  background: var(--bg-elevated);
  border-color: var(--bg-overlay);
}

.map-picker__row--staged {
  border-color: var(--page-accent, var(--accent));
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 8%, transparent);
}

.map-picker__row:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.map-picker__cover {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-btn);
  overflow: hidden;
  background: var(--bg-elevated);
  flex-shrink: 0;
}

.map-picker__cover--sm {
  width: 34px;
  height: 34px;
}

.map-picker__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.map-picker__meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
  min-width: 0;
}

.map-picker__cat {
  font-size: var(--text-caption);
  font-weight: 600;
}

.map-picker__title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-picker__sub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-picker__sep {
  color: var(--text-tertiary);
}

.map-picker__trailing {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.map-picker__diff {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.map-picker__char {
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--text-tertiary);
}

.map-picker__used {
  padding: 2px 6px;
  font-size: var(--text-caption);
  font-weight: 700;
  white-space: nowrap;
  color: var(--text-secondary);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-xs);
  cursor: help;
}

.map-picker__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  opacity: 0.5;
}

.map-picker__check--on {
  color: var(--page-accent, var(--accent));
  border-color: var(--page-accent, var(--accent));
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 14%, transparent);
  opacity: 1;
}

.map-picker__staged {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto auto;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm);
  background: var(--bg-surface);
  border-radius: var(--radius-btn);
}

.map-picker__staged-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.map-picker__staged-title {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-picker__staged-sub {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-picker__pagination {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  min-height: var(--control-h);
}

@media (max-width: 720px) {
  .map-picker--multi .map-picker__panes {
    grid-template-columns: 1fr;
  }

  .map-picker__pane--selected {
    padding-left: 0;
    border-left: none;
    padding-top: var(--space-md);
    border-top: 1px solid var(--bg-overlay);
  }
}
</style>
