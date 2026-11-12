<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SwapList from '@/components/common/SwapList.vue'
import MapCard from '@/views/maps/MapCard.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type { PublicBatchResponse } from '@/types/api/batches'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import type { MapDisplay } from '@/types/display'
import type { Page } from '@/types/pagination'
import { toMapDisplay } from '@/utils/mappers'
import { buildMapRoute } from '@/utils/mapRoute'
import { readStoredString, writeStoredString } from '@/utils/storage'
import { computed, ref, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import BatchListView from '@/components/domain/BatchListView.vue'
import MapFilterSidebar from '@/components/domain/MapFilterSidebar.vue'
import MapListView from './maps/MapListView.vue'
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import ViewToggle, { type ViewMode } from './maps/ViewToggle.vue'

const route = useRoute()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()
const { setQuery, queryRef } = useQueryParams()

usePageMeta({
  title: 'Maps | AccSaber',
  description: 'Browse all ranked maps on AccSaber across categories and difficulties.',
})

const MAPS_VIEW_KEY = 'accsaber:maps-view'
const MAX_COMPLEXITY = 20

function storedView(): ViewMode {
  const stored = readStoredString(MAPS_VIEW_KEY)
  return stored === 'list' || stored === 'batch' ? stored : 'grid'
}

const viewParam = queryRef<ViewMode>('view')
const viewMode = computed<ViewMode>({
  get: () => viewParam.value || storedView(),
  set: (value) => {
    writeStoredString(MAPS_VIEW_KEY, value)
    viewParam.value = value
  },
})

const filtersOpen = ref(false)
const searchQuery = queryRef('q')
const categoryParam = queryRef('category')
const unplayedParam = queryRef('unplayed')
const batchSortParam = queryRef('batchSort')

const selectedCategory = computed<string | null>({
  get: () => categoryParam.value || null,
  set: (value) => { categoryParam.value = value ?? '' },
})

const unplayedOnly = computed<boolean>({
  get: () => unplayedParam.value === 'true',
  set: (value) => { unplayedParam.value = value ? 'true' : '' },
})

const batchSortKey = computed<string>({
  get: () => batchSortParam.value || 'releasedAt',
  set: (value) => { batchSortParam.value = value === 'releasedAt' ? '' : value },
})

const complexityRange = computed<[number, number]>({
  get: (): [number, number] => [Number(route.query.complexityMin) || 0, Number(route.query.complexityMax) || MAX_COMPLEXITY],
  set: ([min, max]) => setQuery({
    complexityMin: min > 0 ? String(min) : undefined,
    complexityMax: max < MAX_COMPLEXITY ? String(max) : undefined,
  }),
})

const hasActiveFilters = computed(() =>
  selectedCategory.value !== null || complexityRange.value[0] > 0
  || complexityRange.value[1] < MAX_COMPLEXITY || unplayedOnly.value,
)

const sortOptions = [
  { value: 'releaseDate', label: 'Release Date' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'name', label: 'Name' },
]

const batchSortOptions = [
  { value: 'releasedAt', label: 'Release Date' },
  { value: 'difficultyCount', label: 'Difficulty Count' },
]

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: 'releaseDate',
  defaultOrder: 'desc',
  defaultSize: 20,
  sortFieldMap: {
    releaseDate: 'rankedAt',
    name: 'songName',
  },
  secondarySort: null,
})

const difficulties = ref<PublicMapDifficultyResponse[]>([])
const totalPages = ref(0)
const totalElements = ref(0)
const loading = ref(true)

const batches = ref<PublicBatchResponse[]>([])
const batchTotalPages = ref(0)
const batchLoading = ref(true)

const isBatchView = computed(() => viewMode.value === 'batch')
const firstLoad = computed(() => loading.value && difficulties.value.length === 0)
const pageCount = computed(() => (isBatchView.value ? batchTotalPages.value : totalPages.value))

const mapDisplays = computed<MapDisplay[]>(() =>
  difficulties.value.map((d) => toMapDisplay(d, (id) => categoryStore.getCategoryCode(id))),
)

const difficultyRequest = computed(() => {
  if (isBatchView.value) return null
  const [min, max] = complexityRange.value
  return {
    unplayedFor: unplayedOnly.value ? authStore.userId : null,
    params: {
      ...paginationParams.value,
      status: 'RANKED',
      categoryId: categoryStore.getCategoryId(selectedCategory.value ?? ''),
      complexityMin: min > 0 ? min : undefined,
      complexityMax: max < MAX_COMPLEXITY ? max : undefined,
      search: searchQuery.value.trim() || undefined,
    },
  }
})

const batchRequest = computed(() =>
  isBatchView.value
    ? {
      page: currentPage.value - 1,
      size: 10,
      sort: batchSortKey.value === 'difficultyCount' ? 'difficultyCount,desc' : 'releasedAt,desc',
    }
    : null,
)

let difficultyRequestId = 0

