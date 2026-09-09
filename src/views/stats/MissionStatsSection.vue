<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import DistributionRanking from '@/components/domain/DistributionRanking.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import { STATS_CHART_RANGE_PARAMS } from '@/composables/useStatsChartConfig'
import { useStatsQueryState } from '@/composables/useStatsQueryState'
import { useCategoryStore } from '@/stores/categories'
import type { MissionBand, MissionPool, MissionType } from '@/types/api/missions'
import type {
  DistributionEntryResponse,
  MissionStatsParams,
  MissionTier,
  TimeSeriesPointResponse,
} from '@/types/api/statistics'
import type { MetricType, TableColumn, TimeRange, TimeSeriesPoint } from '@/types/display'
import type { Page, PaginationParams } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'
import LeaderboardPicker from './LeaderboardPicker.vue'
import LeaderboardPlayerCell from './LeaderboardPlayerCell.vue'
import MissionCalibrationDetail from './MissionCalibrationDetail.vue'
import StatsFilterChips from './StatsFilterChips.vue'
import {
  MISSION_TIER_HINTS,
  MISSION_TIER_LABELS,
  MISSION_TIER_ORDER,
  NO_VALUE,
  fmtDecimal,
  fmtFraction,
  fmtInt,
  labelCase,
  plural,
  rateClass,
} from './statsFormat'

defineProps<{
  accent: string
  countryOptions: { value: string; label: string }[]
}>()

type MissionBoard = 'calibration' | 'xp' | 'trends' | 'most-completed' | 'most-mission-xp'
type MissionFilterKey = 'pool' | 'type' | 'band' | 'category' | 'tier' | 'skillRange' | 'minAssigned' | 'range'
type StatsApi = typeof import('@/api/statistics')

interface MissionBoardDef {
  key: MissionBoard
  label: string
  icon: string
  description: string
  columns: TableColumn[]
  filters: MissionFilterKey[]
  players?: boolean
  fetch?: (api: StatsApi, params: PaginationParams, filters: MissionStatsParams) => Promise<Page<unknown>>
}

const POOLS: MissionPool[] = ['daily', 'weekly', 'event', 'community']
const BANDS: MissionBand[] = ['easy', 'medium', 'hard', 'extreme']

const MISSION_TYPES: MissionType[] = [
  'PLAY_N_MAPS', 'XP_IN_WINDOW', 'ACC_ON_MAP', 'AP_ON_MAP', 'PB_SPECIFIC_MAP', 'PB_ABOVE_THRESHOLD',
  'SNIPE_PLAYER_ON_MAP', 'STREAK_ON_MAP', 'STREAK_N_IN_CATEGORY', 'STREAK_SUM_N', 'COMEBACK_PB', 'SCORES_N',
  'SNIPE_RIVAL_ANY_MAP', 'AP_GAIN_OVERALL', 'BATCH_PLAY_N', 'PB_RANKED_BEFORE_N', 'CAMPAIGN_COMPLETE_N',
]

const templateCol: TableColumn = { key: 'template', label: 'Template', align: 'left', width: '270px' }
const rankCol: TableColumn = { key: 'rank', label: '#', align: 'right', mono: true, width: '76px' }
const playerCol: TableColumn = { key: 'player', label: 'Player', align: 'left' }

