<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import RelationFilter from '@/components/domain/RelationFilter.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import ScoreRowActions from '@/components/domain/ScoreRowActions.vue'
import ScoreTable from '@/components/domain/ScoreTable.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useAppearance } from '@/composables/useAppearance'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useAuthStore } from '@/stores/auth'
import { useModifierStore } from '@/stores/modifiers'
import type { UserRelationType } from '@/types/api/relations'
import type { CategoryCode, DifficultyScoreDisplay, ScoreDisplay, UserRefDisplay } from '@/types/display'
import { countryOptionsFor } from '@/utils/countries'
import { formatAccuracy, formatPlayCount, formatRelativeDate } from '@/utils/formatters'
import { toDifficultyScoreDisplay } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { resolveReplay, type ResolvedReplay } from '@/utils/replay'
import { useMapScoreColumns } from '@/views/maps/useMapScoreColumns'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  difficultyId: string
  mapId?: string
  mapName?: string
  mapSubName?: string | null
  artistName?: string
  coverUrl?: string
  coverFallbackUrl?: string | null
  categoryCode?: CategoryCode
  difficulty?: string
  complexity?: number | null
  mapAuthor?: string
}>()

const emit = defineEmits<{
  'top-scores-loaded': [scores: DifficultyScoreDisplay[]]
}>()

const authStore = useAuthStore()
const modifierStore = useModifierStore()

const {
  primaryReplayService,
  fallbackReplayService,
  isScoreFieldVisible,
} = useAppearance()

function rowReplay(row: Record<string, unknown>): ResolvedReplay | null {
  return (row.replay as ResolvedReplay | null) ?? null
}

function streakSummary(row: Record<string, unknown>): string | null {
  const parts: string[] = []
  if (isScoreFieldVisible('streak_115')) {
    const streak = row.streak115 as number | null
    parts.push(streak ? `${streak} 115s` : '–')
  }
  if (isScoreFieldVisible('max_streak_115')) {
    const max = row.maxStreak115 as number | null
    parts.push(max ? `max ${max}` : '–')
  }
  return parts.length ? parts.join(' · ') : null
}

const { currentPage, sortState, paginationParams, setPage, setSort, resetPage } = usePageableRoute({
  defaultSort: 'ap',
  defaultOrder: 'desc',
  defaultSize: 50,
  sortFieldMap: {
    weighted: 'weightedAp',
    date: 'timeSet',
  },
  initialOrder: { lastPlayedAt: 'asc' },
})

const searchQuery = ref('')
const countryFilter = ref('')
const relationFilter = ref<UserRelationType | ''>('')

const scores = ref<DifficultyScoreDisplay[]>([])
const totalPages = ref(0)
const loading = ref(true)
const refreshing = ref(false)

const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref('')

const filtering = computed(() => !!countryFilter.value || !!relationFilter.value)

const columns = useMapScoreColumns(() => filtering.value)

const rows = computed(() => {
  const pageOffset = (paginationParams.value.page ?? 0) * (paginationParams.value.size ?? 50)
  return scores.value.map((s, i) => {
    const positional = pageOffset + i + 1
    return {
      _userId: s.userId,
      rank: filtering.value ? positional : s.rank,
      parenRank: filtering.value ? s.rank : null,
      player: s.player,
      accuracy: s.accuracy,
      score: s.score,
      ap: s.ap,
      weighted: s.weightedAp,
      streak115: s.streak115,
      maxStreak115: s.maxStreak115,
      pauses: s.pauses,
      playCount: s.playCount,
      lastPlayedAt: s.lastPlayedAt,
      date: s.date,
      replay: resolveReplay(
        { blScoreId: s.blScoreId, ssScoreId: s.ssScoreId },
        primaryReplayService.value,
        fallbackReplayService.value,
      ),
    }
  })
})

const countryOptions = computed(() => countryOptionsFor(authStore.userProfile?.country))

function scoreRowClass(row: Record<string, unknown>): Record<string, boolean> | undefined {
  if (!authStore.userId) return undefined
  return { 'data-table__row--self-highlight': row._userId === authStore.userId }
}