async function fetchDifficulties() {
  const request = difficultyRequest.value
  if (!request) return
  const id = ++difficultyRequestId
  loading.value = true
  try {
    let res: Page<PublicMapDifficultyResponse>
    if (request.unplayedFor) {
      const { getUserMissingMaps } = await import('@/api/users')
      res = await getUserMissingMaps(request.unplayedFor, request.params as never)
    } else {
      const { getDifficulties } = await import('@/api/maps')
      res = await getDifficulties(request.params as never)
    }
    if (id !== difficultyRequestId) return
    difficulties.value = res.content
    totalPages.value = res.totalPages
    totalElements.value = res.totalElements
  } catch {
    if (id !== difficultyRequestId) return
    difficulties.value = []
    totalPages.value = 0
    totalElements.value = 0
  }
  loading.value = false
}

let batchRequestId = 0

async function fetchBatches() {
  const request = batchRequest.value
  if (!request) return
  const id = ++batchRequestId
  batchLoading.value = true
  try {
    const { getBatches } = await import('@/api/batches')
    const res = await getBatches(request)
    if (id !== batchRequestId) return
    batches.value = res.content
    batchTotalPages.value = res.totalPages
  } catch {
    if (id !== batchRequestId) return
    batches.value = []
    batchTotalPages.value = 0
  }
  batchLoading.value = false
}

function mapRouteTo(m: Pick<MapDisplay, 'id' | 'difficultyId' | 'difficulty' | 'characteristic' | 'beatsaverCode'>): RouteLocationRaw {
  return buildMapRoute({
    beatsaverCode: m.beatsaverCode ?? null,
    mapId: m.id,
    difficulty: m.difficulty,
    difficultyId: m.difficultyId,
    characteristic: m.characteristic ?? null,
  })
}

watch(() => JSON.stringify(difficultyRequest.value), fetchDifficulties, { immediate: true })
watch(() => JSON.stringify(batchRequest.value), fetchBatches, { immediate: true })
</script>

<template>
  <div class="maps-page">
    <div class="maps-page__header">
      <h1>Maps</h1>
      <span v-if="!isBatchView && totalElements" class="caption">
        {{ totalElements.toLocaleString() }} ranked difficulties
      </span>
    </div>

    <div class="maps-page__controls">
      <div class="maps-page__controls-left">
        <PlaylistDropdown />
        <BaseSelect v-if="viewMode === 'grid'" :options="sortOptions" :model-value="sortState.key"
          @update:model-value="setSort($event)" />
        <BaseSelect v-if="isBatchView" v-model="batchSortKey" :options="batchSortOptions" />
        <SearchBox v-if="!isBatchView" v-model="searchQuery" placeholder="Search by song, artist, or mapper..." />
      </div>
      <div class="maps-page__controls-right">
        <ViewToggle v-model="viewMode" />

        <FilterPopover v-if="!isBatchView" v-model:open="filtersOpen">
          <template #trigger>
            <FilterButton :active="filtersOpen || hasActiveFilters" />
          </template>
          <MapFilterSidebar v-model:selected-category="selectedCategory" v-model:complexity-range="complexityRange"
            v-model:unplayed-only="unplayedOnly" :show-unplayed="authStore.isLoggedIn" />
        </FilterPopover>
      </div>
    </div>

    <div class="maps-page__content">
      <template v-if="viewMode === 'grid'">
        <EmptyState v-if="!loading && mapDisplays.length === 0" message="No maps found matching your filters." />
        <SwapList v-else class="maps-page__grid" :items="mapDisplays" :item-key="(m) => m.difficultyId"
          :loading="firstLoad" :refreshing="loading && !firstLoad" :placeholders="20">
          <template #placeholder>
            <div class="maps-page__ghost card-ghost placeholder" aria-hidden="true" />
          </template>
          <template #default="{ item, swap }">
            <MapCard :map="item" :to="mapRouteTo(item)" v-bind="swap" />
          </template>
        </SwapList>
      </template>

      <MapListView v-else-if="viewMode === 'list'" :maps="mapDisplays" :loading="firstLoad"
        :refreshing="loading && !firstLoad" :sort-state="sortState" :map-route-to="mapRouteTo" @sort="setSort" />

      <BatchListView v-else-if="viewMode === 'batch'" :batches="batches"
        :loading="batchLoading && batches.length === 0" :refreshing="batchLoading && batches.length > 0"
        :map-route-to="mapRouteTo" />

      <PaginationControls v-if="pageCount > 1" :page="currentPage" :total-pages="pageCount" @update:page="setPage" />
    </div>
  </div>
</template>

<style scoped>
.maps-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.maps-page__header {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.maps-page__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.maps-page__controls-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
  min-width: 0;
}

.maps-page__controls-left :deep(.search-box) {
  min-width: 320px;
  flex: 1 1 320px;
}

.maps-page__controls-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.maps-page__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.maps-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.maps-page__ghost {
  --ghost-body: 115.6px;
}

@media (max-width: 767px) {
  .maps-page__ghost {
    --ghost-body: 109px;
  }

  .maps-page__grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  .maps-page__controls {
    flex-wrap: wrap;
  }

  .maps-page__controls-left {
    width: 100%;
  }

  .maps-page__controls-left :deep(.search-box) {
    min-width: 0;
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>
