<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import RankChange from '@/components/common/RankChange.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import RelationFilter from '@/components/domain/RelationFilter.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useLeaderboardCacheStore } from '@/stores/leaderboardCache'
import { useLevelStore } from '@/stores/levels'
import type { UserRelationType } from '@/types/api/relations'
import type { LeaderboardResponse, XpLeaderboardResponse } from '@/types/api/users'
import type { CategoryCode, TableColumn, UserRefDisplay } from '@/types/display'
import type { Page } from '@/types/pagination'
import { countryOptionsFor } from '@/utils/countries'
import { toPlayerDisplay, toXpPlayerDisplay } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type LeaderboardPage = Page<LeaderboardResponse> | Page<XpLeaderboardResponse>

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const lbCache = useLeaderboardCacheStore()
const levelStore = useLevelStore()

const activeCategory = computed<CategoryCode>({
  get: () => (route.params.categoryCode as CategoryCode) || 'overall',
  set: (code) => {
    const query = { ...route.query }
    delete query.page
    delete query.sort
    delete query.order
    router.push({ name: 'leaderboards-category', params: { categoryCode: code }, query })
  },
})

const isXpMode = computed(() => activeCategory.value === 'xp')
const categoryName = computed(() => categoryStore.getCategoryInfo(activeCategory.value)?.name ?? 'Overall')

usePageMeta({
  title: computed(() => `${categoryName.value} Leaderboard | AccSaber`),
  description: 'AccSaber accuracy leaderboards - compete across True Acc, Standard Acc, Tech Acc, and more.',
})

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: computed(() => isXpMode.value ? 'totalXp' : 'ap'),
  defaultOrder: 'desc',
  defaultSize: 50,
  sortFieldMap: { avgAccuracy: 'averageAcc' },
  secondarySort: computed(() => isXpMode.value ? null : 'ap,desc'),
})

const { queryRef } = useQueryParams()

const countryFilter = queryRef('country')
const relationFilter = queryRef<UserRelationType>('relation')
const searchQuery = queryRef('search')
const showInactive = ref(true)
const loading = ref(true)
const pageData = shallowRef<LeaderboardPage | null>(null)
const highlightedUserId = ref<string | null>(null)

const accent = computed(() => categoryStore.getAccent(activeCategory.value))
const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const totalPlayers = computed(() => pageData.value?.totalElements ?? 0)
const filtered = computed(() => !showInactive.value || !!countryFilter.value || !!relationFilter.value)

const rows = computed<Record<string, unknown>[]>(() => {
  const source = pageData.value
  if (!source) return []
  const offset = (currentPage.value - 1) * (paginationParams.value.size ?? 50)
  const useCountryRank = !!countryFilter.value && !relationFilter.value && showInactive.value

  return source.content.map((entry, i) => {
    const p = isXpMode.value
      ? toXpPlayerDisplay(entry as XpLeaderboardResponse)
      : toPlayerDisplay(entry as LeaderboardResponse)
    const ownRank = useCountryRank && p.countryRank ? p.countryRank : offset + i + 1
    const level = 'level' in p ? p.level : null
    return {
      ...p,
      rank: filtered.value ? ownRank : p.rank,
      parenRank: filtered.value ? p.rank : null,
      tierColor: levelStore.getTierColorForLevel(level),
      tierTitle: level == null ? undefined : levelStore.getTitleForLevel(level) ?? undefined,
    }
  })
})

const RANK_CHANGE_COLUMN: TableColumn = { key: 'rankChange', label: '', align: 'center', width: '90px' }

const AP_COLUMNS: TableColumn[] = [
  { key: 'ap', label: 'AP', sortable: true, align: 'right', mono: true, width: '120px' },
  { key: 'avgAccuracy', label: 'Avg Acc', sortable: true, align: 'right', mono: true, width: '120px' },
  { key: 'rankedPlays', label: 'Plays', sortable: true, align: 'right', mono: true, width: '100px' },
  RANK_CHANGE_COLUMN,
]

const XP_COLUMNS: TableColumn[] = [
  { key: 'level', label: 'Level', sortable: true, align: 'right', mono: true, width: '100px' },
  { key: 'totalXp', label: 'Total XP', sortable: true, align: 'right', mono: true, width: '140px' },
  RANK_CHANGE_COLUMN,
]

