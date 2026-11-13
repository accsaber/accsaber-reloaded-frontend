<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import UserCampaignsPanel from '@/components/domain/UserCampaignsPanel.vue'
import { useAppearance } from '@/composables/useAppearance'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { usePageMeta } from '@/composables/usePageMeta'
import { useQueryParams } from '@/composables/useQueryParams'
import { useSupporter } from '@/composables/useSupporter'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useInventoryStore } from '@/stores/inventory'
import { useRelationsStore } from '@/stores/relations'
import type { EquippedItemsResponse, UserItemResponse } from '@/types/api/items'
import type { LevelResponse, StatsDiffResponse, UserAllStatisticsResponse, UserCategoryStatisticsResponse, UserResponse, UserScoresParams } from '@/types/api/users'
import type { CategoryCode } from '@/types/display'
import { STANDARD_PIN_SLOTS, SUPPORTER_PIN_SLOTS } from '@/utils/constants'
import { pickAvatarUrl } from '@/utils/media'
import { tableNaturalWidth } from '@/utils/tableLayout'
import PinnedMilestonesSection from '@/views/profile/PinnedMilestonesSection.vue'
import PinnedScoresSection from '@/views/profile/PinnedScoresSection.vue'
import ProfileBio from '@/views/profile/ProfileBio.vue'
import ProfileHero from '@/views/profile/ProfileHero.vue'
import ProfileInventoryTab from '@/views/profile/ProfileInventoryTab.vue'
import ProfileMilestonesTab from '@/views/profile/ProfileMilestonesTab.vue'
import ProfileScoresTab from '@/views/profile/ProfileScoresTab.vue'
import ProfileStatisticsTab from '@/views/profile/ProfileStatisticsTab.vue'
import ProfileStatsChart from '@/views/profile/ProfileStatsChart.vue'
import ProfileStatStrip from '@/views/profile/ProfileStatStrip.vue'
import RelationCountsBar from '@/views/profile/RelationCountsBar.vue'
import ScoresPlaylistButton from '@/views/profile/ScoresPlaylistButton.vue'
import { useProfileEdit } from '@/views/profile/useProfileEdit'
import { useScoreColumns } from '@/views/profile/useScoreColumns'
import { usePinnedMilestones, usePinnedScores } from '@/views/profile/useProfilePins'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()
const relationsStore = useRelationsStore()
const inventoryStore = useInventoryStore()
const { hideReloadedProfileFeatures, showStatisticsChart } = useAppearance()

const userId = computed(() => route.params.userId as string)

const isBlockedByMe = computed(() => relationsStore.hasRelation(userId.value, 'blocked'))

const user = ref<UserResponse | null>(null)
const userAvatarUrl = computed(() => pickAvatarUrl(user.value))
const level = ref<LevelResponse | null>(null)
const stats = ref<UserCategoryStatisticsResponse[]>([])
const xpStats = ref<UserAllStatisticsResponse | null>(null)
const statsDiff = ref<StatsDiffResponse | null>(null)
const localEquipped = ref<EquippedItemsResponse>({})
const ownedBadges = ref<UserItemResponse[]>([])
const loading = ref(true)
const error = ref(false)

const isSelfProfile = computed(
  () => authStore.isLoggedIn && authStore.userId !== null && authStore.userId === userId.value,
)

const { state: supporterState } = useSupporter(() =>
  isSelfProfile.value || user.value?.supporterTier ? userId.value : null,
)

const profileOwnerTier = computed(
  () => user.value?.supporterTier ?? supporterState.value?.currentTier ?? null,
)
const isProfileOwnerSupporter = computed(() => profileOwnerTier.value != null)
const pinnedSlotLimit = computed(() => (isProfileOwnerSupporter.value ? SUPPORTER_PIN_SLOTS : STANDARD_PIN_SLOTS))
const bioCharLimit = computed(() => (isProfileOwnerSupporter.value ? 8000 : 4000))

const equipped = computed<EquippedItemsResponse>(() => {
  if (isSelfProfile.value && inventoryStore.equippedUserId === userId.value) {
    return inventoryStore.equipped
  }
  return localEquipped.value
})

