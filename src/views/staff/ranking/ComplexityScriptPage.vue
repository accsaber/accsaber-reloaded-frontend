<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type { BatchResponse } from '@/types/api/batches'
import type {
  ComplexityDatasetKind,
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityPlayerBoard,
  ComplexityPlayerPlays,
  ComplexityScenario,
  ComparisonScenario,
  ScenarioLadderValues,
} from '@/types/api/complexity'
import type { CategoryCode, ChartToggle, Tab } from '@/types/display'
import type { MapDifficultyStatus } from '@/types/enums'
import { parseApiError } from '@/api/client'
import { PREVIEW_SCENARIOS, SCRIPT_SCENARIO, movesUnder } from '@/utils/complexity'
import { saveBlob } from '@/utils/download'
import { formatCount, formatRelativeDate } from '@/utils/formatters'
import ApplyScriptModal from './complexity/ApplyScriptModal.vue'
import ComplexityMapModal from './complexity/ComplexityMapModal.vue'
import ComplexityMapsTable from './complexity/ComplexityMapsTable.vue'
import ComplexityPlayersTable from './complexity/ComplexityPlayersTable.vue'
import LadderStrip from './complexity/LadderStrip.vue'
import PlayerPlaysModal from './complexity/PlayerPlaysModal.vue'
import RaterForm from './complexity/RaterForm.vue'
import { estimateHealth } from './complexity/estimates'
import { useTuningState } from './complexity/tuning'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

