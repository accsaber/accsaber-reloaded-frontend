<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MapComments from '@/components/domain/MapComments.vue'
import { useColorExtract } from '@/composables/useColorExtract'
import { useAutoCheckPoll } from '@/composables/useAutoCheckPoll'
import { useMapComments } from '@/composables/useMapComments'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useThemeStore } from '@/stores/theme'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import type { Tab } from '@/types/display'
import { brightenRgb } from '@/utils/color'
import { buildRankingMapRoute, isUuid, slugToDifficulty } from '@/utils/mapRoute'
import { pickCoverUrl } from '@/utils/media'
import LeaderboardPreviewPanel from '@/views/staff/ranking/LeaderboardPreviewPanel.vue'
import RankDetailHero from '@/views/staff/ranking/detail/RankDetailHero.vue'
import RankDetailManagement from '@/views/staff/ranking/detail/RankDetailManagement.vue'
import RankDetailSuggestion from '@/views/staff/ranking/detail/RankDetailSuggestion.vue'
import RankDetailVoteForm from '@/views/staff/ranking/detail/RankDetailVoteForm.vue'
import RankDetailVoteList from '@/views/staff/ranking/detail/RankDetailVoteList.vue'
import { useDifficultyDrift } from '@/views/staff/ranking/detail/useDifficultyDrift'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type DetailTab = 'voting' | 'leaderboard' | 'comments'

const RefreshModal = defineAsyncComponent(() => import('@/views/staff/ranking/detail/RefreshModal.vue'))

const TABS: Tab[] = [
  { key: 'voting', label: 'Voting' },
  { key: 'leaderboard', label: 'Leaderboard Preview' },
  { key: 'comments', label: 'Public Comments' },
]
const HEAD_FORM_GHOST = 601
const FORM_GHOST = 514
const REWEIGHT_NOTICE = 'Complexity saved and the reweight is running. Scores, statistics, rankings, milestones, XP and skills adjust in the background, so the numbers here stay behind until it finishes.'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const themeStore = useThemeStore()

const difficulty = ref<MapDifficultyResponse | null>(null)
const difficultyId = computed(() => difficulty.value?.id ?? '')
const subscribed = ref(false)
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

const refreshable = computed(
  () => !!difficulty.value?.active && difficulty.value.status !== 'RANKED' && !!difficulty.value.beatsaverCode,
)
const canRefresh = computed(() => isHeadRanking.value && refreshable.value)
const { driftInfo, checking: driftChecking, recheck: recheckDrift } = useDifficultyDrift(difficulty, refreshable)

const activeTab = ref<DetailTab>('voting')
const tab = computed<DetailTab>(() =>
  difficulty.value?.active === false && activeTab.value === 'leaderboard' ? 'voting' : activeTab.value,
)
const { chat: comments, prime } = useMapComments(difficultyId)
const pollAutoCheck = useAutoCheckPoll()
const refreshOpen = ref(false)
const refreshMounted = ref(false)
const notice = ref('')

function openRefresh() {
  refreshMounted.value = true
  refreshOpen.value = true
}

async function fetchDifficulty() {
  const id = difficultyId.value
  try {
    const { getRankingDifficulty } = await import('@/api/ranking/maps')
    const fetched = await getRankingDifficulty(id)
    if (id === difficultyId.value) difficulty.value = fetched
  } catch {
    return
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

async function fetchHub() {
  const api = await import('@/api/ranking/maps')
  const ref = route.params.ref as string
  if (isUuid(ref)) return api.getRankingDifficultyHub(ref, 'RANK')
  const slug = route.query.difficulty as string | undefined
  return api.getRankingDifficultyHubByCode(
    ref,
    { difficulty: slug && slugToDifficulty(slug), characteristic: route.query.characteristic as string | undefined },
    'RANK',
  )
}

async function load() {
  const path = route.fullPath
  notice.value = ''
  loading.value = true
  voteLoading.value = true
  difficulty.value = null
  voteData.value = null
  const hub = await fetchHub().catch(() => null)
  if (path !== route.fullPath) return
  if (hub) {
    prime(hub.difficulty.id, hub.comments)
    subscribed.value = !!hub.subscribed
  }
  difficulty.value = hub?.difficulty ?? null
  loading.value = false
  if (!hub) return
  const fetched = hub.difficulty
  if (isUuid(route.params.ref as string) && fetched.active) void router.replace(buildRankingMapRoute(fetched))
  const { getRankingDifficulty } = await import('@/api/ranking/maps')
  pollAutoCheck(fetched, () => getRankingDifficulty(fetched.id), (fresh) => { if (fresh.id === difficultyId.value) difficulty.value = fresh })
  if (fetched.status === 'RANKED') return void fetchVotes()
  voteData.value = hub.votes
  voteLoading.value = false
}

watch(
  () => route.fullPath,
  (path) => {
    if (difficulty.value && router.resolve(buildRankingMapRoute(difficulty.value)).fullPath === path) return
    void load()
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
    <div class="hero-column">
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
          :outdated="!!driftInfo"
          :subscribed="subscribed"
          @updated="onUpdated"
        />

        <BaseTabs :model-value="tab" :tabs="TABS" :disabled-keys="difficulty?.active === false ? ['leaderboard'] : []"
          @update:model-value="activeTab = $event as DetailTab" />

        <div :key="tab" class="rank-detail__panel">
          <LeaderboardPreviewPanel
            v-if="tab === 'leaderboard' && difficulty"
            :map-difficulty-id="difficulty.id"
            :script-complexity="difficulty.scriptComplexity"
            :script-version="difficulty.scriptVersion"
          />
          <MapComments v-else-if="tab === 'comments' && difficulty" :difficulty-id="difficulty.id" :chat="comments"
            title="Public Comments" warning="Players see these comments with your name on them. They cannot be deleted!" />
          <div v-else-if="difficulty" class="rank-detail__voting">
            <div v-if="difficulty.active" class="rank-detail__column">
              <RankDetailSuggestion v-if="difficulty.status === 'SUGGESTED'" :difficulty="difficulty" @updated="onUpdated($event, false)" />
              <RankDetailVoteForm v-else :difficulty="difficulty" :vote-data="voteData" :is-head-ranking="isHeadRanking" @voted="fetchVotes" />
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
