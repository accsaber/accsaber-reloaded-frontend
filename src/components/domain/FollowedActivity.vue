<script setup lang="ts">
import { getLeaderboard } from '@/api/leaderboards'
import { getRelationScores } from '@/api/relations'
import DataTable from '@/components/common/DataTable.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import ScoreFeedCard from '@/components/domain/ScoreFeedCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { LeaderboardResponse, ScoreResponse } from '@/types/api/users'
import type { ScoreDisplay, ScoreFeedEntry, TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatDifficulty, toPlayerDisplay } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const FOLLOWED_RANKING_SIZE = 8
const FOLLOWED_SCORE_SIZE = 5

const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const rankingLoading = ref(false)
const scoresLoading = ref(false)
const rankingPageData = ref<Page<LeaderboardResponse> | null>(null)
const scorePageData = ref<Page<ScoreResponse> | null>(null)
const scorePage = ref(1)

const tick = ref(0)
let tickInterval: ReturnType<typeof setInterval>
onMounted(() => { tickInterval = setInterval(() => tick.value++, 60_000) })
onUnmounted(() => clearInterval(tickInterval))

const modalOpen = ref(false)
const modalScore = ref<ScoreDisplay | null>(null)
const modalUserId = ref('')

const accent = computed(() => categoryStore.getAccent('overall'))

const rankingColumns: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '60px' },
  { key: 'player', label: 'Player', align: 'left' },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '92px' },
  { key: 'avgAccuracy', label: 'Avg Acc', align: 'right', mono: true, width: '84px' },
]

const rankingRows = computed<Record<string, unknown>[]>(() => {
  const page = rankingPageData.value
  if (!page) return []
  return page.content.map((entry) => {
    const player = toPlayerDisplay(entry)
    return {
      userId: player.userId,
      rank: player.rank,
      name: player.name,
      country: player.country,
      avatarUrl: player.avatarUrl,
      ap: player.ap,
      avgAccuracy: player.avgAccuracy,
      playerInactive: player.playerInactive,
    }
  })
})

const scoreFeedEntries = computed<ScoreFeedEntry[]>(() => {
  const page = scorePageData.value
  if (!page) return []
  return page.content.map((score) => ({
    key: score.id,
    userId: score.userId,
    userName: score.userName,
    avatarUrl: score.avatarUrl ?? '',
    country: score.country ?? '',
    mapId: score.mapId,
    mapDifficultyId: score.mapDifficultyId,
    beatsaverCode: score.beatsaverCode,
    characteristic: score.characteristic,
    rawDifficulty: score.difficulty,
    mapName: score.songName ?? 'Unknown Map',
    artistName: score.songAuthor ?? '',
    mapAuthor: score.mapAuthor ?? '',
    coverUrl: score.coverUrl ?? '',
    difficulty: formatDifficulty(score.difficulty),
    categoryCode: categoryStore.getCategoryCode(score.categoryId) ?? 'overall',
    rank: score.rank,
    score: score.score,
    accuracy: score.accuracy,
    ap: score.ap,
    weightedAp: score.weightedAp,
    modifiers: modifierStore.resolveModifierCodes(score.modifierIds),
    misses: score.misses,
    badCuts: score.badCuts,
    wallHits: score.wallHits,
    bombHits: score.bombHits,
    streak115: score.streak115,
    timeSet: score.timeSet,
    blScoreId: score.blScoreId ?? undefined,
  }))
})

const scoreTotalPages = computed(() => scorePageData.value?.totalPages ?? 0)

function toScoreDisplay(entry: ScoreFeedEntry): ScoreDisplay {
  return {
    scoreId: entry.key,
    mapId: entry.mapId,
    mapDifficultyId: entry.mapDifficultyId,
    beatsaverCode: entry.beatsaverCode,
    characteristic: entry.characteristic,
    rawDifficulty: entry.rawDifficulty,
    mapName: entry.mapName,
    artistName: entry.artistName,
    difficulty: entry.difficulty,
    categoryCode: entry.categoryCode,
    coverUrl: entry.coverUrl,
    leaderboardRank: entry.rank,
    score: entry.score,
    accuracy: entry.accuracy,
    ap: entry.ap,
    weightedAp: entry.weightedAp,
    modifiers: entry.modifiers,
    date: entry.timeSet,
    misses: entry.misses,
    badCuts: entry.badCuts,
    wallHits: entry.wallHits,
    bombHits: entry.bombHits,
    streak115: entry.streak115,
    blScoreId: entry.blScoreId,
    userName: entry.userName,
    mapAuthor: entry.mapAuthor,
  }
}

function onSelectScore(entry: ScoreFeedEntry) {
  modalScore.value = toScoreDisplay(entry)
  modalUserId.value = entry.userId
  modalOpen.value = true
}

function resetData() {
  rankingPageData.value = null
  scorePageData.value = null
}

async function ensureCategories() {
  if (!categoryStore.loaded) await categoryStore.fetchCategories()
}

async function fetchRanking() {
  if (!authStore.isLoggedIn) {
    rankingPageData.value = null
    return
  }

  await ensureCategories()
  const categoryId = categoryStore.getCategoryId('overall')
  if (!categoryId) {
    rankingPageData.value = null
    return
  }

  rankingLoading.value = true
  try {
    rankingPageData.value = await getLeaderboard(categoryId, {
      page: 0,
      size: FOLLOWED_RANKING_SIZE,
      sort: 'ranking,asc',
      relation: 'follower',
      inactiveUsers: true,
    })
  } catch {
    rankingPageData.value = null
  } finally {
    rankingLoading.value = false
  }
}

