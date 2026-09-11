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
  ComplexityDifficultyPage,
  ComplexityDifficultyParams,
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityPlayerBoard,
  ComplexityPlayerPlays,
  ComplexityPreviewParams,
  ComplexityScenario,
  ComparisonScenario,
  ScenarioLadderValues,
  ScenarioPageParams,
} from '@/types/api/complexity'
import type { CategoryCode, ChartToggle, Tab } from '@/types/display'
import type { MapDifficultyStatus } from '@/types/enums'
import { parseApiError } from '@/api/client'
import { PREVIEW_SCENARIOS, SCRIPT_SCENARIO } from '@/utils/complexity'
import { saveBlob } from '@/utils/download'
import { formatCount, formatRelativeDate } from '@/utils/formatters'
import ApplyScriptModal from './complexity/ApplyScriptModal.vue'
import ComplexityMapModal from './complexity/ComplexityMapModal.vue'
import ComplexityMapsTable from './complexity/ComplexityMapsTable.vue'
import ComplexityPlayersTable from './complexity/ComplexityPlayersTable.vue'
import LadderStrip from './complexity/LadderStrip.vue'
import PlayerPlaysModal from './complexity/PlayerPlaysModal.vue'
import RaterForm from './complexity/RaterForm.vue'
import { buildComplexityReport } from './complexity/report'
import {
  DEFAULT_LEADERBOARD_SORT,
  DEFAULT_MAP_SORT,
  type ScenarioSortRequest,
} from './complexity/scenarioKeys'
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

type PanelTab = 'maps' | 'players' | 'tuning'

const STATUSES: MapDifficultyStatus[] = ['RANKED', 'QUALIFIED', 'QUEUE']
const PLAYER_BOARD_LIMIT = 250
const PREVIEW_PLAYER_LIMIT = 100
const PREVIEW_DEBOUNCE = 500
const DEFAULT_PLAYS_LIMIT = 10
const PAGE_SIZE = 50
const REPORT_PAGE_SIZE = 100

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

const pinnedToggles: ChartToggle[] = [{ key: 'pinned', label: 'Pinned only' }]

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
    return value === 'players' || value === 'tuning' ? value : 'maps'
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

