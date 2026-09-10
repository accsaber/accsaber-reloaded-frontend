<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type {
  ComplexityDatasetKind,
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityPlayerBoard,
  EstimateScenario,
} from '@/types/api/complexity'
import type { CategoryCode, ChartToggle, Tab } from '@/types/display'
import type { MapDifficultyStatus } from '@/types/enums'
import { getApiErrorMessage } from '@/api/client'
import { ESTIMATE_SCENARIOS, SCENARIO_LABELS, movesUnder } from '@/utils/complexity'
import { saveBlob } from '@/utils/download'
import { formatCount, formatRelativeDate } from '@/utils/formatters'
import ApplyScenarioModal from './complexity/ApplyScenarioModal.vue'
import ComplexityMapModal from './complexity/ComplexityMapModal.vue'
import ComplexityMapsTable from './complexity/ComplexityMapsTable.vue'
import ComplexityPlayersTable from './complexity/ComplexityPlayersTable.vue'
import LadderStrip from './complexity/LadderStrip.vue'
import { estimateHealth } from './complexity/estimates'
import ReweightTab from './ReweightTab.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

usePageMeta({
  title: 'Reweight Maps | AccSaber Ranking',
  description: 'Compare the complexity scripts map by map and player by player, then apply one.',
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const isHead = computed(() => authStore.hasRole('RANKING_HEAD'))

type PanelTab = 'maps' | 'worth' | 'players' | 'votes'

const STATUSES: MapDifficultyStatus[] = ['RANKED', 'QUALIFIED', 'QUEUE']

const scenarioToggles: ChartToggle[] = ESTIMATE_SCENARIOS.map((scenario) => ({
  key: scenario,
  label: SCENARIO_LABELS[scenario],
  color: 'var(--page-accent, var(--accent))',
}))

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RANKED: { label: 'Ranked', color: 'var(--success)' },
  QUALIFIED: { label: 'Qualified', color: 'var(--info)' },
  QUEUE: { label: 'In queue', color: 'var(--warning)' },
}

const statusToggles: ChartToggle[] = STATUSES.map((status) => ({
  key: status,
  ...STATUS_LABELS[status],
}))

const WORTH_BOARD_LIMIT = 50
const WORTH_BOARD_MIN_SCORES = 10

const DATASETS: { kind: ComplexityDatasetKind; label: string }[] = [
  { kind: 'scores', label: 'Scores CSV' },
  { kind: 'difficulties', label: 'Difficulties CSV' },
  { kind: 'complexity-history', label: 'History CSV' },
]

function queryValue(key: string): string {
  const raw = route.query[key]
  const first = Array.isArray(raw) ? raw[0] : raw
  return typeof first === 'string' ? first : ''
}

function setQuery(key: string, value: string) {
  router.replace({ query: { ...route.query, [key]: value } })
}

const tab = computed<PanelTab>({
  get() {
    const value = queryValue('tab')
    if (value === 'votes') return isHead.value ? 'votes' : 'maps'
    return value === 'worth' || value === 'players' ? value : 'maps'
  },
  set(value) {
    setQuery('tab', value)
  },
})

const category = computed<CategoryCode>({
  get() {
    const value = queryValue('category')
    return value ? (value as CategoryCode) : 'overall'
  },
  set(value) {
    setQuery('category', value)
  },
})

const scenario = computed<EstimateScenario>({
  get() {
    return queryValue('scenario') === 'OLD_SCRIPT' ? 'OLD_SCRIPT' : 'NEW_SCRIPT'
  },
  set(value) {
    setQuery('scenario', value)
  },
})

const status = computed<MapDifficultyStatus>({
  get() {
    const value = queryValue('status') as MapDifficultyStatus
    return STATUSES.includes(value) ? value : 'RANKED'
  },
  set(value) {
    setQuery('status', value)
  },
})

const tabs = computed<Tab[]>(() => {
  const list: Tab[] = [
    { key: 'maps', label: 'Maps' },
    { key: 'worth', label: 'Most worth' },
    { key: 'players', label: 'Players' },
  ]
  if (isHead.value) list.push({ key: 'votes', label: 'Vote reweight' })
  return list
})

const accent = computed(() => categoryStore.getAccent(category.value))

const search = ref('')

const difficulties = ref<ComplexityDifficultyRow[]>([])
const difficultiesLoading = ref(true)
const worthRows = ref<ComplexityDifficultyRow[]>([])
const worthLoading = ref(false)
const board = ref<ComplexityPlayerBoard | null>(null)
const boardLoading = ref(true)

const selectedRow = ref<ComplexityDifficultyRow | null>(null)
const leaderboard = ref<ComplexityMapLeaderboard | null>(null)
const leaderboardLoading = ref(false)
const leaderboardError = ref('')

const applyOpen = ref(false)
const applying = ref(false)
const applyError = ref('')
const applyScope = ref<{ moving: number; total: number } | null>(null)
const preparingApply = ref(false)
const feedback = ref<{ variant: 'success' | 'error'; text: string } | null>(null)
const downloading = ref<ComplexityDatasetKind | null>(null)

const health = computed(() => estimateHealth(difficulties.value, scenario.value))

const estimateNotice = computed(() => {
  if (difficultiesLoading.value || !difficulties.value.length) return ''
  const parts: string[] = []
  if (health.value.missing > 0) {
    parts.push(
      `${SCENARIO_LABELS[scenario.value]} has no estimate on ${formatCount(health.value.missing)} of ${formatCount(health.value.total)} difficulties. Run the refresh complexity estimates job in the admin jobs panel.`,
    )
  }
  if (health.value.stale > 0) {
    parts.push(
      `${formatCount(health.value.stale)} difficulties still carry an estimate from an older model.`,
    )
  }
  return parts.join(' ')
})

const estimateStamp = computed(() =>
  health.value.updatedAt ? `estimated ${formatRelativeDate(health.value.updatedAt)}` : '',
)

const scenarioVersion = computed(() => {
  for (const row of difficulties.value) {
    const version = row.estimates[scenario.value]?.version
    if (version) return version
  }
  return null
})

const filteredMaps = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return difficulties.value
  return difficulties.value.filter((row) =>
    row.songName.toLowerCase().includes(term)
    || row.songAuthor.toLowerCase().includes(term)
    || row.mapAuthor.toLowerCase().includes(term),
  )
})

