<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import ApTweaker from '@/components/domain/ApTweaker.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import ScoreDetailModal, { type ScoreDetailPlayer } from '@/components/domain/ScoreDetailModal.vue'
import ScoreTable from '@/components/domain/ScoreTable.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { useAppearance } from '@/composables/useAppearance'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { ScoreRowField } from '@/types/api/settings'
import type { ScoreResponse, UserScoresParams } from '@/types/api/users'
import type { CategoryCode, ScoreDisplay, TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatAccuracy, formatPlayCount, formatRelativeDate } from '@/utils/formatters'
import { toScoreDisplay } from '@/utils/mappers'
import { buildMapRoute } from '@/utils/mapRoute'
import { getRankClass } from '@/utils/ranking'
import { resolveReplay, type ResolvedReplay } from '@/utils/replay'
import { buildScoreColumns } from '@/utils/scoreRowFields'
import { tableNaturalWidth } from '@/utils/tableLayout'
import ScoreRowActions from '@/views/profile/ScoreRowActions.vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{
  userId: string
  category: CategoryCode
  search?: string
  isSelfProfile?: boolean
  pinnedScoreIds?: Set<string>
  canPinMore?: boolean
  pinPending?: Set<string>
  player?: ScoreDetailPlayer | null
}>(), {
  search: '',
  isSelfProfile: false,
  canPinMore: true,
})

const emit = defineEmits<{
  'pin-toggle': [scoreId: string]
  'params-change': [params: UserScoresParams | null]
  'width-change': [width: number]
}>()

const router = useRouter()
const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const {
  primaryReplayService,
  fallbackReplayService,
  scoreRowFields,
  isScoreFieldVisible,
} = useAppearance()

function rowReplay(row: Record<string, unknown>): ResolvedReplay | null {
  return (row.replay as ResolvedReplay | null) ?? null
}

function streakSummary(row: Record<string, unknown>): string | null {
  const parts: string[] = []
  if (isScoreFieldVisible('streak_115')) {
    const streak = row.streak115 as number | null
    parts.push(streak != null ? `${streak} 115s` : '–')
  }
  if (isScoreFieldVisible('max_streak_115')) {
    const max = row.maxStreak115 as number | null
    parts.push(max != null ? `max ${max}` : '–')
  }
  return parts.length ? parts.join(' · ') : null
}

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: 'weighted',
  defaultOrder: 'desc',
  defaultSize: 20,
  sortFieldMap: { leaderboardRank: 'rank', weighted: 'weightedAp', date: 'timeSet' },
  initialOrder: { lastPlayedAt: 'asc' },
})

const loading = ref(false)
const scoreData = ref<Page<ScoreResponse> | null>(null)

const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)

const tweakerOpenId = ref<string | null>(null)
const tweakerAnchor = ref<HTMLElement | null>(null)

function getScoreCurveId(categoryCode: string): string | undefined {
  return categoryStore.byCode.get(categoryCode)?.scoreCurve?.id
}

function toggleTweaker(diffId: string, event: Event) {
  const open = tweakerOpenId.value !== diffId
  tweakerOpenId.value = open ? diffId : null
  tweakerAnchor.value = open ? event.currentTarget as HTMLElement : null
}

function closeTweaker(open: boolean) {
  if (open) return
  tweakerOpenId.value = null
  tweakerAnchor.value = null
}

const tweakerScore = computed(() => {
  const score = scores.value.find((s) => s.mapDifficultyId === tweakerOpenId.value)
  const curveId = score && getScoreCurveId(score.categoryCode)
  if (!score || !curveId) return null
  const siblingAps = scores.value
    .filter((s) => s.categoryCode === score.categoryCode)
    .map((s) => s.ap)
  return { score, curveId, siblingAps }
})

const scores = computed<ScoreDisplay[]>(() => {
  if (!scoreData.value) return []
  return scoreData.value.content.map((s) => {
    const categoryCode = categoryStore.getCategoryCode(s.categoryId)
    return toScoreDisplay(
      s,
      modifierStore.resolveModifierCodes(s.modifierIds),
      categoryCode,
    )
  })
})

const rows = computed(() =>
  scores.value.map((s) => ({
    ...s,
    beatsaverCode: s.beatsaverCode ?? null,
    category: (categoryStore.getCategoryInfo(s.categoryCode)?.name ?? s.categoryCode).replace(/ Acc$/, ''),
    weighted: s.weightedAp,
    lastPlayedAt: s.lastPlayedAt ?? null,
    replay: resolveReplay(
      { blScoreId: s.blScoreId, ssScoreId: s.ssScoreId },
      primaryReplayService.value,
      fallbackReplayService.value,
    ),
  })),
)

