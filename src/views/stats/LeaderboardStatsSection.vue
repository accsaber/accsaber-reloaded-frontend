<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import { useQueryParams } from '@/composables/useQueryParams'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { MapDifficultyRef } from '@/types/api/common'
import type { ScoreResponse } from '@/types/api/users'
import type { CategoryCode, ScoreDisplay, TableColumn } from '@/types/display'
import { toScoreDisplay, toUserRef, type FlatUserRef } from '@/utils/mappers'
import { buildMapRoute } from '@/utils/mapRoute'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import StatsBar from './StatsBar.vue'
import StatsBoardPicker from './StatsBoardPicker.vue'
import StatsCountrySelect from './StatsCountrySelect.vue'
import StatsMapCell from './StatsMapCell.vue'
import StatsTable from './StatsTable.vue'
import { dateCol, fmt, mainCol, numCol, playerCol, rankCol } from './statsFormat'
import { playerRoute, useStatsBoard, type StatsBoardDef, type StatsRow } from './useStatsBoard'

type Board = 'streaks' | 'max-ap' | 'avg-ap' | 'most-retried' | 'grinders' | 'dedication' | 'collectors'

interface Filters {
  categoryId?: string
  country?: string
}

interface BoardDef extends StatsBoardDef<Board, Filters> {
  category: boolean
  scores?: boolean
}

const mapCol: TableColumn = { key: 'map', label: 'Map', align: 'left', noLink: true }
const categoryCol: TableColumn = {
  key: 'categoryName',
  label: 'Category',
  align: 'left',
  width: '130px',
  format: (_, row) => (row.map as MapDifficultyRef | undefined)?.categoryName ?? '',
}
const scoreDateCol: TableColumn = {
  ...dateCol('timeSet', 'Date', (value, row) => (row.active === false ? `${fmt.relative(value)}, beaten` : fmt.relative(value))),
  width: '150px',
}
const detailCol: TableColumn = { key: 'detail', label: '', width: '60px', align: 'center', noLink: true }
const latestCol = dateCol('latestScoreTimeSet', 'Latest')

const BOARDS: BoardDef[] = [
  {
    key: 'streaks', label: 'Longest Streaks', icon: 'streak', category: true, scores: true, players: true, sort: 'streak115,desc',
    columns: [
      rankCol, playerCol, mapCol, mainCol('streak115', 'Streak', 90),
      numCol('accuracy', 'Accuracy', 100, fmt.accuracy), numCol('ap', 'AP', 100, fmt.fixed2), scoreDateCol, detailCol,
    ],
    fetch: (api, params, f) => api.getStreakLeaderboard(params, f.categoryId, f.country),
  },
  {
    key: 'max-ap', label: 'Highest AP', icon: 'star', category: true, scores: true, players: true, sort: 'ap,desc',
    columns: [
      rankCol, playerCol, mapCol, mainCol('ap', 'AP', 100, fmt.fixed2),
      numCol('accuracy', 'Accuracy', 100, fmt.accuracy), scoreDateCol, detailCol,
    ],
    fetch: (api, params, f) => api.getMaxApLeaderboard(params, f.categoryId, f.country),
  },
  {
    key: 'avg-ap', label: 'Most Worth Maps', icon: 'mountain', category: true, sort: 'averageWeightedAp,desc',
    columns: [
      rankCol, mapCol, categoryCol, mainCol('averageWeightedAp', 'Avg AP', 110, fmt.fixed2),
      numCol('scoreCount', 'Scores', 100), latestCol,
    ],
    fetch: (api, params, f) => api.getHighestAvgApMaps(params, f.categoryId, undefined, f.country),
  },
  {
    key: 'most-retried', label: 'Most Grinded Maps', icon: 'repeat', category: true, sort: 'supersededCount,desc',
    columns: [rankCol, mapCol, categoryCol, mainCol('supersededCount', 'Retries', 110), latestCol],
    fetch: (api, params, f) => api.getMostRetriedMaps(params, f.categoryId, f.country),
  },
  {
    key: 'grinders', label: 'Top Grinders', icon: 'trending', category: true, players: true, sort: 'improvementCount,desc',
    columns: [rankCol, playerCol, mainCol('improvementCount', 'Improvements', 140), latestCol],
    fetch: (api, params, f) => api.getMostImprovements(params, f.categoryId, f.country),
  },
  {
    key: 'dedication', label: 'Map Dedication', icon: 'target', category: true, players: true, sort: 'improvementCount,desc',
    columns: [rankCol, playerCol, mapCol, mainCol('improvementCount', 'Improvements', 140), latestCol],
    fetch: (api, params, f) => api.getMostMapImprovements(params, f.categoryId, f.country),
  },
  {
    key: 'collectors', label: 'Milestone Collectors', icon: 'trophy', category: false, players: true, sort: 'milestoneCount,desc',
    columns: [rankCol, playerCol, mainCol('milestoneCount', 'Milestones', 140)],
    fetch: (api, params, f) => api.getMilestoneCollectors(params, f.country),
  },
]

