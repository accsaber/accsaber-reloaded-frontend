<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import DataTable from '@/components/common/DataTable.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import ComplexityPin from '@/components/domain/ComplexityPin.vue'
import CriteriaVerdict from '@/components/domain/CriteriaVerdict.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapFilterSidebar from '@/components/domain/MapFilterSidebar.vue'
import MapNameCell from '@/components/domain/MapNameCell.vue'
import QueueVotes from '@/components/domain/QueueVotes.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useCategoryStore } from '@/stores/categories'
import { useLeaderboardCacheStore } from '@/stores/leaderboardCache'
import type { PublicStaffUserResponse } from '@/types/api/staff'
import type { MapDifficultyResponse, PublicMapDifficultyResponse } from '@/types/api/maps'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { scriptNote } from '@/utils/complexity'
import { formatRelativeDate } from '@/utils/formatters'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { pickAvatarUrl } from '@/utils/media'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

type StaffFields = 'complexityPinned' | 'scriptComplexity' | 'scriptVersion' | 'commentCount' | 'createdBy'
  | 'lastUpdatedBy' | 'criteriaUpvotes' | 'criteriaDownvotes' | 'headCriteriaVote'

export type QueueEntry = PublicMapDifficultyResponse & Partial<Pick<MapDifficultyResponse, StaffFields>>

type Variant = 'staff' | 'deactivated' | 'public'

const props = defineProps<{
  title: string
  countLabel: string
  emptyMessage: string
  variant: Variant
  baseParams: Record<string, unknown>
  fetchPage: (params: Record<string, unknown>) => Promise<Page<QueueEntry>>
  rowRoute?: (entry: QueueEntry) => RouteLocationRaw
}>()

const PAGE_SIZE = 20
const COMPLEXITY_MAX = 20
const COMMENTS_ICON =
  'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'

const MAP_COLUMNS: TableColumn[] = [
  { key: 'cover', label: '', width: '76px' },
  { key: 'map', label: 'Map', align: 'left', primary: true },
  { key: 'category', label: 'Category', align: 'left', width: '112px' },
]
const QUEUE_COLUMNS: TableColumn[] = [
  ...MAP_COLUMNS,
  { key: 'complexity', label: 'Complexity', sortable: true, align: 'left', width: '148px' },
  { key: 'criteria', label: 'Criteria', align: 'left', width: '120px' },
  { key: 'rating', label: 'Votes', sortable: true, align: 'left', width: '132px' },
  { key: 'comments', label: 'Comments', sortable: true, align: 'right', mono: true, width: '80px', icon: COMMENTS_ICON },
  { key: 'submitted', label: 'Submitted', sortable: true, align: 'left', width: '180px' },
]
const PUBLIC_COLUMNS: TableColumn[] = [
  ...MAP_COLUMNS,
  { key: 'criteria', label: 'Criteria', align: 'left', width: '140px' },
  { key: 'rating', label: 'Votes', sortable: true, align: 'left', width: '132px' },
  { key: 'submitted', label: 'Added', sortable: true, align: 'left', width: '140px' },
]
const DEACTIVATED_COLUMNS: TableColumn[] = [
  ...MAP_COLUMNS,
  { key: 'complexity', label: 'Complexity', align: 'left', width: '148px' },
  { key: 'submitted', label: 'Submitted', sortable: true, align: 'left', width: '180px' },
  { key: 'edited', label: 'Last Edited By', align: 'left', width: '180px' },
]

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()
const queueCache = useLeaderboardCacheStore()
const { queryRef } = useQueryParams()

const columns = { staff: QUEUE_COLUMNS, deactivated: DEACTIVATED_COLUMNS, public: PUBLIC_COLUMNS }[props.variant]
const IMPORT_CUTOFF_MS = Date.parse('2026-04-19T18:00:00Z')

const searchQuery = queryRef('q')
const categoryParam = queryRef('category')
const selectedCategory = computed<string | null>({
  get: () => categoryParam.value || null,
  set: (value) => { categoryParam.value = value ?? '' },
})

const complexityRange = computed<[number, number]>({
  get: (): [number, number] => [Number(route.query.complexityMin) || 0, Number(route.query.complexityMax) || COMPLEXITY_MAX],
  set([min, max]: [number, number]) {
    const query = { ...route.query }
    if (min <= 0) delete query.complexityMin
    else query.complexityMin = String(min)
    if (max >= COMPLEXITY_MAX) delete query.complexityMax
    else query.complexityMax = String(max)
    delete query.page
    router.replace({ query })
  },
})