function playerRowTo(row: Record<string, unknown>) {
  return { name: 'player-profile', params: { userId: row._userId as string } }
}

function openDetail(userId: string) {
  const s = scores.value.find((sc) => sc.userId === userId)
  if (!s) return
  detailUserId.value = s.userId
  detailScore.value = {
    scoreId: s.id,
    mapId: props.mapId,
    mapDifficultyId: props.difficultyId,
    mapName: props.mapName ?? 'Unknown Map',
    mapSubName: props.mapSubName ?? null,
    artistName: props.artistName,
    difficulty: props.difficulty ?? '',
    categoryCode: props.categoryCode ?? 'overall',
    coverUrl: props.coverUrl,
    coverFallbackUrl: props.coverFallbackUrl,
    leaderboardRank: s.rank,
    score: s.score,
    scoreNoMods: s.scoreNoMods,
    accuracy: s.accuracy,
    ap: s.ap,
    weightedAp: s.weightedAp,
    complexity: props.complexity ?? null,
    modifiers: s.modifiers,
    date: s.date,
    misses: s.misses,
    badCuts: s.badCuts,
    maxCombo: s.maxCombo,
    wallHits: s.wallHits,
    bombHits: s.bombHits,
    pauses: s.pauses,
    streak115: s.streak115,
    playCount: s.playCount,
    hmd: s.hmd,
    xpGained: s.xpGained,
    rankWhenSet: s.rankWhenSet,
    blScoreId: s.blScoreId,
    ssScoreId: s.ssScoreId,
    mapAuthor: props.mapAuthor,
    userName: s.player.name,
  }
  detailOpen.value = true
}

const scoresRequest = computed(() => ({
  difficultyId: props.difficultyId,
  params: {
    ...paginationParams.value,
    search: searchQuery.value.trim() || undefined,
    country: countryFilter.value || undefined,
    relation: relationFilter.value || undefined,
  },
}))

let requestId = 0
let awaitingPageReset = false

async function fetchScores() {
  const { difficultyId, params } = scoresRequest.value
  const id = ++requestId
  loading.value = !scores.value.length
  refreshing.value = !loading.value
  try {
    const { getDifficultyScores } = await import('@/api/maps')
    const res = await getDifficultyScores(difficultyId, params)
    if (id !== requestId) return
    scores.value = res.content.map((s) =>
      toDifficultyScoreDisplay(s, modifierStore.resolveModifierCodes(s.modifierIds))
    )
    totalPages.value = res.totalPages

    const isCanonicalView =
      currentPage.value === 1 &&
      sortState.value.key === 'ap' &&
      sortState.value.direction === 'desc' &&
      !searchQuery.value.trim() &&
      !countryFilter.value &&
      !relationFilter.value
    if (isCanonicalView) {
      emit('top-scores-loaded', scores.value)
    }
  } catch {
    if (id !== requestId) return
    scores.value = []
    totalPages.value = 0
  }
  loading.value = false
  refreshing.value = false
}

watch([searchQuery, countryFilter, relationFilter], () => {
  if (currentPage.value === 1) return
  awaitingPageReset = true
  resetPage()
})

watch(() => JSON.stringify(scoresRequest.value), () => {
  if (awaitingPageReset && currentPage.value !== 1) return
  awaitingPageReset = false
  void fetchScores()
}, { immediate: true })
</script>