usePageMeta({
  title: 'Complexity Script | AccSaber Ranking',
  description: 'Compare what the complexity script would pay before a round is applied.',
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()

type PanelTab = 'maps' | 'worth' | 'players' | 'tuning'

const STATUSES: MapDifficultyStatus[] = ['RANKED', 'QUALIFIED', 'QUEUE']
const PLAYER_BOARD_LIMIT = 250
const WORTH_BOARD_LIMIT = 50
const WORTH_BOARD_MIN_SCORES = 10
const PREVIEW_PLAYER_LIMIT = 100
const PREVIEW_DEBOUNCE = 500
const DEFAULT_PLAYS_LIMIT = 10

const PREVIEW_LADDER: (keyof ScenarioLadderValues)[] = [
  'playersWith900',
  'playersWith1000',
  'playersWith1100',
  'topPlayAp',
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RANKED: { label: 'Ranked', color: 'var(--success)' },
  QUALIFIED: { label: 'Qualified', color: 'var(--info)' },
  QUEUE: { label: 'In queue', color: 'var(--warning)' },
}

const statusToggles: ChartToggle[] = STATUSES.map((status) => ({
  key: status,
  ...STATUS_LABELS[status],
}))

const previewViewToggles: ChartToggle[] = [
  { key: 'maps', label: 'Maps', color: 'var(--page-accent, var(--accent))' },
  { key: 'players', label: 'Players', color: 'var(--page-accent, var(--accent))' },
]

const DATASETS: { kind: ComplexityDatasetKind; label: string }[] = [
  { kind: 'scores', label: 'Scores CSV' },
  { kind: 'difficulties', label: 'Difficulties CSV' },
  { kind: 'complexity-history', label: 'History CSV' },
]

const headForbidden = ref(false)
const isHead = computed(() => authStore.hasRole('RANKING_HEAD') && !headForbidden.value)

function queryValue(key: string): string {
  const raw = route.query[key]
  const first = Array.isArray(raw) ? raw[0] : raw
  return typeof first === 'string' ? first : ''
}

function setQuery(changes: Record<string, string>) {
  const query = { ...route.query }
  for (const [key, value] of Object.entries(changes)) {
    if (value) query[key] = value
    else delete query[key]
  }
  router.replace({ query })
}

const tab = computed<PanelTab>({
  get() {
    const value = queryValue('tab')
    return value === 'worth' || value === 'players' || value === 'tuning' ? value : 'maps'
  },
  set(value) {
    setQuery({ tab: value })
  },
})

const category = computed<CategoryCode>({
  get() {
    return queryValue('category') || 'overall'
  },
  set(value) {
    setQuery({ category: value })
  },
})

const status = computed<MapDifficultyStatus>({
  get() {
    const value = queryValue('status') as MapDifficultyStatus
    return STATUSES.includes(value) ? value : 'RANKED'
  },
  set(value) {
    setQuery({ status: value })
  },
})

const batchId = computed<string>({
  get() {
    return queryValue('batch')
  },
  set(value) {
    setQuery({ batch: value })
  },
})

const mapSearch = computed<string>({
  get() {
    return queryValue('search')
  },
  set(value) {
    setQuery({ search: value })
  },
})

const playerSearch = computed<string>({
  get() {
    return queryValue('player')
  },
  set(value) {
    setQuery({ player: value })
  },
})

const batches = ref<BatchResponse[]>([])

const batchOptions = computed(() => [
  { value: '', label: 'Whole ranked pool' },
  ...batches.value.map((batch) => ({
    value: batch.id,
    label: `${batch.name} (${batch.difficulties.length} maps)`,
  })),
])

const activeBatch = computed(() => batches.value.find((batch) => batch.id === batchId.value) ?? null)

const filtersActive = computed(
  () => category.value !== 'overall'
    || status.value !== 'RANKED'
    || !!mapSearch.value
    || !!playerSearch.value,
)

function clearFilters() {
  setQuery({ category: '', status: '', search: '', player: '' })
}

const tabs: Tab[] = [
  { key: 'maps', label: 'Maps' },
  { key: 'worth', label: 'Most worth' },
  { key: 'players', label: 'Players' },
  { key: 'tuning', label: 'Tuning' },
]

const accent = computed(() => categoryStore.getAccent(category.value))

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

const tuning = useTuningState()
const raterLoading = ref(true)
const previewRows = ref<ComplexityDifficultyRow[]>([])
const previewBoard = ref<ComplexityPlayerBoard | null>(null)
const previewLoading = ref(false)
const previewError = ref('')
const previewView = ref<'maps' | 'players'>('maps')

const playsOpen = ref(false)
const playsPreview = ref(false)
const playsUserId = ref('')
const playsPlayer = ref<ComplexityPlayerPlays | null>(null)
const playsLoading = ref(false)
const playsError = ref('')
const playsLimit = ref(DEFAULT_PLAYS_LIMIT)

const playsScenario = computed<ComparisonScenario>(
  () => (playsPreview.value ? 'PREVIEW' : SCRIPT_SCENARIO),
)

const playsColumns = computed<ComplexityScenario[]>(() => ['CURRENT', playsScenario.value])

const health = computed(() => estimateHealth(difficulties.value, SCRIPT_SCENARIO))
const maxNudge = computed(() => tuning.live.value?.board.maxNudge ?? null)

const estimateNotice = computed(() => {
  if (difficultiesLoading.value || !difficulties.value.length) return ''
  if (mapSearch.value) return ''
  const parts: string[] = []
  if (health.value.missing > 0) {
    parts.push(
      `The script has no estimate on ${formatCount(health.value.missing)} of ${formatCount(health.value.total)} difficulties. Run the refresh complexity estimates job in the admin jobs panel.`,
    )
  }
  if (health.value.stale > 0) {
    parts.push(
      `${formatCount(health.value.stale)} difficulties still carry an estimate from an older model.`,
    )
  }
  return parts.join(' ')
})

const scriptVersion = computed(() => {
  for (const row of difficulties.value) {
    const version = row.estimates[SCRIPT_SCENARIO]?.version
    if (version) return version
  }
  return null
})

const previewMaps = computed(() => {
  const term = mapSearch.value.trim().toLowerCase()
  if (!term) return previewRows.value
  return previewRows.value.filter((row) =>
    row.songName.toLowerCase().includes(term)
    || row.songSubName?.toLowerCase().includes(term)
    || row.songAuthor.toLowerCase().includes(term)
    || row.mapAuthor.toLowerCase().includes(term),
  )
})

const subtitle = computed(() => {
  if (difficultiesLoading.value) return 'Loading this round'
  const count = formatCount(difficulties.value.length)
  const noun = difficulties.value.length === 1 ? 'difficulty' : 'difficulties'
  if (mapSearch.value) return `${count} ${noun} match this search`
  const scope = activeBatch.value ? activeBatch.value.name : 'the whole ranked pool'
  const stamp = health.value.updatedAt
    ? `, estimated ${formatRelativeDate(health.value.updatedAt)}`
    : ''
  return `${count} ${noun} in ${scope}${stamp}`
})

function failure(err: unknown, fallback: string): string {
  return parseApiError(err, fallback).message
}

function markForbidden(err: unknown): boolean {
  const forbidden = parseApiError(err, '').status === 403
  if (forbidden) headForbidden.value = true
  return forbidden
}

async function categoryId(): Promise<string | undefined> {
  if (category.value === 'overall') return undefined
  await categoryStore.fetchCategories()
  return categoryStore.getCategoryId(category.value)
}

function searchParam(value: string): string | undefined {
  const term = value.trim()
  return term ? term : undefined
}

async function loadBatches() {
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const res = await listBatches({
      status: 'RELEASED',
      page: 0,
      size: 100,
      sort: 'releasedAt,desc',
    })
    batches.value = res.content
    if (!batchId.value && res.content.length > 0) batchId.value = res.content[0].id
  } catch {
    batches.value = []
  }
}

async function loadDifficulties() {
  difficultiesLoading.value = true
  try {
    const { getComplexityDifficulties } = await import('@/api/ranking/complexity')
    difficulties.value = await getComplexityDifficulties({
      categoryId: await categoryId(),
      status: status.value,
      batchId: batchId.value || undefined,
      search: searchParam(mapSearch.value),
    })
  } catch (err) {
    difficulties.value = []
    feedback.value = { variant: 'error', text: failure(err, 'Could not load this round.') }
  }
  difficultiesLoading.value = false
}

async function loadBoard() {
  boardLoading.value = true
  try {
    const { getComplexityPlayers } = await import('@/api/ranking/complexity')
    board.value = await getComplexityPlayers({
      categoryId: await categoryId(),
      limit: PLAYER_BOARD_LIMIT,
      search: searchParam(playerSearch.value),
    })
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
      scenario: SCRIPT_SCENARIO,
      minScores: WORTH_BOARD_MIN_SCORES,
      limit: WORTH_BOARD_LIMIT,
      batchId: batchId.value || undefined,
      search: searchParam(mapSearch.value),
    })
  } catch {
    worthRows.value = []
  }
  worthLoading.value = false
}