const {
  backgroundValue: equippedBackgroundValue,
  backgroundUrl: equippedBackgroundUrl,
  backgroundIsVideo: equippedBackgroundIsVideo,
  backgroundImageUrl: equippedBackgroundImageUrl,
  backgroundStyle: equippedBackgroundStyle,
} = useEquippedRenderProps(equipped, { previewable: true })

const scorePlayer = computed(() => ({ user: user.value, level: level.value, equipped: equipped.value }))

const equippedBackgroundFitClass = computed(() =>
  equippedBackgroundValue.value?.fit ? `profile-page__bg-equipped--${equippedBackgroundValue.value.fit}` : '',
)

const { setQuery, queryRef } = useQueryParams()

const profileTabs = [
  { key: 'scores', label: 'Scores' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'campaigns', label: 'Campaigns' },
]

const tabParam = queryRef('tab')
const activeTab = computed(() => {
  if (profileTabs.some((t) => t.key === tabParam.value)) return tabParam.value
  return route.query.inventoryHighlight ? 'inventory' : 'scores'
})

function setTab(tab: string) {
  if (tab === activeTab.value) return
  setQuery({
    tab: tab === 'scores' ? undefined : tab,
    sort: undefined,
    order: undefined,
    unowned: undefined,
    inventoryHighlight: undefined,
  })
}

const categoryParam = queryRef<CategoryCode>('category')
const activeCategory = computed<CategoryCode>({
  get: () => (!categoryParam.value || categoryParam.value === 'xp' ? 'overall' : categoryParam.value),
  set: (value) => { categoryParam.value = value === 'overall' ? '' : value },
})

const scoreSearch = queryRef('search')
const scorePlaylistParams = ref<UserScoresParams | null>(null)
const scoreColumns = useScoreColumns(() => authStore.userId === userId.value)
const scoresTableWidth = computed(() => tableNaturalWidth(scoreColumns.value))
const edit = reactive(useProfileEdit(user, bioCharLimit))

function onAvatarChanged(updated: UserResponse) {
  if (user.value) user.value = { ...user.value, avatarUrl: updated.avatarUrl, cdnAvatarUrl: updated.cdnAvatarUrl }
  authStore.fetchAuthMe()
}

const pinContext = { userId, isSelfProfile, slotLimit: pinnedSlotLimit }
const {
  pinned: pinnedScores,
  loading: pinnedLoading,
  pending: pinPending,
  pinnedIds: pinnedScoreIds,
  canPinMore,
  fetch: fetchPinnedScores,
  toggle: onPinToggle,
  updateComment: onUpdateComment,
  reset: resetPinnedScores,
} = usePinnedScores(pinContext)
const {
  pinned: pinnedMilestones,
  loading: pinnedMilestonesLoading,
  pending: milestonePinPending,
  pinnedIds: pinnedMilestoneIds,
  canPinMore: canPinMoreMilestones,
  fetch: fetchPinnedMilestones,
  toggle: onMilestonePinToggle,
  reset: resetPinnedMilestones,
} = usePinnedMilestones(pinContext)

const categoryAwareTabs = new Set(['scores', 'statistics'])
const heroCategoryTabsHidden = ref(false)
const showCategoryDock = computed(
  () => heroCategoryTabsHidden.value && categoryAwareTabs.has(activeTab.value),
)

const activeStats = computed(() => {
  if (!Array.isArray(stats.value) || stats.value.length === 0) return null
  const categoryId = categoryStore.getCategoryId(activeCategory.value)
  return stats.value.find((s) => s.categoryId === categoryId) ?? null
})

const accent = computed(() => categoryStore.getAccent(activeCategory.value))

let statsDiffRequest = 0

async function fetchStatsDiff() {
  const request = ++statsDiffRequest
  try {
    const { getUserStatsDiff } = await import('@/api/users')
    const diff = await getUserStatsDiff(userId.value, activeCategory.value)
    if (request === statsDiffRequest) statsDiff.value = diff
  } catch {
    if (request === statsDiffRequest) statsDiff.value = null
  }
}

const metaTitle = computed(() => {
  if (!user.value) return undefined
  return `${user.value.name} | AccSaber`
})

usePageMeta({ title: metaTitle })