const route = useRoute()
const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()
const { setQuery, queryRef } = useQueryParams()

if (typeof route.query.tab === 'string') {
  setQuery({ board: route.query.tab, tab: undefined }, { keepPage: true })
}

const categoryParam = queryRef<CategoryCode>('category')
const countryFilter = queryRef('country')
const category = computed<CategoryCode>(() => categoryParam.value || 'overall')

function setCategory(code: CategoryCode) {
  categoryParam.value = code === 'overall' ? '' : code
}

function mapRow(row: StatsRow): StatsRow {
  const flat = row as StatsRow & Partial<ScoreResponse>
  return {
    ...row,
    player: row.player ?? (flat.userId ? toUserRef(flat as unknown as FlatUserRef) : undefined),
    map: row.map ?? (flat.songName ? { ...flat, id: flat.mapDifficultyId } : undefined),
  }
}

function boardFilters(def: BoardDef): Filters {
  return {
    categoryId: def.category && category.value !== 'overall' ? categoryStore.getCategoryId(category.value) : undefined,
    country: countryFilter.value || undefined,
  }
}

const {
  activeBoard, boardDef, boardOptions, selectBoard, currentPage, setPage, loading, rows, totalPages, totalElements,
} = useStatsBoard(BOARDS, { mapRow, filters: boardFilters })

function mapRoute(row: StatsRow) {
  const map = row.map as MapDifficultyRef | undefined
  if (!map) return undefined
  return buildMapRoute({
    beatsaverCode: map.beatsaverCode,
    mapId: map.mapId,
    difficulty: map.difficulty,
    difficultyId: map.id,
    characteristic: map.characteristic,
  })
}

const rowTo = computed(() => (boardDef.value.players ? playerRoute : mapRoute))

const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref('')

function openScoreDetail(row: StatsRow) {
  const raw = row as unknown as ScoreResponse
  detailScore.value = toScoreDisplay(
    raw,
    modifierStore.resolveModifierCodes(raw.modifierIds),
    categoryStore.getCategoryCode(raw.categoryId),
  )
  detailUserId.value = raw.userId
}
</script>

<template>
  <div class="stats-section">
    <StatsBoardPicker :model-value="activeBoard" :options="boardOptions"
      @update:model-value="selectBoard($event)" />

    <StatsBar :count="totalElements">
      <StatsCountrySelect />
      <CategoryTabs v-if="boardDef.category" :model-value="category" :exclude="['xp']"
        @update:model-value="setCategory" />
    </StatsBar>

    <StatsTable :columns="boardDef.columns" :rows="rows" :loading="loading" :page="currentPage"
      :total-pages="totalPages" :row-to="rowTo" @update:page="setPage">
      <template #cell-map="{ row }">
        <StatsMapCell v-if="row.map" :map="(row.map as MapDifficultyRef)" />
      </template>
      <template #cell-detail="{ row }">
        <IconButton label="View score details" @click.stop.prevent="openScoreDetail(row)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 11L5.5 5L8 8L10.5 4L14 11M2 13H14" />
          </svg>
        </IconButton>
      </template>
    </StatsTable>

    <ScoreDetailModal :open="!!detailScore" :score="detailScore" :user-id="detailUserId"
      @close="detailScore = null" />
  </div>
</template>