async function loadRater() {
  raterLoading.value = true
  try {
    const { getComplexityRater } = await import('@/api/ranking/complexity')
    const response = await getComplexityRater()
    tuning.adopt(response.rater, response.worstBands, response.version)
  } catch (err) {
    previewError.value = failure(err, 'Could not load the live constants.')
  }
  raterLoading.value = false
}

async function runPreview() {
  const rater = tuning.edited.value
  if (!rater) return
  previewLoading.value = true
  previewError.value = ''
  try {
    const { previewComplexity } = await import('@/api/ranking/complexity')
    const response = await previewComplexity(rater, {
      categoryId: await categoryId(),
      status: status.value,
      playerLimit: PREVIEW_PLAYER_LIMIT,
    })
    previewRows.value = response.difficulties
    previewBoard.value = response.players
  } catch (err) {
    previewRows.value = []
    previewBoard.value = null
    previewError.value = failure(err, 'The preview failed.')
  }
  previewLoading.value = false
}

const previewKey = ref('')

function bumpPreview() {
  previewKey.value = JSON.stringify({
    rater: tuning.edited.value,
    category: category.value,
    status: status.value,
  })
}

const debouncedPreviewKey = useDebouncedRef(previewKey, PREVIEW_DEBOUNCE)

watch(debouncedPreviewKey, (key) => {
  if (key && tab.value === 'tuning') runPreview()
})

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
    leaderboardError.value = failure(err, 'Could not load this leaderboard.')
  }
  leaderboardLoading.value = false
}

function closeMap() {
  selectedRow.value = null
  leaderboard.value = null
}

async function loadPlays() {
  if (!playsUserId.value) return
  playsLoading.value = true
  playsError.value = ''
  try {
    const { getPlayerPlays, previewPlayerPlays } = await import('@/api/ranking/complexity')
    const rater = tuning.edited.value
    playsPlayer.value = playsPreview.value && rater
      ? await previewPlayerPlays(playsUserId.value, rater, playsLimit.value)
      : await getPlayerPlays(playsUserId.value, playsLimit.value)
  } catch (err) {
    playsPlayer.value = null
    playsError.value = failure(err, 'Could not load these plays.')
  }
  playsLoading.value = false
}

function openPlayer(userId: string) {
  playsUserId.value = userId
  playsPreview.value = tab.value === 'tuning'
  playsPlayer.value = null
  playsOpen.value = true
  closeMap()
  loadPlays()
}

function closePlays() {
  playsOpen.value = false
  playsPlayer.value = null
  playsUserId.value = ''
}

function setPlaysLimit(limit: number) {
  if (!Number.isFinite(limit) || limit < 1) return
  playsLimit.value = limit
  loadPlays()
}

let roundScope: { key: string; rows: ComplexityDifficultyRow[] } | null = null