const BOARDS: MissionBoardDef[] = [
  {
    key: 'calibration',
    label: 'Calibration',
    icon: 'gauge',
    description: 'Handed out vs finished',
    filters: ['pool', 'type', 'band', 'category', 'tier', 'skillRange', 'minAssigned'],
    columns: [
      templateCol,
      { key: 'tier', label: 'Tier', align: 'left', width: '110px' },
      { key: 'assigned', label: 'Assigned', align: 'right', mono: true, width: '110px' },
      { key: 'completed', label: 'Done', align: 'right', mono: true, width: '80px' },
      { key: 'completionRate', label: 'Rate', align: 'right', mono: true, width: '120px' },
      { key: 'progressed', label: 'Progressed', align: 'right', mono: true, width: '130px' },
      { key: 'averageXpReward', label: 'Avg XP', align: 'right', mono: true, width: '100px' },
    ],
    fetch: (api, params, filters) => api.getMissionCalibration(params, filters),
  },
  {
    key: 'xp',
    label: 'XP Payouts',
    icon: 'gem',
    description: 'What each mission pays',
    filters: ['pool', 'type', 'band', 'category', 'tier', 'skillRange'],
    columns: [
      templateCol,
      { key: 'completed', label: 'Done', align: 'right', mono: true, width: '80px' },
      { key: 'xpPaid', label: 'XP Paid', align: 'right', mono: true, width: '110px' },
      { key: 'averageXp', label: 'Avg', align: 'right', mono: true, width: '90px' },
      { key: 'medianXp', label: 'Median', align: 'right', mono: true, width: '100px' },
      { key: 'p90Xp', label: 'P90', align: 'right', mono: true, width: '90px' },
      { key: 'shareOfMissionXp', label: 'Share', align: 'right', mono: true, width: '90px' },
      { key: 'itemsAwarded', label: 'Items', align: 'right', mono: true, width: '90px' },
    ],
    fetch: (api, params, filters) => api.getMissionXpPayouts(params, filters),
  },
  {
    key: 'trends',
    label: 'Trends',
    icon: 'trending',
    description: 'Completion over time',
    filters: ['pool', 'type', 'band', 'tier', 'range'],
    columns: [],
  },
  {
    key: 'most-completed',
    label: 'Most Completed',
    icon: 'trophy',
    description: 'Top mission finishers',
    filters: ['pool', 'type', 'tier'],
    players: true,
    columns: [
      rankCol, playerCol,
      { key: 'missionsCompleted', label: 'Missions', align: 'right', mono: true, width: '120px' },
      { key: 'missionXp', label: 'Mission XP', align: 'right', mono: true, width: '140px' },
    ],
    fetch: (api, params, filters) => api.getMostMissionsCompleted(params, filters),
  },
  {
    key: 'most-mission-xp',
    label: 'Most Mission XP',
    icon: 'star',
    description: 'Lifetime mission XP',
    filters: [],
    players: true,
    columns: [
      rankCol, playerCol,
      { key: 'missionXp', label: 'Mission XP', align: 'right', mono: true, width: '140px' },
      { key: 'missionsCompleted', label: 'Missions', align: 'right', mono: true, width: '120px' },
    ],
    fetch: (api, params, filters) => api.getMostMissionXp(params, filters.country),
  },
]

const BOARD_MAP = new Map<MissionBoard, MissionBoardDef>(BOARDS.map((b) => [b.key, b]))
const pickerOptions = BOARDS.map((b) => ({ key: b.key, label: b.label, icon: b.icon, description: b.description }))

const RANGE_KEYS = Object.keys(STATS_CHART_RANGE_PARAMS) as TimeRange[]

const router = useRouter()
const categoryStore = useCategoryStore()
const { currentPage, param, multiParam, numberParam, patch, setParam, toggleMulti, setPage } = useStatsQueryState()

const activeBoard = computed<MissionBoard>(() => {
  const board = param('board') as MissionBoard
  return BOARD_MAP.has(board) ? board : 'calibration'
})
const boardDef = computed(() => BOARD_MAP.get(activeBoard.value) as MissionBoardDef)
const shows = (filter: MissionFilterKey) => boardDef.value.filters.includes(filter)

const poolFilter = computed(() => multiParam('pool'))
const bandFilter = computed(() => multiParam('band'))
const tierFilter = computed(() => multiParam('tier'))
const typeFilter = computed(() => param('type'))
const categoryFilter = computed(() => param('category'))
const countryFilter = computed(() => param('country'))
const openTemplate = computed(() => param('template'))
const skillMode = computed<'tier' | 'range'>(() => (param('skillMode') === 'range' ? 'range' : 'tier'))
const skillMin = computed(() => numberParam('skillMin'))
const skillMax = computed(() => numberParam('skillMax'))
const minAssigned = computed(() => numberParam('minAssigned') ?? 1)

const chartRange = computed<TimeRange>(() => {
  const range = param('range') as TimeRange
  return RANGE_KEYS.includes(range) ? range : '30d'
})

const categoryOptions = computed(() => [
  { value: '', label: 'All Categories' },
  ...categoryStore.categories.map((c) => ({ value: c.id, label: c.name })),
])

