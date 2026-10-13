<script setup lang="ts">
import {
  abandonCampaign,
  getCampaignByIdOrSlug,
  getMyCampaignProgress,
  getMyCampaignProgressByIdOrSlug,
  startCampaign,
} from '@/api/campaigns'
import { ApiError, getApiErrorMessage } from '@/api/client'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CampaignModifierBadges from '@/components/domain/CampaignModifierBadges.vue'
import CampaignRoadmap from '@/components/domain/CampaignRoadmap.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapChartStats from '@/components/domain/MapChartStats.vue'
import PseudoLoginModal from '@/components/domain/PseudoLoginModal.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { pickCoverUrl } from '@/composables/useAvatarFallback'
import { useCampaignAccent } from '@/composables/useCampaignAccent'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type {
  BarrierProgressResponse,
  CampaignBarrierResponse,
  CampaignDetailResponse,
  CampaignDifficultyProgressResponse,
  CampaignDifficultyResponse,
  CampaignLeaderboardPlayer,
  CampaignProgressResponse,
} from '@/types/api/campaigns'
import {
  barrierConditionLabel,
  barrierGoalValue,
  barrierReadout,
  formatUserValue,
  requirementGoalText,
  requirementLabel,
} from '@/utils/campaignLayout'
import { collectMissingPrerequisites } from '@/utils/campaignProgress'
import { buildMapRoute } from '@/utils/mapRoute'
import { isCurationSurface } from '@/utils/subdomain'
import CampaignAwards from '@/views/campaign/CampaignAwards.vue'
import CampaignLeaderboardTray from '@/views/campaign/CampaignLeaderboardTray.vue'
import CampaignOverviewRail from '@/views/campaign/CampaignOverviewRail.vue'
import CampaignSpectateBar from '@/views/campaign/CampaignSpectateBar.vue'
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const MarkdownText = defineAsyncComponent(() => import('@/components/common/MarkdownText.vue'))

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()
const { campaignAccent, nodeAccent } = useCampaignAccent()

const campaign = ref<CampaignDetailResponse | null>(null)

usePageMeta({
  title: computed(() =>
    campaign.value ? `${campaign.value.name} | AccSaber Campaigns` : 'Campaign | AccSaber',
  ),
  description: computed(() =>
    campaign.value ? `The ${campaign.value.name} campaign on AccSaber.` : undefined,
  ),
})

const myProgress = ref<CampaignProgressResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const hoverId = ref<string | null>(null)
const starting = ref(false)
const abandoning = ref(false)
const actionError = ref<string | null>(null)
const loginOpen = ref(false)

const idOrSlug = computed(() => String(route.params.campaignId ?? ''))

const spectatePlayer = ref<CampaignLeaderboardPlayer | null>(null)
const spectateProgress = ref<CampaignProgressResponse | null>(null)
const spectateLoading = ref(false)
const spectateError = ref<string | null>(null)

const spectateUserId = computed(() => {
  const raw = route.query.viewing
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : null
})

const isSpectating = computed(() => spectateUserId.value !== null)

const spectateName = computed(
  () => spectatePlayer.value?.userName ?? (isSpectating.value ? 'this player' : ''),
)

const activeProgress = computed(() =>
  isSpectating.value ? spectateProgress.value : myProgress.value,
)

let spectateSeq = 0

async function loadSpectatedProgress() {
  const userId = spectateUserId.value
  const campaignId = campaign.value?.id
  if (!userId || !campaignId) {
    spectateProgress.value = null
    spectateError.value = null
    spectateLoading.value = false
    return
  }
  const seq = ++spectateSeq
  spectateLoading.value = true
  spectateError.value = null
  spectateProgress.value = null
  try {
    const { getUser, getUserCampaignProgress } = await import('@/api/users')
    if (spectatePlayer.value?.userId !== userId) {
      spectatePlayer.value = null
      void getUser(userId).then((user) => {
        if (seq !== spectateSeq) return
        spectatePlayer.value = {
          userId: user.id,
          userName: user.name,
          country: user.country,
          avatarUrl: user.avatarUrl,
          cdnAvatarUrl: user.cdnAvatarUrl ?? undefined,
        }
      }, () => {})
    }
    const result = await getUserCampaignProgress(userId, campaignId)
    if (seq !== spectateSeq) return
    spectateProgress.value = result
  } catch (err) {
    if (seq !== spectateSeq) return
    spectateError.value = getApiErrorMessage(err, 'Failed to load this run')
  } finally {
    if (seq === spectateSeq) spectateLoading.value = false
  }
}

function spectate(player: CampaignLeaderboardPlayer) {
  if (player.userId === spectateUserId.value) return
  spectatePlayer.value = player
  void router.replace({ query: { ...route.query, viewing: player.userId } })
}