async function redirectToCanonicalProfile(canonicalId: string): Promise<boolean> {
  try {
    const failure = await router.replace({
      name: route.name as string,
      params: { ...route.params, userId: canonicalId },
      query: route.query,
      hash: route.hash,
    })
    return !failure
  } catch {
    return false
  }
}

function resetProfile() {
  edit.cancel()
  user.value = null
  level.value = null
  stats.value = []
  xpStats.value = null
  localEquipped.value = {}
  ownedBadges.value = []
  resetPinnedScores()
  resetPinnedMilestones()
}

let profileRequest = 0

async function fetchProfile() {
  const request = ++profileRequest
  const id = userId.value
  loading.value = true
  error.value = false
  resetProfile()

  try {
    const [{ getUser, getUserLevel, getUserAllStatistics }, itemsApi] = await Promise.all([
      import('@/api/users'),
      import('@/api/items'),
    ])

    let reveal!: (visible: boolean) => void
    const revealed = new Promise<boolean>((resolve) => { reveal = resolve })
    const late = <T>(pending: Promise<T>, apply: (value: T) => void) => {
      Promise.all([pending, revealed]).then(
        ([value, visible]) => { if (visible && request === profileRequest) apply(value) },
        () => undefined,
      )
    }
    const equippedRequest = isSelfProfile.value ? inventoryStore.fetchEquipped(id, true) : itemsApi.getUserEquippedItems(id)
    late(getUserLevel(id), (value) => { level.value = value })
    late(getUserAllStatistics(id), (value) => {
      xpStats.value = value
      stats.value = value.categories
    })
    if (authStore.isLoggedIn) {
      late(import('@/api/relations').then((api) => api.getUserRelationCounts(id)), (relations) => {
        if (user.value) user.value = { ...user.value, relations }
      })
    }
    fetchStatsDiff()
    fetchPinnedScores()
    fetchPinnedMilestones()

    const [userRes, [equippedRes, badgesRes]] = await Promise.all([
      getUser(id),
      Promise.allSettled([equippedRequest, itemsApi.getUserItems(id, { typeKey: 'badge' })]),
    ])
    if (request !== profileRequest) return
    if (userRes.id !== id && (await redirectToCanonicalProfile(userRes.id))) return
    user.value = userRes
    const visible = !userRes.banned && !isBlockedByMe.value
    reveal(visible)
    if (visible) {
      if (equippedRes.status === 'fulfilled' && !isSelfProfile.value) {
        localEquipped.value = (equippedRes.value as EquippedItemsResponse) ?? {}
      }
      if (badgesRes.status === 'fulfilled') ownedBadges.value = badgesRes.value
    }
  } catch {
    if (request !== profileRequest) return
    error.value = true
    resetProfile()
  }
  loading.value = false
}

watch(userId, () => { fetchProfile() }, { immediate: true })

watch(isBlockedByMe, (blocked, wasBlocked) => {
  if (blocked === wasBlocked) return
  fetchProfile()
})
watch(activeCategory, () => {
  if (user.value) fetchStatsDiff()
})
</script>