const typeOptions = computed(() => [
  { value: '', label: 'All Types' },
  ...MISSION_TYPES.map((t) => ({ value: t, label: labelCase(t) })),
])

const poolChips = POOLS.map((p) => ({ key: p, label: labelCase(p) }))
const bandChips = BANDS.map((b) => ({ key: b, label: labelCase(b) }))
const tierChips = MISSION_TIER_ORDER.map((t) => ({
  key: t,
  label: MISSION_TIER_LABELS[t],
  hint: MISSION_TIER_HINTS[t],
}))

/**
 * Only the filters the active board's endpoint accepts are sent. The skill
 * range and the tier chips both cut on the same threshold, so exactly one of
 * them is offered at a time and only that one reaches the request.
 */
const filters = computed<MissionStatsParams>(() => {
  const def = boardDef.value
  const useTiers = skillMode.value === 'tier'
  return {
    pool: def.filters.includes('pool') ? (poolFilter.value as MissionPool[]) : undefined,
    type: def.filters.includes('type') && typeFilter.value ? [typeFilter.value as MissionType] : undefined,
    band: def.filters.includes('band') ? (bandFilter.value as MissionBand[]) : undefined,
    categoryId: def.filters.includes('category') && categoryFilter.value ? [categoryFilter.value] : undefined,
    tier: def.filters.includes('tier') && useTiers ? (tierFilter.value as MissionTier[]) : undefined,
    skillMin: def.filters.includes('skillRange') && !useTiers ? skillMin.value : undefined,
    skillMax: def.filters.includes('skillRange') && !useTiers ? skillMax.value : undefined,
    country: countryFilter.value || undefined,
    minAssigned: def.filters.includes('minAssigned') ? minAssigned.value : undefined,
  }
})

/** The by-tier and shortfall endpoints take no pool-independent extras of their own. */
const detailFilters = computed<MissionStatsParams>(() => ({
  pool: poolFilter.value as MissionPool[],
  band: bandFilter.value as MissionBand[],
  categoryId: categoryFilter.value ? [categoryFilter.value] : undefined,
  tier: skillMode.value === 'tier' ? (tierFilter.value as MissionTier[]) : undefined,
  skillMin: skillMode.value === 'range' ? skillMin.value : undefined,
  skillMax: skillMode.value === 'range' ? skillMax.value : undefined,
  country: countryFilter.value || undefined,
}))

function selectBoard(board: MissionBoard) {
  patch({ board: board === 'calibration' ? undefined : board, template: undefined })
}

function setSkillMode(mode: 'tier' | 'range') {
  patch({
    skillMode: mode === 'tier' ? undefined : mode,
    tier: undefined,
    skillMin: undefined,
    skillMax: undefined,
  })
}

function setNumberParam(key: string, raw: string) {
  patch({ [key]: raw.trim() || undefined })
}

function playerRoute(row: Record<string, unknown>): RouteLocationRaw | undefined {
  const userId = row.userId as string | undefined
  return userId ? { name: 'player-profile', params: { userId } } : undefined
}

const rowTo = computed(() => (boardDef.value.players ? playerRoute : undefined))

function onRowClick(row: Record<string, unknown>) {
  const target = playerRoute(row)
  if (boardDef.value.players) {
    if (target) router.push(target)
    return
  }
  const templateId = row.templateId as string | undefined
  if (templateId) patch({ template: templateId }, true)
}

const loading = ref(false)
const pageData = ref<Page<unknown> | null>(null)
const pageBoard = ref<MissionBoard | null>(null)

const currentPageData = computed(() => (pageBoard.value === activeBoard.value ? pageData.value : null))

const totalPages = computed(() => currentPageData.value?.totalPages ?? 0)
const totalElements = computed(() => currentPageData.value?.totalElements ?? 0)

const rows = computed<Record<string, unknown>[]>(() => {
  if (!currentPageData.value) return []
  const offset = currentPageData.value.number * currentPageData.value.size
  return currentPageData.value.content.map((raw, index) => {
    const item = raw as Record<string, unknown>
    return {
      ...item,
      rank: offset + index + 1,
      avatarUrl: pickAvatarUrl(item),
      avatarFallbackUrl: pickAvatarFallback(item),
    }
  })
})

