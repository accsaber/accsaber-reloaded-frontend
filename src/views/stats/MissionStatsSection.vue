<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import { useQueryParams } from '@/composables/useQueryParams'
import { useCategoryStore } from '@/stores/categories'
import type { MissionBand, MissionPool, MissionType } from '@/types/api/missions'
import type { DistributionEntryResponse, MissionStatsParams, MissionTier } from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import { computed } from 'vue'
import DistributionRanking from './DistributionRanking.vue'
import MissionCalibrationDetail from './MissionCalibrationDetail.vue'
import StatsBar from './StatsBar.vue'
import StatsBoardPicker from './StatsBoardPicker.vue'
import StatsCountrySelect from './StatsCountrySelect.vue'
import StatsFilters, { type StatsFilterGroup } from './StatsFilters.vue'
import StatsNameCell from './StatsNameCell.vue'
import StatsTable from './StatsTable.vue'
import {
  MISSION_TIER_LABELS,
  MISSION_TIER_ORDER,
  NO_VALUE,
  fmt,
  labelCase,
  mainCol,
  numCol,
  playerCol,
  rankCol,
  rateCol,
} from './statsFormat'
import { useStatsBoard, type StatsBoardDef, type StatsRow } from './useStatsBoard'
import { useStatsTrends } from './useStatsTrends'

type MissionBoard = 'calibration' | 'xp' | 'trends' | 'most-completed' | 'most-mission-xp'
type MissionFilterKey = 'pool' | 'type' | 'band' | 'category' | 'tier' | 'skillRange' | 'minAssigned' | 'range'

interface MissionBoardDef extends StatsBoardDef<MissionBoard, MissionStatsParams> {
  filters: MissionFilterKey[]
}

const POOLS: MissionPool[] = ['daily', 'weekly', 'event', 'community']
const BANDS: MissionBand[] = ['easy', 'medium', 'hard', 'extreme']

const MISSION_TYPES: MissionType[] = [
  'PLAY_N_MAPS', 'XP_IN_WINDOW', 'ACC_ON_MAP', 'AP_ON_MAP', 'PB_SPECIFIC_MAP', 'PB_ABOVE_THRESHOLD',
  'SNIPE_PLAYER_ON_MAP', 'STREAK_ON_MAP', 'STREAK_N_IN_CATEGORY', 'STREAK_SUM_N', 'COMEBACK_PB', 'SCORES_N',
  'SNIPE_RIVAL_ANY_MAP', 'AP_GAIN_OVERALL', 'BATCH_PLAY_N', 'PB_RANKED_BEFORE_N', 'CAMPAIGN_COMPLETE_N',
]

const templateCol: TableColumn = { key: 'template', label: 'Template', align: 'left' }

const BOARDS: MissionBoardDef[] = [
  {
    key: 'calibration',
    label: 'Calibration', icon: 'gauge',
    filters: ['pool', 'type', 'band', 'category', 'tier', 'skillRange', 'minAssigned'],
    columns: [
      templateCol,
      {
        key: 'tier', label: 'Tier', align: 'left', width: '110px',
        format: (value) => (value ? MISSION_TIER_LABELS[value as MissionTier] : NO_VALUE),
        cellClass: (value) => (value === 'unknown' ? 'stats-dim' : undefined),
      },
      numCol('assigned', 'Assigned', 110),
      numCol('completed', 'Done', 80),
      { ...rateCol('completionRate', 'Rate', 90), primary: true },
      numCol('progressed', 'Progressed', 120),
      numCol('averageXpReward', 'Avg XP', 100, fmt.decimal),
    ],
    fetch: (api, params, filters) => api.getMissionCalibration(params, filters),
  },
  {
    key: 'xp',
    label: 'XP Payouts', icon: 'gem',
    filters: ['pool', 'type', 'band', 'category', 'tier', 'skillRange'],
    columns: [
      templateCol,
      numCol('completed', 'Done', 80),
      mainCol('xpPaid', 'XP Paid', 110),
      numCol('averageXp', 'Avg', 90, fmt.decimal),
      numCol('medianXp', 'Median', 100, fmt.decimal),
      numCol('p90Xp', 'P90', 90, fmt.decimal),
      numCol('shareOfMissionXp', 'Share', 90, fmt.rate),
      numCol('itemsAwarded', 'Items', 90),
    ],
    fetch: (api, params, filters) => api.getMissionXpPayouts(params, filters),
  },
  {
    key: 'trends',
    label: 'Trends', icon: 'trending',
    filters: ['pool', 'type', 'band', 'tier', 'range'],
    columns: [],
  },
  {
    key: 'most-completed',
    label: 'Most Completed', icon: 'trophy',
    filters: ['pool', 'type', 'tier'],
    players: true,
    columns: [rankCol, playerCol, mainCol('missionsCompleted', 'Missions', 120), numCol('missionXp', 'Mission XP', 140, fmt.whole)],
    fetch: (api, params, filters) => api.getMostMissionsCompleted(params, filters),
  },
  {
    key: 'most-mission-xp',
    label: 'Most Mission XP', icon: 'star',
    filters: [],
    players: true,
    columns: [rankCol, playerCol, mainCol('missionXp', 'Mission XP', 140, fmt.whole), numCol('missionsCompleted', 'Missions', 120)],
    fetch: (api, params, filters) => api.getMostMissionXp(params, filters.country),
  },
]