<template>
  <div class="map-scores">
    <div class="map-scores__controls">
      <BaseSelect :model-value="countryFilter" :options="countryOptions" placeholder="All Countries" searchable
        @update:model-value="countryFilter = $event" />
      <RelationFilter v-model="relationFilter" />
      <SearchBox v-model="searchQuery" placeholder="Search players..." />
    </div>

    <ScoreTable :columns="columns" :rows="rows" :sort-state="sortState" :loading="loading" :refreshing="refreshing"
      :loading-rows="10"
      :page="currentPage" :total-pages="totalPages" medal-ranks row-clickable :row-to="playerRowTo"
      row-key="_userId" :row-class="scoreRowClass" empty-message="No scores recorded yet." @sort="setSort"
      @update:page="setPage">
      <template #cell-rank="{ value, row }">
        <span class="rank" :class="getRankClass(value as number)">
          #{{ value }}
          <span v-if="row.parenRank" class="map-scores__rank-global">(#{{ row.parenRank }})</span>
        </span>
      </template>

      <template #cell-player="{ row }">
        <UserChip :user="(row.player as UserRefDisplay)" tooltip />
      </template>

      <template #cell-streak115="{ value }">
        <span v-if="value != null && value !== 0">{{ value }}</span>
        <span v-else class="map-scores__muted">&ndash;</span>
      </template>

      <template #cell-maxStreak115="{ value }">
        <span v-if="value != null && value !== 0">{{ value }}</span>
        <span v-else class="map-scores__muted">&ndash;</span>
      </template>

      <template #cell-pauses="{ value }">
        <span v-if="value != null">{{ value }}</span>
      </template>

      <template #cell-playCount="{ value }">
        <span>{{ formatPlayCount(value) }}</span>
      </template>

      <template #cell-detail="{ row }">
        <ScoreRowActions :replay="rowReplay(row)" @detail="openDetail(row._userId as string)" />
      </template>

      <template #mobile-card="{ row }">
        <router-link :to="playerRowTo(row)" class="ms-card"
          :class="{ 'ms-card--self-highlight': !!authStore.userId && row._userId === authStore.userId }">
          <div class="ms-card__grid">
            <span class="ms-card__name-cell">
              <span class="rank ms-card__rank" :class="getRankClass(row.rank as number)">
                #{{ row.rank }}<span v-if="row.parenRank" class="map-scores__rank-global">(#{{ row.parenRank }})</span>
              </span>
              <UserChip :user="(row.player as UserRefDisplay)" size="sm" />
            </span>
            <span v-if="isScoreFieldVisible('accuracy')" class="ms-card__acc">
              {{ formatAccuracy(row.accuracy as number) }}
            </span>

            <span v-if="isScoreFieldVisible('date')" class="ms-card__date">
              {{ formatRelativeDate(row.date as string) }}
            </span>
            <span v-if="isScoreFieldVisible('ap')" class="ms-card__ap">{{ (row.ap as number).toFixed(2) }}</span>

            <span v-if="streakSummary(row)" class="ms-card__streak-cell">{{ streakSummary(row) }}</span>
            <span v-if="isScoreFieldVisible('weighted_ap')" class="ms-card__weighted">
              / {{ (row.weighted as number).toFixed(2) }}
            </span>
          </div>
          <ScoreRowActions :replay="rowReplay(row)" stacked @detail="openDetail(row._userId as string)" />
        </router-link>
      </template>
    </ScoreTable>

    <ScoreDetailModal :open="detailOpen" :score="detailScore" :user-id="detailUserId" @close="detailOpen = false" />
  </div>
</template>

<style scoped>
.map-scores {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.map-scores__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.map-scores__controls :deep(.base-select__trigger),
.map-scores__controls :deep(.search-box),
.map-scores__controls :deep(.filter-button) {
  height: var(--control-h);
}

.map-scores__rank-global {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-weight: 400;
  margin-left: 2px;
}

.map-scores__muted {
  color: var(--text-secondary);
}

.map-scores :deep(.data-table__row.data-table__row--self-highlight) {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
}

.ms-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  cursor: pointer;
  min-height: 48px;
  text-decoration: none;
  color: inherit;
}

.ms-card__rank {
  flex-shrink: 0;
}

.ms-card__grid {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--space-sm);
  row-gap: 2px;
  align-items: center;
}

.ms-card__name-cell,
.ms-card__streak-cell {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ms-card__streak-cell {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.ms-card__date {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ms-card__acc {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  justify-self: end;
  white-space: nowrap;
}

.ms-card__ap {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-weight: 500;
  justify-self: end;
  white-space: nowrap;
}

.ms-card__weighted {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  justify-self: end;
  white-space: nowrap;
}

.ms-card--self-highlight {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
}
</style>