function isPinned(scoreId: string): boolean {
  return props.pinnedScoreIds?.has(scoreId) ?? false
}

function rowActions(row: Record<string, unknown>) {
  const scoreId = row.scoreId as string
  const pinned = isPinned(scoreId)
  return {
    showPin: props.isSelfProfile,
    pinned,
    pinDisabled: !pinned && !props.canPinMore,
    pinPending: props.pinPending?.has(scoreId) ?? false,
    replay: rowReplay(row),
  }
}

const totalPages = computed(() => scoreData.value?.totalPages ?? 0)

const showStreak115 = computed(() =>
  sortState.value.key === 'streak115' || scores.value.some((s) => s.streak115 != null),
)

const LEADING_COLUMNS: TableColumn[] = [
  { key: 'leaderboardRank', label: '#', sortable: true, align: 'right', mono: true, width: '80px' },
  { key: 'cover', label: '', width: '56px' },
  { key: 'mapName', label: 'Map', align: 'left', width: '240px', flex: true },
]

const trailingColumns = computed<TableColumn[]>(() => [
  { key: 'actions', label: '', align: 'center', width: props.isSelfProfile ? '112px' : '84px', noLink: true },
])

const FIELD_COLUMNS: Record<ScoreRowField, TableColumn> = {
  difficulty: { key: 'difficulty', label: 'Diff', align: 'center', width: '76px' },
  accuracy: { key: 'accuracy', label: 'Acc', sortable: true, align: 'right', mono: true, width: '76px' },
  ap: { key: 'ap', label: 'AP', sortable: true, align: 'right', mono: true, width: '100px' },
  weighted_ap: { key: 'weighted', label: 'Weighted', sortable: true, align: 'right', mono: true, width: '100px' },
  complexity: { key: 'complexity', label: 'COMP', sortable: true, align: 'center', mono: true, width: '76px' },
  category: { key: 'category', label: 'Category', align: 'center', width: '92px' },
  streak_115: { key: 'streak115', label: '115s', sortable: true, align: 'right', mono: true, width: '64px' },
  max_streak_115: { key: 'maxStreak115', label: 'Max', sortable: true, align: 'right', mono: true, width: '64px' },
  pauses: { key: 'pauses', label: 'Pauses', sortable: true, align: 'right', mono: true, width: '84px' },
  play_count: { key: 'playCount', label: 'Plays', sortable: true, align: 'right', mono: true, width: '76px' },
  last_played_at: { key: 'lastPlayedAt', label: 'Played', sortable: true, align: 'right', width: '84px' },
  date: { key: 'date', label: 'Date', sortable: true, align: 'right', width: '84px' },
}

const columns = computed(() =>
  buildScoreColumns(scoreRowFields.value, {
    leading: LEADING_COLUMNS,
    trailing: trailingColumns.value,
    fields: {
      ...FIELD_COLUMNS,
      streak_115: showStreak115.value ? FIELD_COLUMNS.streak_115 : null,
    },
  }),
)

watch(
  columns,
  (cols) => emit('width-change', tableNaturalWidth(cols)),
  { immediate: true },
)

const scoreParams = computed<UserScoresParams>(() => ({
  ...paginationParams.value,
  categoryId: props.category !== 'overall'
    ? categoryStore.getCategoryId(props.category)
    : undefined,
  search: props.search.trim() || undefined,
}))

let requestId = 0

async function fetchScores() {
  const id = ++requestId
  loading.value = true
  try {
    const { getUserScores } = await import('@/api/users')
    const page = await getUserScores(props.userId, scoreParams.value)
    if (id === requestId) scoreData.value = page
  } catch {
    if (id === requestId) scoreData.value = null
  }
  if (id === requestId) loading.value = false
}

function scoreRowTo(row: Record<string, unknown>) {
  if (typeof row.mapId !== 'string') return undefined
  return buildMapRoute({
    beatsaverCode: typeof row.beatsaverCode === 'string' ? row.beatsaverCode : null,
    mapId: row.mapId,
    difficulty: typeof row.rawDifficulty === 'string' ? row.rawDifficulty : null,
    difficultyId: typeof row.mapDifficultyId === 'string' ? row.mapDifficultyId : null,
    characteristic: typeof row.characteristic === 'string' ? row.characteristic : null,
  })
}

function handleRowClick(row: Record<string, unknown>) {
  const to = scoreRowTo(row)
  if (to) router.push(to)
}

function openDetail(diffId: string) {
  detailScore.value = scores.value.find((s) => s.mapDifficultyId === diffId) ?? null
  detailOpen.value = true
}

watch(
  () => (scores.value.length ? scoreParams.value : null),
  (params) => { emit('params-change', params) },
  { immediate: true },
)

watch(
  () => JSON.stringify([props.userId, scoreParams.value]),
  () => { void fetchScores() },
  { immediate: true },
)
</script>

