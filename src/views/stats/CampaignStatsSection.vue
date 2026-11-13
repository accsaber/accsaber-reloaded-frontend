<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import { useQueryParams } from '@/composables/useQueryParams'
import type { CampaignStatsParams, CampaignStatsStatus } from '@/types/api/statistics'
import { computed } from 'vue'
import CampaignHardestNodes from './CampaignHardestNodes.vue'
import StatsBar from './StatsBar.vue'
import StatsBoardPicker from './StatsBoardPicker.vue'
import StatsCountrySelect from './StatsCountrySelect.vue'
import StatsFilters, { type StatsFilterGroup } from './StatsFilters.vue'
import StatsNameCell from './StatsNameCell.vue'
import StatsTable from './StatsTable.vue'
import { fmt, labelCase, mainCol, numCol, playerCol, rankCol, rateCol } from './statsFormat'
import { useStatsBoard, type StatsBoardDef, type StatsRow } from './useStatsBoard'
import { useStatsTrends } from './useStatsTrends'

type CampaignBoard = 'funnel' | 'trends' | 'most-completed' | 'top-creators'

interface CampaignBoardDef extends StatsBoardDef<CampaignBoard, CampaignStatsParams> {
  minParticipants?: boolean
}

const STATUSES: CampaignStatsStatus[] = ['published', 'editing', 'curated', 'official', 'loved']

function playingRate(_: unknown, row: StatsRow): string {
  const total = Number(row.participants ?? 0)
  return fmt.rate(total > 0 ? Number(row.inProgress ?? 0) / total : null)
}

const BOARDS: CampaignBoardDef[] = [
  {
    key: 'funnel',
    label: 'Funnel', icon: 'gauge',
    minParticipants: true,
    columns: [
      { key: 'campaign', label: 'Campaign', align: 'left' },
      numCol('participants', 'Started', 90),
      { ...rateCol('completionRate', 'Finished', 100), primary: true },
      numCol('inProgress', 'Playing', 100, playingRate),
      numCol('abandonRate', 'Abandoned', 120, fmt.rate),
      numCol('medianDaysToComplete', 'Median Days', 130, fmt.decimal),
      numCol('nodeCount', 'Nodes', 80),
    ],
    fetch: (api, params, filters) => api.getCampaignFunnel(params, filters),
  },
  { key: 'trends', label: 'Trends', icon: 'trending', columns: [] },
  {
    key: 'most-completed',
    label: 'Most Completed', icon: 'trophy',
    players: true,
    columns: [
      rankCol, playerCol,
      mainCol('completed', 'Completed', 120),
      numCol('inProgress', 'In Progress', 130),
      numCol('nodesCleared', 'Nodes', 100),
      numCol('campaignXp', 'Campaign XP', 140, fmt.whole),
    ],
    fetch: (api, params, filters) => api.getMostCampaignsCompleted(params, filters),
  },
  {
    key: 'top-creators',
    label: 'Top Creators', icon: 'award',
    players: true,
    columns: [
      rankCol,
      { ...playerCol, label: 'Creator' },
      mainCol('campaigns', 'Built', 90),
      numCol('curatedCampaigns', 'Curated', 100),
      numCol('participants', 'Players', 100),
      numCol('completions', 'Completions', 130),
      rateCol('completionRate', 'Rate', 90),
    ],
    fetch: (api, params, filters) => api.getTopCampaignCreators(params, filters),
  },
]

const { setQuery, queryRef, queryListRef } = useQueryParams()

const statusFilter = queryListRef<CampaignStatsStatus>('status')
const countryFilter = queryRef('country')
const minParticipantsParam = queryRef('minParticipants')
const openCampaign = queryRef('campaign')

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
  activeBoard, boardDef, boardOptions, selectBoard, rowTo, pushPlayer,
  currentPage, setPage, loading, rows, totalPages, totalElements,
} = useStatsBoard(BOARDS, { filters: boardFilters })

const filters = computed(() => boardFilters(boardDef.value))

const filterGroups = computed<StatsFilterGroup[]>(() => [
  { key: 'status', label: 'Status', options: STATUSES.map((s) => ({ key: s, label: labelCase(s) })), selected: statusFilter.value },
])

const openCampaignName = computed(
  () => (rows.value.find((r) => r.campaignId === openCampaign.value)?.name as string) ?? '',
)

function onRowClick(row: StatsRow) {
  if (pushPlayer(row)) return
  const campaignId = row.campaignId as string | undefined
  if (campaignId && activeBoard.value === 'funnel') setQuery({ campaign: campaignId }, { keepPage: true })
}

function campaignMeta(row: StatsRow): string {
  return [labelCase(row.status), row.official ? 'Official' : '', row.loved ? 'Loved' : ''].filter(Boolean).join(' · ')
}

const trends = useStatsTrends({
  metrics: [
    { key: 'campaignStarts', label: 'Campaigns Started' },
    { key: 'campaignCompletions', label: 'Campaigns Finished' },
  ],
  active: () => activeBoard.value === 'trends',
  filters: () => filters.value,
  load: async (api, range, metric) => ({
    points: metric === 'campaignStarts'
      ? await api.getCampaignStartsPerDay(range, filters.value)
      : await api.getCampaignCompletionsPerDay(range, filters.value),
  }),
})
</script>

<template>
  <CampaignHardestNodes v-if="openCampaign && activeBoard === 'funnel'" :campaign-id="openCampaign"
    :campaign-name="openCampaignName" :country="countryFilter"
    @close="setQuery({ campaign: undefined }, { keepPage: true })" />

  <div v-else class="stats-section">
    <StatsBoardPicker :model-value="activeBoard" :options="boardOptions"
      @update:model-value="selectBoard($event, { campaign: undefined })" />

    <StatsBar :count="activeBoard === 'trends' ? 0 : totalElements">
      <StatsCountrySelect />
      <StatsFilters :groups="filterGroups" :active="!!boardDef.minParticipants && minParticipants !== 3"
        @change="(key, selected) => setQuery({ [key]: selected })">
        <BaseInput v-if="boardDef.minParticipants" label="Min Participants" type="number" min="0"
          inputmode="numeric" :model-value="minParticipants"
          @change="minParticipantsParam = ($event.target as HTMLInputElement).value.trim()" />
      </StatsFilters>
    </StatsBar>

    <TimeSeriesChart v-if="activeBoard === 'trends'" :data="trends.points.value" :loading="trends.loading.value"
      :available-metrics="trends.metrics" :selected-metric="trends.metric.value.key"
      :selected-range="trends.range.value" :metric-label="trends.metric.value.label"
      empty-message="Nothing recorded in this range yet"
      @update:selected-metric="trends.setMetric" @update:selected-range="trends.setRange" />

    <StatsTable v-else :columns="boardDef.columns" :rows="rows" :loading="loading" :page="currentPage"
      :total-pages="totalPages" :row-to="rowTo" :row-clickable="activeBoard === 'funnel'"
      :empty-message="activeBoard === 'funnel' ? 'No campaigns match these filters' : 'No records found'"
      @row-click="onRowClick" @update:page="setPage">
      <template #cell-campaign="{ row }">
        <StatsNameCell :name="(row.name as string)" :meta="campaignMeta(row)" :icon="(row.iconUrl as string | null)"
          icon-slot />
      </template>
    </StatsTable>
  </div>
</template>
