<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ApTweaker from '@/components/domain/ApTweaker.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import { useColorExtract } from '@/composables/useColorExtract'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useThemeStore } from '@/stores/theme'
import type { MapDifficultyResponse, VoteListResponse, VoteResponse } from '@/types/api/maps'
import type { MapVoteAction, VoteType } from '@/types/enums'
import { brightenRgb } from '@/utils/color'
import { formatDifficulty } from '@/utils/mappers'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { rankingDashboardRoute } from '@/router'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const themeStore = useThemeStore()

const difficultyId = computed(() => route.params.difficultyId as string)

const difficulty = ref<MapDifficultyResponse | null>(null)
const voteData = ref<VoteListResponse | null>(null)
const loading = ref(true)
const voteLoading = ref(true)

const coverUrl = computed(() => difficulty.value?.coverUrl ?? '')
const { dominantColor } = useColorExtract(coverUrl)

const categoryCode = computed(() => {
  if (!difficulty.value) return 'overall'
  return categoryStore.getCategoryCode(difficulty.value.categoryId) ?? 'overall'
})

const categoryAccent = computed(() => categoryStore.getAccent(categoryCode.value))

const resolvedAccent = computed(() => {
  const raw = dominantColor.value
  if (!raw) return categoryAccent.value
  return themeStore.theme === 'dark' ? brightenRgb(raw, 60) : raw
})

const categoryName = computed(() => {
  const info = categoryStore.getCategoryInfo(categoryCode.value)
  return info?.name ?? categoryCode.value
})

const metaTitle = computed(() => {
  if (!difficulty.value) return 'Map Detail | Ranking'
  return `${difficulty.value.songAuthor} - ${difficulty.value.songName} | Ranking`
})

usePageMeta({ title: metaTitle })

const isHeadRanking = computed(() => authStore.hasRole('RANKING_HEAD'))

const beatsaverCode = computed(() => mapBeatsaverCode.value)

const beatleaderUrl = computed(() => {
  if (!difficulty.value?.blLeaderboardId) return null
  return `https://www.beatleader.com/leaderboard/global/${difficulty.value.blLeaderboardId}`
})

const scoresaberUrl = computed(() => {
  if (!difficulty.value?.ssLeaderboardId) return null
  return `https://scoresaber.com/leaderboard/${difficulty.value.ssLeaderboardId}`
})

const scoreCurveId = computed(() =>
  categoryStore.byCode.get(categoryCode.value)?.scoreCurve?.id ?? null
)

const tweakerOpen = ref(false)
const tweakerAnchor = ref<HTMLElement | null>(null)

function toggleTweaker(event: Event) {
  tweakerOpen.value = !tweakerOpen.value
  tweakerAnchor.value = tweakerOpen.value ? (event.currentTarget as HTMLElement) : null
}

const managementOpen = ref(false)
const voteFormOpen = ref(false)

const voteType = ref<VoteType>('UPVOTE')
const voteAction = ref<MapVoteAction>('RANK')
const voteReason = ref('')
const voteSuggestedComplexity = ref<number | undefined>(undefined)
const voteCriteriaVote = ref<VoteType | undefined>(undefined)
const voteCriteriaOverride = ref(false)
const voteSubmitting = ref(false)
const voteError = ref('')

const showStatusModal = ref(false)
const statusTarget = ref<string>('')
const statusLoading = ref(false)

const showComplexityModal = ref(false)
const complexityValue = ref<number>(0)
const complexityLoading = ref(false)

const batchOptions = ref<{ value: string; label: string }[]>([])
const mapBeatsaverCode = ref<string | null>(null)

async function fetchDifficulty() {
  loading.value = true
  try {
    const { getDifficulty } = await import('@/api/maps')
    difficulty.value = await getDifficulty(difficultyId.value)
  } catch {
    difficulty.value = null
  }
  if (difficulty.value) {
    try {
      const { getMap } = await import('@/api/maps')
      const map = await getMap(difficulty.value.mapId)
      mapBeatsaverCode.value = map.beatsaverCode
    } catch {
      mapBeatsaverCode.value = null
    }
  }
  loading.value = false
}

async function fetchVotes() {
  voteLoading.value = true
  try {
    const { listVotes } = await import('@/api/ranking/voting')
    voteData.value = await listVotes(difficultyId.value)
  } catch {
    voteData.value = null
  }
  voteLoading.value = false
}