/**
 * Expired missions have only been retained since this release, so the rate
 * columns read thin at first. Say so instead of letting it look like a bug.
 */
const stillAccruing = computed(() => {
  if (activeBoard.value !== 'calibration' || !rows.value.length) return false
  return rows.value.every((row) => Number(row.expired ?? 0) === 0)
})

let requestId = 0

async function fetchBoard() {
  const def = boardDef.value
  if (!def.fetch) return
  const id = ++requestId
  loading.value = true
  try {
    const params: PaginationParams = { page: currentPage.value - 1, size: 20 }
    const api = await import('@/api/statistics')
    const result = await def.fetch(api, params, filters.value)
    if (id !== requestId) return
    pageData.value = result
    pageBoard.value = def.key
  } catch (error) {
    if (id !== requestId) return
    console.error('Failed to fetch mission stats:', error)
    pageData.value = null
    pageBoard.value = def.key
  }
  loading.value = false
}

const TREND_METRICS: { key: MetricType; label: string }[] = [
  { key: 'missionCompletionRate', label: 'Completion Rate' },
  { key: 'missionCompletions', label: 'Missions Completed' },
]

const chartMetric = computed<MetricType>(() => {
  const metric = param('metric') as MetricType
  return TREND_METRICS.some((m) => m.key === metric) ? metric : 'missionCompletionRate'
})

const isRateMetric = computed(() => chartMetric.value === 'missionCompletionRate')

const chartLoading = ref(false)
const chartPoints = ref<TimeSeriesPoint[]>([])
const byType = ref<DistributionEntryResponse[]>([])

function toChartPoints(data: TimeSeriesPointResponse[]): TimeSeriesPoint[] {
  return data.map((d) => ({ timestamp: new Date(d.date).getTime(), value: d.value }))
}

/** The completion-rate endpoint returns whole percentages, not a 0..1 fraction. */
function formatRatePoint(value: number): string {
  return value.toFixed(1) + '%'
}

let chartRequestId = 0

async function fetchTrends() {
  const id = ++chartRequestId
  chartLoading.value = true
  try {
    const api = await import('@/api/statistics')
    const range = STATS_CHART_RANGE_PARAMS[chartRange.value]
    const scope = filters.value
    const series = isRateMetric.value
      ? api.getMissionCompletionRate(range, scope)
      : api.getMissionCompletionsPerDay(range, {
        pool: scope.pool, type: scope.type, tier: scope.tier, country: scope.country,
      })
    const [points, types] = await Promise.all([
      series,
      api.getMissionCompletionsByType({ pool: scope.pool, tier: scope.tier, country: scope.country }),
    ])
    if (id !== chartRequestId) return
    chartPoints.value = toChartPoints(points)
    byType.value = types.map((entry) => ({ ...entry, label: labelCase(entry.label) }))
  } catch (error) {
    if (id !== chartRequestId) return
    console.error('Failed to fetch mission trends:', error)
    chartPoints.value = []
    byType.value = []
  }
  chartLoading.value = false
}

