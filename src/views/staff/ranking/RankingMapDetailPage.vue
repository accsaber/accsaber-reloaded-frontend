<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import LeaderboardPreviewPanel from '@/views/staff/ranking/LeaderboardPreviewPanel.vue'
import { useColorExtract } from '@/composables/useColorExtract'
import { usePageMeta } from '@/composables/usePageMeta'
import { rankingDashboardRoute } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useRankingQueueStore } from '@/stores/rankingQueue'
import { useThemeStore } from '@/stores/theme'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import type { Tab } from '@/types/display'
import { brightenRgb } from '@/utils/color'
import { pickCoverUrl } from '@/utils/media'
import CategoryModal from '@/views/staff/ranking/detail/CategoryModal.vue'
import ComplexityModal from '@/views/staff/ranking/detail/ComplexityModal.vue'
import RankDetailHero from '@/views/staff/ranking/detail/RankDetailHero.vue'
import RankDetailManagement from '@/views/staff/ranking/detail/RankDetailManagement.vue'
import RankDetailVoteForm from '@/views/staff/ranking/detail/RankDetailVoteForm.vue'
import RankDetailVoteList from '@/views/staff/ranking/detail/RankDetailVoteList.vue'
import RefreshModal from '@/views/staff/ranking/detail/RefreshModal.vue'
import { useDifficultyDrift } from '@/views/staff/ranking/detail/useDifficultyDrift'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const themeStore = useThemeStore()
const queueCache = useRankingQueueStore()

const difficultyId = computed(() => route.params.difficultyId as string)

const difficulty = ref<MapDifficultyResponse | null>(null)
const voteData = ref<VoteListResponse | null>(null)
const loading = ref(true)
const voteLoading = ref(true)

const coverUrl = computed(() => pickCoverUrl(difficulty.value))
const { dominantColor } = useColorExtract(coverUrl)

const categoryCode = computed(() => {
  if (!difficulty.value) return 'overall'
  return categoryStore.getCategoryCode(difficulty.value.categoryId) ?? 'overall'
})

const resolvedAccent = computed(() => {
  const raw = dominantColor.value
  if (!raw) return categoryStore.getAccent(categoryCode.value)
  return themeStore.resolvedBase === 'dark' ? brightenRgb(raw, 60) : raw
})

const metaTitle = computed(() => {
  if (!difficulty.value) return 'Map Detail | Ranking'
  return `${difficulty.value.songAuthor} - ${difficulty.value.songName} | Ranking`
})

usePageMeta({ title: metaTitle })

const isHeadRanking = computed(() => authStore.hasRole('RANKING_HEAD'))
const isRanking = computed(() => authStore.hasRole('RANKING'))

const canRefreshFromBeatSaver = computed(
  () =>
    isHeadRanking.value &&
    !!difficulty.value &&
    difficulty.value.status !== 'RANKED' &&
    !!difficulty.value.beatsaverCode,
)
const { driftInfo, checking: driftChecking, recheck: recheckDrift } = useDifficultyDrift(
  difficulty,
  canRefreshFromBeatSaver,
)

const activeTab = ref<'voting' | 'leaderboard'>('voting')
const detailTabs: Tab[] = [
  { key: 'voting', label: 'Voting' },
  { key: 'leaderboard', label: 'Leaderboard Preview' },
]

const activeModal = ref<'complexity' | 'category' | 'refresh' | null>(null)
const complexityNotice = ref('')

const REWEIGHT_NOTICE = 'Complexity saved and the reweight is now running on this map. Scores, statistics, rankings, milestones, XP and skills adjust in the background, and the numbers on this page stay behind until it lands.'

function goBackToQueue() {
  router.push(queueCache.lastReturnUrl || { name: rankingDashboardRoute })
}

async function fetchDifficulty() {
  const id = difficultyId.value
  const silent = difficulty.value?.id === id
  if (!silent) loading.value = true
  try {
    const { getRankingDifficulty } = await import('@/api/ranking/maps')
    const res = await getRankingDifficulty(id)
    if (id === difficultyId.value) difficulty.value = res
  } catch {
    if (id === difficultyId.value && !silent) difficulty.value = null
  }
  if (id === difficultyId.value) loading.value = false
}