const SKILL_TABS = [
  { key: 'tier', label: 'Tiers' },
  { key: 'range', label: 'Skill Range' },
]

const categoryStore = useCategoryStore()
const { setQuery, queryRef, queryListRef } = useQueryParams()

const poolFilter = queryListRef<MissionPool>('pool')
const bandFilter = queryListRef<MissionBand>('band')
const tierFilter = queryListRef<MissionTier>('tier')
const typeFilter = queryRef<MissionType>('type')
const categoryFilter = queryRef('category')
const countryFilter = queryRef('country')
const openTemplate = queryRef('template')
const skillModeParam = queryRef('skillMode')
const skillMinParam = queryRef('skillMin')
const skillMaxParam = queryRef('skillMax')
const minAssignedParam = queryRef('minAssigned')

function toNumber(raw: string): number | undefined {
  const value = Number(raw)
  return raw && Number.isFinite(value) ? value : undefined
}

const skillMode = computed<'tier' | 'range'>(() => (skillModeParam.value === 'range' ? 'range' : 'tier'))
const skillMin = computed(() => toNumber(skillMinParam.value))
const skillMax = computed(() => toNumber(skillMaxParam.value))
const minAssigned = computed(() => toNumber(minAssignedParam.value) ?? 1)
const categoryIds = computed(() => {
  const id = categoryStore.getCategoryId(categoryFilter.value)
  return id ? [id] : undefined
})

function boardFilters(def: MissionBoardDef): MissionStatsParams {
  const has = (filter: MissionFilterKey) => def.filters.includes(filter)
  const useTiers = skillMode.value === 'tier'
  return {
    pool: has('pool') ? poolFilter.value : undefined,
    type: has('type') && typeFilter.value ? [typeFilter.value] : undefined,
    band: has('band') ? bandFilter.value : undefined,
    categoryId: has('category') ? categoryIds.value : undefined,
    tier: has('tier') && useTiers ? tierFilter.value : undefined,
    skillMin: has('skillRange') && !useTiers ? skillMin.value : undefined,
    skillMax: has('skillRange') && !useTiers ? skillMax.value : undefined,
    country: countryFilter.value || undefined,
    minAssigned: has('minAssigned') ? minAssigned.value : undefined,
  }
}

const {
  activeBoard, boardDef, boardOptions, selectBoard, rowTo, pushPlayer,
  currentPage, setPage, loading, rows, totalPages, totalElements,
} = useStatsBoard(BOARDS, { filters: boardFilters })

const shows = (filter: MissionFilterKey) => boardDef.value.filters.includes(filter)
const filters = computed(() => boardFilters(boardDef.value))

const detailFilters = computed<MissionStatsParams>(() => ({
  pool: poolFilter.value,
  band: bandFilter.value,
  categoryId: categoryIds.value,
  tier: skillMode.value === 'tier' ? tierFilter.value : undefined,
  skillMin: skillMode.value === 'range' ? skillMin.value : undefined,
  skillMax: skillMode.value === 'range' ? skillMax.value : undefined,
  country: countryFilter.value || undefined,
}))

const categoryOptions = computed(() => [
  { value: '', label: 'All Categories' },
  ...categoryStore.categories.map((c) => ({ value: c.code, label: c.name })),
])

const typeOptions = [
  { value: '', label: 'All Types' },
  ...MISSION_TYPES.map((t) => ({ value: t, label: labelCase(t) })),
]

const TIER_TOGGLES = MISSION_TIER_ORDER.map((t) => ({ key: t, label: MISSION_TIER_LABELS[t] }))

const filterGroups = computed<StatsFilterGroup[]>(() => [
  ...(shows('pool')
    ? [{ key: 'pool', label: 'Pool', options: POOLS.map((p) => ({ key: p, label: labelCase(p) })), selected: poolFilter.value }]
    : []),
  ...(shows('band')
    ? [{ key: 'band', label: 'Band', options: BANDS.map((b) => ({ key: b, label: labelCase(b) })), selected: bandFilter.value }]
    : []),
])

const extraFiltersActive = computed(
  () =>
    tierFilter.value.length > 0 || skillMin.value !== undefined || skillMax.value !== undefined || minAssigned.value !== 1,
)

function setGroup(key: string, selected: string[]) {
  setQuery({ [key]: selected })
}

function toggleTier(tier: string) {
  const active = tierFilter.value as string[]
  setQuery({ tier: active.includes(tier) ? active.filter((t) => t !== tier) : [...active, tier] })
}

function setSkillMode(mode: string) {
  setQuery({ skillMode: mode === 'tier' ? undefined : mode, tier: undefined, skillMin: undefined, skillMax: undefined })
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value.trim()
}

function onRowClick(row: StatsRow) {
  if (pushPlayer(row)) return
  const templateId = row.templateId as string | undefined
  if (templateId && activeBoard.value === 'calibration') setQuery({ template: templateId }, { keepPage: true })
}