const columns = computed<TableColumn[]>(() => [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: filtered.value ? '150px' : '80px' },
  { key: 'player', label: 'Player', align: 'left' },
  ...(isXpMode.value ? XP_COLUMNS : AP_COLUMNS),
])

const countryOptions = computed(() => countryOptionsFor(authStore.userProfile?.country))

const request = computed(() => ({
  xp: isXpMode.value,
  categoryId: isXpMode.value ? undefined : categoryStore.getCategoryId(activeCategory.value),
  params: {
    ...paginationParams.value,
    search: searchQuery.value.trim() || undefined,
    country: countryFilter.value || undefined,
    inactiveUsers: showInactive.value,
    relation: relationFilter.value || undefined,
  },
}))
const requestKey = computed(() => JSON.stringify(request.value))

let requestId = 0

async function fetchData() {
  const { xp, categoryId, params } = request.value
  if (!xp && !categoryId) return
  const id = ++requestId
  const cacheKey = { key: requestKey.value }
  const cached = lbCache.getCached<LeaderboardPage>(cacheKey)
  if (cached) pageData.value = cached
  loading.value = !cached
  try {
    const { getLeaderboard, getXpLeaderboard } = await import('@/api/leaderboards')
    const res = xp ? await getXpLeaderboard(params) : await getLeaderboard(categoryId!, params)
    lbCache.setCache(cacheKey, res)
    if (id !== requestId) return
    pageData.value = res
  } catch {
    if (id !== requestId) return
    if (!cached) pageData.value = null
  }
  loading.value = false
  await handleHighlight()
}

