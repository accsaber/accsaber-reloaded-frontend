<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
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
  ComparisonScenario,
  ScenarioLadderValues,
  ScenarioPageParams,
} from '@/types/api/complexity'
import type { CategoryCode, Tab } from '@/types/display'
import type { MapDifficultyStatus } from '@/types/enums'
import { parseApiError } from '@/api/client'
import { SCRIPT_SCENARIO } from '@/utils/complexity'
import { MAP_STATUS_LABELS } from '@/utils/constants'
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
  REPORT_MAP_SORT,
  type ScenarioSortRequest,
} from './complexity/scenarioKeys'
import { useTuningState } from './complexity/tuning'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

usePageMeta({
  title: 'Complexity Script | AccSaber Ranking',
  description: 'Compare how the complexity script would weight the pool before a round is applied.',
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

const STATUS_TABS: Tab[] = STATUSES.map((key) => ({ key, label: MAP_STATUS_LABELS[key] }))

const PREVIEW_VIEW_TABS: Tab[] = [
  { key: 'maps', label: 'Maps' },
  { key: 'players', label: 'Players' },
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

const drillScenario = ref<ComparisonScenario>(SCRIPT_SCENARIO)

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
const playsUserId = ref('')
const playsPlayer = ref<ComplexityPlayerPlays | null>(null)
const playsLoading = ref(false)
const playsError = ref('')
const playsLimit = ref(DEFAULT_PLAYS_LIMIT)

const tuningTab = computed(() => tab.value === 'tuning')

const summary = computed(() => (tuningTab.value ? preview.value : round.value)?.summary ?? null)

const roundSummary = computed(() => round.value?.summary ?? null)

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
  if (!health) return '\u00a0'
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
    tuning.adopt(response.rater, response.version)
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

function drillRater() {
  return drillScenario.value === 'PREVIEW' ? tuning.edited.value : null
}

async function loadLeaderboard() {
  const row = selectedRow.value
  if (!row) return
  const token = ++leaderboardToken
  leaderboardLoading.value = true
  leaderboardError.value = ''
  try {
    const api = await import('@/api/ranking/complexity')
    const window = {
      page: leaderboardPage.value - 1,
      size: PAGE_SIZE,
      sort: leaderboardSort.value.sort,
      absolute: leaderboardSort.value.absolute,
    }
    const rater = drillRater()
    const result = rater
      ? await api.previewComplexityLeaderboard(row.map.id, rater, window)
      : await api.getComplexityLeaderboard(row.map.id, window)
    if (token !== leaderboardToken) return
    leaderboard.value = result
  } catch (err) {
    if (token !== leaderboardToken) return
    leaderboardError.value = failure(err, 'Could not load this leaderboard.')
  }
  leaderboardLoading.value = false
}

function openMap(row: ComplexityDifficultyRow) {
  drillScenario.value = tuning.dirty.value ? 'PREVIEW' : SCRIPT_SCENARIO
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
    const api = await import('@/api/ranking/complexity')
    const rater = drillRater()
    playsPlayer.value = rater
      ? await api.previewPlayerPlays(playsUserId.value, rater, playsLimit.value)
      : await api.getPlayerPlays(playsUserId.value, playsLimit.value)
  } catch (err) {
    playsPlayer.value = null
    playsError.value = failure(err, 'Could not load these plays.')
  }
  playsLoading.value = false
}

function openPlayer(userId: string) {
  drillScenario.value = tuning.dirty.value ? 'PREVIEW' : SCRIPT_SCENARIO
  playsUserId.value = userId
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
        text: `${MAP_STATUS_LABELS[applyStatus.value]} maps in ${scope} now carry the script value.`,
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
      ...REPORT_MAP_SORT,
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
    if (tuningTab.value) scope.push('Weighted from the edited constants, nothing stored')
    else if (roundSummary.value?.scriptVersion) {
      scope.push(`Script: ${roundSummary.value.scriptVersion}`)
    }
    if (summary.value?.estimatedAt) {
      scope.push(`Estimated ${formatRelativeDate(summary.value.estimatedAt)}`)
    }

    const report = buildComplexityReport({
      title: tuningTab.value ? 'Complexity script preview' : 'Complexity script round',
      scope,
      scenarioLabel: tuningTab.value ? 'Preview' : 'Script',
      scenario: reportScenario.value,
      categoryName: (code) => categoryStore.getCategoryInfo(code)?.name ?? code,
      maps,
      board: reportBoard.value,
    })

    const slug = activeBatch.value
      ? activeBatch.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'ranked-pool'
    const stamp = new Date().toISOString().slice(0, 10)
    saveBlob(
      new Blob([report], { type: 'text/plain;charset=utf-8' }),
      `complexity-${tuningTab.value ? 'preview' : 'round'}-${slug}-${stamp}.txt`,
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
  <div class="script-page" :style="{ '--page-accent': accent }">
    <header class="script-page__head">
      <div class="script-page__titles">
        <h1>Complexity Script</h1>
        <p class="caption">{{ subtitle }}</p>
      </div>
      <BaseButton :disabled="!reportReady" :loading="exporting" @click="exportReport">Export Report</BaseButton>
      <BaseButton v-if="isHead" variant="primary" :loading="preparingApply !== null && !applyOpen"
        @click="openApply('RANKED')">
        Apply Script
      </BaseButton>
    </header>

    <BaseBanner v-if="feedback" :variant="feedback.variant" @close="feedback = null">{{ feedback.text }}</BaseBanner>

    <BaseTabs :tabs="tabs" :model-value="tab" @update:model-value="tab = $event as PanelTab" />

    <div class="script-page__controls">
      <CategoryTabs :model-value="category" :exclude="['xp', 'low_mid']" @update:model-value="category = $event" />
      <BaseSelect v-if="tab === 'maps'" class="script-page__batch" :model-value="batchId" :options="batchOptions"
        @update:model-value="batchId = $event" />
      <BaseButton v-if="filtersActive" @click="clearFilters">Clear Filters</BaseButton>
    </div>

    <Transition name="collapse">
      <div v-if="estimateNotice && !tuningTab" class="collapsible">
        <BaseBanner variant="warning" :dismissible="false">{{ estimateNotice }}</BaseBanner>
      </div>
    </Transition>

    <div :key="tab" class="script-page__panel">
      <template v-if="tuningTab">
        <RaterForm :category="category" :loading="raterLoading" />
        <p v-if="previewError" class="caption script-page__error" role="alert">{{ previewError }}</p>
      </template>

      <LadderStrip :ladders="(tuningTab ? previewBoard : board)?.ladders ?? {}" :scenario="reportScenario"
        :metrics="tuningTab ? PREVIEW_LADDER : undefined" />

      <ComplexityPlayersTable v-if="tab === 'players' || (tuningTab && previewView === 'players')"
        :rows="reportBoard?.rows ?? []" :scenario="reportScenario" :loading="tuningTab ? previewLoading : boardLoading"
        @select="openPlayer">
        <template #filters>
          <SearchBox v-if="!tuningTab" class="script-page__search" :model-value="playerSearch"
            placeholder="Search a player, current or past name" @update:model-value="playerSearch = $event" />
          <BaseTabs v-else variant="segmented" label="Preview board" :tabs="PREVIEW_VIEW_TABS" :model-value="previewView"
            @update:model-value="previewView = $event as 'maps' | 'players'" />
        </template>
      </ComplexityPlayersTable>

      <ComplexityMapsTable v-else :rows="(tuningTab ? preview : round)?.rows ?? []" :scenario="reportScenario"
        :loading="tuningTab ? previewLoading : difficultiesLoading" :page="mapsPage"
        :total-pages="(tuningTab ? preview : round)?.totalPages ?? 0" @select="openMap" @update:page="setMapsPage"
        @update:sort="setMapsSort">
        <template #filters>
          <SearchBox class="script-page__search" :model-value="mapSearch" placeholder="Search song, artist or mapper"
            @update:model-value="mapSearch = $event" />
          <BaseTabs variant="segmented" label="Map status" :tabs="STATUS_TABS" :model-value="status"
            @update:model-value="status = $event as MapDifficultyStatus" />
          <BaseSwitch v-model="pinnedOnly" label="Pinned Only" />
          <BaseTabs v-if="tuningTab" variant="segmented" label="Preview board" :tabs="PREVIEW_VIEW_TABS"
            :model-value="previewView" @update:model-value="previewView = $event as 'maps' | 'players'" />
        </template>
      </ComplexityMapsTable>
    </div>

    <ComplexityMapModal :open="!!selectedRow" :row="selectedRow" :leaderboard="leaderboard" :scenario="drillScenario"
      :model-hash="summary?.modelHash ?? null" :page="leaderboardPage"
      :total-pages="leaderboard?.totalPages ?? 0" :loading="leaderboardLoading" :error="leaderboardError"
      @close="closeMap" @select-player="openPlayer" @update:page="setLeaderboardPage" @update:sort="setLeaderboardSort" />

    <PlayerPlaysModal :open="playsOpen" :player="playsPlayer" :scenario="drillScenario"
      :limit="playsLimit" :loading="playsLoading" :error="playsError" @close="closePlays" @update:limit="setPlaysLimit" />

    <ApplyScriptModal v-if="isHead && applyScope" :open="applyOpen" :status="applyStatus" :statuses="STATUS_TABS"
      :counting="preparingApply !== null" :batch-name="activeBatch?.name ?? null" :moving="applyScope.moving"
      :total="applyScope.total" :pinned="applyScope.pinned" :version="roundSummary?.scriptVersion ?? null"
      :submitting="applying" :error="applyError" @close="applyOpen = false" @confirm="confirmApply"
      @update:status="openApply($event)" />
  </div>
</template>

<style scoped>
.script-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  min-width: 0;
  margin: 0 auto;
}

.script-page__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.script-page__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.script-page__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  min-height: var(--control-h);
}

.script-page__batch {
  width: 280px;
  margin-left: auto;
}

.script-page__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  animation: settle-in var(--dur-enter) var(--ease-out) backwards;
}

.script-page__search {
  flex: 1;
  min-width: 240px;
}

.script-page__error {
  color: var(--error);
}

@media (max-width: 767px) {
  .script-page__titles {
    flex-basis: 100%;
  }

  .script-page__batch {
    width: 100%;
    margin-left: 0;
  }

  .script-page__search {
    flex-basis: 100%;
  }
}
</style>