async function loadRoundScope(): Promise<ComplexityDifficultyRow[]> {
  const unfiltered = category.value === 'overall'
    && status.value === 'RANKED'
    && !mapSearch.value
  if (unfiltered) return difficulties.value
  const key = batchId.value
  if (roundScope?.key === key) return roundScope.rows
  const { getComplexityDifficulties } = await import('@/api/ranking/complexity')
  const rows = await getComplexityDifficulties({
    status: 'RANKED',
    batchId: batchId.value || undefined,
  })
  roundScope = { key, rows }
  return rows
}

async function openApply() {
  applyError.value = ''
  preparingApply.value = true
  try {
    const scope = await loadRoundScope()
    const moving = scope.filter((row) => movesUnder(row, SCRIPT_SCENARIO)).length
    applyScope.value = { moving, total: scope.length }
    applyOpen.value = true
  } catch (err) {
    feedback.value = { variant: 'error', text: failure(err, 'Could not count the affected maps.') }
  }
  preparingApply.value = false
}

async function confirmApply(reason: string, maxStep: number | undefined) {
  applying.value = true
  applyError.value = ''
  try {
    const { applyComplexityScript } = await import('@/api/ranking/complexity')
    await applyComplexityScript({ reason, maxStep, batchId: batchId.value || undefined })
    applyOpen.value = false
    const scope = activeBatch.value ? activeBatch.value.name : 'the whole ranked pool'
    feedback.value = {
      variant: 'success',
      text: `The script is being applied to ${scope}. Scores, statistics, rankings, milestones and XP update in the background.`,
    }
  } catch (err) {
    if (markForbidden(err)) applyOpen.value = false
    else applyError.value = failure(err, 'The apply request failed.')
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
    if (!markForbidden(err)) {
      feedback.value = { variant: 'error', text: failure(err, 'The download failed.') }
    }
  }
  downloading.value = null
}

loadRater()
loadBatches()

watch([category, status, batchId, mapSearch], loadDifficulties, { immediate: true })
watch([category, playerSearch], loadBoard, { immediate: true })

watch([tab, category, batchId, mapSearch], () => {
  if (tab.value === 'worth') loadWorthBoard()
}, { immediate: true })

watch([tab, category, status, () => tuning.edited.value], () => {
  if (tab.value === 'tuning') bumpPreview()
}, { immediate: true })
</script>

