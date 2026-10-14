<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import RankedQueueRow from '@/components/domain/RankedQueueRow.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useLeaderboardCacheStore } from '@/stores/leaderboardCache'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import type { Page } from '@/types/pagination'
import { QUEUE_STATUSES } from '@/utils/constants'
import { computed, ref, watch } from 'vue'
import MapFilterSidebar from './maps/MapFilterSidebar.vue'

const queueCache = useLeaderboardCacheStore()
const { queryRef } = useQueryParams()

usePageMeta({
  title: 'Ranking Queue | AccSaber',
  description: 'Maps awaiting ranking review on AccSaber. See community votes and criteria status.',
})

const sortOptions = [
  { value: 'rating', label: 'Rating' },
  { value: 'dateAdded', label: 'Date Added' },
]

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: 'rating',
  defaultOrder: 'desc',
  defaultSize: 20,
  sortFieldMap: {
    dateAdded: 'createdAt',
  },
  secondarySort: null,
})

const searchQuery = queryRef('q')
const categoryParam = queryRef('category')
const selectedCategory = computed<string | null>({
  get: () => categoryParam.value || null,
  set: (value) => { categoryParam.value = value ?? '' },
})

const filtersOpen = ref(false)

const difficulties = ref<PublicMapDifficultyResponse[]>([])
const totalPages = ref(0)
const totalElements = ref(0)
const loading = ref(true)

const subtitle = computed(() => {
  if (loading.value) return ''
  if (totalElements.value === 0) return 'No maps awaiting review'
  const noun = totalElements.value === 1 ? 'map' : 'maps'
  return `${totalElements.value} ${noun} in the ranking queue`
})

const request = computed(() => ({
  ...paginationParams.value,
  status: QUEUE_STATUSES,
  categoryId: selectedCategory.value ?? undefined,
  search: searchQuery.value.trim() || undefined,
}))

function applyPage(res: Page<PublicMapDifficultyResponse>) {
  difficulties.value = res.content
  totalPages.value = res.totalPages
  totalElements.value = res.totalElements
}

let requestId = 0

async function fetchDifficulties() {
  const params = request.value
  const cacheKey = { _type: 'ranked-queue', ...params, status: QUEUE_STATUSES.join(',') }
  const id = ++requestId
  const cached = queueCache.getCached<Page<PublicMapDifficultyResponse>>(cacheKey)
  if (cached) applyPage(cached)
  loading.value = !cached
  try {
    const { getDifficulties } = await import('@/api/maps')
    const res = await getDifficulties(params as never)
    queueCache.setCache(cacheKey, res)
    if (id === requestId) applyPage(res)
  } catch {
    if (id === requestId && !cached) {
      difficulties.value = []
      totalPages.value = 0
      totalElements.value = 0
    }
  }
  if (id === requestId) loading.value = false
}

watch(() => JSON.stringify(request.value), fetchDifficulties, { immediate: true })

const emptyMessage = computed(() => (request.value.search || request.value.categoryId ? 'No matches' : 'No maps in the queue'))
</script>

<template>
  <div class="queue-page">
    <PageHeaderBleed title="Ranking Queue" :subtitle="subtitle" />

    <div class="queue-page__controls">
      <PlaylistDropdown queued />
      <BaseSelect :options="sortOptions" :model-value="sortState.key" @update:model-value="setSort($event)" />
      <SearchBox v-model="searchQuery" placeholder="Search by song, artist, or mapper..."
        class="queue-page__search" />
      <FilterPopover :open="filtersOpen" @update:open="filtersOpen = $event">
        <template #trigger>
          <FilterButton :active="filtersOpen || selectedCategory !== null" :has-indicator="selectedCategory !== null" />
        </template>
        <MapFilterSidebar v-model:selected-category="selectedCategory" :show-complexity="false" />
      </FilterPopover>
    </div>

    <div class="queue-page__list">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 8" :key="'skel-' + i" variant="card" height="88px" />
      </template>
      <EmptyState v-else-if="difficulties.length === 0" :message="emptyMessage" />
      <template v-else>
        <RankedQueueRow v-for="entry in difficulties" :key="entry.id" :entry="entry" />
      </template>
    </div>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages"
      @update:page="setPage($event)" />
  </div>
</template>

<style scoped>
.queue-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1030px;
  margin: 0 auto;
  width: 100%;
}

.queue-page__controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.queue-page__search {
  flex: 1;
  min-width: 240px;
}

.queue-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

@media (max-width: 767px) {
  .queue-page__search {
    min-width: 0;
  }
}
</style>