async function fetchScores() {
  if (!authStore.isLoggedIn) {
    scorePageData.value = null
    return
  }

  scoresLoading.value = true
  try {
    scorePageData.value = await getRelationScores({
      type: 'follower',
      includePrincipal: true,
      page: scorePage.value - 1,
      size: FOLLOWED_SCORE_SIZE,
      sort: 'timeSet,desc',
    })
  } catch {
    scorePageData.value = null
  } finally {
    scoresLoading.value = false
  }
}

async function fetchActivity() {
  if (!authStore.isLoggedIn) {
    resetData()
    return
  }
  await Promise.all([fetchRanking(), fetchScores()])
}

function buildPlayerProfileRoute(userId: string): RouteLocationRaw {
  return { name: 'player-profile', params: { userId } }
}

function buildRankingPlayerRoute(row: Record<string, unknown>): RouteLocationRaw {
  return buildPlayerProfileRoute(row.userId as string)
}

watch(
  () => authStore.isLoggedIn,
  () => {
    scorePage.value = 1
    void fetchActivity()
  },
  { immediate: true },
)

watch(
  () => categoryStore.loaded,
  (loaded) => {
    if (loaded && authStore.isLoggedIn) void fetchRanking()
  },
)

watch(scorePage, () => {
  if (authStore.isLoggedIn) void fetchScores()
})
</script>

<template>
  <section v-if="authStore.isLoggedIn" class="followed-activity" :style="{ '--accent': accent }">
    <div class="followed-activity__panel">
      <div class="followed-activity__header">
        <h2 class="followed-activity__title">Followed Ranking</h2>
      </div>

      <DataTable
        :columns="rankingColumns"
        :rows="rankingRows"
        :loading="rankingLoading"
        :loading-rows="FOLLOWED_RANKING_SIZE"
        row-key="userId"
        row-clickable
        :row-to="buildRankingPlayerRoute"
        empty-message="No followed players ranked"
      >
        <template #cell-rank="{ value }">
          <span class="followed-activity__rank" :class="getRankClass(value as number)">#{{ value }}</span>
        </template>

        <template #cell-player="{ row }">
          <div class="followed-activity__player">
            <GlowImage :src="(row.avatarUrl as string)" :alt="(row.name as string)" :size="28" />
            <span class="followed-activity__player-name">{{ row.name }}</span>
            <CountryFlag :country="(row.country as string)" />
          </div>
        </template>

        <template #cell-ap="{ value }">
          <span class="followed-activity__ap">{{ (value as number).toFixed(2) }}</span>
        </template>

        <template #cell-avgAccuracy="{ value }">
          <template v-if="value != null">{{ ((value as number) * 100).toFixed(2) }}%</template>
          <template v-else>-</template>
        </template>

        <template #mobile-card="{ row }">
          <RouterLink :to="buildRankingPlayerRoute(row)" class="followed-activity__player-card">
            <span class="followed-activity__rank" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
            <GlowImage :src="(row.avatarUrl as string)" :alt="(row.name as string)" :size="28" />
            <span class="followed-activity__player-name">{{ row.name }}</span>
            <CountryFlag :country="(row.country as string)" />
            <span class="followed-activity__ap">{{ (row.ap as number).toFixed(2) }}</span>
          </RouterLink>
        </template>
      </DataTable>
    </div>

    <div class="followed-activity__panel followed-activity__panel--scores">
      <div class="followed-activity__header">
        <h2 class="followed-activity__title">Activity Feed</h2>
      </div>

      <div v-if="scoresLoading" class="followed-activity__feed-loading">
        <div v-for="i in FOLLOWED_SCORE_SIZE" :key="i" class="followed-activity__feed-skeleton" />
      </div>

      <div v-else-if="scoreFeedEntries.length === 0" class="followed-activity__feed-empty">
        No followed scores found
      </div>

      <div v-else class="followed-activity__feed">
        <ScoreFeedCard
          v-for="entry in scoreFeedEntries"
          :key="entry.key"
          :entry="entry"
          :tick="tick"
          @select="onSelectScore"
        />
      </div>

      <PaginationControls
        v-if="scoreTotalPages > 1"
        :page="scorePage"
        :total-pages="scoreTotalPages"
        :sibling-count="2"
        @update:page="scorePage = $event"
      />
    </div>

    <ScoreDetailModal
      :open="modalOpen"
      :score="modalScore"
      :user-id="modalUserId"
      @close="modalOpen = false"
    />
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
.followed-activity :deep(.data-table__td) {
  padding-left: var(--space-sm);
  padding-right: var(--space-sm);
}

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
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
}

.followed-activity__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
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
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.followed-activity__player-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  border-left: 2px solid transparent;
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  color: inherit;
  text-align: left;
  text-decoration: none;
  transition: border-color 120ms ease;
}

.followed-activity__player-card:hover {
  border-left-color: var(--accent);
}

.followed-activity__feed {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.followed-activity__feed :deep(.feed-card) {
  margin-top: 31px;
}

.followed-activity__feed :deep(.feed-card:first-child) {
  margin-top: 29px;
}

.followed-activity__feed :deep(.feed-card__body) {
  padding: var(--space-xs) var(--space-sm);
  column-gap: var(--space-xl);
  row-gap: 0;
  grid-template-columns: 40px 36px 1fr auto;
}

.followed-activity__feed :deep(.feed-card__stats-mid) {
  display: none;
}

.followed-activity__feed :deep(.feed-card__stats-bottom) {
  gap: var(--space-xs);
}

.followed-activity__feed-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-top: var(--space-lg);
}

.followed-activity__feed-skeleton {
  height: 52px;
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.followed-activity__feed-empty {
  padding: var(--space-3xl) var(--space-md);
  text-align: center;
  color: var(--text-secondary);
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
