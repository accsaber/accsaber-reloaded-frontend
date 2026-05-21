<script setup lang="ts">
import { getLeaderboard } from '@/api/leaderboards'
import { getRelationScores } from '@/api/relations'
import DataTable from '@/components/common/DataTable.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { LeaderboardResponse, ScoreResponse } from '@/types/api/users'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatRelativeDate, isRecentDate } from '@/utils/formatters'
import { formatDifficulty, toPlayerDisplay } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'

const FOLLOWED_RANKING_SIZE = 8
const FOLLOWED_SCORE_SIZE = 8

const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()
const router = useRouter()

const rankingLoading = ref(false)
const scoresLoading = ref(false)
const rankingPageData = ref<Page<LeaderboardResponse> | null>(null)
const scorePageData = ref<Page<ScoreResponse> | null>(null)
const scorePage = ref(1)

const accent = computed(() => categoryStore.getAccent('overall'))

const rankingColumns: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '70px' },
  { key: 'player', label: 'Player', align: 'left' },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '100px' },
  { key: 'avgAccuracy', label: 'Avg Acc', align: 'right', mono: true, width: '100px' },
]

const scoreColumns: TableColumn[] = [
  { key: 'player', label: 'Player', align: 'left', width: '150px' },
  { key: 'date', label: 'Date', align: 'right', width: '100px' },
  { key: 'map', label: 'Map', align: 'left' },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '90px' },
  { key: 'accuracy', label: 'Acc', align: 'right', mono: true, width: '90px' },
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

const scoreRows = computed<Record<string, unknown>[]>(() => {
  const page = scorePageData.value
  if (!page) return []
  return page.content.map((score) => ({
    id: score.id,
    userId: score.userId,
    userName: score.userName,
    avatarUrl: score.avatarUrl,
    country: score.country,
    mapId: score.mapId,
    mapDifficultyId: score.mapDifficultyId,
    mapName: score.songName ?? 'Unknown Map',
    songAuthor: score.songAuthor,
    mapAuthor: score.mapAuthor,
    coverUrl: score.coverUrl,
    difficulty: formatDifficulty(score.difficulty),
    categoryCode: categoryStore.getCategoryCode(score.categoryId) ?? 'overall',
    modifiers: modifierStore.resolveModifierCodes(score.modifierIds),
    ap: score.ap,
    accuracy: score.accuracy,
    score: score.score,
    date: score.timeSet,
  }))
})

const scoreTotalPages = computed(() => scorePageData.value?.totalPages ?? 0)

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

function buildScoreMapRoute(row: Record<string, unknown>): RouteLocationRaw {
  return {
    name: 'map-detail',
    params: { mapId: row.mapId as string },
    query: { difficultyId: row.mapDifficultyId as string },
  }
}

function openScore(row: Record<string, unknown>) {
  router.push(buildScoreMapRoute(row))
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
        <h2 class="followed-activity__title">Ranking of Followed</h2>
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
        <h2 class="followed-activity__title">Scores of Followed</h2>
      </div>

      <DataTable
        :columns="scoreColumns"
        :rows="scoreRows"
        :loading="scoresLoading"
        :loading-rows="FOLLOWED_SCORE_SIZE"
        row-key="id"
        row-clickable
        empty-message="No followed scores found"
        @row-click="openScore"
      >
        <template #cell-player="{ row }">
          <RouterLink
            class="followed-activity__player followed-activity__player--link"
            :to="buildPlayerProfileRoute(row.userId as string)"
            @click.stop
          >
            <GlowImage :src="(row.avatarUrl as string)" :alt="(row.userName as string)" :size="24" />
            <span class="followed-activity__player-name">{{ row.userName }}</span>
          </RouterLink>
        </template>

        <template #cell-map="{ row }">
          <div class="followed-activity__map">
            <GlowImage :src="(row.coverUrl as string)" :alt="(row.mapName as string)" :size="32" />
            <div class="followed-activity__map-text">
              <span class="followed-activity__map-name">{{ row.mapName }}</span>
              <span class="followed-activity__map-meta">
                {{ row.difficulty }} - {{ row.songAuthor }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-ap="{ value }">
          <span class="followed-activity__ap">{{ (value as number).toFixed(2) }}</span>
        </template>

        <template #cell-accuracy="{ value }">
          {{ ((value as number) * 100).toFixed(2) }}%
        </template>

        <template #cell-date="{ value }">
          <span
            class="followed-activity__date"
            :class="{ 'followed-activity__date--recent': isRecentDate(value as string) }"
          >
            {{ formatRelativeDate(value as string) }}
          </span>
        </template>

        <template #mobile-card="{ row }">
          <button class="followed-activity__score-card" type="button" @click="openScore(row)">
            <div class="followed-activity__score-card-top">
              <RouterLink
                class="followed-activity__player followed-activity__player--link"
                :to="buildPlayerProfileRoute(row.userId as string)"
                @click.stop
              >
                <GlowImage :src="(row.avatarUrl as string)" :alt="(row.userName as string)" :size="22" />
                <span class="followed-activity__player-name">{{ row.userName }}</span>
              </RouterLink>
              <span class="followed-activity__date">{{ formatRelativeDate(row.date as string) }}</span>
            </div>
            <div class="followed-activity__map">
              <GlowImage :src="(row.coverUrl as string)" :alt="(row.mapName as string)" :size="36" />
              <div class="followed-activity__map-text">
                <span class="followed-activity__map-name">{{ row.mapName }}</span>
                <span class="followed-activity__map-meta">
                  {{ ((row.accuracy as number) * 100).toFixed(2) }}% -
                  {{ (row.ap as number).toFixed(2) }} AP
                </span>
              </div>
            </div>
          </button>
        </template>
      </DataTable>

      <PaginationControls
        v-if="scoreTotalPages > 1"
        :page="scorePage"
        :total-pages="scoreTotalPages"
        @update:page="scorePage = $event"
      />
    </div>
  </section>
</template>

<style scoped>
.followed-activity {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: var(--space-lg);
  width: 100%;
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

.followed-activity__player,
.followed-activity__map {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.followed-activity__player--link {
  color: inherit;
  text-decoration: none;
}

.followed-activity__player--link:hover .followed-activity__player-name {
  color: var(--accent);
}

.followed-activity__player-name,
.followed-activity__map-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.followed-activity__map-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.followed-activity__map-meta {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.followed-activity__ap {
  color: var(--accent);
  font-weight: 600;
}

.followed-activity__date {
  color: var(--text-secondary);
  font-size: var(--text-caption);
  white-space: nowrap;
}

.followed-activity__date--recent {
  color: var(--text-primary);
}

.followed-activity__player-card,
.followed-activity__score-card {
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

.followed-activity__player-card:hover,
.followed-activity__score-card:hover {
  border-left-color: var(--accent);
}

.followed-activity__score-card {
  flex-direction: column;
  align-items: stretch;
  cursor: pointer;
  font: inherit;
}

.followed-activity__score-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
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