async function fetchBatches() {
  if (!isHeadRanking.value) return
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const res = await listBatches({ status: 'DRAFT', page: 0, size: 50 })
    batchOptions.value = res.content.map((b) => ({ value: b.id, label: b.name }))
  } catch {
    batchOptions.value = []
  }
}

watch(difficultyId, () => {
  fetchDifficulty()
  fetchVotes()
  fetchBatches()
}, { immediate: true })

async function submitVote() {
  voteSubmitting.value = true
  voteError.value = ''
  if (voteAction.value === 'REWEIGHT' && !voteSuggestedComplexity.value) {
    voteError.value = 'Suggested complexity is required for reweight votes.'
    voteSubmitting.value = false
    return
  }
  try {
    const { castVote } = await import('@/api/ranking/voting')
    await castVote(difficultyId.value, {
      vote: voteType.value,
      type: voteAction.value,
      reason: voteReason.value || undefined,
      suggestedComplexity: voteSuggestedComplexity.value || undefined,
      criteriaVote: difficulty.value?.status !== 'RANKED' ? (voteCriteriaVote.value || undefined) : undefined,
      criteriaVoteOverride: difficulty.value?.status !== 'RANKED' ? (voteCriteriaOverride.value || undefined) : undefined,
    })
    voteReason.value = ''
    voteSuggestedComplexity.value = undefined
    voteCriteriaVote.value = undefined
    voteCriteriaOverride.value = false
    await fetchVotes()
  } catch (e) {
    voteError.value = e instanceof Error ? e.message : 'Failed to submit vote'
  } finally {
    voteSubmitting.value = false
  }
}

async function deactivateVote(voteId: string) {
  try {
    const { deactivateVote: deactivate } = await import('@/api/ranking/voting')
    await deactivate(difficultyId.value, voteId)
    await fetchVotes()
  } catch {
  }
}

async function handleStatusChange() {
  if (!statusTarget.value) return
  statusLoading.value = true
  try {
    const { updateMapStatus } = await import('@/api/ranking/maps')
    await updateMapStatus(difficultyId.value, { status: statusTarget.value as never })
    showStatusModal.value = false
    statusTarget.value = ''
    await fetchDifficulty()
  } catch {
  } finally {
    statusLoading.value = false
  }
}

async function handleComplexityChange() {
  complexityLoading.value = true
  try {
    const { updateMapComplexity } = await import('@/api/ranking/maps')
    await updateMapComplexity(difficultyId.value, { complexity: complexityValue.value })
    showComplexityModal.value = false
    await fetchDifficulty()
  } catch {
  } finally {
    complexityLoading.value = false
  }
}

async function handleDeactivate() {
  if (!confirm('Are you sure you want to deactivate this difficulty?')) return
  try {
    const { deactivateMapDifficulty } = await import('@/api/ranking/maps')
    await deactivateMapDifficulty(difficultyId.value)
    router.push({ name: rankingDashboardRoute })
  } catch {
  }
}

async function addToBatch(batchId: string) {
  try {
    const { addDifficultyToBatch } = await import('@/api/ranking/batches')
    await addDifficultyToBatch(batchId, difficultyId.value)
  } catch {
  }
}

function statusBadgeClass(status: string): string {
  if (status === 'RANKED') return 'status-badge--ranked'
  if (status === 'QUALIFIED') return 'status-badge--qualified'
  return 'status-badge--queue'
}

function criteriaBadgeClass(status: string): string {
  if (status === 'PASSED') return 'criteria-badge--passed'
  if (status === 'FAILED') return 'criteria-badge--failed'
  return 'criteria-badge--pending'
}

function voteIconClass(vote: VoteType): string {
  if (vote === 'UPVOTE') return 'vote-icon--up'
  if (vote === 'DOWNVOTE') return 'vote-icon--down'
  return 'vote-icon--neutral'
}

const availableActions = computed<{ value: MapVoteAction; label: string }[]>(() => {
  if (!difficulty.value) return []
  if (difficulty.value.status === 'RANKED') {
    return [
      { value: 'REWEIGHT', label: 'Reweight' },
    ]
  }
  return [{ value: 'RANK', label: 'Rank' }]
})

watch(availableActions, (actions) => {
  if (actions.length > 0 && !actions.find((a) => a.value === voteAction.value)) {
    voteAction.value = actions[0].value
  }
}, { immediate: true })