const pinnedOnly = computed<boolean>({
  get() {
    return queryValue('pinned') === '1'
  },
  set(value) {
    setQuery({ pinned: value ? '1' : '' })
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
    || !!playerSearch.value
    || pinnedOnly.value,
)

function clearFilters() {
  setQuery({ category: '', status: '', search: '', player: '', pinned: '' })
}

const tabs: Tab[] = [
  { key: 'maps', label: 'Maps' },
  { key: 'players', label: 'Players' },
  { key: 'tuning', label: 'Tuning' },
]

const accent = computed(() => categoryStore.getAccent(category.value))

const round = ref<ComplexityDifficultyPage | null>(null)
const difficultiesLoading = ref(true)
const board = ref<ComplexityPlayerBoard | null>(null)
const boardLoading = ref(true)

const mapsPage = ref(1)
const mapsSort = ref<ScenarioSortRequest>(DEFAULT_MAP_SORT)

const selectedRow = ref<ComplexityDifficultyRow | null>(null)
const leaderboard = ref<ComplexityMapLeaderboard | null>(null)
const leaderboardLoading = ref(false)
const leaderboardError = ref('')
const leaderboardPage = ref(1)
const leaderboardSort = ref<ScenarioSortRequest>(DEFAULT_LEADERBOARD_SORT)

const applyStatus = ref<MapDifficultyStatus>('RANKED')
const applyOpen = ref(false)
const applying = ref(false)
const applyError = ref('')
const applyScope = ref<{ moving: number; total: number; pinned: number } | null>(null)
const preparingApply = ref<MapDifficultyStatus | null>(null)
const feedback = ref<{ variant: 'success' | 'error'; text: string } | null>(null)

const tuning = useTuningState()
const raterLoading = ref(true)
const preview = ref<ComplexityDifficultyPage | null>(null)
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

const tuningTab = computed(() => tab.value === 'tuning')

const summary = computed(() => (tuningTab.value ? preview.value : round.value)?.summary ?? null)

const roundSummary = computed(() => round.value?.summary ?? null)

const maxNudge = computed(() => tuning.live.value?.board.maxNudge ?? null)

const estimateNotice = computed(() => {
  const health = roundSummary.value
  if (difficultiesLoading.value || !health || !health.difficulties) return ''
  if (mapSearch.value) return ''
  const parts: string[] = []
  if (health.missingEstimate > 0) {
    parts.push(
      `The script has no estimate on ${formatCount(health.missingEstimate)} of ${formatCount(health.difficulties)} difficulties. Run the refresh complexity estimates job in the admin jobs panel.`,
    )
  }
  if (health.staleEstimate > 0) {
    parts.push(
      `${formatCount(health.staleEstimate)} difficulties still carry an estimate from an older model.`,
    )
  }
  return parts.join(' ')
})

const subtitle = computed(() => {
  const health = roundSummary.value
  if (difficultiesLoading.value || !health) return 'Loading this round'
  const total = health.difficulties
  const count = formatCount(total)
  const noun = total === 1 ? 'difficulty' : 'difficulties'
  const held = pinnedOnly.value ? 'pinned ' : ''
  if (mapSearch.value) return `${count} ${held}${noun} match this search`
  const scope = activeBatch.value ? activeBatch.value.name : 'the whole ranked pool'
  const stamp = health.estimatedAt
    ? `, estimated ${formatRelativeDate(health.estimatedAt)}`
    : ''
  return `${count} ${held}${noun} in ${scope}${stamp}`
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

const tableWindow = computed<ScenarioPageParams>(() => ({
  page: mapsPage.value - 1,
  size: PAGE_SIZE,
  sort: mapsSort.value.sort,
  absolute: mapsSort.value.absolute,
}))

async function roundParams(window: ScenarioPageParams): Promise<ComplexityDifficultyParams> {
  return {
    categoryId: await categoryId(),
    status: status.value,
    batchId: batchId.value || undefined,
    search: searchParam(mapSearch.value),
    pinned: pinnedOnly.value || undefined,
    ...window,
  }
}

async function previewParams(window: ScenarioPageParams): Promise<ComplexityPreviewParams> {
  return {
    categoryId: await categoryId(),
    status: status.value,
    search: searchParam(mapSearch.value),
    pinned: pinnedOnly.value || undefined,
    playerLimit: PREVIEW_PLAYER_LIMIT,
    ...window,
  }
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
  } catch {
    batches.value = []
  }
}

let roundToken = 0

async function loadDifficulties() {
  const token = ++roundToken
  difficultiesLoading.value = true
  try {
    const { getComplexityDifficulties } = await import('@/api/ranking/complexity')
    const result = await getComplexityDifficulties(await roundParams(tableWindow.value))
    if (token !== roundToken) return
    round.value = result
  } catch (err) {
    if (token !== roundToken) return
    round.value = null
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

let previewToken = 0

async function runPreview() {
  const rater = tuning.edited.value
  if (!rater) return
  const token = ++previewToken
  previewLoading.value = true
  previewError.value = ''
  try {
    const { previewComplexity } = await import('@/api/ranking/complexity')
    const response = await previewComplexity(rater, await previewParams(tableWindow.value))
    if (token !== previewToken) return
    preview.value = response.difficulties
    previewBoard.value = response.players
  } catch (err) {
    if (token !== previewToken) return
    preview.value = null
    previewBoard.value = null
    previewError.value = failure(err, 'The preview failed.')
  }
  previewLoading.value = false
}

function setMapsPage(page: number) {
  mapsPage.value = page
}

function setMapsSort(request: ScenarioSortRequest) {
  mapsSort.value = request
  mapsPage.value = 1
}

let leaderboardToken = 0

async function loadLeaderboard() {
  const row = selectedRow.value
  if (!row) return
  const token = ++leaderboardToken
  leaderboardLoading.value = true
  leaderboardError.value = ''
  try {
    const { getComplexityLeaderboard } = await import('@/api/ranking/complexity')
    const result = await getComplexityLeaderboard(row.mapDifficultyId, {
      page: leaderboardPage.value - 1,
      size: PAGE_SIZE,
      sort: leaderboardSort.value.sort,
      absolute: leaderboardSort.value.absolute,
    })
    if (token !== leaderboardToken) return
    leaderboard.value = result
  } catch (err) {
    if (token !== leaderboardToken) return
    leaderboardError.value = failure(err, 'Could not load this leaderboard.')
  }
  leaderboardLoading.value = false
}

function openMap(row: ComplexityDifficultyRow) {
  selectedRow.value = row
  leaderboard.value = null
  leaderboardPage.value = 1
  loadLeaderboard()
}

function setLeaderboardPage(page: number) {
  leaderboardPage.value = page
  loadLeaderboard()
}

function setLeaderboardSort(request: ScenarioSortRequest) {
  leaderboardSort.value = request
  leaderboardPage.value = 1
  loadLeaderboard()
}

function closeMap() {
  leaderboardToken += 1
  selectedRow.value = null
  leaderboard.value = null
  leaderboardLoading.value = false
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
  playsPreview.value = tuningTab.value
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

async function openApply(target: MapDifficultyStatus) {
  applyError.value = ''
  applyStatus.value = target
  preparingApply.value = target
  try {
    const { getComplexityDifficulties } = await import('@/api/ranking/complexity')
    const scope = await getComplexityDifficulties({
      status: target,
      batchId: batchId.value || undefined,
      page: 0,
      size: 1,
    })
    applyScope.value = {
      moving: scope.summary.moving[SCRIPT_SCENARIO] ?? 0,
      total: scope.summary.difficulties,
      pinned: scope.summary.pinned,
    }
    applyOpen.value = true
  } catch (err) {
    feedback.value = { variant: 'error', text: failure(err, 'Could not count the affected maps.') }
  }
  preparingApply.value = null
}

async function confirmApply(reason: string, maxStep: number | undefined) {
  applying.value = true
  applyError.value = ''
  try {
    const { applyComplexityScript } = await import('@/api/ranking/complexity')
    await applyComplexityScript({
      reason,
      maxStep,
      batchId: batchId.value || undefined,
      status: applyStatus.value,
    })
    applyOpen.value = false
    const scope = activeBatch.value ? activeBatch.value.name : 'every map in scope'
    feedback.value = applyStatus.value === 'RANKED'
      ? {
        variant: 'success',
        text: `The script is being applied to ${scope}. Scores, statistics, rankings, milestones and XP update in the background.`,
      }
      : {
        variant: 'success',
        text: `${STATUS_LABELS[applyStatus.value].label} maps in ${scope} now carry the script value.`,
      }
    loadDifficulties()
  } catch (err) {
    if (markForbidden(err)) applyOpen.value = false
    else applyError.value = failure(err, 'The apply request failed.')
  }
  applying.value = false
}

const reportScenario = computed<ComparisonScenario>(
  () => (tuningTab.value ? 'PREVIEW' : SCRIPT_SCENARIO),
)

const reportBoard = computed(() => (tuningTab.value ? previewBoard.value : board.value))

const reportReady = computed(() => !!summary.value?.difficulties || !!reportBoard.value)

const exporting = ref(false)

async function collectReportMaps(): Promise<ComplexityDifficultyRow[]> {
  const api = await import('@/api/ranking/complexity')
  const rater = tuning.edited.value
  const maps: ComplexityDifficultyRow[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const window = {
      page,
      size: REPORT_PAGE_SIZE,
      sort: mapsSort.value.sort,
      absolute: mapsSort.value.absolute,
    }
    const result = tuningTab.value && rater
      ? (await api.previewComplexity(rater, await previewParams(window))).difficulties
      : await api.getComplexityDifficulties(await roundParams(window))
    maps.push(...result.rows)
    totalPages = result.totalPages
    page += 1
  }
  return maps
}

async function exportReport() {
  exporting.value = true
  try {
    const maps = await collectReportMaps()
    const scope = [
      `Maps: ${activeBatch.value ? activeBatch.value.name : 'the whole ranked pool'}, status ${status.value.toLowerCase()}`,
      `Category: ${categoryStore.getCategoryInfo(category.value)?.name ?? category.value}`,
      'Players: the whole category, not only the maps above',
    ]
    if (mapSearch.value) scope.push(`Map search: ${mapSearch.value}`)
    if (pinnedOnly.value) scope.push('Pinned maps only')
    if (playerSearch.value) scope.push(`Player search: ${playerSearch.value}`)
    if (tuningTab.value) scope.push('Priced from the edited constants, nothing stored')
    else if (roundSummary.value?.scriptVersion) {
      scope.push(`Script: ${roundSummary.value.scriptVersion}`)
    }
    if (summary.value?.estimatedAt) {
      scope.push(`Estimated ${formatRelativeDate(summary.value.estimatedAt)}`)
    }

    const markdown = buildComplexityReport({
      title: tuningTab.value ? 'Complexity script preview' : 'Complexity script round',
      scope,
      scenarioLabel: tuningTab.value ? 'Preview' : 'Script',
      scenario: reportScenario.value,
      maps,
      board: reportBoard.value,
    })

    const slug = activeBatch.value
      ? activeBatch.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'ranked-pool'
    const stamp = new Date().toISOString().slice(0, 10)
    saveBlob(
      new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
      `complexity-${tuningTab.value ? 'preview' : 'round'}-${slug}-${stamp}.md`,
    )
  } catch (err) {
    feedback.value = { variant: 'error', text: failure(err, 'Could not build the report.') }
  }
  exporting.value = false
}

loadRater()
loadBatches()

watch([category, status, batchId, mapSearch, pinnedOnly], () => {
  mapsPage.value = 1
})

const roundKey = computed(() => JSON.stringify([
  category.value,
  status.value,
  batchId.value,
  mapSearch.value,
  pinnedOnly.value,
  tableWindow.value,
]))

watch(roundKey, loadDifficulties, { immediate: true })

watch([category, playerSearch], loadBoard, { immediate: true })

const raterKey = computed(() => JSON.stringify(tuning.edited.value))

const debouncedRaterKey = useDebouncedRef(raterKey, PREVIEW_DEBOUNCE)

const previewKey = computed(() => JSON.stringify([
  tab.value,
  debouncedRaterKey.value,
  category.value,
  status.value,
  mapSearch.value,
  pinnedOnly.value,
  tableWindow.value,
]))

watch(previewKey, () => {
  if (tuningTab.value) runPreview()
}, { immediate: true })
</script>

<template>
  <div class="script-page" :style="{ '--page-accent': accent, '--accent': accent }">
    <header class="script-page__head">
      <div class="script-page__title-block">
        <h1 class="script-page__title">Complexity Script</h1>
        <p class="script-page__subtitle">{{ subtitle }}</p>
      </div>
      <div class="script-page__actions">
        <BaseButton size="sm" :disabled="!reportReady" :loading="exporting"
          @click="exportReport">
          Export markdown
        </BaseButton>
        <template v-if="isHead">
          <BaseButton size="sm" :loading="preparingApply === 'QUEUE'" @click="openApply('QUEUE')">
            Set queue
          </BaseButton>
          <BaseButton size="sm" :loading="preparingApply === 'QUALIFIED'"
            @click="openApply('QUALIFIED')">
            Set qualified
          </BaseButton>
          <BaseButton variant="primary" size="sm" :loading="preparingApply === 'RANKED'"
            @click="openApply('RANKED')">
            Apply this round
          </BaseButton>
        </template>
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
      <RaterForm :loading="raterLoading" />

      <p v-if="previewError" class="script-page__error">{{ previewError }}</p>

      <LadderStrip :ladders="previewBoard?.ladders ?? {}" scenario="PREVIEW"
        :columns="PREVIEW_SCENARIOS" :metrics="PREVIEW_LADDER" :loading="previewLoading" />

      <div class="script-page__filters">
        <SearchBox :model-value="mapSearch" placeholder="Search song, artist or mapper"
          @update:model-value="mapSearch = $event" />
        <ChartToggleGroup :toggles="statusToggles" :active="[status]" label="Map status"
          @select="status = $event as MapDifficultyStatus" />
        <ChartToggleGroup :toggles="pinnedToggles" :active="pinnedOnly ? ['pinned'] : []"
          label="Pin filter" @select="pinnedOnly = !pinnedOnly" />
        <ChartToggleGroup :toggles="previewViewToggles" :active="[previewView]" label="Preview board"
          @select="previewView = $event as 'maps' | 'players'" />
      </div>

      <ComplexityMapsTable v-if="previewView === 'maps'" :rows="preview?.rows ?? []"
        scenario="PREVIEW" :columns="PREVIEW_SCENARIOS" :loading="previewLoading"
        :page="mapsPage" :total-pages="preview?.totalPages ?? 0"
        empty-message="No difficulties priced under these constants" @select="openMap"
        @update:page="setMapsPage" @update:sort="setMapsSort" />
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
          <ChartToggleGroup :toggles="pinnedToggles" :active="pinnedOnly ? ['pinned'] : []"
            label="Pin filter" @select="pinnedOnly = !pinnedOnly" />
        </div>
        <ComplexityMapsTable :rows="round?.rows ?? []" :scenario="SCRIPT_SCENARIO"
          :loading="difficultiesLoading" :page="mapsPage" :total-pages="round?.totalPages ?? 0"
          @select="openMap" @update:page="setMapsPage" @update:sort="setMapsSort" />
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
      :scenario="SCRIPT_SCENARIO" :model-hash="summary?.modelHash ?? null" :max-nudge="maxNudge"
      :page="leaderboardPage" :total-pages="leaderboard?.totalPages ?? 0"
      :loading="leaderboardLoading" :error="leaderboardError" @close="closeMap"
      @select-player="openPlayer" @update:page="setLeaderboardPage"
      @update:sort="setLeaderboardSort" />

    <PlayerPlaysModal :open="playsOpen" :player="playsPlayer" :scenario="playsScenario"
      :columns="playsColumns" :limit="playsLimit" :loading="playsLoading" :error="playsError"
      @close="closePlays" @update:limit="setPlaysLimit" />

    <ApplyScriptModal v-if="isHead && applyScope" :open="applyOpen" :status="applyStatus"
      :batch-name="activeBatch?.name ?? null" :moving="applyScope.moving" :total="applyScope.total"
      :pinned="applyScope.pinned"
      :version="roundSummary?.scriptVersion ?? null" :submitting="applying" :error="applyError"
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