<template>
  <div class="scores-tab">
    <ScoreTable :columns="columns" :rows="rows" :sort-state="sortState" :loading="loading" :loading-rows="8"
      :page="currentPage" :total-pages="totalPages" row-clickable :row-to="scoreRowTo" row-key="mapDifficultyId"
      medal-ranks
      :empty-message="props.search ? `No maps matching &quot;${props.search}&quot;` : 'No scores found'" @sort="setSort"
      @row-click="handleRowClick" @update:page="setPage">
      <template #cell-cover="{ row }">
        <CoverImage v-if="row.coverUrl" :src="(row.coverUrl as string)" :alt="(row.mapName as string)"
          :fallback-src="(row.coverFallbackUrl as string | null | undefined) ?? null" />
      </template>

      <template #cell-mapName="{ row }">
        <SongTitle class="scores-tab__map-name" :name="(row.mapName as string)"
          :sub-name="(row.mapSubName as string | null)" :title="(row.mapName as string)" />
      </template>

      <template #cell-ap="{ row }">
        <span class="scores-tab__ap-cell" @click.stop.prevent>
          <span class="scores-tab__ap-value">{{ (row.ap as number).toFixed(2) }}</span>
          <button class="scores-tab__tweak-btn" aria-label="Tweak AP"
            @click="toggleTweaker(row.mapDifficultyId as string, $event)">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" />
              <path
                d="M16.2 12.5a1.4 1.4 0 00.28 1.54l.05.05a1.7 1.7 0 11-2.4 2.4l-.05-.05a1.4 1.4 0 00-1.54-.28 1.4 1.4 0 00-.84 1.28v.14a1.7 1.7 0 11-3.4 0v-.07a1.4 1.4 0 00-.92-1.28 1.4 1.4 0 00-1.54.28l-.05.05a1.7 1.7 0 11-2.4-2.4l.05-.05a1.4 1.4 0 00.28-1.54 1.4 1.4 0 00-1.28-.84H2.3a1.7 1.7 0 110-3.4h.07a1.4 1.4 0 001.28-.92 1.4 1.4 0 00-.28-1.54l-.05-.05a1.7 1.7 0 112.4-2.4l.05.05a1.4 1.4 0 001.54.28h.07a1.4 1.4 0 00.84-1.28V2.3a1.7 1.7 0 113.4 0v.07a1.4 1.4 0 00.84 1.28 1.4 1.4 0 001.54-.28l.05-.05a1.7 1.7 0 112.4 2.4l-.05.05a1.4 1.4 0 00-.28 1.54v.07a1.4 1.4 0 001.28.84h.14a1.7 1.7 0 110 3.4h-.07a1.4 1.4 0 00-1.28.84z"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </span>
      </template>

      <template #cell-complexity="{ value }">
        <ComplexityBadge v-if="value != null" :complexity="(value as number)" />
        <span v-else class="scores-tab__streak scores-tab__streak--empty">&ndash;</span>
      </template>

      <template #cell-category="{ row }">
        <span class="scores-tab__category"
          :style="{ '--cat-accent': categoryStore.getAccent(row.categoryCode as string) }">
          {{ row.category }}
        </span>
      </template>

      <template #cell-difficulty="{ value }">
        <span class="scores-tab__difficulty">{{ value }}</span>
      </template>

      <template #cell-streak115="{ value }">
        <span v-if="value != null" class="scores-tab__streak">{{ value }}</span>
        <span v-else class="scores-tab__streak scores-tab__streak--empty">&ndash;</span>
      </template>

      <template #cell-maxStreak115="{ value }">
        <span v-if="value != null" class="scores-tab__streak">{{ value }}</span>
        <span v-else class="scores-tab__streak scores-tab__streak--empty">&ndash;</span>
      </template>

      <template #cell-pauses="{ value }">
        <span v-if="value != null">{{ value }}</span>
      </template>

      <template #cell-playCount="{ value }">
        <span>{{ formatPlayCount(value) }}</span>
      </template>

      <template #cell-actions="{ row }">
        <ScoreRowActions v-bind="rowActions(row)" @pin="emit('pin-toggle', row.scoreId as string)"
          @detail="openDetail(row.mapDifficultyId as string)" />
      </template>

      <template #mobile-card="{ row }">
        <div class="ps-card" @click="handleRowClick(row)">
          <CoverImage v-if="row.coverUrl" :src="(row.coverUrl as string)" :alt="(row.mapName as string)" :size="40"
            :fallback-src="(row.coverFallbackUrl as string | null | undefined) ?? null" />
          <div v-else class="ps-card__cover-placeholder" />
          <div class="ps-card__grid">
            <span class="ps-card__name-cell">
              <span class="ps-card__rank" :class="getRankClass(row.leaderboardRank as number)">#{{ row.leaderboardRank }}</span>
              <SongTitle class="ps-card__name" :name="(row.mapName as string)"
                :sub-name="(row.mapSubName as string | null)" :title="(row.mapName as string)" />
              <span v-if="isScoreFieldVisible('difficulty')" class="ps-card__diff">{{ row.difficulty }}</span>
            </span>
            <span v-if="isScoreFieldVisible('accuracy')" class="ps-card__acc">
              {{ formatAccuracy(row.accuracy as number) }}
            </span>

            <span class="ps-card__meta-cell">
              <template v-if="isScoreFieldVisible('category')">
                <span class="ps-card__dot"
                  :style="{ background: categoryStore.getAccent(row.categoryCode as string) }" />
                <span class="ps-card__category">{{ row.category }}</span>
              </template>
              <template v-if="isScoreFieldVisible('complexity') && (row.complexity as number | null) != null">
                <span class="ps-card__sep">·</span>
                <span class="ps-card__cx">{{ (row.complexity as number).toFixed(1) }}</span>
              </template>
              <template v-if="isScoreFieldVisible('date')">
                <span class="ps-card__sep">·</span>
                <span class="ps-card__date">{{ formatRelativeDate(row.date as string) }}</span>
              </template>
              <template v-if="isScoreFieldVisible('last_played_at') && row.lastPlayedAt">
                <span class="ps-card__sep">·</span>
                <span class="ps-card__date">played {{ formatRelativeDate(row.lastPlayedAt as string) }}</span>
              </template>
            </span>
            <span v-if="isScoreFieldVisible('ap')" class="ps-card__ap">{{ (row.ap as number).toFixed(2) }}</span>

            <span v-if="streakSummary(row)" class="ps-card__streak-cell">{{ streakSummary(row) }}</span>
            <span v-if="isScoreFieldVisible('weighted_ap')" class="ps-card__weighted">
              / {{ (row.weighted as number).toFixed(2) }}
            </span>
          </div>
          <ScoreRowActions v-bind="rowActions(row)" stacked @pin="emit('pin-toggle', row.scoreId as string)"
            @detail="openDetail(row.mapDifficultyId as string)" />
        </div>
      </template>
    </ScoreTable>

    <ApTweaker v-if="tweakerScore" :open="true" :accuracy="tweakerScore.score.accuracy" :ap="tweakerScore.score.ap"
      :weighted-ap="tweakerScore.score.weightedAp" :curve-id="tweakerScore.curveId" :anchor-el="tweakerAnchor"
      :sibling-aps="tweakerScore.siblingAps" @update:open="closeTweaker" />

    <ScoreDetailModal :open="detailOpen" :score="detailScore" :user-id="userId" :player="player"
      @close="detailOpen = false" />
  </div>