<template>
  <div class="profile-page" :style="{ '--page-accent': accent, '--scores-column': scoresTableWidth + 'px' }">
    <template v-if="loading">
      <div class="profile-page__skeleton">
        <SkeletonLoader variant="avatar" width="160px" height="160px" />
        <div class="profile-page__skeleton-details">
          <SkeletonLoader variant="text" width="260px" height="40px" />
          <SkeletonLoader variant="text" width="340px" height="38px" />
          <SkeletonLoader variant="text" width="460px" height="36px" />
          <SkeletonLoader variant="text" width="380px" height="20px" />
        </div>
      </div>
      <div class="profile-page__reserved" />
    </template>

    <template v-else-if="error || !user">
      <h1>Player not found</h1>
    </template>

    <template v-else>
      <div class="profile-page__bg">
        <video
          v-if="equippedBackgroundIsVideo && equippedBackgroundUrl"
          class="profile-page__bg-equipped"
          :class="equippedBackgroundFitClass"
          :src="equippedBackgroundUrl"
          :style="equippedBackgroundStyle"
          autoplay
          loop
          muted
          playsinline
        />
        <div
          v-else-if="equippedBackgroundImageUrl"
          class="profile-page__bg-equipped"
          :class="equippedBackgroundFitClass"
          :style="{ ...equippedBackgroundStyle, backgroundImage: `url(${equippedBackgroundImageUrl})` }"
        />
        <div v-else class="profile-page__bg-image" :style="{ backgroundImage: `url(${userAvatarUrl})` }" />
      </div>

      <ProfileHero v-model:name-draft="edit.name" :user="user" :user-id="userId" :avatar-url="userAvatarUrl"
        :level="level" :equipped="equipped" :stats-diff="statsDiff" :badges="ownedBadges"
        :supporter-state="supporterState" :is-self-profile="isSelfProfile" :is-blocked-by-me="isBlockedByMe"
        :editing="edit.editing && isSelfProfile" :saving="edit.saving" :edit-error="edit.error"
        @edit="edit.start" @save="edit.save" @cancel="edit.cancel" @avatar-changed="onAvatarChanged">
        <ProfileStatStrip v-model:category="activeCategory" :user-id="userId" :country="user.country ?? null"
          :stats="activeStats" :stats-diff="statsDiff" @tabs-hidden="heroCategoryTabsHidden = $event" />
        <RelationCountsBar v-if="user.relations" :user-id="userId" :counts="user.relations" />
      </ProfileHero>

      <template v-if="!user.banned && !isBlockedByMe">
        <ProfileBio v-if="!hideReloadedProfileFeatures" v-model:draft="edit.bio" :bio="user.bio ?? null"
          :editing="edit.editing && isSelfProfile" :max-chars="bioCharLimit"
          :can-use-effects="isProfileOwnerSupporter" />

        <section v-if="showStatisticsChart" class="profile-page__inline-chart" aria-label="Statistics history">
          <h2 class="section-title">History</h2>
          <ProfileStatsChart :user-id="userId" :category="activeCategory" />
        </section>

        <PinnedScoresSection v-if="!hideReloadedProfileFeatures" :pinned="pinnedScores"
          :loading="pinnedLoading" :is-self-profile="isSelfProfile" :max-slots="pinnedSlotLimit"
          :player="scorePlayer" @unpin="onPinToggle" @update-comment="onUpdateComment" />

        <PinnedMilestonesSection v-if="!hideReloadedProfileFeatures" :pinned="pinnedMilestones"
          :loading="pinnedMilestonesLoading" :is-self-profile="isSelfProfile" :max-slots="pinnedSlotLimit"
          @unpin="onMilestonePinToggle" />

        <div class="profile-page__tabs-row">
          <BaseTabs :tabs="profileTabs" :model-value="activeTab" @update:model-value="setTab" />
          <div v-if="activeTab === 'scores'" class="profile-page__scores-tools">
            <ScoresPlaylistButton v-if="scorePlaylistParams" :user-id="userId" :params="scorePlaylistParams" />
            <SearchBox v-model="scoreSearch" placeholder="Search maps..." />
          </div>
        </div>

        <div class="profile-page__content">
          <ProfileScoresTab v-if="activeTab === 'scores'" :user-id="userId" :columns="scoreColumns"
            :category="activeCategory"
            :search="scoreSearch" :is-self-profile="isSelfProfile" :pinned-score-ids="pinnedScoreIds"
            :player="scorePlayer"
            :can-pin-more="canPinMore" :pin-pending="pinPending" @pin-toggle="onPinToggle"
            @params-change="scorePlaylistParams = $event" />
          <ProfileStatisticsTab v-if="activeTab === 'statistics'" :user-id="userId" :category="activeCategory"
            :xp-stats="xpStats" />
          <ProfileMilestonesTab v-if="activeTab === 'milestones'" :user-id="userId"
            :is-self-profile="isSelfProfile" :pinned-ids="pinnedMilestoneIds"
            :can-pin-more="canPinMoreMilestones" :pin-pending="milestonePinPending"
            @pin-toggle="onMilestonePinToggle" />
          <ProfileInventoryTab v-if="activeTab === 'inventory'" :user-id="userId" :avatar-url="userAvatarUrl" />
          <UserCampaignsPanel v-if="activeTab === 'campaigns'" :user-id="userId" />
        </div>

        <Transition name="cat-dock">
          <div v-if="showCategoryDock" class="profile-page__cat-dock">
            <div class="profile-page__cat-dock-inner">
              <CategoryTabs :model-value="activeCategory" :exclude="['xp']"
                @update:model-value="activeCategory = $event" />
            </div>
          </div>
        </Transition>
      </template>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  --accent: var(--page-accent, var(--accent-overall));
  --page-column: max(1280px, var(--scores-column, 1280px));
}