<template>
  <div class="script-page" :style="{ '--page-accent': accent, '--accent': accent }">
    <header class="script-page__head">
      <div class="script-page__title-block">
        <h1 class="script-page__title">Complexity Script</h1>
        <p class="script-page__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="isHead" class="script-page__actions">
        <BaseButton v-for="dataset in DATASETS" :key="dataset.kind" size="sm"
          :loading="downloading === dataset.kind" @click="download(dataset.kind)">
          {{ dataset.label }}
        </BaseButton>
        <BaseButton variant="primary" size="sm" :loading="preparingApply" @click="openApply">
          Apply this round
        </BaseButton>
      </div>
    </header>

    <BaseBanner v-if="feedback" :variant="feedback.variant" @close="feedback = null">
      {{ feedback.text }}
    </BaseBanner>

    <BaseTabs :tabs="tabs" :model-value="tab" @update:model-value="tab = $event as PanelTab" />

    <div class="script-page__controls">
      <CategoryTabs :model-value="category" :exclude="['xp', 'low_mid']"
        @update:model-value="category = $event" />
      <div class="script-page__control-actions">
        <BaseSelect v-if="tab !== 'tuning' && tab !== 'players'" class="script-page__batch"
          :model-value="batchId" :options="batchOptions"
          @update:model-value="batchId = $event" />
        <BaseButton v-if="filtersActive" size="sm" @click="clearFilters">Clear filters</BaseButton>
      </div>
    </div>

    <BaseBanner v-if="estimateNotice && tab !== 'tuning'" variant="warning" :dismissible="false">
      {{ estimateNotice }}
    </BaseBanner>

    <template v-if="tab === 'tuning'">
      <RaterForm :loading="raterLoading" @change="bumpPreview" />

      <p v-if="previewError" class="script-page__error">{{ previewError }}</p>

      <LadderStrip :ladders="previewBoard?.ladders ?? {}" scenario="PREVIEW"
        :columns="PREVIEW_SCENARIOS" :metrics="PREVIEW_LADDER" :loading="previewLoading" />

      <div class="script-page__filters">
        <SearchBox :model-value="mapSearch" placeholder="Search song, artist or mapper"
          @update:model-value="mapSearch = $event" />
        <ChartToggleGroup :toggles="statusToggles" :active="[status]" label="Map status"
          @select="status = $event as MapDifficultyStatus" />
        <ChartToggleGroup :toggles="previewViewToggles" :active="[previewView]" label="Preview board"
          @select="previewView = $event as 'maps' | 'players'" />
      </div>

      <ComplexityMapsTable v-if="previewView === 'maps'" :rows="previewMaps" scenario="PREVIEW"
        :columns="PREVIEW_SCENARIOS" :loading="previewLoading"
        empty-message="No difficulties priced under these constants" @select="openMap" />
      <ComplexityPlayersTable v-else :rows="previewBoard?.rows ?? []" scenario="PREVIEW"
        :columns="PREVIEW_SCENARIOS" :loading="previewLoading" @select="openPlayer" />
    </template>

    <template v-else>
      <LadderStrip :ladders="board?.ladders ?? {}" :scenario="SCRIPT_SCENARIO"
        :loading="boardLoading" />

      <div v-if="tab === 'maps'" class="script-page__view">
        <div class="script-page__filters">
          <SearchBox :model-value="mapSearch" placeholder="Search song, artist or mapper"
            @update:model-value="mapSearch = $event" />
          <ChartToggleGroup :toggles="statusToggles" :active="[status]" label="Map status"
            @select="status = $event as MapDifficultyStatus" />
        </div>
        <ComplexityMapsTable :rows="difficulties" :scenario="SCRIPT_SCENARIO"
          :loading="difficultiesLoading" @select="openMap" />
      </div>

      <div v-else-if="tab === 'worth'" class="script-page__view">
        <div class="script-page__filters">
          <SearchBox :model-value="mapSearch" placeholder="Search song, artist or mapper"
            @update:model-value="mapSearch = $event" />
        </div>
        <p class="script-page__note">
          Top fifty by average weighted AP, at least ten scores each. The board column is where a
          map sits today next to where it would sit, and a match keeps its real position.
        </p>
        <ComplexityMapsTable board :rows="worthRows" :scenario="SCRIPT_SCENARIO"
          :loading="worthLoading" empty-message="No maps clear the score threshold here"
          @select="openMap" />
      </div>

      <div v-else class="script-page__view">
        <div class="script-page__filters">
          <SearchBox :model-value="playerSearch" placeholder="Search a player, current or past name"
            @update:model-value="playerSearch = $event" />
        </div>
        <ComplexityPlayersTable :rows="board?.rows ?? []" :scenario="SCRIPT_SCENARIO"
          :loading="boardLoading" @select="openPlayer" />
      </div>
    </template>

    <ComplexityMapModal :open="!!selectedRow" :row="selectedRow" :leaderboard="leaderboard"
      :scenario="SCRIPT_SCENARIO" :model-hash="health.modelHash" :max-nudge="maxNudge"
      :loading="leaderboardLoading" :error="leaderboardError" @close="closeMap"
      @select-player="openPlayer" />

    <PlayerPlaysModal :open="playsOpen" :player="playsPlayer" :scenario="playsScenario"
      :columns="playsColumns" :limit="playsLimit" :loading="playsLoading" :error="playsError"
      @close="closePlays" @update:limit="setPlaysLimit" />

    <ApplyScriptModal v-if="isHead && applyScope" :open="applyOpen"
      :batch-name="activeBatch?.name ?? null" :moving="applyScope.moving" :total="applyScope.total"
      :version="scriptVersion" :submitting="applying" :error="applyError"
      @close="applyOpen = false" @confirm="confirmApply" />
  </div>
</template>

<style scoped>
.script-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  width: 100%;
  max-width: 1760px;
  margin: 0 auto;
}

.script-page :deep(.banner) {
  margin-inline: 0 auto;
}

.script-page__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
  padding-top: var(--space-lg);
}

.script-page__title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-page-title);
  font-weight: 700;
}

.script-page__subtitle {
  margin: var(--space-xs) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.script-page__actions,
.script-page__filters,
.script-page__control-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.script-page__filters > :first-child {
  flex: 1;
  min-width: 220px;
}

.script-page__batch {
  min-width: 260px;
}

.script-page__controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.script-page__controls > :first-child {
  flex: 1;
  min-width: 260px;
}

.script-page__view {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.script-page__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.script-page__error {
  margin: 0;
  color: var(--error);
  font-size: var(--text-body);
}

@media (max-width: 767px) {
  .script-page__head {
    align-items: flex-start;
  }
}
</style>