function stopSpectating() {
  spectateSeq++
  spectatePlayer.value = null
  spectateProgress.value = null
  spectateError.value = null
  spectateLoading.value = false
  const query = { ...route.query }
  delete query.viewing
  void router.replace({ query })
}

function isCreator(c: { creatorId: string | null } | null): boolean {
  return auth.isLoggedIn && !!c?.creatorId && c.creatorId === auth.userId
}

async function fetchMyProgress(value: string): Promise<CampaignProgressResponse | null> {
  if (!auth.isLoggedIn || !auth.userId) return null
  try {
    return await getMyCampaignProgressByIdOrSlug(value, auth.userId)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

async function load() {
  loading.value = true
  error.value = null
  const value = idOrSlug.value
  try {
    const [fetched, progress] = await Promise.all([getCampaignByIdOrSlug(value), fetchMyProgress(value)])

    if (fetched.status === 'DRAFT') {
      if (isCreator(fetched) || auth.hasRole('ADMIN')) {
        await router.replace({
          name: 'campaign-editor',
          params: { campaignId: fetched.slug || fetched.id },
        })
        return
      }
      campaign.value = null
      error.value = 'Campaign not found.'
      return
    }

    campaign.value = fetched
    myProgress.value = progress ?? (fetched.id !== value ? await fetchMyProgress(fetched.id) : null)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      campaign.value = null
    } else {
      error.value = getApiErrorMessage(err, 'Failed to load campaign')
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

watch(() => idOrSlug.value, () => {
  selectedId.value = null
  hoverId.value = null
  void load()
})

watch(() => auth.isLoggedIn, async () => {
  if (!campaign.value) return load()
  myProgress.value = await fetchMyProgress(campaign.value.id).catch(() => null)
})

watch([spectateUserId, () => campaign.value?.id], () => {
  void loadSpectatedProgress()
})

const accent = computed(() => campaignAccent(campaign.value?.tags))

const completedCount = computed(() => activeProgress.value?.completedDifficulties ?? 0)

const totalCount = computed(
  () =>
    campaign.value?.difficulties?.length
    ?? campaign.value?.difficultyCount
    ?? 0,
)

const completionPct = computed(() => {
  if (!totalCount.value) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

const isInProgress = computed(() => activeProgress.value?.progressStatus === 'IN_PROGRESS')
const isCompleted = computed(() => activeProgress.value?.progressStatus === 'COMPLETED')
const isAbandoned = computed(() => activeProgress.value?.progressStatus === 'ABANDONED')

const spectateStatusLabel = computed(() => {
  if (isCompleted.value) return 'Completed'
  if (isAbandoned.value) return 'Abandoned'
  if (isInProgress.value) return 'In progress'
  return 'Not started'
})

const spectateMilestone = computed(() => {
  const milestone = activeProgress.value?.currentMilestone
  if (!milestone) return null
  if (milestone.label) return milestone.label
  return difficultiesById.value.get(milestone.nodeId)?.songName ?? null
})

const spectateStartedAt = computed(() => {
  const started = activeProgress.value?.startedAt
  if (!started) return null
  return new Date(started).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
})

const canManage = computed(
  () => isCreator(campaign.value) || (isCurationSurface && auth.hasRole('CAMPAIGN_CURATOR')),
)

function goToEditor() {
  if (!campaign.value) return
  void router.push({
    name: 'campaign-editor',
    params: { campaignId: campaign.value.slug || campaign.value.id },
  })
}

const effectiveDifficultyProgress = computed<CampaignDifficultyProgressResponse[] | undefined>(() => {
  const diffs = activeProgress.value?.difficulties
  if (!diffs) return undefined
  if (isAbandoned.value) return diffs.map((p) => ({ ...p, unlocked: false, completed: false }))
  return diffs
})

const effectiveBarrierProgress = computed<BarrierProgressResponse[] | undefined>(() => {
  const barrs = activeProgress.value?.barriers
  if (!barrs) return undefined
  if (isAbandoned.value) return barrs.map((p) => ({ ...p, unlocked: false, satisfied: false }))
  return barrs
})

const progressByDifficulty = computed(() => {
  const map = new Map<string, CampaignDifficultyProgressResponse>()
  for (const p of effectiveDifficultyProgress.value ?? []) {
    map.set(p.node.id, p)
  }
  return map
})

const difficultiesById = computed(() => {
  const map = new Map<string, CampaignDifficultyResponse>()
  for (const d of campaign.value?.difficulties ?? []) map.set(d.id, d)
  return map
})

const displayedId = computed(() => selectedId.value ?? hoverId.value ?? focusNodeId.value)

const displayedDifficulty = computed<CampaignDifficultyResponse | null>(() => {
  const id = displayedId.value
  return id ? difficultiesById.value.get(id) ?? null : null
})

const displayedProgress = computed(() => {
  const id = displayedId.value
  if (!id) return null
  return progressByDifficulty.value.get(id) ?? null
})

const rewardsActive = computed(() => campaign.value?.status === 'CURATED')

const displayedRewardPending = computed(() => {
  if (!rewardsActive.value || isSpectating.value) return false
  const d = displayedDifficulty.value
  const p = displayedProgress.value
  return !!d && !!p && !!d.checkpointLabel && d.items.length > 0 && p.completed && !p.rewardsEarned
})

const displayedMissingPrereqNames = computed<string[]>(() => {
  const d = displayedDifficulty.value
  if (!displayedRewardPending.value || !d) return []
  return collectMissingPrerequisites(
    d.id,
    difficultiesById.value,
    (id) => progressByDifficulty.value.get(id)?.completed ?? false,
  ).map((n) => n.songName)
})

const progressByBarrier = computed(() => {
  const map = new Map<string, BarrierProgressResponse>()
  for (const p of effectiveBarrierProgress.value ?? []) map.set(p.barrier.id, p)
  return map
})

const displayedBarrier = computed<CampaignBarrierResponse | null>(() => {
  const id = displayedId.value
  if (!id) return null
  return campaign.value?.barriers.find((b) => b.id === id) ?? null
})

const displayedBarrierProgress = computed(() => {
  const id = displayedId.value
  if (!id) return null
  return progressByBarrier.value.get(id) ?? null
})

const barrierAccent = computed(() => displayedBarrier.value?.borderColor || 'var(--warning)')

const displayedTargets = computed(() => {
  const d = displayedDifficulty.value
  if (!d) return []
  const progress = displayedProgress.value?.targets ?? []
  return d.targets.map((t, index) => {
    return {
      key: t.id ?? String(index),
      label: requirementLabel(t.requirementType),
      goal: requirementGoalText(t.requirementType, t.requirementValue, t.requirementValueMax),
      userValue: formatUserValue(t.requirementType, progress[index]?.userValue ?? null),
      met: progress[index]?.met ?? false,
    }
  })
})

const isMultiObjective = computed(() => displayedTargets.value.length > 1)

const objectiveModeLabel = computed(() => {
  if (!isMultiObjective.value) return 'Objective'
  return displayedDifficulty.value?.targetMode === 'OR'
    ? 'Clear any one of these'
    : 'Clear all of these'
})

const displayedBarrierGoal = computed(() => {
  const b = displayedBarrier.value
  if (!b) return null
  return barrierReadout(b.conditionType, b.conditionValue, b.conditionValueMax)
})

const barrierSubtitle = computed(() => {
  const b = displayedBarrier.value
  if (!b) return ''
  const n = b.affectedCampaignDifficultyIds.length
  const maps = n === 1 ? 'map' : 'maps'
  const lead =
    b.conditionType === 'COMPLETION_COUNT' ? 'Completions' : barrierConditionLabel(b.conditionType)
  return `${lead} across ${n} ${maps}`
})

function shortName(name: string): string {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name
}

const viewerLabel = computed(() => (isSpectating.value ? shortName(spectateName.value) : 'You'))

const viewerPossessive = computed(() =>
  isSpectating.value ? `${shortName(spectateName.value)}'s` : 'Your',
)

const barrierProgressLabel = computed(() =>
  displayedBarrier.value?.conditionType === 'COMPLETION_COUNT'
    ? 'Completed'
    : `${viewerPossessive.value} best`,
)

const prereqsFor = computed(() =>
  (displayedDifficulty.value?.prerequisites ?? [])
    .map((p) => difficultiesById.value.get(p.comesFromCampaignDifficultyId))
    .filter((d): d is CampaignDifficultyResponse => !!d),
)

const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Campaigns', to: '/campaigns' },
  { label: campaign.value?.name || 'Campaign' },
])

const displayedCover = computed(() => pickCoverUrl(displayedDifficulty.value))

const displayedAccent = computed(() => nodeAccent(displayedDifficulty.value ?? undefined) ?? accent.value)

const displayedMapRoute = computed(() => {
  const d = displayedDifficulty.value
  if (!d) return null
  return buildMapRoute({
    beatsaverCode: d.beatsaverCode,
    mapId: d.mapId,
    difficulty: d.difficulty,
    difficultyId: d.mapDifficultyId,
    characteristic: d.characteristic,
  })
})

const focusNodeId = computed<string | null>(() => {
  const c = campaign.value
  if (!c || c.difficulties.length === 0) return null

  const cleared = activeProgress.value?.difficulties.filter((p) => p.completed) ?? []

  const rootId = () =>
    c.difficulties.find((d) => d.prerequisites.length === 0)?.id
    ?? c.difficulties[0].id

  if (cleared.length === 0) return rootId()

  const byId = difficultiesById.value
  const depthMemo = new Map<string, number>()
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!
    if (seen.has(id)) return 0
    const node = byId.get(id)
    if (!node || node.prerequisites.length === 0) {
      depthMemo.set(id, 0)
      return 0
    }
    seen.add(id)
    let max = 0
    for (const p of node.prerequisites) {
      max = Math.max(max, 1 + depthOf(p.comesFromCampaignDifficultyId, seen))
    }
    seen.delete(id)
    depthMemo.set(id, max)
    return max
  }

  if (isInProgress.value && !c.progressionAgnostic) {
    const frontier =
      activeProgress.value?.difficulties.filter((p) => p.unlocked && !p.completed) ?? []
    if (frontier.length > 0) {
      let next = { id: frontier[0].node.id, depth: Infinity }
      for (const f of frontier) {
        const d = depthOf(f.node.id)
        if (d < next.depth) next = { id: f.node.id, depth: d }
      }
      return next.id
    }
  }

  if (c.completionMode === 'ALL' || c.progressionAgnostic) {
    return cleared[cleared.length - 1].node.id
  }

  let best = { id: cleared[0].node.id, depth: -1 }
  for (const c2 of cleared) {
    const d = depthOf(c2.node.id)
    if (d > best.depth) best = { id: c2.node.id, depth: d }
  }
  return best.id
})

let progressRefreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleProgressRefresh(campaignId: string) {
  if (progressRefreshTimer) clearTimeout(progressRefreshTimer)
  progressRefreshTimer = setTimeout(async () => {
    progressRefreshTimer = null
    if (campaign.value?.id !== campaignId) return
    try {
      myProgress.value = await getMyCampaignProgress(campaignId)
    } catch {
    }
  }, 2500)
}

async function onStart() {
  if (!campaign.value || starting.value) return
  starting.value = true
  actionError.value = null
  try {
    await startCampaign(campaign.value.id)
    myProgress.value = await getMyCampaignProgress(campaign.value.id)
    if (campaign.value.legacy) scheduleProgressRefresh(campaign.value.id)
  } catch (err) {
    actionError.value = getApiErrorMessage(err, 'Failed to start campaign')
  } finally {
    starting.value = false
  }
}

async function onAbandon() {
  if (!campaign.value || abandoning.value) return
  if (!window.confirm('Abandon this campaign? Your progress will reset.')) return
  abandoning.value = true
  actionError.value = null
  try {
    await abandonCampaign(campaign.value.id)
    myProgress.value = await getMyCampaignProgress(campaign.value.id)
  } catch (err) {
    actionError.value = getApiErrorMessage(err, 'Failed to abandon campaign')
  } finally {
    abandoning.value = false
  }
}

const cursorPos = ref({ x: 0, y: 0 })
const pinnedPos = ref<{ x: number; y: number } | null>(null)

const TOOLTIP_WIDTH = 340
const TOOLTIP_FALLBACK_HEIGHT = 520
const TOOLTIP_GAP = 18
const VIEWPORT_MARGIN = 8

const tooltipEl = ref<HTMLElement | null>(null)
const tooltipHeight = ref(TOOLTIP_FALLBACK_HEIGHT)
const viewport = ref({ w: 1280, h: 720 })
let tooltipResize: ResizeObserver | null = null

function onCanvasMouseMove(e: MouseEvent) {
  if (hoverId.value) cursorPos.value = { x: e.clientX, y: e.clientY }
}

function readViewport() {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
}

watch(tooltipEl, (el) => {
  tooltipResize?.disconnect()
  tooltipResize = null
  if (!el) return
  tooltipHeight.value = el.offsetHeight
  tooltipResize = new ResizeObserver(() => {
    if (tooltipEl.value) tooltipHeight.value = tooltipEl.value.offsetHeight
  })
  tooltipResize.observe(el)
})

onMounted(() => {
  readViewport()
  window.addEventListener('resize', readViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', readViewport)
  tooltipResize?.disconnect()
  if (progressRefreshTimer) clearTimeout(progressRefreshTimer)
})

const tooltipPos = computed(() => {
  const base = pinnedPos.value ?? cursorPos.value
  const { w: vw, h: vh } = viewport.value
  const height = Math.min(tooltipHeight.value, vh - VIEWPORT_MARGIN * 2)
  const fitsRight = base.x + TOOLTIP_GAP + TOOLTIP_WIDTH <= vw - VIEWPORT_MARGIN
  const x = fitsRight
    ? base.x + TOOLTIP_GAP
    : Math.max(VIEWPORT_MARGIN, base.x - TOOLTIP_GAP - TOOLTIP_WIDTH)
  let y = base.y + TOOLTIP_GAP
  if (y + height > vh - VIEWPORT_MARGIN) y = base.y - TOOLTIP_GAP - height
  if (y < VIEWPORT_MARGIN) y = Math.max(VIEWPORT_MARGIN, vh - height - VIEWPORT_MARGIN)
  return { x, y }
})

const tooltipPinned = computed(() => !!selectedId.value)

const tooltipVisible = computed(
  () =>
    (!!displayedDifficulty.value || !!displayedBarrier.value) &&
    (!!hoverId.value || !!selectedId.value),
)

const tooltipState = computed<{ label: string; tone: 'done' | 'locked' | null }>(() => {
  if (displayedDifficulty.value) {
    const p = displayedProgress.value
    if (p?.completed) return { label: 'Cleared', tone: 'done' }
    if (p && !p.unlocked) return { label: 'Locked', tone: 'locked' }
    return { label: 'Available', tone: null }
  }
  const p = displayedBarrierProgress.value
  if (p?.satisfied) return { label: 'Passed', tone: 'done' }
  if (p && !p.unlocked) return { label: 'Locked', tone: 'locked' }
  return { label: 'Gate', tone: null }
})

const tooltipAccent = computed(() => (displayedDifficulty.value ? displayedAccent.value : barrierAccent.value))

function handleSelect(id: string, e?: MouseEvent) {
  if (e) cursorPos.value = { x: e.clientX, y: e.clientY }
  selectedId.value = id
  pinnedPos.value = { ...cursorPos.value }
}

const lbNodeId = ref<string | null>(null)

watch(selectedId, (id) => {
  if (id && difficultiesById.value.has(id)) {
    lbNodeId.value = id
  } else if (!id) {
    lbNodeId.value = null
  }
})

function handleHover(id: string | null, point?: { x: number; y: number }) {
  hoverId.value = id
  if (point) cursorPos.value = point
}

function handleDeselect() {
  selectedId.value = null
  pinnedPos.value = null
}
</script>

<template>
  <div
    class="campaign-detail"
    :class="{ 'campaign-detail--backdrop': themeStore.backdropConfig }"
    :style="{ '--page-accent': accent }"
  >
    <template v-if="loading">
      <div class="campaign-detail__loading">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </template>

    <template v-else-if="error">
      <EmptyState icon="!" :message="error" />
    </template>

    <template v-else-if="!campaign">
      <EmptyState icon="?" message="Campaign not found." />
    </template>

    <template v-else>
      <main class="campaign-detail__canvas" aria-label="Campaign roadmap" @mousemove.passive="onCanvasMouseMove">
        <CampaignRoadmap :difficulties="campaign.difficulties" :barriers="campaign.barriers"
          :texts="campaign.texts" :progress="effectiveDifficultyProgress" :barrier-progress="effectiveBarrierProgress"
          :accent-color="accent" :background-url="campaign.backgroundUrl"
          :background-color="campaign.backgroundColor"
          :background-placement="campaign.background"
          :show-starfield="!campaign.backgroundUrl" :focus-id="focusNodeId" :default-scale="1.35"
          :selected-id="selectedId" :highlight-barrier-id="selectedId"
          :show-terminal="campaign.completionMode === 'TERMINAL'"
          :mark-next="isInProgress && !campaign.progressionAgnostic"
          @select="handleSelect" @hover="handleHover"
          @deselect="handleDeselect" />

        <div class="campaign-detail__topbar">
          <Breadcrumbs class="campaign-detail__breadcrumbs" :crumbs="breadcrumbs" />

          <Transition name="campaign-detail__spectate-fade">
            <CampaignSpectateBar v-if="isSpectating" :player="spectatePlayer" :name="spectateName"
              :user-id="spectateUserId" :loading="spectateLoading" :error="spectateError"
              :completed="completedCount" :total="totalCount" :pct="completionPct"
              :status-label="spectateStatusLabel" :done="isCompleted" :logged-in="auth.isLoggedIn"
              @stop="stopSpectating" />
          </Transition>
        </div>
      </main>

      <CampaignLeaderboardTray
        v-if="campaign.status !== 'DRAFT'"
        :campaign="campaign"
        :node-id="lbNodeId"
        :spectating-user-id="spectateUserId"
        @update:node-id="lbNodeId = $event"
        @spectate="spectate"
      />

      <div class="campaign-detail__floats">
        <CampaignOverviewRail :campaign="campaign" :accent="accent" :logged-in="auth.isLoggedIn"
          :my-status="myProgress?.progressStatus ?? null" :spectating="isSpectating" :spectate-name="spectateName"
          :spectate-loading="spectateLoading" :spectate-error="spectateError" :completed="completedCount"
          :total="totalCount" :pct="completionPct" :status-label="spectateStatusLabel"
          :started-at="spectateStartedAt" :milestone="spectateMilestone" :starting="starting"
          :abandoning="abandoning" :action-error="actionError" :can-manage="canManage"
          @start="onStart" @abandon="onAbandon" @manage="goToEditor" @login="loginOpen = true" />

        <Transition name="campaign-detail__tooltip-fade">
          <aside v-if="tooltipVisible && (displayedDifficulty || displayedBarrier)"
            ref="tooltipEl"
            class="campaign-detail__tooltip"
            :class="{
              'campaign-detail__tooltip--pinned': tooltipPinned,
              'campaign-detail__tooltip--locked': tooltipState.tone === 'locked',
              'campaign-detail__tooltip--cleared': tooltipState.tone === 'done',
            }"
            :style="{
              '--page-accent': tooltipAccent,
              left: tooltipPos.x + 'px',
              top: tooltipPos.y + 'px',
            }">
            <header class="campaign-detail__node-head">
              <div class="campaign-detail__tooltip-state">
                <span class="campaign-detail__node-state"
                  :class="tooltipState.tone && `campaign-detail__node-state--${tooltipState.tone}`"
                  :style="tooltipState.tone ? undefined : { color: tooltipAccent }">
                  {{ tooltipState.label }}
                </span>
                <button v-if="tooltipPinned" type="button" class="campaign-detail__tooltip-close"
                  aria-label="Unpin" @click="handleDeselect">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </div>
            </header>

            <template v-if="displayedDifficulty">
              <div class="campaign-detail__node-song">
                <div class="campaign-detail__node-cover">
                  <img v-if="displayedCover" :src="displayedCover"
                    :alt="displayedDifficulty.songName" loading="lazy" />
                </div>
                <div class="campaign-detail__node-meta">
                  <h2 class="campaign-detail__node-title">
                    <SongTitle :name="displayedDifficulty.songName"
                      :sub-name="displayedDifficulty.songSubName" />
                  </h2>
                  <p class="campaign-detail__node-artist">
                    {{ displayedDifficulty.songAuthor }}
                    <span class="campaign-detail__node-sep">·</span>
                    {{ displayedDifficulty.mapAuthor }}
                  </p>
                  <div class="campaign-detail__node-badges">
                    <DifficultyBadge :difficulty="displayedDifficulty.difficulty" />
                    <span v-if="displayedDifficulty.characteristic && displayedDifficulty.characteristic.toLowerCase() !== 'standard'"
                      class="campaign-detail__node-char">{{ displayedDifficulty.characteristic }}</span>
                    <span v-if="displayedDifficulty.complexity != null" class="campaign-detail__node-badge-sep" aria-hidden="true">·</span>
                    <ComplexityBadge v-if="displayedDifficulty.complexity != null"
                      :complexity="displayedDifficulty.complexity" />
                  </div>
                </div>
              </div>

              <div v-if="displayedTargets.length > 0" class="campaign-detail__objectives">
                <h3 class="campaign-detail__section-label">{{ objectiveModeLabel }}</h3>
                <table class="campaign-detail__objective-table">
                  <thead>
                    <tr>
                      <td />
                      <th v-if="displayedProgress" scope="col">{{ viewerLabel }}</th>
                      <th scope="col">Goal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in displayedTargets" :key="t.key"
                      :class="{ 'campaign-detail__objective-row--met': t.met }">
                      <th scope="row">
                        <span v-if="displayedProgress" class="campaign-detail__objective-tick"
                          :class="{ 'campaign-detail__objective-tick--met': t.met }" aria-hidden="true">
                          <svg v-if="t.met" width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        {{ t.label }}
                      </th>
                      <td v-if="displayedProgress" class="campaign-detail__objective-you">{{ t.userValue }}</td>
                      <td class="campaign-detail__objective-goal" :style="{ color: displayedAccent }">{{ t.goal }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="displayedDifficulty.modifiers.length > 0" class="campaign-detail__mods">
                <h3 class="campaign-detail__section-label">Modifiers</h3>
                <CampaignModifierBadges :modifiers="displayedDifficulty.modifiers" />
              </div>

              <MapChartStats :source="displayedDifficulty" />

              <MarkdownText v-if="displayedDifficulty.description" :content="displayedDifficulty.description" />

              <div v-if="prereqsFor.length > 0 && !campaign.progressionAgnostic" class="campaign-detail__prereqs">
                <h3 class="campaign-detail__section-label">
                  {{ prereqsFor.length >= 2
                    ? (displayedDifficulty.prerequisiteMode === 'AND' ? 'Requires all of' : 'Requires any of')
                    : 'Requires' }}
                </h3>
                <ul class="campaign-detail__prereq-list">
                  <li v-for="pr in prereqsFor" :key="pr.id" class="campaign-detail__prereq"
                    :class="{ 'campaign-detail__prereq--done': progressByDifficulty.get(pr.id)?.completed }"
                    @click="handleSelect(pr.id, $event)">
                    <span class="campaign-detail__prereq-tick" aria-hidden="true">
                      <svg v-if="progressByDifficulty.get(pr.id)?.completed" width="10" height="10"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <SongTitle :name="pr.songName" :sub-name="pr.songSubName" />
                  </li>
                </ul>
              </div>

              <CampaignAwards v-if="displayedDifficulty.items.length > 0 || displayedDifficulty.xp > 0"
                label="Awards" :items="displayedDifficulty.items" :xp="displayedDifficulty.xp"
                :curated="campaign.status === 'CURATED'" :withheld="displayedRewardPending">
                <div v-if="displayedRewardPending" class="campaign-detail__reward-pending" role="note">
                  <p>Rewards held until the remaining maps are cleared</p>
                  <p v-if="displayedMissingPrereqNames.length > 0">
                    Still needed: {{ displayedMissingPrereqNames.join(', ') }}
                  </p>
                </div>
              </CampaignAwards>

              <router-link v-if="displayedMapRoute" :to="displayedMapRoute" class="campaign-detail__node-link">
                Open map detail
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </router-link>
            </template>

            <template v-else-if="displayedBarrier">
              <div class="campaign-detail__barrier-head">
                <span class="campaign-detail__barrier-icon" :style="{ color: barrierAccent }" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <line x1="7" y1="6" x2="17" y2="6" />
                    <line x1="7" y1="18" x2="17" y2="18" />
                  </svg>
                </span>
                <div class="campaign-detail__node-meta">
                  <h2 class="campaign-detail__node-title">{{ displayedBarrier.checkpointLabel || 'Checkpoint gate' }}</h2>
                  <p class="campaign-detail__node-artist">{{ barrierSubtitle }}</p>
                </div>
              </div>

              <div
                v-if="displayedBarrierGoal && displayedBarrier.conditionType !== 'FC' && displayedBarrier.conditionType !== 'PASS'"
                class="campaign-detail__targets">
                <div class="campaign-detail__target">
                  <span class="campaign-detail__target-label">{{ displayedBarrierGoal.label }}</span>
                  <span class="campaign-detail__target-value" :style="{ color: barrierAccent }">
                    {{ displayedBarrierGoal.text }}
                  </span>
                </div>
                <div v-if="displayedBarrierProgress" class="campaign-detail__target">
                  <span class="campaign-detail__target-label">{{ barrierProgressLabel }}</span>
                  <span class="campaign-detail__target-value">
                    {{ barrierGoalValue(displayedBarrier.conditionType, displayedBarrierProgress.currentValue) }}
                  </span>
                </div>
              </div>

              <MarkdownText v-if="displayedBarrier.description" :content="displayedBarrier.description" />

              <CampaignAwards v-if="displayedBarrier.items.length > 0 || displayedBarrier.xp > 0"
                label="Awards" :items="displayedBarrier.items" :xp="displayedBarrier.xp"
                :curated="campaign.status === 'CURATED'" />
            </template>
          </aside>
        </Transition>
      </div>

      <PseudoLoginModal v-if="loginOpen" :open="loginOpen" @close="loginOpen = false" />
    </template>
  </div>
</template>

<style scoped>
.campaign-detail {
  position: fixed;
  inset: var(--navbar-height) 0 0 0;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--bg-base);
}

.campaign-detail--backdrop {
  background: transparent;
}

.campaign-detail__loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 720px;
  margin: var(--space-lg) auto;
  padding: 0 var(--space-md);
}

.campaign-detail__canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.campaign-detail__topbar {
  position: absolute;
  top: var(--space-md);
  left: var(--space-md);
  right: calc(var(--space-md) * 2 + 340px);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  pointer-events: none;
}

.campaign-detail__breadcrumbs {
  flex-shrink: 0;
  pointer-events: auto;
}

.campaign-detail__spectate-fade-enter-active,
.campaign-detail__spectate-fade-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.campaign-detail__spectate-fade-enter-from,
.campaign-detail__spectate-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.campaign-detail__floats {
  position: absolute;
  inset: calc(var(--space-md) + 40px) var(--space-md) var(--space-md);
  display: grid;
  grid-template-columns: minmax(280px, 340px) 1fr;
  gap: var(--space-md);
  pointer-events: none;
  z-index: 5;
}

.campaign-detail__tooltip {
  position: fixed;
  width: 340px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 50;
  pointer-events: auto;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}

.campaign-detail__tooltip:not(.campaign-detail__tooltip--pinned) {
  pointer-events: none;
}

.campaign-detail__barrier-head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.campaign-detail__barrier-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, currentColor 45%, transparent);
  background: color-mix(in srgb, currentColor 12%, transparent);
  border-radius: var(--radius-card);
}

