<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useQueryParams } from '@/composables/useQueryParams'
import type { CampaignStatsParams, CampaignStatsStatus } from '@/types/api/statistics'
import type { MetricType, TableColumn, TimeRange, TimeSeriesPoint, UserRefDisplay } from '@/types/display'
import { TIME_RANGE_PARAMS } from '@/utils/constants'
import { storeCountry } from '@/utils/statsCountry'
import { computed, ref, watch } from 'vue'
import CampaignHardestNodes from './CampaignHardestNodes.vue'
import LeaderboardPicker from './LeaderboardPicker.vue'
import StatsFilterChips from './StatsFilterChips.vue'
import { fmtDecimal, fmtFraction, fmtInt, labelCase, plural, rateClass, toChartPoints } from './statsFormat'
import { useStatsBoard, type StatsBoardDef, type StatsRow } from './useStatsBoard'

defineProps<{
  accent: string
  countryOptions: { value: string; label: string }[]
}>()

type CampaignBoard = 'funnel' | 'trends' | 'most-completed' | 'top-creators'

interface CampaignBoardDef extends StatsBoardDef<CampaignBoard, CampaignStatsParams> {
  minParticipants: boolean
  creatorCountry: boolean
}

const STATUS_CHIPS: { key: CampaignStatsStatus; label: string }[] = [
  { key: 'published', label: 'Published' },
  { key: 'editing', label: 'Editing' },
  { key: 'curated', label: 'Curated' },
  { key: 'official', label: 'Official' },
  { key: 'loved', label: 'Loved' },
]

const rankCol: TableColumn = { key: 'rank', label: '#', align: 'right', mono: true, width: '76px' }
const playerCol: TableColumn = { key: 'player', label: 'Player', align: 'left' }

const BOARDS: CampaignBoardDef[] = [
  {
    key: 'funnel',
    label: 'Funnel',
    icon: 'gauge',
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
    minParticipants: false,
    creatorCountry: false,
    columns: [],
  },
  {
    key: 'most-completed',
    label: 'Most Completed',
    icon: 'trophy',
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

const { setQuery, queryRef, queryListRef } = useQueryParams()

const statusFilter = queryListRef<CampaignStatsStatus>('status')
const countryFilter = queryRef('country')
const minParticipantsParam = queryRef('minParticipants')
const openCampaign = queryRef('campaign')
const rangeParam = queryRef<TimeRange>('range')
const metricParam = queryRef<MetricType>('metric')

const minParticipants = computed(() => {
  const value = Number(minParticipantsParam.value)
  return minParticipantsParam.value && Number.isFinite(value) ? value : 3
})

function boardFilters(def: CampaignBoardDef): CampaignStatsParams {
  return {
    status: statusFilter.value,
    country: countryFilter.value || undefined,
    minParticipants: def.minParticipants ? minParticipants.value : undefined,
  }
}

const {
  activeBoard, boardDef, pickerOptions, selectBoard, rowTo, pushPlayer,
  currentPage, setPage, loading, rows, totalPages, totalElements,
} = useStatsBoard(BOARDS, { size: 20, filters: boardFilters })

const filters = computed(() => boardFilters(boardDef.value))

const openCampaignName = computed(
  () => (rows.value.find((r) => r.campaignId === openCampaign.value)?.name as string) ?? '',
)

const chartRange = computed<TimeRange>(() => (rangeParam.value in TIME_RANGE_PARAMS ? rangeParam.value as TimeRange : '30d'))

function setCountry(country: string) {
  storeCountry(country)
  countryFilter.value = country
}

function toggleStatus(status: CampaignStatsStatus) {
  const active = statusFilter.value
  statusFilter.value = active.includes(status) ? active.filter((v) => v !== status) : [...active, status]
}

function onRowClick(row: StatsRow) {
  if (pushPlayer(row)) return
  const campaignId = row.campaignId as string | undefined
  if (campaignId) setQuery({ campaign: campaignId }, { keepPage: true })
}

function segment(row: StatsRow, key: string): string {
  const total = Number(row.participants ?? 0)
  if (total <= 0) return '0%'
  return `${(Number(row[key] ?? 0) / total) * 100}%`
}

const TREND_METRICS: { key: MetricType; label: string }[] = [
  { key: 'campaignStarts', label: 'Campaigns Started' },
  { key: 'campaignCompletions', label: 'Campaigns Finished' },
]

const chartMetric = computed<MetricType>(() =>
  (TREND_METRICS.some((m) => m.key === metricParam.value) ? metricParam.value as MetricType : 'campaignStarts'))

const chartLoading = ref(false)
const chartPoints = ref<TimeSeriesPoint[]>([])

let chartRequestId = 0

async function fetchTrends() {
  const id = ++chartRequestId
  chartLoading.value = true
  try {
    const api = await import('@/api/statistics')
    const range = TIME_RANGE_PARAMS[chartRange.value]
    const points = chartMetric.value === 'campaignStarts'
      ? await api.getCampaignStartsPerDay(range, filters.value)
      : await api.getCampaignCompletionsPerDay(range, filters.value)
    if (id !== chartRequestId) return
    chartPoints.value = toChartPoints(points)
  } catch {
    if (id !== chartRequestId) return
    chartPoints.value = []
  }
  chartLoading.value = false
}

watch(
  () => activeBoard.value === 'trends'
    ? JSON.stringify([filters.value, chartRange.value, chartMetric.value])
    : null,
  (key) => { if (key) fetchTrends() },
  { immediate: true },
)
</script>

<template>
  <div class="campaign-stats" :style="{ '--accent': accent }">
    <div class="campaign-stats__filters">
      <div class="campaign-stats__row">
        <BaseSelect :model-value="countryFilter" :options="countryOptions" placeholder="All Countries" searchable
          @update:model-value="setCountry" />
        <label v-if="boardDef.minParticipants" class="campaign-stats__number">
          <span>Min participants</span>
          <input type="number" min="0" inputmode="numeric" :value="minParticipants"
            @change="minParticipantsParam = ($event.target as HTMLInputElement).value.trim()" />
        </label>
      </div>

      <StatsFilterChips label="Status" :options="STATUS_CHIPS" :selected="statusFilter" empty-label="All campaigns"
        @toggle="toggleStatus" @clear="statusFilter = []" />
    </div>

    <LeaderboardPicker :model-value="activeBoard" :options="pickerOptions"
      @update:model-value="selectBoard($event, { campaign: undefined })" />

    <template v-if="activeBoard === 'trends'">
      <div class="campaign-stats__chart">
        <TimeSeriesChart :data="chartPoints" :accent-color="accent" :available-metrics="TREND_METRICS"
          :selected-metric="chartMetric" :selected-range="chartRange"
          :metric-label="chartMetric === 'campaignStarts' ? 'Campaigns Started' : 'Campaigns Finished'"
          empty-message="Nothing recorded in this range yet."
          @update:selected-metric="metricParam = $event"
          @update:selected-range="rangeParam = $event" />
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
          ? 'No campaigns match these filters.'
          : 'No records found.'"
        @row-click="onRowClick">
        <template #cell-rank="{ value }">
          <span class="campaign-stats__rank">#{{ value }}</span>
        </template>

        <template #cell-player="{ row }">
          <UserChip :user="(row.player as UserRefDisplay)" tooltip />
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
        :campaign-name="openCampaignName" :country="countryFilter"
        @close="setQuery({ campaign: undefined }, { keepPage: true })" />
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

<style scoped src="./statsRates.css"></style>
