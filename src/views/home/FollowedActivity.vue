<script setup lang="ts">
import { formatAccuracy } from '@/utils/formatters'
import { getLeaderboard } from '@/api/leaderboards'
import { getRelationScores } from '@/api/relations'
import BaseTabs from '@/components/common/BaseTabs.vue'
import DataTable from '@/components/common/DataTable.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import ScoreFeedCard from '@/components/domain/ScoreFeedCard.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { ScoreRelationType } from '@/types/api/relations'
import type { LeaderboardResponse, ScoreResponse } from '@/types/api/users'
import type { ScoreDisplay, ScoreFeedEntry, Tab, TableColumn, UserRefDisplay } from '@/types/display'
import type { Page } from '@/types/pagination'
import { feedEntryToScoreDisplay, toPlayerDisplay, toScoreFeedEntry } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { useNow } from '@/composables/useNow'
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const RANKING_SIZE = 8
const SCORE_SIZE = 5

const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const rankingLoading = ref(false)
const scoresLoading = ref(false)
const rankingPageData = ref<Page<LeaderboardResponse> | null>(null)
const scorePageData = ref<Page<ScoreResponse> | null>(null)
const rankingPage = ref(1)
const scorePage = ref(1)
const scoreMode = ref<ScoreRelationType>('follower')
const filterCategoryId = ref<string | undefined>(undefined)
const filtersOpen = ref(false)

const now = useNow()

const scoreTabs: Tab[] = [
  { key: 'follower', label: 'Following' },
  { key: 'rival', label: 'Rivals' },
]

const rankingColumns: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '84px' },
  { key: 'player', label: 'Player', align: 'left', width: '130px', flex: true },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '104px' },
  { key: 'avgAccuracy', label: 'Avg Acc', align: 'right', mono: true, width: '96px' },
]

const accent = computed(() => categoryStore.getAccent('overall'))

const filterCategories = computed(() =>
  categoryStore.categoryInfoList.filter((c) => c.code !== 'overall' && c.code !== 'xp'),
)

const rankingRows = computed<Record<string, unknown>[]>(
  () => rankingPageData.value?.content.map((entry) => ({ ...toPlayerDisplay(entry) })) ?? [],
)

const scoreFeedEntries = computed<ScoreFeedEntry[]>(
  () => scorePageData.value?.content.map((score) => toScoreFeedEntry(
    score,
    modifierStore.resolveModifierCodes(score.modifierIds),
    categoryStore.getCategoryCode(score.categoryId),
  )) ?? [],
)

const modalOpen = ref(false)
const modalScore = ref<ScoreDisplay | null>(null)
const modalUserId = ref('')

function onSelectScore(entry: ScoreFeedEntry) {
  modalScore.value = feedEntryToScoreDisplay(entry)
  modalUserId.value = entry.userId
  modalOpen.value = true
}

function setMode(mode: ScoreRelationType) {
  scoreMode.value = mode
  rankingPage.value = 1
  scorePage.value = 1
}

function setCategory(categoryId: string | undefined) {
  filterCategoryId.value = categoryId
  scorePage.value = 1
}

function playerRoute(row: Record<string, unknown>): RouteLocationRaw {
  return { name: 'player-profile', params: { userId: row.userId as string } }
}

let rankingRequest = 0
let scoresRequest = 0

async function fetchRanking() {
  const request = ++rankingRequest
  await categoryStore.fetchCategories()
  const categoryId = categoryStore.getCategoryId('overall')
  if (!categoryId || request !== rankingRequest) return
  rankingLoading.value = true
  try {
    const next = await getLeaderboard(categoryId, {
      page: rankingPage.value - 1,
      size: RANKING_SIZE,
      sort: 'ranking,asc',
      relation: scoreMode.value,
      inactiveUsers: true,
    })
    if (request === rankingRequest) rankingPageData.value = next
  } catch {
    if (request === rankingRequest) rankingPageData.value = null
  } finally {
    if (request === rankingRequest) rankingLoading.value = false
  }
}

async function fetchScores() {
  const request = ++scoresRequest
  scoresLoading.value = true
  try {
    const next = await getRelationScores({
      type: scoreMode.value,
      includePrincipal: true,
      categoryId: filterCategoryId.value,
      page: scorePage.value - 1,
      size: SCORE_SIZE,
      sort: 'timeSet,desc',
    })
    if (request === scoresRequest) scorePageData.value = next
  } catch {
    if (request === scoresRequest) scorePageData.value = null
  } finally {
    if (request === scoresRequest) scoresLoading.value = false
  }
}

watch([scoreMode, rankingPage], fetchRanking, { immediate: true })
watch([scoreMode, scorePage, filterCategoryId], fetchScores, { immediate: true })
</script>