const filtersOpen = ref(false)
const hasActiveFilters = computed(
  () => selectedCategory.value !== null || complexityRange.value[0] > 0 || complexityRange.value[1] < COMPLEXITY_MAX,
)

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: props.variant === 'deactivated' ? 'submitted' : 'rating',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  sortFieldMap: {
    submitted: 'createdAt',
    comments: 'commentCount',
  },
  secondarySort: null,
})

const difficulties = ref<QueueEntry[]>([])
const totalPages = ref(0)
const totalElements = ref(0)
const loading = ref(true)

const subtitle = computed(() => (totalElements.value ? `${totalElements.value} ${props.countLabel}` : '\u00a0'))
const countKey = `queue-maps:${props.variant}`

const rows = computed<Record<string, unknown>[]>(() =>
  difficulties.value.map((d) => {
    const code = categoryStore.getCategoryCode(d.categoryId) ?? 'overall'
    return {
      id: d.id,
      entry: d,
      categoryName: categoryStore.getShortName(code),
      categoryAccent: categoryStore.getAccent(code),
    }
  }),
)

function entryOf(row: Record<string, unknown>): QueueEntry {
  return row.entry as QueueEntry
}

function rowTo(row: Record<string, unknown>) {
  return props.rowRoute?.(entryOf(row))
}

function addedLabel(entry: QueueEntry): string {
  return props.variant === 'public' && Date.parse(entry.createdAt) < IMPORT_CUTOFF_MS ? 'Imported' : formatRelativeDate(entry.createdAt)
}

function staffOf(row: Record<string, unknown>, key: string): PublicStaffUserResponse | undefined {
  return key === 'edited' ? entryOf(row).lastUpdatedBy : entryOf(row).createdBy
}

const request = computed<Record<string, unknown>>(() => ({
  ...paginationParams.value,
  ...props.baseParams,
  categoryId: selectedCategory.value ? categoryStore.getCategoryId(selectedCategory.value) : undefined,
  complexityMin: complexityRange.value[0] > 0 ? complexityRange.value[0] : undefined,
  complexityMax: complexityRange.value[1] < COMPLEXITY_MAX ? complexityRange.value[1] : undefined,
  search: searchQuery.value.trim() || undefined,
}))

let requestId = 0

function show(page: Page<QueueEntry>) {
  difficulties.value = page.content
  totalPages.value = page.totalPages
  totalElements.value = page.totalElements
}

