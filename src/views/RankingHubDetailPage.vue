<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FollowButton from '@/components/domain/FollowButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import DeactivationNote from '@/components/domain/DeactivationNote.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapComments from '@/components/domain/MapComments.vue'
import MapHero from '@/components/domain/MapHero.vue'
import RankingFacts from '@/components/domain/RankingFacts.vue'
import VoteList from '@/components/domain/VoteList.vue'
import { useAutoCheckPoll } from '@/composables/useAutoCheckPoll'
import { useMapComments } from '@/composables/useMapComments'
import { useMapFollow } from '@/composables/useMapFollow'
import { usePageMeta } from '@/composables/usePageMeta'
import { useWithdrawSuggestion } from '@/composables/useWithdrawSuggestion'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type { PublicMapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import { buildHubRoute, buildMapRoute, isUuid, slugToDifficulty } from '@/utils/mapRoute'
import { pickCoverFallback, pickCoverUrl } from '@/utils/media'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const PseudoLoginModal = defineAsyncComponent(() => import('@/components/domain/PseudoLoginModal.vue'))

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const categoryStore = useCategoryStore()

const difficulty = ref<PublicMapDifficultyResponse | null>(null)
const difficultyId = computed(() => difficulty.value?.id)
const voteData = ref<VoteListResponse | null>(null)
const loading = ref(true)
const loginMounted = ref(false)
const loginOpen = ref(false)
const pollAutoCheck = useAutoCheckPoll()
const { confirmModal, canWithdraw, askWithdraw } = useWithdrawSuggestion()
const { following, busy: followBusy, error: followError, set: setFollowing, toggle: toggleFollow } = useMapFollow(difficultyId, openLogin)

const categoryCode = computed(() =>
  difficulty.value ? (categoryStore.getCategoryCode(difficulty.value.categoryId) ?? 'overall') : 'overall',
)
const accent = computed(() => categoryStore.getAccent(categoryCode.value))
const ownSuggestion = computed(() => !!auth.userId && difficulty.value?.importedBy?.id === auth.userId)

usePageMeta({
  title: computed(() =>
    difficulty.value ? `${difficulty.value.songAuthor} - ${difficulty.value.songName} | Ranking Hub` : 'Ranking Hub | AccSaber',
  ),
})

const { chat, prime } = useMapComments(difficultyId)

function openLogin() {
  loginMounted.value = true
  loginOpen.value = true
}

type MapsApi = typeof import('@/api/maps')

function fetchHub(api: MapsApi) {
  const ref = route.params.ref as string
  if (isUuid(ref)) return api.getDifficultyHub(ref)
  const slug = route.query.difficulty as string | undefined
  return api.getDifficultyHubByCode(ref, {
    difficulty: slug && slugToDifficulty(slug),
    characteristic: route.query.characteristic as string | undefined,
  })
}

async function load() {
  const path = route.fullPath
  loading.value = true
  difficulty.value = null
  voteData.value = null
  const api = await import('@/api/maps')
  const hub = await fetchHub(api).catch(() => null)
  if (path !== route.fullPath) return
  const fetched = hub?.difficulty ?? null
  if (fetched && !fetched.deactivatedAt && (fetched.status === 'RANKED' || fetched.status === 'CAMPAIGN')) {
    void router.replace(buildMapRoute({ ...fetched, difficultyId: fetched.id }))
    return
  }
  if (hub) {
    prime(hub.difficulty.id, hub.comments)
    setFollowing(hub.subscribed)
    voteData.value = hub.votes
  }
  difficulty.value = fetched
  loading.value = false
  if (!fetched) return
  const { id } = fetched
  if (isUuid(route.params.ref as string) && !fetched.deactivatedAt) void router.replace(buildHubRoute(fetched))
  pollAutoCheck(fetched, () => api.getDifficulty(id), (fresh) => { if (id === difficultyId.value) difficulty.value = fresh })
}

watch(
  () => route.fullPath,
  (path) => {
    if (difficulty.value && router.resolve(buildHubRoute(difficulty.value)).fullPath === path) return
    void load()
  },
  { immediate: true },
)

function leave() {
  void router.replace({ name: 'ranked-queue', query: { tab: 'suggested' } })
}

async function runCheck() {
  const { refreshCriteriaCheck } = await import('@/api/maps')
  return refreshCriteriaCheck(difficultyId.value!)
}
</script>

<template>
  <div class="hub-detail" :style="{ '--page-accent': accent }">
    <div class="hero-column">
      <EmptyState v-if="!loading && !difficulty" message="Difficulty not found" />

      <template v-else>
        <MapHero
          :song="difficulty"
          :cover-url="pickCoverUrl(difficulty)"
          :cover-fallback="pickCoverFallback(difficulty)"
          :bl-leaderboard-id="difficulty?.blLeaderboardId"
          :ss-leaderboard-id="difficulty?.ssLeaderboardId"
          :chart="difficulty"
        >
          <template v-if="difficulty" #meta>
            <DifficultyBadge :difficulty="difficulty.difficulty" />
            <span class="hub-detail__category">{{ categoryStore.getCategoryInfo(categoryCode)?.name ?? categoryCode }}</span>
            <DeactivationNote v-if="difficulty.deactivatedAt" :at="difficulty.deactivatedAt" :reason="difficulty.deactivationReason" />
          </template>

          <template v-if="difficulty" #actions>
            <FollowButton :following="following" :busy="followBusy" @toggle="toggleFollow" />
            <BaseButton v-if="canWithdraw(difficulty)" size="sm" variant="destructive" @click="askWithdraw(difficulty, leave)">
              Withdraw
            </BaseButton>
          </template>

          <template v-if="followError" #side>
            <span class="caption hub-detail__error" role="alert">{{ followError }}</span>
          </template>

          <template v-if="difficulty" #facts>
            <RankingFacts :difficulty="difficulty" :vote-data="voteData" :run="ownSuggestion ? runCheck : undefined" />
          </template>
        </MapHero>

        <div v-if="difficulty" class="hub-detail__columns">
          <VoteList v-if="difficulty.status !== 'SUGGESTED'" :difficulty-id="difficulty.id" :vote-data="voteData" :loading="false" />
          <MapComments :difficulty-id="difficulty.id" :chat="chat">
            <template v-if="!auth.userId" #action>
              <BaseButton size="sm" @click="openLogin">Log In to Comment</BaseButton>
            </template>
          </MapComments>
        </div>
        <div v-else class="hub-detail__columns">
          <SkeletonLoader class="placeholder hub-detail__votes-ghost" height="100%" />
          <SkeletonLoader class="placeholder hub-detail__comments" height="100%" />
        </div>
      </template>
    </div>

    <ConfirmModal v-bind="confirmModal" />
    <PseudoLoginModal v-if="loginMounted" :open="loginOpen" @close="loginOpen = false" />
  </div>
</template>

<style scoped>
.hub-detail {
  position: relative;
}

.hub-detail__category {
  font-weight: 600;
  color: var(--page-accent);
}

.hub-detail__error {
  color: var(--error);
}

.hub-detail__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: var(--space-lg);
}

.hub-detail__votes-ghost {
  min-height: 134px;
}

.hub-detail__comments {
  min-height: min(560px, 70vh);
}
</style>