<template>
  <section class="followed-activity" :style="{ '--accent': accent }">
    <div class="followed-activity__panel">
      <div class="followed-activity__header">
        <h2 class="section-title">{{ scoreMode === 'follower' ? 'Followed Ranking' : 'Rival Ranking' }}</h2>
        <BaseTabs :tabs="scoreTabs" :model-value="scoreMode" class="followed-activity__feed-tabs"
          @update:model-value="setMode($event as ScoreRelationType)" />
      </div>

      <DataTable
        :class="{ 'followed-activity--refreshing': rankingLoading && rankingPageData }"
        :columns="rankingColumns"
        :rows="rankingRows"
        :loading="rankingLoading && !rankingPageData"
        :loading-rows="RANKING_SIZE"
        row-key="userId"
        row-clickable
        :row-to="playerRoute"
        :empty-message="scoreMode === 'follower' ? 'No followed players ranked' : 'No rivals ranked'"
      >
        <template #cell-rank="{ value }">
          <span class="followed-activity__rank" :class="getRankClass(value as number)">#{{ value }}</span>
        </template>

        <template #cell-player="{ row }">
          <UserChip :user="(row.player as UserRefDisplay)" size="sm" tooltip hide-clan />
        </template>

        <template #cell-ap="{ value }">
          <span class="followed-activity__ap">{{ (value as number).toFixed(2) }}</span>
        </template>

        <template #cell-avgAccuracy="{ value }">
          <template v-if="value != null">{{ formatAccuracy(value as number) }}</template>
          <template v-else>-</template>
        </template>

        <template #mobile-card="{ row }">
          <RouterLink :to="playerRoute(row)" class="followed-activity__player-card">
            <span class="followed-activity__rank" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
            <UserChip :user="(row.player as UserRefDisplay)" size="sm" hide-clan class="followed-activity__player" />
            <span class="followed-activity__ap">{{ (row.ap as number).toFixed(2) }}</span>
          </RouterLink>
        </template>
      </DataTable>

      <PaginationControls
        v-if="(rankingPageData?.totalPages ?? 0) > 1"
        :page="rankingPage"
        :total-pages="rankingPageData!.totalPages"
        :sibling-count="1"
        @update:page="rankingPage = $event"
      />
    </div>

    <div class="followed-activity__panel">
      <div class="followed-activity__header">
        <h2 class="section-title">Activity Feed</h2>
        <FilterPopover :open="filtersOpen" @update:open="filtersOpen = $event">
          <template #trigger>
            <FilterButton :active="filtersOpen || !!filterCategoryId" :has-indicator="!!filterCategoryId" />
          </template>
          <div class="feed-filters">
            <button class="feed-filters__chip" :class="{ 'feed-filters__chip--active': !filterCategoryId }"
              @click="setCategory(undefined)">All</button>
            <button
              v-for="cat in filterCategories"
              :key="cat.code"
              class="feed-filters__chip"
              :class="{ 'feed-filters__chip--active': filterCategoryId === categoryStore.getCategoryId(cat.code) }"
              :style="{ '--chip-accent': cat.accent }"
              @click="setCategory(categoryStore.getCategoryId(cat.code))"
            >{{ cat.name }}</button>
          </div>
        </FilterPopover>
      </div>

      <div v-if="scoresLoading && !scorePageData" class="followed-activity__feed">
        <SkeletonLoader v-for="i in SCORE_SIZE" :key="i" width="100%" height="71px" class="followed-activity__skeleton" />
      </div>

      <div v-else-if="scoreFeedEntries.length === 0" class="followed-activity__feed followed-activity__feed--empty">
        No followed scores found
      </div>

      <div v-else class="followed-activity__feed" :class="{ 'followed-activity--refreshing': scoresLoading }">
        <ScoreFeedCard
          v-for="entry in scoreFeedEntries"
          :key="entry.key"
          :entry="entry"
          :now="now"
          compact
          @select="onSelectScore"
        />
      </div>

      <PaginationControls
        v-if="(scorePageData?.totalPages ?? 0) > 1"
        :page="scorePage"
        :total-pages="scorePageData!.totalPages"
        :sibling-count="2"
        @update:page="scorePage = $event"
      />
    </div>

    <ScoreDetailModal :open="modalOpen" :score="modalScore" :user-id="modalUserId" @close="modalOpen = false" />
  </section>
</template>

<style scoped>
.followed-activity {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: var(--space-lg);
  align-items: start;
  width: 100%;
}

.followed-activity :deep(.data-table) {
  table-layout: fixed;
}

.followed-activity :deep(.data-table__th),
.followed-activity :deep(.data-table__td),
.followed-activity :deep(.data-table__cell-link) {
  padding-left: var(--space-sm);
  padding-right: var(--space-sm);
}

.followed-activity__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.followed-activity__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.followed-activity__feed-tabs {
  border-bottom: none;
}

.followed-activity__feed-tabs :deep(.base-tabs__tab) {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-caption);
}

.feed-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.feed-filters__chip {
  padding: 3px var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.feed-filters__chip:hover {
  background: var(--bg-base);
  color: var(--text-primary);
}

.feed-filters__chip--active {
  border-color: var(--chip-accent, var(--accent));
  color: var(--chip-accent, var(--accent));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 10%, transparent);
}

.followed-activity__rank {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.followed-activity__rank.rank--gold {
  color: var(--tier-gold);
}

.followed-activity__rank.rank--silver {
  color: var(--tier-silver);
}

.followed-activity__rank.rank--bronze {
  color: var(--tier-bronze);
}

.followed-activity__player {
  flex: 1;
}

.followed-activity__ap {
  color: var(--accent);
  font-weight: 600;
}

.followed-activity__player-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  min-height: 48px;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  color: inherit;
  text-decoration: none;
  transition: border-color 120ms ease;
}

.followed-activity__player-card:hover {
  border-color: var(--text-tertiary);
}

.followed-activity__feed {
  display: flex;
  flex-direction: column;
  min-height: 475px;
}

.followed-activity__skeleton {
  margin-top: var(--space-lg);
}

.followed-activity__feed--empty {
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.followed-activity--refreshing {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 120ms ease;
}

@media (max-width: 960px) {
  .followed-activity {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .followed-activity__header {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-xs);
  }
}
</style>