const statusTransitions = computed<{ value: string; label: string }[]>(() => {
  if (!difficulty.value) return []
  const s = difficulty.value.status
  const opts: { value: string; label: string }[] = []
  if (s === 'QUALIFIED') opts.push({ value: 'RANKED', label: 'Move to Ranked' })
  return opts
})
</script>

<template>
  <div class="rank-detail" :style="{ '--page-accent': resolvedAccent }">
    <template v-if="loading">
      <div class="rank-detail__loading">
        <SkeletonLoader variant="card" />
      </div>
    </template>

    <template v-else-if="difficulty">
      <div class="rank-detail__bg">
        <div class="rank-detail__bg-image" :style="{ backgroundImage: `url(${difficulty.coverUrl})` }" />
        <div class="rank-detail__bg-fade" />
      </div>

      <div class="rank-detail__content">
        <div class="rank-detail__nav">
          <button class="rank-detail__back" @click="router.push({ name: rankingDashboardRoute })" aria-label="Back to queue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Queue
          </button>
        </div>

        <div class="rank-detail__hero">
          <div class="rank-detail__cover-wrap">
            <img class="rank-detail__cover" :src="difficulty.coverUrl" :alt="difficulty.songName" />
            <div class="rank-detail__cover-glow" :style="{ backgroundImage: `url(${difficulty.coverUrl})` }" />
          </div>

          <div class="rank-detail__hero-info">
            <h1 class="rank-detail__song-name">{{ difficulty.songName }}</h1>
            <p v-if="difficulty.songSubName" class="rank-detail__song-sub">{{ difficulty.songSubName }}</p>
            <p class="rank-detail__song-meta">{{ difficulty.songAuthor }} - Mapped by {{ difficulty.mapAuthor }}</p>

            <div class="rank-detail__badges">
              <span class="rank-detail__diff-label">
                {{ formatDifficulty(difficulty.difficulty) }}
                <span v-if="difficulty.characteristic !== 'Standard'"> ({{ difficulty.characteristic }})</span>
              </span>
              <span class="rank-detail__category-badge" :style="{ '--cat-accent': categoryAccent }">
                {{ categoryName }}
              </span>
              <span v-if="isHeadRanking" class="rank-detail__complexity-editable" @click="complexityValue = difficulty.complexity ?? 0; showComplexityModal = true">
                <ComplexityBadge v-if="difficulty.complexity != null" :complexity="difficulty.complexity" />
                <span v-else class="rank-detail__complexity-unset">Set complexity</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
              <ComplexityBadge v-else-if="difficulty.complexity != null" :complexity="difficulty.complexity" />
              <span class="rank-detail__status-badge" :class="statusBadgeClass(difficulty.status)">
                {{ difficulty.status }}
              </span>
              <span v-if="voteData?.headCriteriaVote" class="rank-detail__criteria-badge" :class="voteData.headCriteriaVote === 'UPVOTE' ? 'criteria-badge--passed' : voteData.headCriteriaVote === 'DOWNVOTE' ? 'criteria-badge--failed' : 'criteria-badge--pending'">
                Criteria: HEAD {{ voteData.headCriteriaVote === 'UPVOTE' ? 'PASS' : voteData.headCriteriaVote === 'DOWNVOTE' ? 'FAIL' : 'NEUTRAL' }}
              </span>
              <span v-else-if="voteData && (voteData.criteriaUpvotes > 0 || voteData.criteriaDownvotes > 0)" class="rank-detail__criteria-badge" :class="voteData.criteriaUpvotes > voteData.criteriaDownvotes ? 'criteria-badge--passed' : voteData.criteriaDownvotes > voteData.criteriaUpvotes ? 'criteria-badge--failed' : 'criteria-badge--pending'">
                Criteria: {{ voteData.criteriaUpvotes > voteData.criteriaDownvotes ? 'PASS' : voteData.criteriaDownvotes > voteData.criteriaUpvotes ? 'FAIL' : 'PENDING' }}
              </span>
              <span v-else class="rank-detail__criteria-badge" :class="criteriaBadgeClass(difficulty.criteriaStatus)">
                Criteria: {{ difficulty.criteriaStatus }}
              </span>
            </div>

            <div class="rank-detail__links">
              <BaseButton v-if="beatsaverCode" size="sm" :href="`beatsaver://${beatsaverCode}`" aria-label="One-Click Install" title="One-Click Install">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12" /><path d="M11 11.5V6.5a1.5 1.5 0 0 1 3 0V12" /><path d="M14 10.5V8.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2a1.5 1.5 0 0 1 3 0V12" />
                </svg>
              </BaseButton>
              <BaseButton v-if="beatsaverCode" size="sm" :href="`https://beatsaver.com/maps/${beatsaverCode}`" aria-label="View on BeatSaver">
                <img src="https://beatsaver.com/static/favicon/favicon-32x32.png" alt="BeatSaver" width="16" height="16" style="border-radius: 3px;" />
              </BaseButton>
              <BaseButton v-if="beatleaderUrl" size="sm" :href="beatleaderUrl" aria-label="View on BeatLeader">
                <img src="https://beatleader.com/assets/favicon-32x32.png" alt="BeatLeader" width="16" height="16" style="border-radius: 3px;" />
              </BaseButton>
              <BaseButton v-if="scoresaberUrl" size="sm" :href="scoresaberUrl" aria-label="View on ScoreSaber">
                <img src="https://scoresaber.com/favicon-32x32.png" alt="ScoreSaber" width="16" height="16" style="border-radius: 3px;" />
              </BaseButton>
              <BaseButton v-if="scoreCurveId && difficulty.complexity != null" size="sm" aria-label="AP Tweaker" @click="toggleTweaker($event)">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M16.2 12.5a1.4 1.4 0 00.28 1.54l.05.05a1.7 1.7 0 11-2.4 2.4l-.05-.05a1.4 1.4 0 00-1.54-.28 1.4 1.4 0 00-.84 1.28v.14a1.7 1.7 0 11-3.4 0v-.07a1.4 1.4 0 00-.92-1.28 1.4 1.4 0 00-1.54.28l-.05.05a1.7 1.7 0 11-2.4-2.4l.05-.05a1.4 1.4 0 00.28-1.54 1.4 1.4 0 00-1.28-.84H2.3a1.7 1.7 0 110-3.4h.07a1.4 1.4 0 001.28-.92 1.4 1.4 0 00-.28-1.54l-.05-.05a1.7 1.7 0 112.4-2.4l.05.05a1.4 1.4 0 001.54.28h.07a1.4 1.4 0 00.84-1.28V2.3a1.7 1.7 0 113.4 0v.07a1.4 1.4 0 00.84 1.28 1.4 1.4 0 001.54-.28l.05-.05a1.7 1.7 0 112.4 2.4l-.05.05a1.4 1.4 0 00-.28 1.54v.07a1.4 1.4 0 001.28.84h.14a1.7 1.7 0 110 3.4h-.07a1.4 1.4 0 00-1.28.84z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </BaseButton>
              <ApTweaker v-if="scoreCurveId && difficulty.complexity != null" :open="tweakerOpen" :curve-id="scoreCurveId" :anchor-el="tweakerAnchor" :complexity="difficulty.complexity" :show-weighted="false" @update:open="(val: boolean) => { tweakerOpen = val; if (!val) tweakerAnchor = null }" />
            </div>
          </div>
        </div>

        <div v-if="voteData" class="rank-detail__thresholds">
          <span v-if="difficulty.status !== 'RANKED'" class="rank-detail__threshold" :class="{ 'rank-detail__threshold--met': voteData.rankReady }">
            {{ voteData.rankReady ? 'Rank Ready' : 'Not Rank Ready' }}
          </span>
          <span v-if="difficulty.status === 'RANKED'" class="rank-detail__threshold" :class="{ 'rank-detail__threshold--met': voteData.reweightReady }">
            {{ voteData.reweightReady ? 'Reweight Ready' : 'Not Reweight Ready' }}
          </span>
          <span class="rank-detail__threshold rank-detail__threshold--criteria" :class="{
            'rank-detail__threshold--criteria-pass': voteData.criteriaUpvotes > voteData.criteriaDownvotes,
            'rank-detail__threshold--criteria-fail': voteData.criteriaDownvotes > voteData.criteriaUpvotes,
          }">
            Criteria {{ voteData.criteriaUpvotes }}/{{ voteData.criteriaDownvotes }}
          </span>
          <span v-if="voteData.headCriteriaVote" class="rank-detail__threshold" :class="{
            'rank-detail__threshold--override-pass': voteData.headCriteriaVote === 'UPVOTE',
            'rank-detail__threshold--override-fail': voteData.headCriteriaVote === 'DOWNVOTE',
            'rank-detail__threshold--override': voteData.headCriteriaVote === 'NEUTRAL',
          }">
            Head: {{ voteData.headCriteriaVote === 'UPVOTE' ? 'Pass' : voteData.headCriteriaVote === 'DOWNVOTE' ? 'Fail' : 'Neutral' }}
          </span>
        </div>

        <div v-if="isHeadRanking" class="rank-detail__collapsible">
          <button class="rank-detail__collapsible-header" @click="managementOpen = !managementOpen">
            <h3 class="rank-detail__section-title">Management</h3>
            <svg class="rank-detail__collapsible-chevron" :class="{ 'rank-detail__collapsible-chevron--open': managementOpen }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div v-if="managementOpen" class="rank-detail__action-row">
            <BaseButton
              v-for="transition in statusTransitions"
              :key="transition.value"
              variant="primary"
              size="sm"
              @click="statusTarget = transition.value; showStatusModal = true"
            >
              {{ transition.label }}
            </BaseButton>
            <BaseSelect
              v-if="batchOptions.length"
              :options="[{ value: '', label: 'Add to Batch...' }, ...batchOptions]"
              model-value=""
              @update:model-value="(v: string) => v && addToBatch(v)"
            />
            <BaseButton variant="destructive" size="sm" @click="handleDeactivate">Deactivate</BaseButton>
          </div>
        </div>

        <div class="rank-detail__collapsible">
          <button class="rank-detail__collapsible-header" @click="voteFormOpen = !voteFormOpen">
            <h3 class="rank-detail__section-title">{{ difficulty.status === 'RANKED' ? 'Cast Reweight Vote' : 'Cast Rank Vote' }}</h3>
            <svg class="rank-detail__collapsible-chevron" :class="{ 'rank-detail__collapsible-chevron--open': voteFormOpen }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div v-if="voteFormOpen" class="rank-detail__vote-form-content">
          <div class="rank-detail__vote-type-row">
            <button
              class="rank-detail__vote-btn rank-detail__vote-btn--up"
              :class="{ 'rank-detail__vote-btn--active': voteType === 'UPVOTE' }"
              @click="voteType = 'UPVOTE'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              Upvote
            </button>
            <button
              class="rank-detail__vote-btn rank-detail__vote-btn--down"
              :class="{ 'rank-detail__vote-btn--active': voteType === 'DOWNVOTE' }"
              @click="voteType = 'DOWNVOTE'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
              Downvote
            </button>
            <button
              class="rank-detail__vote-btn rank-detail__vote-btn--neutral"
              :class="{ 'rank-detail__vote-btn--active': voteType === 'NEUTRAL' }"
              @click="voteType = 'NEUTRAL'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Neutral
            </button>
          </div>

          <div v-if="availableActions.length > 1" class="rank-detail__vote-action-row">
            <BaseSelect
              :model-value="voteAction"
              :options="availableActions"
              @update:model-value="voteAction = $event as MapVoteAction"
            />
          </div>

          <BaseInput
            v-model.number="voteSuggestedComplexity"
            type="number"
            label="Suggested Complexity"
            placeholder="e.g. 8.5"
          />

          <div v-if="difficulty.status !== 'RANKED'" class="rank-detail__criteria-vote-section">
            <label class="rank-detail__field-label">Criteria Vote</label>
            <div class="rank-detail__criteria-vote-row">
              <button
                class="rank-detail__vote-btn rank-detail__vote-btn--up rank-detail__vote-btn--sm"
                :class="{ 'rank-detail__vote-btn--active': voteCriteriaVote === 'UPVOTE' }"
                @click="voteCriteriaVote = voteCriteriaVote === 'UPVOTE' ? undefined : 'UPVOTE'"
              >Pass</button>
              <button
                class="rank-detail__vote-btn rank-detail__vote-btn--down rank-detail__vote-btn--sm"
                :class="{ 'rank-detail__vote-btn--active': voteCriteriaVote === 'DOWNVOTE' }"
                @click="voteCriteriaVote = voteCriteriaVote === 'DOWNVOTE' ? undefined : 'DOWNVOTE'"
              >Fail</button>
              <button
                class="rank-detail__vote-btn rank-detail__vote-btn--neutral rank-detail__vote-btn--sm"
                :class="{ 'rank-detail__vote-btn--active': voteCriteriaVote === 'NEUTRAL' }"
                @click="voteCriteriaVote = voteCriteriaVote === 'NEUTRAL' ? undefined : 'NEUTRAL'"
              >Neutral</button>
            </div>
            <label v-if="isHeadRanking" class="rank-detail__override-toggle">
              <input type="checkbox" v-model="voteCriteriaOverride" />
              <span>Override criteria check</span>
              <span class="rank-detail__override-hint">Signals that the automated criteria verdict should be bypassed</span>
            </label>
          </div>

          <textarea
            v-model="voteReason"
            class="rank-detail__reason-input"
            placeholder="Reason (optional)"
            rows="3"
          />

          <div v-if="voteError" class="rank-detail__vote-error">{{ voteError }}</div>

          <BaseButton variant="primary" :loading="voteSubmitting" @click="submitVote">
            Submit Vote
          </BaseButton>
          </div>
        </div>

        <div class="rank-detail__votes-section">
          <h3 class="rank-detail__section-title">
            Votes
            <span v-if="voteData" class="rank-detail__vote-count">({{ voteData.votes.length }})</span>
          </h3>

          <div v-if="voteLoading" class="rank-detail__votes-loading">
            <SkeletonLoader variant="text" />
            <SkeletonLoader variant="text" />
          </div>

          <div v-else-if="voteData && voteData.votes.length" class="rank-detail__vote-list">
            <div
              v-for="vote in voteData.votes"
              :key="vote.id"
              class="rank-detail__vote-card"
            >
              <div class="rank-detail__vote-header">
                <img
                  v-if="vote.staffAvatarUrl"
                  :src="vote.staffAvatarUrl"
                  alt=""
                  class="rank-detail__vote-avatar"
                />
                <div v-else class="rank-detail__vote-avatar rank-detail__vote-avatar--placeholder">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span class="rank-detail__vote-username">{{ vote.staffUsername ?? 'Unknown' }}</span>
                <span class="rank-detail__vote-icon" :class="voteIconClass(vote.vote)">
                  <template v-if="vote.vote === 'UPVOTE'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                  </template>
                  <template v-else-if="vote.vote === 'DOWNVOTE'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                    </svg>
                  </template>
                  <template v-else>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </template>
                </span>
                <span class="rank-detail__vote-action-label">{{ vote.type }}</span>
                <span v-if="vote.suggestedComplexity != null" class="rank-detail__vote-complexity" :class="{ 'rank-detail__vote-complexity--highlight': vote.vote === 'UPVOTE' }">
                  {{ vote.suggestedComplexity }}
                </span>
                <span class="rank-detail__vote-date">{{ formatRelativeDate(vote.createdAt) }}</span>
                <BaseButton
                  v-if="isHeadRanking"
                  size="sm"
                  variant="destructive"
                  class="rank-detail__vote-deactivate"
                  @click="deactivateVote(vote.id)"
                >
                  Deactivate
                </BaseButton>
              </div>
              <div v-if="vote.criteriaVote || vote.criteriaVoteOverride" class="rank-detail__vote-criteria-row">
                <span v-if="vote.criteriaVote" class="rank-detail__vote-criteria" :class="{
                  'rank-detail__vote-criteria--pass': vote.criteriaVote === 'UPVOTE',
                  'rank-detail__vote-criteria--fail': vote.criteriaVote === 'DOWNVOTE',
                  'rank-detail__vote-criteria--neutral': vote.criteriaVote === 'NEUTRAL',
                }">
                  Criteria: {{ vote.criteriaVote === 'UPVOTE' ? 'Pass' : vote.criteriaVote === 'DOWNVOTE' ? 'Fail' : 'Neutral' }}
                </span>
                <span v-if="vote.criteriaVoteOverride" class="rank-detail__vote-override">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Criteria Override
                </span>
              </div>
              <p v-if="vote.reason" class="rank-detail__vote-reason">{{ vote.reason }}</p>
            </div>
          </div>

          <div v-else class="rank-detail__no-votes">
            No votes yet.
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="rank-detail__not-found">
        <h2>Difficulty not found</h2>
        <BaseButton @click="router.push({ name: rankingDashboardRoute })">Back to Queue</BaseButton>
      </div>
    </template>

    <BaseModal :open="showStatusModal" title="Change Status" max-width="400px" @close="showStatusModal = false">
      <p style="color: var(--text-secondary); margin: 0 0 var(--space-md)">
        Move this difficulty to <strong>{{ statusTarget }}</strong>?
      </p>
      <template #footer>
        <div style="display: flex; gap: var(--space-sm); justify-content: flex-end">
          <BaseButton @click="showStatusModal = false">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="statusLoading" @click="handleStatusChange">Confirm</BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseModal :open="showComplexityModal" title="Set Complexity" max-width="400px" @close="showComplexityModal = false">
      <BaseInput v-model.number="complexityValue" type="number" label="Complexity" placeholder="e.g. 8.5" />
      <template #footer>
        <div style="display: flex; gap: var(--space-sm); justify-content: flex-end">
          <BaseButton @click="showComplexityModal = false">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="complexityLoading" @click="handleComplexityChange">Save</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.rank-detail {
  position: relative;
  min-height: 100vh;
}