async function handleHighlight() {
  const highlightId = route.query.highlight as string | undefined
  if (!highlightId) return
  highlightedUserId.value = highlightId
  router.replace({ query: { ...route.query, highlight: undefined } })
  await nextTick()
  document.querySelector(`[data-user-id="${highlightId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => { highlightedUserId.value = null }, 2000)
}

function rowClass(row: Record<string, unknown>): Record<string, boolean> {
  return {
    'lb-row--highlighted': row.userId === highlightedUserId.value,
    'lb-row--self': !!authStore.userId && row.userId === authStore.userId,
  }
}

function playerRowTo(row: Record<string, unknown>) {
  const code = activeCategory.value
  const query = code !== 'overall' && code !== 'xp' ? { category: code } : {}
  return { name: 'player-profile', params: { userId: row.userId as string }, query }
}

watch(requestKey, fetchData, { immediate: true })
</script>

<template>
  <div class="leaderboards" :style="{ '--page-accent': accent }">
    <header class="leaderboards__header">
      <h1 class="leaderboards__title">{{ categoryName }}</h1>
      <p v-if="totalPlayers > 0" class="leaderboards__subtitle">
        {{ totalPlayers.toLocaleString() }} players ranked
      </p>
    </header>

    <div class="leaderboards__controls">
      <CategoryTabs v-model="activeCategory" />
      <div class="leaderboards__filter">
        <button class="leaderboards__inactive-toggle" :class="{ 'leaderboards__inactive-toggle--active': showInactive }"
          :aria-pressed="showInactive" aria-label="Show inactive players" @click="showInactive = !showInactive">
          <span class="leaderboards__inactive-track">
            <span class="leaderboards__inactive-thumb" />
          </span>
          <span class="leaderboards__inactive-label">Inactive</span>
        </button>
        <SearchBox v-model="searchQuery" placeholder="Search players..." />
        <BaseSelect v-model="countryFilter" :options="countryOptions" placeholder="All Countries" searchable />
        <RelationFilter v-model="relationFilter" />
      </div>
    </div>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

    <div class="leaderboards__table">
      <DataTable :columns="columns" :rows="rows" :sort-state="sortState" :loading="loading" :loading-rows="10"
        :row-class="rowClass" :row-to="playerRowTo" row-key="userId" empty-message="No players found"
        @sort="setSort">
        <template #cell-rank="{ value, row }">
          <span class="rank-cell" :class="getRankClass(value as number)">
            #{{ value }}
            <span v-if="row.parenRank" class="rank-cell__global">(#{{ row.parenRank }})</span>
          </span>
        </template>

        <template #cell-rankChange="{ row }">
          <RankChange :value="(row.rankChange as number) ?? 0" />
        </template>

        <template #cell-player="{ row }">
          <UserChip :user="(row.player as UserRefDisplay)" tooltip :data-user-id="row.userId" />
        </template>

        <template #cell-ap="{ value }">
          <span class="ap-cell">{{ (value as number).toFixed(2) }}</span>
        </template>

        <template #cell-avgAccuracy="{ value }">
          <template v-if="value != null">{{ ((value as number) * 100).toFixed(2) }}%</template>
          <template v-else>-</template>
        </template>

        <template #cell-totalXp="{ value, row }">
          <span class="xp-cell" :style="{ color: row.tierColor as string }" :title="(row.tierTitle as string | undefined)">
            {{ Math.round(value as number).toLocaleString() }}
          </span>
        </template>

        <template #mobile-card="{ row }">
          <router-link :to="playerRowTo(row)" class="lb-card" :class="rowClass(row)" :data-user-id="row.userId">
            <span class="lb-card__rank rank-cell" :class="getRankClass(row.rank as number)">
              #{{ row.rank }}
              <span v-if="row.parenRank" class="rank-cell__global">(#{{ row.parenRank }})</span>
            </span>
            <UserChip :user="(row.player as UserRefDisplay)" size="sm" class="lb-card__player" />
            <RankChange :value="(row.rankChange as number) ?? 0" />
            <template v-if="isXpMode">
              <span class="lb-card__level">Lv. {{ row.level }}</span>
              <span class="lb-card__ap xp-cell" :style="{ color: row.tierColor as string }"
                :title="(row.tierTitle as string | undefined)">
                {{ Math.round(row.totalXp as number).toLocaleString() }} XP
              </span>
            </template>
            <span v-else class="lb-card__ap ap-cell">{{ (row.ap as number).toFixed(2) }}</span>
          </router-link>
        </template>
      </DataTable>
    </div>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </div>
</template>

<style scoped>
.leaderboards {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
}

.leaderboards__header {
  text-align: center;
  padding: var(--space-2xl) 0 var(--space-lg);
}

.leaderboards__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.leaderboards__subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: var(--space-xs) 0 0;
  letter-spacing: 0.02em;
}

.leaderboards__controls {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.leaderboards__inactive-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}

.leaderboards__inactive-track {
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: var(--bg-overlay);
  border: 1px solid var(--text-tertiary);
  transition: background 120ms ease, border-color 120ms ease;
}

.leaderboards__inactive-toggle--active .leaderboards__inactive-track {
  background: color-mix(in srgb, var(--page-accent) 40%, transparent);
  border-color: var(--page-accent);
}

.leaderboards__inactive-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: transform 120ms ease, background 120ms ease;
}

.leaderboards__inactive-toggle--active .leaderboards__inactive-thumb {
  transform: translateX(12px);
  background: var(--page-accent);
}

.leaderboards__inactive-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  user-select: none;
}

.leaderboards__filter {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: var(--space-sm);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.leaderboards__table {
  --accent: var(--page-accent);
}

.rank-cell {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-secondary);
}

.rank-cell.rank--gold {
  color: var(--tier-gold);
  font-weight: 700;
}

.rank-cell.rank--silver {
  color: var(--tier-silver);
  font-weight: 700;
}

.rank-cell.rank--bronze {
  color: var(--tier-bronze);
  font-weight: 700;
}

.rank-cell__global {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-weight: 400;
  margin-left: 2px;
}

.leaderboards__table :deep(.data-table__row.lb-row--self),
.lb-card.lb-row--self {
  background: color-mix(in srgb, var(--page-accent) 8%, var(--bg-surface));
}

.leaderboards__table :deep(.lb-row--highlighted),
.lb-card.lb-row--highlighted {
  animation: row-highlight 2s ease-out;
}

@keyframes row-highlight {
  from {
    background: color-mix(in srgb, var(--page-accent) 25%, var(--bg-surface));
  }
}

.ap-cell {
  color: var(--page-accent);
  font-weight: 600;
}

.xp-cell {
  font-weight: 600;
}

.lb-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  min-height: 48px;
  transition: border-color 120ms ease;
  text-decoration: none;
  color: inherit;
}

.lb-card:hover {
  border-color: var(--text-tertiary);
}

.lb-card__rank {
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

.lb-card__player {
  flex: 1;
}

.lb-card__ap {
  font-family: var(--font-mono);
  font-weight: 600;
  flex-shrink: 0;
}

.lb-card__level {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .leaderboards__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .leaderboards__header {
    padding: var(--space-lg) 0 var(--space-md);
  }
}
</style>