const subtitle = computed(() => {
  if (difficultiesLoading.value) return 'Loading the scenarios'
  const noun = difficulties.value.length === 1 ? 'difficulty' : 'difficulties'
  const stamp = estimateStamp.value ? `, ${estimateStamp.value}` : ''
  return `${formatCount(difficulties.value.length)} ${noun} priced under three scenarios${stamp}`
})

async function categoryId(): Promise<string | undefined> {
  if (category.value === 'overall') return undefined
  await categoryStore.fetchCategories()
  return categoryStore.getCategoryId(category.value)
}

async function loadDifficulties() {
  difficultiesLoading.value = true
  try {
    const { getComplexityDifficulties } = await import('@/api/ranking/complexity')
    difficulties.value = await getComplexityDifficulties({
      categoryId: await categoryId(),
      status: status.value,
    })
  } catch (err) {
    difficulties.value = []
    feedback.value = { variant: 'error', text: getApiErrorMessage(err, 'Could not load the scenarios.') }
  }
  difficultiesLoading.value = false
}

async function loadBoard() {
  boardLoading.value = true
  try {
    const { getComplexityPlayers } = await import('@/api/ranking/complexity')
    board.value = await getComplexityPlayers({ categoryId: await categoryId(), limit: 250 })
  } catch {
    board.value = null
  }
  boardLoading.value = false
}

async function loadWorthBoard() {
  worthLoading.value = true
  try {
    const { getHighestAverageApMaps } = await import('@/api/ranking/complexity')
    worthRows.value = await getHighestAverageApMaps({
      categoryId: await categoryId(),
      scenario: scenario.value,
      minScores: WORTH_BOARD_MIN_SCORES,
      limit: WORTH_BOARD_LIMIT,
    })
  } catch {
    worthRows.value = []
  }
  worthLoading.value = false
}

async function openMap(row: ComplexityDifficultyRow) {
  selectedRow.value = row
  leaderboard.value = null
  leaderboardError.value = ''
  if (row.scores === 0) return
  leaderboardLoading.value = true
  try {
    const { getComplexityLeaderboard } = await import('@/api/ranking/complexity')
    leaderboard.value = await getComplexityLeaderboard(row.mapDifficultyId)
  } catch (err) {
    leaderboardError.value = getApiErrorMessage(err, 'Could not load this leaderboard.')
  }
  leaderboardLoading.value = false
}

function closeMap() {
  selectedRow.value = null
  leaderboard.value = null
}

let rankedScope: ComplexityDifficultyRow[] | null = null

async function loadRankedScope(): Promise<ComplexityDifficultyRow[]> {
  if (category.value === 'overall' && status.value === 'RANKED') return difficulties.value
  if (rankedScope) return rankedScope
  const { getComplexityDifficulties } = await import('@/api/ranking/complexity')
  rankedScope = await getComplexityDifficulties({ status: 'RANKED' })
  return rankedScope
}

async function openApply() {
  applyError.value = ''
  preparingApply.value = true
  try {
    const scope = await loadRankedScope()
    const moving = scope.filter((row) => movesUnder(row, scenario.value)).length
    applyScope.value = { moving, total: scope.length }
    applyOpen.value = true
  } catch (err) {
    feedback.value = { variant: 'error', text: getApiErrorMessage(err, 'Could not count the affected maps.') }
  }
  preparingApply.value = false
}

async function confirmApply(reason: string) {
  applying.value = true
  applyError.value = ''
  try {
    const { applyComplexityScenario } = await import('@/api/ranking/complexity')
    await applyComplexityScenario(scenario.value, reason)
    applyOpen.value = false
    feedback.value = {
      variant: 'success',
      text: `${SCENARIO_LABELS[scenario.value]} is being applied. Boards, statistics and XP update in the background.`,
    }
  } catch (err) {
    applyError.value = getApiErrorMessage(err, 'The apply request failed.')
  }
  applying.value = false
}