watch(
  [activeBoard, filters, currentPage, chartRange, chartMetric],
  () => {
    if (activeBoard.value === 'trends') {
      fetchTrends()
    } else {
      fetchBoard()
    }
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="mission-stats" :style="{ '--accent': accent }">
    <div class="mission-stats__filters">
      <div class="mission-stats__row">
        <BaseSelect :model-value="countryFilter" :options="countryOptions" placeholder="All Countries" searchable
          @update:model-value="setParam('country', $event)" />
        <BaseSelect v-if="shows('type')" :model-value="typeFilter" :options="typeOptions" placeholder="All Types"
          searchable @update:model-value="setParam('type', $event)" />
        <BaseSelect v-if="shows('category')" :model-value="categoryFilter" :options="categoryOptions"
          placeholder="All Categories" @update:model-value="setParam('category', $event)" />
        <label v-if="shows('minAssigned')" class="mission-stats__number">
          <span>Min assigned</span>
          <input type="number" min="1" inputmode="numeric" :value="minAssigned"
            @change="setNumberParam('minAssigned', ($event.target as HTMLInputElement).value)" />
        </label>
      </div>

      <StatsFilterChips v-if="shows('pool')" label="Pool" :options="poolChips" :selected="poolFilter"
        empty-label="All pools" @toggle="toggleMulti('pool', $event)" @clear="patch({ pool: undefined })" />

      <StatsFilterChips v-if="shows('band')" label="Band" :options="bandChips" :selected="bandFilter"
        empty-label="All bands" @toggle="toggleMulti('band', $event)" @clear="patch({ band: undefined })" />

      <div v-if="shows('tier')" class="mission-stats__skill">
        <div v-if="shows('skillRange')" class="mission-stats__mode">
          <button type="button" class="mission-stats__mode-btn"
            :class="{ 'mission-stats__mode-btn--active': skillMode === 'tier' }" @click="setSkillMode('tier')">
            Tiers
          </button>
          <button type="button" class="mission-stats__mode-btn"
            :class="{ 'mission-stats__mode-btn--active': skillMode === 'range' }" @click="setSkillMode('range')">
            Skill range
          </button>
        </div>

        <StatsFilterChips v-if="skillMode === 'tier'" label="Tier" :options="tierChips" :selected="tierFilter"
          empty-label="All tiers" @toggle="toggleMulti('tier', $event)" @clear="patch({ tier: undefined })" />

        <div v-else class="mission-stats__range">
          <label class="mission-stats__number">
            <span>Skill min</span>
            <input type="number" inputmode="numeric" :value="skillMin ?? ''"
              @change="setNumberParam('skillMin', ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="mission-stats__number">
            <span>Skill max</span>
            <input type="number" inputmode="numeric" :value="skillMax ?? ''"
              @change="setNumberParam('skillMax', ($event.target as HTMLInputElement).value)" />
          </label>
        </div>
      </div>
    </div>

    <LeaderboardPicker :model-value="activeBoard" :options="pickerOptions"
      @update:model-value="selectBoard($event as MissionBoard)" />

    <template v-if="activeBoard === 'trends'">
      <div class="mission-stats__chart">
        <TimeSeriesChart :data="chartPoints" :accent-color="accent" :available-metrics="TREND_METRICS"
          :selected-metric="chartMetric" :selected-range="chartRange"
          :metric-label="isRateMetric ? 'Completion Rate' : 'Missions Completed'"
          :format-value="isRateMetric ? formatRatePoint : undefined"
          empty-message="Nothing recorded in this range yet."
          @update:selected-metric="setParam('metric', $event)"
          @update:selected-range="setParam('range', $event)" />
        <div v-if="chartLoading" class="mission-stats__chart-skeleton">
          <SkeletonLoader variant="card" height="300px" />
        </div>
      </div>

      <DistributionRanking title="Completions by Type" :entries="byType" :accent-color="accent" :max-entries="10" />

    </template>

    <template v-else>
      <p v-if="totalElements > 0" class="mission-stats__count">{{ plural(totalElements, 'row') }}</p>

      <p v-if="stillAccruing" class="mission-stats__note">No missions in view have expired yet.</p>

      <DataTable :columns="boardDef.columns" :rows="rows" :loading="loading" :loading-rows="10" row-key="rank"
        :row-clickable="activeBoard === 'calibration' || !!boardDef.players" :row-to="rowTo"
        :empty-message="activeBoard === 'calibration' ? 'No missions match these filters yet.' : 'No records found.'"
        @row-click="onRowClick">
        <template #cell-rank="{ value }">
          <span class="mission-stats__rank">#{{ value }}</span>
        </template>

        <template #cell-player="{ row }">
          <LeaderboardPlayerCell :user-id="(row.userId as string)" :user-name="(row.userName as string)"
            :avatar-url="(row.avatarUrl as string)"
            :avatar-fallback-url="(row.avatarFallbackUrl as string | null)" :country="(row.country as string)" />
        </template>

        <template #cell-template="{ row }">
          <span class="mission-stats__template">
            <span class="mission-stats__template-name">{{ row.templateName }}</span>
            <span class="mission-stats__template-meta">
              <span class="mission-stats__tag">{{ labelCase(row.pool) }}</span>
              <span v-if="row.band" class="mission-stats__tag">{{ labelCase(row.band) }}</span>
              <span v-if="row.categoryName" class="mission-stats__template-cat">{{ row.categoryName }}</span>
            </span>
          </span>
        </template>

        <template #cell-tier="{ value }">
          <span class="mission-stats__tag" :class="{ 'mission-stats__tag--dim': value === 'unknown' }">
            {{ value ? MISSION_TIER_LABELS[value as MissionTier] : NO_VALUE }}
          </span>
        </template>

        <template #cell-completionRate="{ row }">
          <span class="mission-stats__rate" :class="rateClass(row.completionRate as number | null)">
            <span class="mission-stats__rate-track">
              <span class="mission-stats__rate-fill"
                :style="{ '--fill': (((row.completionRate as number | null) ?? 0) * 100) + '%' }" />
            </span>
            {{ fmtFraction(row.completionRate) }}
          </span>
        </template>

        <template #cell-progressed="{ row }">
          <span v-if="row.progressed == null" class="mission-stats__dim"
            title="One-shot mission: it banks no partial progress, so there is nothing to count.">
            {{ NO_VALUE }}
          </span>
          <span v-else>{{ fmtInt(row.progressed) }}</span>
        </template>

        <template #cell-assigned="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-completed="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-itemsAwarded="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-averageXpReward="{ value }">{{ fmtDecimal(value) }}</template>
        <template #cell-xpPaid="{ value }"><span class="mission-stats__strong">{{ fmtInt(value) }}</span></template>
        <template #cell-averageXp="{ value }">{{ fmtDecimal(value) }}</template>
        <template #cell-medianXp="{ value }">{{ fmtDecimal(value) }}</template>
        <template #cell-p90Xp="{ value }">{{ fmtDecimal(value) }}</template>
        <template #cell-shareOfMissionXp="{ value }">
          <span title="Share of mission XP within the current filters, not of all mission XP ever.">
            {{ fmtFraction(value) }}
          </span>
        </template>
        <template #cell-missionsCompleted="{ value }">
          <span class="mission-stats__strong">{{ fmtInt(value) }}</span>
        </template>
        <template #cell-missionXp="{ value }">{{ fmtDecimal(value, 0) }}</template>
      </DataTable>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

      <MissionCalibrationDetail v-if="openTemplate && activeBoard === 'calibration'" :template-id="openTemplate"
        :filters="detailFilters" @close="patch({ template: undefined }, true)" />
    </template>
  </div>
</template>

<style scoped>
.mission-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  --page-accent: var(--accent);
}

.mission-stats__filters {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.mission-stats__row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.mission-stats__number {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.mission-stats__number input {
  width: 72px;
  padding: var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.mission-stats__number input:focus {
  outline: none;
  border-color: var(--page-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent) 20%, transparent);
}

.mission-stats__skill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.mission-stats__mode {
  display: flex;
  justify-content: center;
  gap: var(--space-xs);
}

.mission-stats__mode-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}

.mission-stats__mode-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.mission-stats__mode-btn--active {
  color: var(--page-accent);
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 10%, transparent);
}

.mission-stats__range {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
}

.mission-stats__chart {
  position: relative;
}

.mission-stats__chart-skeleton {
  position: absolute;
  inset: 0;
}

.mission-stats__count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: right;
}

.mission-stats__note {
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-card);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.5;
}

.mission-stats__template {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mission-stats__template-name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.mission-stats__template-meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
  overflow: hidden;
}

.mission-stats__template-cat {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.mission-stats__tag {
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.mission-stats__tag--dim {
  color: var(--text-tertiary);
}

.mission-stats__rank {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.mission-stats__strong {
  color: var(--page-accent);
  font-weight: 600;
}

.mission-stats__dim {
  color: var(--text-tertiary);
}

.mission-stats__rate {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
  font-weight: 600;
}

.mission-stats__rate-track {
  width: 34px;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 1px;
  overflow: hidden;
}

.mission-stats__rate-fill {
  display: block;
  width: var(--fill);
  height: 100%;
  background: currentColor;
}

.rate--critical { color: var(--error); }
.rate--low { color: var(--xp-score); }
.rate--mid { color: var(--warning); }
.rate--high { color: var(--tier-platinum); }
.rate--top { color: var(--success); }
.rate--none { color: var(--text-tertiary); }

@media (max-width: 767px) {
  .mission-stats__row {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .mission-stats__number {
    justify-content: space-between;
  }
}
</style>