.campaign-detail__tooltip--pinned {
  border-color: var(--page-accent);
}

.campaign-detail__tooltip--cleared {
  border-color: color-mix(in srgb, var(--success) 35%, var(--bg-overlay));
}

.campaign-detail__tooltip--locked {
  opacity: 0.85;
}

.campaign-detail__tooltip-state {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.campaign-detail__tooltip-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.campaign-detail__tooltip-close:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-detail__tooltip-fade-enter-active,
.campaign-detail__tooltip-fade-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.campaign-detail__tooltip-fade-enter-from,
.campaign-detail__tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .campaign-detail__tooltip-fade-enter-active,
  .campaign-detail__tooltip-fade-leave-active {
    transition: none;
  }
}

.campaign-detail__section-label {
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-detail__reward-pending {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid color-mix(in srgb, var(--warning) 40%, transparent);
  border-radius: var(--radius-btn);
  background: color-mix(in srgb, var(--warning) 8%, transparent);
}

.campaign-detail__reward-pending p {
  margin: 0;
  font-size: var(--text-caption);
  line-height: 1.45;
  color: var(--text-secondary);
}

.campaign-detail__reward-pending p:first-child {
  color: var(--text-primary);
}

.campaign-detail__node-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.campaign-detail__node-state {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.campaign-detail__node-state--done {
  color: var(--success);
}

.campaign-detail__node-state--locked {
  color: var(--text-tertiary);
}

.campaign-detail__node-song {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
}

.campaign-detail__node-cover {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--bg-elevated);
  flex-shrink: 0;
}

.campaign-detail__node-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.campaign-detail__node-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.campaign-detail__node-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.campaign-detail__node-artist {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campaign-detail__node-sep {
  color: var(--text-tertiary);
  padding: 0 2px;
}

.campaign-detail__node-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
  font-size: var(--text-caption);
}

.campaign-detail__node-badge-sep {
  color: var(--text-tertiary);
}

.campaign-detail__node-char {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.campaign-detail__targets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  padding: var(--space-sm) 0 0;
  border-top: 1px solid var(--bg-overlay);
}

.campaign-detail__target {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.campaign-detail__target-label {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-detail__target-value {
  font-family: var(--font-mono);
  font-size: 1.0625rem;
  font-weight: 500;
  color: var(--text-primary);
}

.campaign-detail__objective-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.campaign-detail__objective-table thead th,
.campaign-detail__objective-table thead td {
  padding: 0 0 4px var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
  text-align: right;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-detail__objective-table thead td {
  padding-left: 0;
}

.campaign-detail__objective-table tbody th {
  width: 100%;
  padding: 5px 0;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  white-space: nowrap;
}

.campaign-detail__objective-table tbody tr + tr th,
.campaign-detail__objective-table tbody tr + tr td {
  border-top: 1px solid color-mix(in srgb, var(--bg-overlay) 55%, transparent);
}

.campaign-detail__objective-tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  margin-right: 5px;
  vertical-align: -1px;
  color: var(--success);
}

.campaign-detail__objective-tick::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.campaign-detail__objective-tick--met::before {
  display: none;
}

.campaign-detail__objective-row--met th {
  color: var(--text-primary);
}

.campaign-detail__objective-goal,
.campaign-detail__objective-you {
  padding: 5px 0 5px var(--space-sm);
  text-align: right;
  font-family: var(--font-mono);
  white-space: nowrap;
  vertical-align: baseline;
}

.campaign-detail__objective-goal {
  font-size: 1rem;
  font-weight: 700;
}

.campaign-detail__objective-you {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.campaign-detail__objective-row--met .campaign-detail__objective-you {
  color: var(--success);
}

.campaign-detail__mods,
.campaign-detail__objectives,
.campaign-detail__prereqs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campaign-detail__prereq-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campaign-detail__prereq {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.campaign-detail__prereq:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-detail__prereq-tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  color: transparent;
}

.campaign-detail__prereq--done .campaign-detail__prereq-tick {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 50%, var(--bg-overlay));
  background: color-mix(in srgb, var(--success) 10%, transparent);
}

.campaign-detail__prereq--done {
  color: var(--success);
}

.campaign-detail__node-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 6px 0;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--page-accent);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--page-accent) 35%, transparent);
  transition: color 120ms ease, border-color 120ms ease;
}

.campaign-detail__node-link:hover {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}

@media (max-width: 1100px) {
  .campaign-detail__floats {
    inset: var(--space-sm);
    grid-template-columns: minmax(0, 320px) 1fr minmax(0, 320px);
    gap: var(--space-sm);
  }
}

@media (max-width: 860px) {
  .campaign-detail {
    position: static;
    inset: auto;
    overflow: visible;
  }

  .campaign-detail__topbar {
    right: var(--space-md);
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .campaign-detail__canvas {
    position: relative;
    height: clamp(360px, 55vh, 560px);
  }

  .campaign-detail__floats {
    position: relative;
    inset: auto;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-md);
    padding: var(--space-md);
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .campaign-detail__spectate-fade-enter-active,
  .campaign-detail__spectate-fade-leave-active {
    transition: none;
  }
}
</style>
