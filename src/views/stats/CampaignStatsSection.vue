<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import { STATS_CHART_RANGE_PARAMS } from '@/composables/useStatsChartConfig'
import { useStatsQueryState } from '@/composables/useStatsQueryState'
import type {
  CampaignStatsParams,
  CampaignStatsStatus,
  TimeSeriesPointResponse,
} from '@/types/api/statistics'
import type { MetricType, TableColumn, TimeRange, TimeSeriesPoint } from '@/types/display'
import type { Page, PaginationParams } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'
import CampaignHardestNodes from './CampaignHardestNodes.vue'
import LeaderboardPicker from './LeaderboardPicker.vue'
import LeaderboardPlayerCell from './LeaderboardPlayerCell.vue'
import StatsFilterChips from './StatsFilterChips.vue'
import { fmtDecimal, fmtFraction, fmtInt, labelCase, plural, rateClass } from './statsFormat'

defineProps<{
  accent: string
  countryOptions: { value: string; label: string }[]
}>()

type CampaignBoard = 'funnel' | 'trends' | 'most-completed' | 'top-creators'
type StatsApi = typeof import('@/api/statistics')

interface CampaignBoardDef {
  key: CampaignBoard
  label: string
  icon: string
  description: string
  columns: TableColumn[]
  minParticipants: boolean
  creatorCountry: boolean
  players?: boolean
  fetch?: (api: StatsApi, params: PaginationParams, filters: CampaignStatsParams) => Promise<Page<unknown>>
}

const STATUS_CHIPS: { key: CampaignStatsStatus; label: string; hint: string }[] = [
  { key: 'published', label: 'Published', hint: 'Live and playable' },
  { key: 'editing', label: 'Editing', hint: 'Still a draft' },
  { key: 'curated', label: 'Curated', hint: 'Rewards-eligible' },
  { key: 'official', label: 'Official', hint: 'Curator flag, not a lifecycle state' },
  { key: 'loved', label: 'Loved', hint: 'Curator flag, not a lifecycle state' },
]

const rankCol: TableColumn = { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' }
const playerCol: TableColumn = { key: 'player', label: 'Player', align: 'left' }

const BOARDS: CampaignBoardDef[] = [
  {
    key: 'funnel',
    label: 'Funnel',
    icon: 'gauge',
    description: 'Started to finished',
    minParticipants: true,
    creatorCountry: false,
    columns: [
      { key: 'campaign', label: 'Campaign', align: 'left' },
      { key: 'participants', label: 'Started', align: 'right', mono: true, width: '90px' },
      { key: 'split', label: 'Split', align: 'left', width: '150px' },
      { key: 'completionRate', label: 'Finished', align: 'right', mono: true, width: '100px' },
      { key: 'abandonRate', label: 'Abandoned', align: 'right', mono: true, width: '125px' },
      { key: 'medianDaysToComplete', label: 'Median days', align: 'right', mono: true, width: '140px' },
      { key: 'nodeCount', label: 'Nodes', align: 'right', mono: true, width: '80px' },
    ],
    fetch: (api, params, filters) => api.getCampaignFunnel(params, filters),
  },
  {
    key: 'trends',
    label: 'Trends',
    icon: 'trending',
    description: 'Starts and finishes',
    minParticipants: false,
    creatorCountry: false,
    columns: [],
  },
  {
    key: 'most-completed',
    label: 'Most Completed',
    icon: 'trophy',
    description: 'Top campaign finishers',
    minParticipants: false,
    creatorCountry: false,
    players: true,
    columns: [
      rankCol, playerCol,
      { key: 'completed', label: 'Completed', align: 'right', mono: true, width: '125px' },
      { key: 'inProgress', label: 'In Progress', align: 'right', mono: true, width: '135px' },
      { key: 'nodesCleared', label: 'Nodes', align: 'right', mono: true, width: '100px' },
      { key: 'campaignXp', label: 'Campaign XP', align: 'right', mono: true, width: '145px' },
    ],
    fetch: (api, params, filters) => api.getMostCampaignsCompleted(params, filters),
  },
  {
    key: 'top-creators',
    label: 'Top Creators',
    icon: 'award',
    description: 'Builders by reach',
    minParticipants: false,
    creatorCountry: true,
    players: true,
    columns: [
      rankCol,
      { key: 'player', label: 'Creator', align: 'left' },
      { key: 'campaigns', label: 'Built', align: 'right', mono: true, width: '90px' },
      { key: 'curatedCampaigns', label: 'Curated', align: 'right', mono: true, width: '100px' },
      { key: 'participants', label: 'Players', align: 'right', mono: true, width: '100px' },
      { key: 'completions', label: 'Completions', align: 'right', mono: true, width: '140px' },
      { key: 'completionRate', label: 'Rate', align: 'right', mono: true, width: '90px' },
    ],
    fetch: (api, params, filters) => api.getTopCampaignCreators(params, filters),
  },
]

const BOARD_MAP = new Map<CampaignBoard, CampaignBoardDef>(BOARDS.map((b) => [b.key, b]))
const pickerOptions = BOARDS.map((b) => ({ key: b.key, label: b.label, icon: b.icon, description: b.description }))
const RANGE_KEYS = Object.keys(STATS_CHART_RANGE_PARAMS) as TimeRange[]

const router = useRouter()
const { currentPage, param, multiParam, numberParam, patch, setParam, toggleMulti, setPage } = useStatsQueryState()

const activeBoard = computed<CampaignBoard>(() => {
  const board = param('board') as CampaignBoard
  return BOARD_MAP.has(board) ? board : 'funnel'
})
const boardDef = computed(() => BOARD_MAP.get(activeBoard.value) as CampaignBoardDef)

const statusFilter = computed(() => multiParam('status'))
const countryFilter = computed(() => param('country'))
const minParticipants = computed(() => numberParam('minParticipants') ?? 3)
const openCampaign = computed(() => param('campaign'))
const openCampaignName = computed(
  () => (rows.value.find((r) => r.campaignId === openCampaign.value)?.name as string) ?? '',
)

const chartRange = computed<TimeRange>(() => {
  const range = param('range') as TimeRange
  return RANGE_KEYS.includes(range) ? range : '30d'
})

const filters = computed<CampaignStatsParams>(() => ({
  status: statusFilter.value as CampaignStatsStatus[],
  country: countryFilter.value || undefined,
  minParticipants: boardDef.value.minParticipants ? minParticipants.value : undefined,
}))

function selectBoard(board: CampaignBoard) {
  patch({ board: board === 'funnel' ? undefined : board, campaign: undefined })
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
  const campaignId = row.campaignId as string | undefined
  if (campaignId) patch({ campaign: campaignId }, true)
}

const loading = ref(false)
const pageData = ref<Page<unknown> | null>(null)
const pageBoard = ref<CampaignBoard | null>(null)

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

function segment(row: Record<string, unknown>, key: string): string {
  const total = Number(row.participants ?? 0)
  if (total <= 0) return '0%'
  return `${(Number(row[key] ?? 0) / total) * 100}%`
}

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
    console.error('Failed to fetch campaign stats:', error)
    pageData.value = null
    pageBoard.value = def.key
  }
  loading.value = false
}