async function download(kind: ComplexityDatasetKind) {
  downloading.value = kind
  try {
    const { downloadComplexityDataset } = await import('@/api/ranking/complexity')
    const { blob, filename } = await downloadComplexityDataset(kind)
    saveBlob(blob, filename ?? `accsaber-${kind}.csv`)
  } catch (err) {
    feedback.value = { variant: 'error', text: getApiErrorMessage(err, 'The download failed.') }
  }
  downloading.value = null
}

watch([category, status], loadDifficulties, { immediate: true })
watch(category, loadBoard, { immediate: true })

watch([tab, category, scenario], () => {
  if (tab.value === 'worth') loadWorthBoard()
}, { immediate: true })
</script>

<template>
  <div class="reweight-page" :style="{ '--page-accent': accent, '--accent': accent }">
    <header class="reweight-page__head">
      <div class="reweight-page__title-block">
        <h1 class="reweight-page__title">Reweight Maps</h1>
        <p class="reweight-page__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="isHead" class="reweight-page__actions">
        <BaseButton v-for="dataset in DATASETS" :key="dataset.kind" size="sm"
          :loading="downloading === dataset.kind" @click="download(dataset.kind)">
          {{ dataset.label }}
        </BaseButton>
        <BaseButton variant="primary" size="sm" :loading="preparingApply" @click="openApply">
          Apply {{ SCENARIO_LABELS[scenario].toLowerCase() }}
        </BaseButton>
      </div>
    </header>

    <BaseBanner v-if="feedback" :variant="feedback.variant" @close="feedback = null">
      {{ feedback.text }}
    </BaseBanner>

    <BaseTabs :tabs="tabs" :model-value="tab" @update:model-value="tab = $event as PanelTab" />

    <ReweightTab v-if="tab === 'votes'" class="reweight-page__votes" />

    <template v-else>
      <div class="reweight-page__controls">
        <CategoryTabs :model-value="category" :exclude="['xp', 'low_mid']"
          @update:model-value="category = $event" />
        <ChartToggleGroup :toggles="scenarioToggles" :active="[scenario]" label="Scenario"
          @select="scenario = $event as EstimateScenario" />
      </div>

      <BaseBanner v-if="estimateNotice" variant="warning" :dismissible="false">
        {{ estimateNotice }}
      </BaseBanner>

      <LadderStrip :ladders="board?.ladders ?? {}" :scenario="scenario" :loading="boardLoading" />

      <div v-if="tab === 'maps'" class="reweight-page__view">
        <div class="reweight-page__filters">
          <SearchBox v-model="search" placeholder="Search song, artist or mapper" />
          <ChartToggleGroup :toggles="statusToggles" :active="[status]" label="Map status"
            @select="status = $event as MapDifficultyStatus" />
        </div>
        <ComplexityMapsTable :rows="filteredMaps" :scenario="scenario" :loading="difficultiesLoading"
          @select="openMap" />
      </div>

      <div v-else-if="tab === 'worth'" class="reweight-page__view">
        <p class="reweight-page__note">
          Top fifty by average weighted AP, at least ten scores each. The board column is where a map
          sits today next to where it would sit.
        </p>
        <ComplexityMapsTable board :rows="worthRows" :scenario="scenario" :loading="worthLoading"
          empty-message="No maps clear the score threshold here" @select="openMap" />
      </div>

      <div v-else class="reweight-page__view">
        <ComplexityPlayersTable :rows="board?.rows ?? []" :scenario="scenario" :loading="boardLoading" />
      </div>
    </template>

    <ComplexityMapModal :open="!!selectedRow" :row="selectedRow" :leaderboard="leaderboard"
      :scenario="scenario" :model-hash="health.modelHash" :loading="leaderboardLoading"
      :error="leaderboardError" @close="closeMap" />

    <ApplyScenarioModal v-if="isHead && applyScope" :open="applyOpen" :scenario="scenario"
      :moving="applyScope.moving" :total="applyScope.total" :version="scenarioVersion"
      :submitting="applying" :error="applyError" @close="applyOpen = false" @confirm="confirmApply" />
  </div>
</template>

<style scoped>
.reweight-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: var(--page-width-wide);
  margin: 0 auto;
}

.reweight-page :deep(.banner) {
  margin-inline: 0 auto;
}

.reweight-page__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
  padding-top: var(--space-lg);
}

.reweight-page__title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-page-title);
  font-weight: 700;
}

.reweight-page__subtitle {
  margin: var(--space-xs) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.reweight-page__actions,
.reweight-page__filters {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.reweight-page__filters > :first-child {
  flex: 1;
  min-width: 220px;
}

.reweight-page__controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.reweight-page__controls > :first-child {
  flex: 1;
  min-width: 260px;
}

.reweight-page__view {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.reweight-page__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.reweight-page__votes {
  max-width: 1030px;
}

@media (max-width: 767px) {
  .reweight-page :deep(.banner) {
  margin-inline: 0 auto;
}

.reweight-page__head {
    align-items: flex-start;
  }
}
</style>