.rank-detail > *:not(.rank-detail__bg) {
  position: relative;
  z-index: 1;
}

.rank-detail__bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50vh;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.rank-detail__bg-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center 20%;
  filter: blur(40px);
  opacity: 0.3;
  transform: scale(1.1);
}

.rank-detail__bg-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, var(--bg-base) 100%);
}

.rank-detail__loading {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-3xl) var(--space-xl);
}

.rank-detail__not-found {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.rank-detail__content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg) var(--space-xl) var(--space-3xl);
}

.rank-detail__nav {
  margin-bottom: var(--space-lg);
}

.rank-detail__back {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-btn);
  transition: color 120ms ease, background 120ms ease;
}

.rank-detail__back:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.rank-detail__hero {
  display: flex;
  gap: var(--space-xl);
  padding: var(--space-xl);
  background: color-mix(in srgb, var(--bg-surface) 55%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
  margin-bottom: var(--space-lg);
}

.rank-detail__cover-wrap {
  position: relative;
  flex-shrink: 0;
  width: 96px;
  height: 96px;
}

.rank-detail__cover {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-card);
  position: relative;
  z-index: 1;
}

.rank-detail__cover-glow {
  position: absolute;
  inset: -8px;
  background-size: cover;
  background-position: center;
  filter: blur(16px) saturate(1.8);
  opacity: 0.4;
  border-radius: var(--radius-card);
  z-index: 0;
}