</template>

<style scoped>
.scores-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.scores-tab__category {
  color: color-mix(in srgb, var(--cat-accent) 30%, var(--text-secondary));
  font-size: var(--text-caption);
}

.scores-tab__map-name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scores-tab__difficulty {
  color: var(--text-secondary);
}

.scores-tab__streak--empty {
  color: var(--text-tertiary);
}

.scores-tab__ap-cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.scores-tab__ap-value {
  font-weight: 500;
}

.scores-tab__tweak-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: color 120ms ease;
}

.scores-tab__tweak-btn:hover {
  color: var(--accent, var(--text-primary));
}

.ps-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  cursor: pointer;
  min-height: 48px;
  transition: border-color 120ms ease;
}

.ps-card:hover {
  border-color: var(--text-tertiary);
}

.ps-card__cover-placeholder {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-avatar);
  background: var(--bg-overlay);
}

.ps-card__grid {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--space-sm);
  row-gap: 2px;
  align-items: center;
}

.ps-card__name-cell,
.ps-card__meta-cell,
.ps-card__streak-cell {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ps-card__rank {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.ps-card__rank.rank--gold { color: var(--tier-gold); font-weight: 700; }
.ps-card__rank.rank--silver { color: var(--tier-silver); font-weight: 700; }
.ps-card__rank.rank--bronze { color: var(--tier-bronze); font-weight: 700; }

.ps-card__name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-body);
  min-width: 0;
}

.ps-card__diff {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.ps-card__meta-cell,
.ps-card__streak-cell {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.ps-card__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ps-card__category {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.ps-card__cx {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.ps-card__sep {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.ps-card__date {
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ps-card__acc {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  justify-self: end;
  white-space: nowrap;
}

.ps-card__ap {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-weight: 500;
  justify-self: end;
  white-space: nowrap;
}

.ps-card__weighted {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  justify-self: end;
  white-space: nowrap;
}
</style>