.profile-page>*:not(.profile-page__bg):not(.profile-page__cat-dock) {
  width: 100%;
  max-width: var(--page-column);
  position: relative;
}

.profile-page__cat-dock {
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  z-index: 90;
  background: var(--bg-base);
  border-bottom: 1px solid var(--bg-overlay);
}

.profile-page__cat-dock-inner {
  max-width: var(--page-column);
  margin: 0 auto;
  padding: 0 var(--space-xl);
  overflow-x: auto;
  scrollbar-width: none;
}

.profile-page__cat-dock-inner::-webkit-scrollbar {
  display: none;
}

.profile-page__cat-dock-inner :deep(.base-tabs) {
  flex-wrap: nowrap;
  width: fit-content;
  margin-block: var(--space-xs);
}

.cat-dock-enter-active,
.cat-dock-leave-active {
  transition: opacity var(--dur-menu) var(--ease-out), transform var(--dur-menu) var(--ease-out);
}

.cat-dock-enter-from,
.cat-dock-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

@media (prefers-reduced-motion: reduce) {

  .cat-dock-enter-active,
  .cat-dock-leave-active {
    transition: none;
  }

  .cat-dock-enter-from,
  .cat-dock-leave-to {
    opacity: 1;
    transform: none;
  }
}

.profile-page__bg {
  position: absolute;
  top: calc(-1 * var(--space-xl));
  left: calc(-1 * var(--space-xl));
  right: calc(-1 * var(--space-xl));
  height: 75vh;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
}

.profile-page__bg-image {
  position: absolute;
  inset: -80px;
  background-size: cover;
  background-position: center 20%;
  background-repeat: no-repeat;
  filter: blur(40px) brightness(0.55) saturate(1.5);
  opacity: 0.7;
  -webkit-mask-image: radial-gradient(ellipse 65% 70% at 50% 35%, transparent 0%, rgba(0, 0, 0, 0.4) 55%, black 90%);
  mask-image: radial-gradient(ellipse 65% 70% at 50% 35%, transparent 0%, rgba(0, 0, 0, 0.4) 55%, black 90%);
}

.profile-page__bg-equipped {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  object-fit: cover;
}

.profile-page__bg-equipped--cover {
  background-size: cover;
  object-fit: cover;
}

.profile-page__bg-equipped--contain {
  background-size: contain;
  object-fit: contain;
}

.profile-page__bg-equipped--tile {
  background-size: auto;
  background-repeat: repeat;
}

.profile-page__bg-equipped--center {
  background-size: auto;
  background-position: center;
  object-fit: none;
}

@media (max-width: 767px) {
  .profile-page__bg {
    top: calc(-1 * var(--space-md));
    left: calc(-1 * var(--space-md));
    right: calc(-1 * var(--space-md));
  }
}

.profile-page__inline-chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-block: var(--space-sm) var(--space-md);
  min-width: 0;
}

.profile-page__tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.profile-page__scores-tools {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.profile-page__scores-tools :deep(.spl__btn),
.profile-page__scores-tools :deep(.search-box) {
  height: var(--control-h);
}


.profile-page__content {
  min-height: 400px;
}

.profile-page__skeleton {
  display: flex;
  gap: var(--space-xl);
  min-height: 301px;
  padding: var(--space-xl) 0 var(--space-lg);
}

@media (min-width: 768px) {
  .profile-page__reserved {
    height: 1195px;
  }
}

.profile-page__skeleton-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.profile-page__tabs-row :deep(.base-tabs--underline) {
  flex-wrap: nowrap;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

@media (max-width: 767px) {
  .profile-page__tabs-row {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-page__skeleton {
    flex-direction: column;
    align-items: center;
  }

  .profile-page__skeleton-details {
    align-items: center;
  }

  .profile-page__scores-tools :deep(.search-box) {
    flex: 1;
  }

  .profile-page__cat-dock-inner {
    padding: 0 var(--space-md);
  }
}
</style>