.rank-detail__hero-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rank-detail__song-name {
  font-size: var(--text-section);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.rank-detail__song-sub {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
}

.rank-detail__song-meta {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
}

.rank-detail__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.rank-detail__diff-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
}

.rank-detail__category-badge {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--cat-accent, var(--accent)) 15%, transparent);
  color: var(--cat-accent, var(--accent));
  border: 1px solid color-mix(in srgb, var(--cat-accent, var(--accent)) 30%, transparent);
}

.rank-detail__status-badge {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-badge--queue {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
}

.status-badge--qualified {
  background: color-mix(in srgb, var(--info) 15%, transparent);
  color: var(--info);
  border: 1px solid color-mix(in srgb, var(--info) 30%, transparent);
}

.status-badge--ranked {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
}

.rank-detail__criteria-badge {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.criteria-badge--passed {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
}

.criteria-badge--failed {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
}

.criteria-badge--pending {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
}

.rank-detail__complexity-editable {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border-radius: var(--radius-pill);
  padding-right: 4px;
  transition: background 120ms ease;
}

.rank-detail__complexity-editable:hover {
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
}

.rank-detail__complexity-editable svg {
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 120ms ease;
}

.rank-detail__complexity-editable:hover svg {
  opacity: 1;
}

.rank-detail__complexity-unset {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-style: italic;
}

.rank-detail__links {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.rank-detail__thresholds {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.rank-detail__threshold {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  background: var(--bg-elevated);
  color: var(--text-tertiary);
  border: 1px solid var(--bg-overlay);
}

.rank-detail__threshold--met {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

.rank-detail__threshold--danger.rank-detail__threshold--met {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}

.rank-detail__threshold--criteria-pass {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

.rank-detail__threshold--criteria-fail {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}

.rank-detail__threshold--override {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 30%, transparent);
}

.rank-detail__threshold--override-pass {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

.rank-detail__threshold--override-fail {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}

.rank-detail__section-title {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 var(--space-md);
}

.rank-detail__vote-count {
  font-weight: 400;
  color: var(--text-tertiary);
}

.rank-detail__collapsible {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  margin-bottom: var(--space-lg);
  overflow: hidden;
}

.rank-detail__collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 120ms ease;
}

.rank-detail__collapsible-header:hover {
  background: var(--bg-elevated);
}

.rank-detail__collapsible-header .rank-detail__section-title {
  margin: 0;
}

.rank-detail__collapsible-chevron {
  color: var(--text-tertiary);
  transition: transform 150ms ease;
  flex-shrink: 0;
}

.rank-detail__collapsible-chevron--open {
  transform: rotate(180deg);
}

.rank-detail__action-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
  padding: 0 var(--space-lg) var(--space-lg);
}

.rank-detail__vote-form-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: 0 var(--space-lg) var(--space-lg);
}

.rank-detail__vote-type-row {
  display: flex;
  gap: var(--space-sm);
}

.rank-detail__vote-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-btn);
  border: 1px solid var(--bg-overlay);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-caption);
  font-weight: 600;
  transition: all 120ms ease;
}