async function fetchVotes() {
  voteLoading.value = true
  try {
    const { listVotes } = await import('@/api/ranking/voting')
    const type = difficulty.value?.status === 'RANKED' ? 'REWEIGHT' : 'RANK'
    voteData.value = await listVotes(difficultyId.value, type)
  } catch {
    voteData.value = null
  }
  voteLoading.value = false
}

watch(difficultyId, async () => {
  complexityNotice.value = ''
  await fetchDifficulty()
  fetchVotes()
}, { immediate: true })

function onComplexitySaved(updated: MapDifficultyResponse, wasRanked: boolean) {
  difficulty.value = updated
  activeModal.value = null
  complexityNotice.value = wasRanked ? REWEIGHT_NOTICE : ''
}

async function onCategorySaved() {
  activeModal.value = null
  await fetchDifficulty()
}

async function onRefreshed() {
  activeModal.value = null
  await fetchDifficulty()
  await recheckDrift()
}
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
        <div class="rank-detail__bg-image" :style="{ backgroundImage: `url(${coverUrl})` }" />
      </div>

      <div class="rank-detail__content"
        :class="{ 'rank-detail__content--wide': activeTab === 'leaderboard' }">
        <div class="rank-detail__nav">
          <button class="rank-detail__back" @click="goBackToQueue"
            aria-label="Back to queue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Queue
          </button>
        </div>

        <BaseBanner v-if="complexityNotice" variant="info" @close="complexityNotice = ''">
          {{ complexityNotice }}
        </BaseBanner>

        <RankDetailHero :difficulty="difficulty" :vote-data="voteData" :cover-url="coverUrl"
          :category-code="categoryCode" :is-head-ranking="isHeadRanking" :is-ranking="isRanking"
          @edit-category="activeModal = 'category'" @edit-complexity="activeModal = 'complexity'" />

        <div class="rank-detail__tabs">
          <BaseTabs :tabs="detailTabs" :model-value="activeTab"
            @update:model-value="(v: string) => activeTab = v as 'voting' | 'leaderboard'" />
        </div>

        <LeaderboardPreviewPanel v-if="activeTab === 'leaderboard'"
          :map-difficulty-id="difficulty.id" :script-complexity="difficulty.scriptComplexity"
          :script-version="difficulty.scriptVersion" />

        <div v-show="activeTab === 'voting'">
          <RankDetailManagement v-if="isHeadRanking" :difficulty="difficulty"
            :can-refresh="canRefreshFromBeatSaver" :drift-info="driftInfo" :drift-checking="driftChecking"
            @updated="difficulty = $event" @refresh="activeModal = 'refresh'" />
          <RankDetailVoteForm :difficulty="difficulty" :vote-data="voteData" :is-head-ranking="isHeadRanking"
            @voted="fetchVotes" />
          <RankDetailVoteList :difficulty-id="difficultyId" :vote-data="voteData" :loading="voteLoading"
            :is-head-ranking="isHeadRanking" @changed="fetchVotes" />
        </div>
      </div>

      <ComplexityModal :open="activeModal === 'complexity'" :difficulty="difficulty"
        @close="activeModal = null" @saved="onComplexitySaved" />
      <CategoryModal :open="activeModal === 'category'" :difficulty="difficulty"
        @close="activeModal = null" @saved="onCategorySaved" />
      <RefreshModal :open="activeModal === 'refresh'" :difficulty-id="difficultyId" :drift-info="driftInfo"
        @close="activeModal = null" @refreshed="onRefreshed" />
    </template>

    <template v-else>
      <div class="rank-detail__not-found">
        <h2>Difficulty not found</h2>
        <BaseButton @click="goBackToQueue">Back to Queue</BaseButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rank-detail {
  position: relative;
  min-height: 100vh;
}

.rank-detail>*:not(.rank-detail__bg) {
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
  -webkit-mask-image: linear-gradient(180deg, black 0%, transparent 100%);
  mask-image: linear-gradient(180deg, black 0%, transparent 100%);
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
  min-width: 0;
  max-width: var(--rank-detail-column, 800px);
  margin: 0 auto;
  padding: var(--space-lg) var(--space-xl) var(--space-3xl);
}

.rank-detail__content--wide {
  --rank-detail-column: 1280px;
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

.rank-detail__tabs {
  margin-bottom: var(--space-lg);
}

@media (max-width: 767px) {
  .rank-detail__content {
    padding: var(--space-md) var(--space-md) var(--space-2xl);
  }
}
</style>