async function fetchDifficulties() {
  const params = request.value
  const cacheKey = { _type: `queue-maps:${props.variant}`, ...params }
  const id = ++requestId
  const cached = queueCache.getCached<Page<QueueEntry>>(cacheKey)
  if (cached) show(cached)
  loading.value = true
  try {
    const res = await props.fetchPage(params)
    queueCache.setCache(cacheKey, res)
    rememberCount(countKey, res.content.length)
    if (id === requestId) show(res)
  } catch {
    if (id !== requestId || cached) return
    difficulties.value = []
    totalPages.value = 0
    totalElements.value = 0
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(() => JSON.stringify(request.value), fetchDifficulties, { immediate: true })
</script>

<template>
  <div class="queue">
    <PageHeaderBleed :title="title" :subtitle="subtitle" />

    <div class="queue__controls">
      <SearchBox v-model="searchQuery" class="queue__search" placeholder="Search song, artist or mapper" />
      <slot name="actions" />
      <FilterPopover :open="filtersOpen" @update:open="filtersOpen = $event">
        <template #trigger>
          <FilterButton :active="filtersOpen || hasActiveFilters" />
        </template>
        <MapFilterSidebar
          v-model:selected-category="selectedCategory"
          v-model:complexity-range="complexityRange"
          :show-complexity="variant !== 'public'"
        />
      </FilterPopover>
    </div>

    <DataTable
      :columns="columns"
      :rows="rows"
      :sort-state="sortState"
      :loading="loading && difficulties.length === 0"
      :refreshing="loading && difficulties.length > 0"
      :loading-rows="knownCount(countKey, PAGE_SIZE)"
      :row-height="64"
      :row-to="rowTo"
      row-key="id"
      :empty-message="emptyMessage"
      @sort="setSort"
    >
      <template #cell-cover="{ row }">
        <CoverImage :source="entryOf(row)" :alt="entryOf(row).songName" :size="44" />
      </template>

      <template #cell-map="{ row }">
        <MapNameCell
          :name="entryOf(row).songName"
          :sub-name="entryOf(row).songSubName"
          :artist="entryOf(row).songAuthor"
          :mapper="entryOf(row).mapAuthor"
        >
          <DifficultyBadge :difficulty="entryOf(row).difficulty" />
        </MapNameCell>
      </template>

      <template #cell-category="{ row }">
        <span class="queue__stack">
          <span class="queue__category" :style="{ color: row.categoryAccent as string }">{{ row.categoryName }}</span>
          <span v-if="entryOf(row).status === 'QUALIFIED'" class="caption queue__qualified">Qualified</span>
        </span>
      </template>

      <template #cell-complexity="{ row }">
        <span class="queue__stack">
          <span v-if="entryOf(row).complexity != null" class="queue__complexity">
            <ComplexityBadge :complexity="entryOf(row).complexity!" />
            <ComplexityPin v-if="entryOf(row).complexityPinned" />
          </span>
          <span v-else class="queue__none">-</span>
          <span v-if="entryOf(row).scriptComplexity != null" class="caption" :title="entryOf(row).scriptVersion ?? undefined">
            Script {{ scriptNote(entryOf(row)) }}
          </span>
        </span>
      </template>

      <template #cell-criteria="{ row }">
        <CriteriaVerdict :source="entryOf(row)" />
      </template>

      <template #cell-rating="{ row }">
        <QueueVotes :up="entryOf(row).rankUpvotes ?? 0" :down="entryOf(row).rankDownvotes ?? 0" :neutral="entryOf(row).rankNeutrals ?? 0" />
      </template>

      <template #cell-comments="{ row }">
        <span :class="{ queue__none: !entryOf(row).commentCount }">{{ entryOf(row).commentCount ?? 0 }}</span>
      </template>

      <template v-for="key in ['submitted', 'edited']" :key="key" #[`cell-${key}`]="{ row }">
        <span class="queue__stack">
          <span v-if="key === 'submitted'">{{ addedLabel(entryOf(row)) }}</span>
          <span v-if="staffOf(row, key)?.username" class="queue__by" :class="{ caption: key === 'submitted' }">
            <img v-if="pickAvatarUrl(staffOf(row, key))" class="queue__avatar" :src="pickAvatarUrl(staffOf(row, key))"
              alt="" loading="lazy" decoding="async" />
            {{ staffOf(row, key)?.username }}
          </span>
          <span v-else-if="key === 'edited'" class="queue__none">-</span>
        </span>
      </template>

      <template #mobile-card="{ row }">
        <component :is="rowRoute ? 'RouterLink' : 'div'" class="queue__card" :to="rowTo(row)">
          <CoverImage :source="entryOf(row)" :alt="entryOf(row).songName" :size="48" />
          <span class="queue__card-body">
            <MapNameCell
              :name="entryOf(row).songName"
              :sub-name="entryOf(row).songSubName"
              :artist="entryOf(row).songAuthor"
              :mapper="entryOf(row).mapAuthor"
            />
            <span class="queue__card-line">
              <span class="queue__category" :style="{ color: row.categoryAccent as string }">{{ row.categoryName }}</span>
              <DifficultyBadge :difficulty="entryOf(row).difficulty" />
              <ComplexityBadge v-if="entryOf(row).complexity != null" :complexity="entryOf(row).complexity!" />
              <span v-if="entryOf(row).status === 'QUALIFIED'" class="caption queue__qualified">Qualified</span>
            </span>
            <span v-if="variant === 'deactivated'" class="queue__card-line caption">
              {{ addedLabel(entryOf(row)) }}
            </span>
            <span v-else class="queue__card-line">
              <CriteriaVerdict :source="entryOf(row)" prefix="criteria" />
              <QueueVotes :up="entryOf(row).rankUpvotes ?? 0" :down="entryOf(row).rankDownvotes ?? 0" :neutral="entryOf(row).rankNeutrals ?? 0" />
            </span>
          </span>
        </component>
      </template>
    </DataTable>

    <div class="queue__pages">
      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
    </div>
  </div>
</template>

<style scoped>
.queue {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  min-width: 0;
  margin: 0 auto;
}

.queue__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.queue__search {
  flex: 1;
  min-width: 240px;
}

.queue__stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.queue__category {
  font-weight: 600;
}

.queue__qualified {
  color: var(--info);
}

.queue__complexity {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.queue__none {
  color: var(--text-tertiary);
}

.queue__by {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.queue__avatar {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-xs);
  object-fit: cover;
}

.queue__pages {
  min-height: var(--control-h);
}

.queue__card {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  color: inherit;
  text-decoration: none;
}

.queue__card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.queue__card-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
  min-height: 24px;
}

@media (max-width: 767px) {
  .queue__search {
    flex-basis: 100%;
  }
}
</style>