.rank-detail__vote-btn:hover {
  border-color: var(--text-tertiary);
}

.rank-detail__vote-btn--up.rank-detail__vote-btn--active {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  border-color: var(--success);
  color: var(--success);
}

.rank-detail__vote-btn--down.rank-detail__vote-btn--active {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  border-color: var(--error);
  color: var(--error);
}

.rank-detail__vote-btn--neutral.rank-detail__vote-btn--active {
  background: color-mix(in srgb, var(--text-secondary) 15%, transparent);
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

.rank-detail__vote-action-row {
  max-width: 200px;
}

.rank-detail__reason-input {
  width: 100%;
  min-height: 72px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-body);
  resize: vertical;
  transition: border-color 120ms ease;
}

.rank-detail__reason-input::placeholder {
  color: var(--text-tertiary);
}

.rank-detail__reason-input:focus {
  outline: none;
  border-color: var(--page-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent, var(--accent)) 20%, transparent);
}

.rank-detail__criteria-vote-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.rank-detail__field-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rank-detail__criteria-vote-row {
  display: flex;
  gap: var(--space-xs);
}

.rank-detail__vote-btn--sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-caption);
}

.rank-detail__override-toggle {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  cursor: pointer;
  flex-wrap: wrap;
}

.rank-detail__override-toggle input {
  accent-color: var(--warning);
  margin-top: 2px;
}

