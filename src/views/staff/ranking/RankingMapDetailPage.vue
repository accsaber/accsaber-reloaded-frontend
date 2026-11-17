<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useColorExtract } from '@/composables/useColorExtract'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useThemeStore } from '@/stores/theme'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import type { Tab } from '@/types/display'
import { brightenRgb } from '@/utils/color'
import { pickCoverUrl } from '@/utils/media'
import LeaderboardPreviewPanel from '@/views/staff/ranking/LeaderboardPreviewPanel.vue'
import RankDetailHero from '@/views/staff/ranking/detail/RankDetailHero.vue'
import RankDetailManagement from '@/views/staff/ranking/detail/RankDetailManagement.vue'
import RankDetailVoteForm from '@/views/staff/ranking/detail/RankDetailVoteForm.vue'
import RankDetailVoteList from '@/views/staff/ranking/detail/RankDetailVoteList.vue'
import { useDifficultyDrift } from '@/views/staff/ranking/detail/useDifficultyDrift'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

type DetailTab = 'voting' | 'leaderboard'

const RefreshModal = defineAsyncComponent(() => import('@/views/staff/ranking/detail/RefreshModal.vue'))

const TABS: Tab[] = [
  { key: 'voting', label: 'Voting' },
  { key: 'leaderboard', label: 'Leaderboard Preview' },
]
const HEAD_FORM_GHOST = 601
const FORM_GHOST = 514
const REWEIGHT_NOTICE = 'Complexity saved and the reweight is running. Scores, statistics, rankings, milestones, XP and skills adjust in the background, so the numbers here stay behind until it finishes.'

const route = useRoute()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const themeStore = useThemeStore()

const difficultyId = computed(() => route.params.difficultyId as string)

const difficulty = ref<MapDifficultyResponse | null>(null)
const voteData = ref<VoteListResponse | null>(null)
const loading = ref(true)
const voteLoading = ref(true)

const coverUrl = computed(() => pickCoverUrl(difficulty.value))
const { dominantColor } = useColorExtract(coverUrl)

const categoryCode = computed(() =>
  difficulty.value ? (categoryStore.getCategoryCode(difficulty.value.categoryId) ?? 'overall') : 'overall',
)

const accent = computed(() => {
  const raw = dominantColor.value
  if (!raw) return categoryStore.getAccent(categoryCode.value)
  return themeStore.resolvedBase === 'dark' ? brightenRgb(raw, 60) : raw
})

usePageMeta({
  title: computed(() =>
    difficulty.value ? `${difficulty.value.songAuthor} - ${difficulty.value.songName} | Ranking` : 'Map Detail | Ranking',
  ),
})

const isHeadRanking = computed(() => authStore.hasRole('RANKING_HEAD'))
const isRanking = computed(() => authStore.hasRole('RANKING'))

const canRefresh = computed(
  () => isHeadRanking.value && !!difficulty.value && difficulty.value.status !== 'RANKED' && !!difficulty.value.beatsaverCode,
)
const { driftInfo, checking: driftChecking, recheck: recheckDrift } = useDifficultyDrift(difficulty, canRefresh)

const activeTab = ref<DetailTab>('voting')
const refreshOpen = ref(false)
const refreshMounted = ref(false)
const notice = ref('')

function openRefresh() {
  refreshMounted.value = true
  refreshOpen.value = true
}

async function fetchDifficulty() {
  const id = difficultyId.value
  if (difficulty.value?.id !== id) loading.value = true
  try {
    const { getRankingDifficulty } = await import('@/api/ranking/maps')
    const fetched = await getRankingDifficulty(id)
    if (id === difficultyId.value) difficulty.value = fetched
  } catch {
    if (id === difficultyId.value && loading.value) difficulty.value = null
  } finally {
    if (id === difficultyId.value) loading.value = false
  }
}

async function fetchVotes() {
  const id = difficultyId.value
  voteLoading.value = true
  try {
    const { listVotes } = await import('@/api/ranking/voting')
    const fetched = await listVotes(id, difficulty.value?.status === 'RANKED' ? 'REWEIGHT' : 'RANK')
    if (id === difficultyId.value) voteData.value = fetched
  } catch {
    if (id === difficultyId.value) voteData.value = null
  } finally {
    if (id === difficultyId.value) voteLoading.value = false
  }
}

watch(
  difficultyId,
  async () => {
    notice.value = ''
    voteData.value = null
    await fetchDifficulty()
    void fetchVotes()
  },
  { immediate: true },
)

function onUpdated(updated: MapDifficultyResponse, reweighting: boolean) {
  difficulty.value = updated
  if (reweighting) notice.value = REWEIGHT_NOTICE
}

async function onRefreshed() {
  refreshOpen.value = false
  await fetchDifficulty()
  await recheckDrift()
}
</script>

<template>
  <div class="rank-detail" :style="{ '--page-accent': accent }">
    <div class="rank-detail__content">
      <EmptyState v-if="!loading && !difficulty" message="Difficulty not found" />

      <template v-else>
        <BaseBanner v-if="notice" variant="info" @close="notice = ''">{{ notice }}</BaseBanner>

        <RankDetailHero
          :difficulty="difficulty"
          :vote-data="voteData"
          :cover-url="coverUrl"
          :category-code="categoryCode"
          :is-head-ranking="isHeadRanking"
          :is-ranking="isRanking"
          @updated="onUpdated"
        />

        <BaseTabs v-model="activeTab" :tabs="TABS" />

        <div :key="activeTab" class="rank-detail__panel">
          <LeaderboardPreviewPanel
            v-if="activeTab === 'leaderboard' && difficulty"
            :map-difficulty-id="difficulty.id"
            :script-complexity="difficulty.scriptComplexity"
            :script-version="difficulty.scriptVersion"
          />
          <div v-else-if="difficulty" class="rank-detail__voting">
            <div class="rank-detail__column">
              <RankDetailVoteForm :difficulty="difficulty" :vote-data="voteData" :is-head-ranking="isHeadRanking" @voted="fetchVotes" />
              <RankDetailManagement
                v-if="isHeadRanking"
                :difficulty="difficulty"
                :can-refresh="canRefresh"
                :drift-info="driftInfo"
                :drift-checking="driftChecking"
                @refresh="openRefresh"
              />
            </div>
            <RankDetailVoteList
              :difficulty-id="difficultyId"
              :vote-data="voteData"
              :loading="voteLoading"
              :is-head-ranking="isHeadRanking"
              @changed="fetchVotes"
            />
          </div>
          <div v-else class="rank-detail__voting">
            <SkeletonLoader class="placeholder" :height="`${isHeadRanking ? HEAD_FORM_GHOST : FORM_GHOST}px`" />
            <SkeletonLoader class="placeholder" height="134px" />
          </div>
        </div>
      </template>
    </div>

    <RefreshModal
      v-if="difficulty && refreshMounted"
      :open="refreshOpen"
      :difficulty-id="difficultyId"
      :drift-info="driftInfo"
      @close="refreshOpen = false"
      @refreshed="onRefreshed"
    />
  </div>
</template>

<style scoped>
.rank-detail {
  position: relative;
}

.rank-detail__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  min-width: 0;
  margin: 0 auto;
}

.rank-detail__content > *:not(.map-hero) {
  position: relative;
  z-index: 1;
}

.rank-detail__panel {
  animation: settle-in var(--dur-enter) var(--ease-out) backwards;
}

.rank-detail__voting {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-lg);
  align-items: start;
}

.rank-detail__column {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

@media (max-width: 1023px) {
  .rank-detail__voting {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
