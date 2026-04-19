<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import RankedQueueRow from '@/components/domain/RankedQueueRow.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import type { Tab } from '@/types/display'
import type { MapDifficultyStatus } from '@/types/enums'
import { MAP_STATUS_ACCENT } from '@/utils/constants'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MapFilterSidebar from './maps/MapFilterSidebar.vue'

const route = useRoute()
const router = useRouter()

usePageMeta({
  title: 'Ranking Queue | AccSaber Reloaded',
  description: 'Maps awaiting ranking review on AccSaber. See community votes and criteria status.',
})

const statusTabs: Tab[] = [
  { key: 'QUEUE', label: 'In Queue' },
  { key: 'QUALIFIED', label: 'Qualified' },
]

const activeStatus = computed<MapDifficultyStatus>({
  get() {
    const s = route.query.status as string
    if (s === 'QUALIFIED') return 'QUALIFIED'
    return 'QUEUE'
  },
  set(val) {
    const query = { ...route.query }
    if (val === 'QUEUE') {
      delete query.status
    } else {
      query.status = val
    }
    delete query.page
    router.replace({ query })
  },
})

const accent = computed(() => MAP_STATUS_ACCENT[activeStatus.value] ?? 'var(--accent-overall)')

const sortOptions = [
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'rating', label: 'Rating' },
]

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: 'dateAdded',
  defaultOrder: 'desc',
  defaultSize: 20,
  sortFieldMap: {
    dateAdded: 'createdAt',
  },
  secondarySort: null,
})

const selectedCategories = computed<string[]>({
  get() {
    const c = route.query.category
    if (!c) return []
    return Array.isArray(c) ? (c as string[]) : [c as string]
  },
  set(val) {
    const query = { ...route.query }
    if (val.length === 0) {
      delete query.category
    } else if (val.length === 1) {
      query.category = val[0]
    } else {
      query.category = val
    }
    delete query.page
    router.replace({ query })
  },
})

const filtersOpen = ref(false)
const searchQuery = ref('')

const hasActiveFilters = computed(() => selectedCategories.value.length > 0)

const difficulties = ref<PublicMapDifficultyResponse[]>([])
const totalPages = ref(0)
const totalElements = ref(0)
const loading = ref(true)

const subtitle = computed(() => {
  if (loading.value) return ''
  if (totalElements.value === 0) return 'No maps awaiting review'
  const noun = totalElements.value === 1 ? 'map' : 'maps'
  return activeStatus.value === 'QUALIFIED'
    ? `${totalElements.value} qualified ${noun} awaiting release`
    : `${totalElements.value} ${noun} in the ranking queue`
})

async function fetchDifficulties() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      ...paginationParams.value,
      status: activeStatus.value,
    }
    if (selectedCategories.value.length === 1) {
      params.categoryId = selectedCategories.value[0]
    }
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    const { getDifficulties } = await import('@/api/maps')
    const res = await getDifficulties(params as never)
    difficulties.value = res.content
    totalPages.value = res.totalPages
    totalElements.value = res.totalElements
  } catch {
    difficulties.value = []
    totalPages.value = 0
    totalElements.value = 0
  }
  loading.value = false
}

watch(searchQuery, () => {
  const query = { ...route.query }
  delete query.page
  router.replace({ query })
})

watch(
  [activeStatus, selectedCategories, paginationParams, searchQuery],
  fetchDifficulties,
  { immediate: true, deep: true },
)

function navigateToMap(entry: PublicMapDifficultyResponse) {
  router.push({
    name: 'map-detail',
    params: { mapId: entry.mapId },
    query: { difficultyId: entry.id },
  })
}

const emptyMessage = computed(() =>
  activeStatus.value === 'QUALIFIED'
    ? 'No qualified maps awaiting release. Check back soon.'
    : 'No maps currently in the ranking queue. Check back soon.',
)
</script>

<template>
  <div class="queue-page" :style="{ '--page-accent': accent, '--accent': accent }">
    <PageHeaderBleed title="Ranking Queue" :subtitle="subtitle" />

    <div class="queue-page__controls">
      <BaseTabs
        :tabs="statusTabs"
        :model-value="activeStatus"
        @update:model-value="activeStatus = $event as MapDifficultyStatus"
      />
      <div class="queue-page__filters">
        <BaseSelect
          :options="sortOptions"
          :model-value="sortState.key"
          @update:model-value="setSort($event)"
        />
        <SearchBox
          v-model="searchQuery"
          placeholder="Search by song, artist, or mapper..."
          class="queue-page__search"
        />
        <FilterPopover :open="filtersOpen" @update:open="filtersOpen = $event">
          <template #trigger>
            <FilterButton :active="filtersOpen || hasActiveFilters" :has-indicator="hasActiveFilters" />
          </template>
          <MapFilterSidebar
            :selected-categories="selectedCategories"
            :complexity-range="[0, 20]"
            :show-complexity="false"
            @update:selected-categories="selectedCategories = $event"
          />
        </FilterPopover>
      </div>
    </div>

    <div class="queue-page__list">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 8" :key="'skel-' + i" variant="card" height="88px" />
      </template>
      <template v-else-if="difficulties.length === 0">
        <EmptyState :message="emptyMessage" />
      </template>
      <template v-else>
        <RankedQueueRow
          v-for="entry in difficulties"
          :key="entry.id"
          :entry="entry"
          @click="navigateToMap(entry)"
        />
      </template>
    </div>

    <PaginationControls
      v-if="totalPages > 1"
      :page="currentPage"
      :total-pages="totalPages"
      @update:page="setPage($event)"
    />
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
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
}

.queue-page__filters {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.queue-page__search {
  min-width: 240px;
}

.queue-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

@media (max-width: 767px) {
  .queue-page__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .queue-page__filters {
    flex-direction: row;
    align-items: stretch;
  }

  .queue-page__search {
    flex: 1;
    min-width: 0;
  }
}
</style>