function templateMeta(row: StatsRow): string {
  return [labelCase(row.pool), row.band ? labelCase(row.band) : '', row.categoryName].filter(Boolean).join(' · ')
}

const stillAccruing = computed(() => {
  if (activeBoard.value !== 'calibration' || !rows.value.length) return false
  return rows.value.every((row) => Number(row.expired ?? 0) === 0)
})

const trends = useStatsTrends<DistributionEntryResponse[]>({
  metrics: [
    { key: 'missionCompletionRate', label: 'Completion Rate' },
    { key: 'missionCompletions', label: 'Missions Completed' },
  ],
  active: () => activeBoard.value === 'trends',
  filters: () => filters.value,
  load: async (api, range, metric) => {
    const scope = filters.value
    const [points, types] = await Promise.all([
      metric === 'missionCompletionRate'
        ? api.getMissionCompletionRate(range, scope)
        : api.getMissionCompletionsPerDay(range, {
          pool: scope.pool, type: scope.type, tier: scope.tier, country: scope.country,
        }),
      api.getMissionCompletionsByType({ pool: scope.pool, tier: scope.tier, country: scope.country }),
    ])
    return { points, extra: types.map((entry) => ({ ...entry, label: labelCase(entry.label) })) }
  },
})

const isRateMetric = computed(() => trends.metric.value.key === 'missionCompletionRate')
</script>

<template>
  <MissionCalibrationDetail v-if="openTemplate && activeBoard === 'calibration'" :template-id="openTemplate"
    :filters="detailFilters" @close="setQuery({ template: undefined }, { keepPage: true })" />

  <div v-else class="stats-section">
    <StatsBoardPicker :model-value="activeBoard" :options="boardOptions"
      @update:model-value="selectBoard($event, { template: undefined })" />

    <StatsBar :count="activeBoard === 'trends' ? 0 : totalElements">
      <StatsCountrySelect />
      <BaseSelect v-if="shows('type')" :model-value="typeFilter" :options="typeOptions" placeholder="All Types"
        searchable @update:model-value="typeFilter = $event as MissionType" />
      <BaseSelect v-if="shows('category')" :model-value="categoryFilter" :options="categoryOptions"
        placeholder="All Categories" @update:model-value="categoryFilter = $event" />
      <StatsFilters v-if="shows('pool') || shows('tier')" :groups="filterGroups" :active="extraFiltersActive"
        @change="setGroup">
        <template v-if="shows('tier')">
          <h4 class="field-label mission-stats__label">Skill</h4>
          <BaseTabs v-if="shows('skillRange')" variant="segmented" label="Skill filter" :tabs="SKILL_TABS"
            :model-value="skillMode" @update:model-value="setSkillMode" />
          <ChartToggleGroup v-if="skillMode === 'tier' || !shows('skillRange')" :toggles="TIER_TOGGLES"
            :active="tierFilter" label="Tier" @select="toggleTier" />
          <div v-else class="mission-stats__range">
            <BaseInput label="Skill Min" type="number" inputmode="numeric" :model-value="skillMin ?? ''"
              @change="skillMinParam = inputValue($event)" />
            <BaseInput label="Skill Max" type="number" inputmode="numeric" :model-value="skillMax ?? ''"
              @change="skillMaxParam = inputValue($event)" />
          </div>
        </template>
        <BaseInput v-if="shows('minAssigned')" label="Min Assigned" type="number" min="1" inputmode="numeric"
          :model-value="minAssigned" @change="minAssignedParam = inputValue($event)" />
      </StatsFilters>
    </StatsBar>

    <template v-if="activeBoard === 'trends'">
      <TimeSeriesChart :data="trends.points.value" :loading="trends.loading.value"
        :available-metrics="trends.metrics" :selected-metric="trends.metric.value.key"
        :selected-range="trends.range.value" :metric-label="trends.metric.value.label"
        :format-value="isRateMetric ? fmt.percentPoint : undefined"
        empty-message="Nothing recorded in this range yet"
        @update:selected-metric="trends.setMetric" @update:selected-range="trends.setRange" />
      <DistributionRanking title="Completions by Type" :entries="trends.extra.value ?? []" :max-entries="10" />
    </template>

    <template v-else>
      <p v-if="stillAccruing" class="caption">No missions in view have expired yet</p>

      <StatsTable :columns="boardDef.columns" :rows="rows" :loading="loading" :page="currentPage"
        :total-pages="totalPages" :row-to="rowTo" :row-clickable="activeBoard === 'calibration'"
        :empty-message="activeBoard === 'calibration' ? 'No missions match these filters yet' : 'No records found'"
        @row-click="onRowClick" @update:page="setPage">
        <template #cell-template="{ row }">
          <StatsNameCell :name="(row.templateName as string)" :meta="templateMeta(row)" />
        </template>
      </StatsTable>
    </template>
  </div>
</template>

<style scoped>
.mission-stats__label {
  margin: 0 0 calc(-1 * var(--space-sm));
}

.mission-stats__range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}
</style>