const TREND_METRICS: { key: MetricType; label: string }[] = [
  { key: 'campaignStarts', label: 'Campaigns Started' },
  { key: 'campaignCompletions', label: 'Campaigns Finished' },
]

const chartMetric = computed<MetricType>(() => {
  const metric = param('metric') as MetricType
  return TREND_METRICS.some((m) => m.key === metric) ? metric : 'campaignStarts'
})

const chartLoading = ref(false)
const chartPoints = ref<TimeSeriesPoint[]>([])

function toChartPoints(data: TimeSeriesPointResponse[]): TimeSeriesPoint[] {
  return data.map((d) => ({ timestamp: new Date(d.date).getTime(), value: d.value }))
}

let chartRequestId = 0

async function fetchTrends() {
  const id = ++chartRequestId
  chartLoading.value = true
  try {
    const api = await import('@/api/statistics')
    const range = STATS_CHART_RANGE_PARAMS[chartRange.value]
    const points = chartMetric.value === 'campaignStarts'
      ? await api.getCampaignStartsPerDay(range, filters.value)
      : await api.getCampaignCompletionsPerDay(range, filters.value)
    if (id !== chartRequestId) return
    chartPoints.value = toChartPoints(points)
  } catch (error) {
    if (id !== chartRequestId) return
    console.error('Failed to fetch campaign trends:', error)
    chartPoints.value = []
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
  <div class="campaign-stats" :style="{ '--accent': accent }">
    <div class="campaign-stats__filters">
      <div class="campaign-stats__row">
        <BaseSelect :model-value="countryFilter" :options="countryOptions" placeholder="All Countries" searchable
          @update:model-value="setParam('country', $event)" />
        <label v-if="boardDef.minParticipants" class="campaign-stats__number">
          <span>Min participants</span>
          <input type="number" min="0" inputmode="numeric" :value="minParticipants"
            @change="patch({ minParticipants: ($event.target as HTMLInputElement).value.trim() || undefined })" />
        </label>
      </div>

      <StatsFilterChips label="Status" :options="STATUS_CHIPS" :selected="statusFilter" empty-label="All campaigns"
        @toggle="toggleMulti('status', $event)" @clear="patch({ status: undefined })" />
    </div>

    <LeaderboardPicker :model-value="activeBoard" :options="pickerOptions"
      @update:model-value="selectBoard($event as CampaignBoard)" />

    <template v-if="activeBoard === 'trends'">
      <div class="campaign-stats__chart">
        <TimeSeriesChart :data="chartPoints" :accent-color="accent" :available-metrics="TREND_METRICS"
          :selected-metric="chartMetric" :selected-range="chartRange"
          :metric-label="chartMetric === 'campaignStarts' ? 'Campaigns Started' : 'Campaigns Finished'"
          empty-message="Nothing recorded in this range yet."
          @update:selected-metric="setParam('metric', $event)"
          @update:selected-range="setParam('range', $event)" />
        <div v-if="chartLoading" class="campaign-stats__chart-skeleton">
          <SkeletonLoader variant="card" height="300px" />
        </div>
      </div>
    </template>

    <template v-else>
      <p v-if="totalElements > 0" class="campaign-stats__count">{{ plural(totalElements, 'row') }}</p>


      <DataTable :columns="boardDef.columns" :rows="rows" :loading="loading" :loading-rows="10" row-key="rank"
        :row-clickable="activeBoard === 'funnel' || !!boardDef.players" :row-to="rowTo"
        :empty-message="activeBoard === 'funnel'
          ? 'No campaigns match these filters. Try lowering the minimum participants.'
          : 'No records found.'"
        @row-click="onRowClick">
        <template #cell-rank="{ value }">
          <span class="campaign-stats__rank">#{{ value }}</span>
        </template>

        <template #cell-player="{ row }">
          <LeaderboardPlayerCell :user-id="(row.userId as string)" :user-name="(row.userName as string)"
            :avatar-url="(row.avatarUrl as string)"
            :avatar-fallback-url="(row.avatarFallbackUrl as string | null)" :country="(row.country as string)" />
        </template>

        <template #cell-campaign="{ row }">
          <span class="campaign-cell">
            <GlowImage v-if="row.iconUrl" :src="(row.iconUrl as string)" alt="" :size="28" hide-on-error />
            <span class="campaign-cell__text">
              <span class="campaign-cell__name">{{ row.name }}</span>
              <span class="campaign-cell__flags">
                <span class="campaign-cell__status">{{ labelCase(row.status) }}</span>
                <span v-if="row.official" class="campaign-cell__flag">Official</span>
                <span v-if="row.loved" class="campaign-cell__flag">Loved</span>
              </span>
            </span>
          </span>
        </template>

        <template #cell-split="{ row }">
          <span class="split"
            :title="fmtInt(row.completed) + ' finished, ' + fmtInt(row.inProgress) + ' playing, ' + fmtInt(row.abandoned) + ' abandoned'">
            <span class="split__seg split__seg--done" :style="{ width: segment(row, 'completed') }" />
            <span class="split__seg split__seg--playing" :style="{ width: segment(row, 'inProgress') }" />
            <span class="split__seg split__seg--gone" :style="{ width: segment(row, 'abandoned') }" />
          </span>
        </template>

        <template #cell-participants="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-nodeCount="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-completionRate="{ value }">
          <span :class="rateClass(value as number | null)">{{ fmtFraction(value) }}</span>
        </template>
        <template #cell-abandonRate="{ value }">{{ fmtFraction(value) }}</template>
        <template #cell-medianDaysToComplete="{ value }">{{ fmtDecimal(value) }}</template>
        <template #cell-completed="{ value }"><span class="campaign-stats__strong">{{ fmtInt(value) }}</span></template>
        <template #cell-inProgress="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-nodesCleared="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-campaignXp="{ value }">{{ fmtDecimal(value, 0) }}</template>
        <template #cell-campaigns="{ value }"><span class="campaign-stats__strong">{{ fmtInt(value) }}</span></template>
        <template #cell-curatedCampaigns="{ value }">{{ fmtInt(value) }}</template>
        <template #cell-completions="{ value }">{{ fmtInt(value) }}</template>
      </DataTable>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

      <CampaignHardestNodes v-if="openCampaign && activeBoard === 'funnel'" :campaign-id="openCampaign"
        :campaign-name="openCampaignName" :country="countryFilter" @close="patch({ campaign: undefined }, true)" />
    </template>
  </div>
</template>

<style scoped>
.campaign-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  --page-accent: var(--accent);
}

.campaign-stats__filters {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.campaign-stats__row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.campaign-stats__number {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.campaign-stats__number input {
  width: 72px;
  padding: var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.campaign-stats__number input:focus {
  outline: none;
  border-color: var(--page-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent) 20%, transparent);
}

.campaign-stats__chart {
  position: relative;
}

.campaign-stats__chart-skeleton {
  position: absolute;
  inset: 0;
}

.campaign-stats__count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: right;
}

.campaign-stats__rank {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.campaign-stats__strong {
  color: var(--page-accent);
  font-weight: 600;
}

.campaign-cell {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.campaign-cell__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.campaign-cell__name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.campaign-cell__flags {
  display: flex;
  gap: var(--space-sm);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.campaign-cell__status {
  color: var(--text-tertiary);
}

.campaign-cell__flag {
  color: var(--page-accent);
}

.split {
  display: flex;
  width: 100%;
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 1px;
  overflow: hidden;
}

.split__seg {
  height: 100%;
}

.split__seg--done { background: var(--success); }
.split__seg--playing { background: var(--info); }
.split__seg--gone { background: var(--error); }

@media (max-width: 767px) {
  .campaign-stats__row {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .campaign-stats__number {
    justify-content: space-between;
  }
}
</style>