.rank-detail__override-hint {
  width: 100%;
  font-size: 0.65rem;
  color: var(--text-tertiary);
  padding-left: calc(16px + var(--space-sm));
}

.rank-detail__vote-criteria-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-left: calc(28px + var(--space-sm));
  margin-top: var(--space-xs);
}

.rank-detail__vote-criteria {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
}

.rank-detail__vote-criteria--pass {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}

.rank-detail__vote-criteria--fail {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
}

.rank-detail__vote-criteria--neutral {
  background: color-mix(in srgb, var(--text-tertiary) 15%, transparent);
  color: var(--text-tertiary);
}

.rank-detail__vote-override {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--warning);
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
}

.rank-detail__vote-error {
  color: var(--error);
  font-size: var(--text-caption);
}

.rank-detail__votes-section {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
}

.rank-detail__votes-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.rank-detail__vote-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.rank-detail__vote-card {
  background: var(--bg-elevated);
  border-radius: var(--radius-btn);
  padding: var(--space-md);
}

.rank-detail__vote-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.rank-detail__vote-avatar {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
}

.rank-detail__vote-avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  color: var(--text-tertiary);
}

.rank-detail__vote-username {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--text-body);
}

.rank-detail__vote-icon {
  display: flex;
  align-items: center;
}

.vote-icon--up { color: var(--success); }
.vote-icon--down { color: var(--error); }
.vote-icon--neutral { color: var(--text-tertiary); }

.rank-detail__vote-action-label {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rank-detail__vote-complexity {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  padding: 2px 8px;
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.rank-detail__vote-complexity--highlight {
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--success) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
}

.rank-detail__vote-date {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  margin-left: auto;
}

.rank-detail__vote-deactivate {
  margin-left: var(--space-sm);
}

.rank-detail__vote-reason {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.5;
  padding-left: calc(28px + var(--space-sm));
}

.rank-detail__no-votes {
  color: var(--text-tertiary);
  font-size: var(--text-body);
  text-align: center;
  padding: var(--space-xl);
}

@media (max-width: 767px) {
  .rank-detail__content {
    padding: var(--space-md) var(--space-md) var(--space-2xl);
  }

  .rank-detail__hero {
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .rank-detail__vote-type-row {
    flex-wrap: wrap;
  }

  .rank-detail__vote-header {
    gap: var(--space-xs);
  }

  .rank-detail__vote-date {
    margin-left: 0;
    width: 100%;
  }
}
</style>
