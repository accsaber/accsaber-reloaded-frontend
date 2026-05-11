<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import ProfileBadgesRow from '@/components/domain/ProfileBadgesRow.vue'
import RelationActions from '@/components/domain/RelationActions.vue'
import RelationCountsBar from '@/components/domain/RelationCountsBar.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useInventoryStore } from '@/stores/inventory'
import { useRelationsStore } from '@/stores/relations'
import type { EquippedItemsResponse, UserItemResponse } from '@/types/api/items'
import type { LevelResponse, StatsDiffResponse, UserAllStatisticsResponse, UserCategoryStatisticsResponse, UserResponse } from '@/types/api/users'
import type { CategoryCode } from '@/types/display'
import {
  pickAssetUrl,
  pickVideoOrAssetUrl,
  readBackgroundValue,
  readBorderColorValue,
  readBorderShapeValue,
  readTitleValue,
} from '@/utils/items'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProfileInventoryTab from './profile/ProfileInventoryTab.vue'
import ProfileMilestonesTab from './profile/ProfileMilestonesTab.vue'
import ProfileScoresTab from './profile/ProfileScoresTab.vue'
import ProfileStatisticsTab from './profile/ProfileStatisticsTab.vue'

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()
const relationsStore = useRelationsStore()
const inventoryStore = useInventoryStore()

const userId = computed(() => route.params.userId as string)

const isBlockedByMe = computed(() => relationsStore.hasRelation(userId.value, 'blocked'))

const canSnipe = computed(
  () =>
    authStore.isLoggedIn
    && !!authStore.userId
    && authStore.userId !== userId.value
    && !isBlockedByMe.value,
)

const user = ref<UserResponse | null>(null)
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

const equipped = computed<EquippedItemsResponse>(() => {
  if (isSelfProfile.value && inventoryStore.equippedUserId === userId.value) {
    return inventoryStore.equipped
  }
  return localEquipped.value
})

const equippedTitleValue = computed(() => readTitleValue(equipped.value.title?.item.value))
const equippedBorderColorValue = computed(() => readBorderColorValue(equipped.value.profile_border_color?.item.value))
const equippedBorderShapeValue = computed(() => readBorderShapeValue(equipped.value.profile_border_shape?.item.value))
const equippedBackgroundValue = computed(() => readBackgroundValue(equipped.value.profile_background?.item.value))
const equippedBackgroundUrl = computed(() => pickVideoOrAssetUrl(equippedBackgroundValue.value?.asset))
const equippedBackgroundIsVideo = computed(() => !!equippedBackgroundValue.value?.asset.video)
const equippedBackgroundImageUrl = computed(() => pickAssetUrl(equippedBackgroundValue.value?.asset))
const equippedBackgroundStyle = computed(() => {
  const bg = equippedBackgroundValue.value
  if (!bg) return undefined
  const style: Record<string, string> = {}
  if (bg.opacity != null) style.opacity = String(bg.opacity)
  if (bg.blendMode) style.mixBlendMode = bg.blendMode
  return style
})
const equippedBackgroundFitClass = computed(() =>
  equippedBackgroundValue.value?.fit ? `profile-page__bg-equipped--${equippedBackgroundValue.value.fit}` : '',
)

const activeTab = ref('scores')
const initialCategory = (route.query.category as CategoryCode) || 'overall'
const activeCategory = ref<CategoryCode>(initialCategory === 'xp' ? 'overall' : initialCategory)

watch(() => route.query.category, (newQueryCategory) => {
  const newCategory = (newQueryCategory as CategoryCode) || 'overall'
  const resolvedCategory = newCategory === 'xp' ? 'overall' : newCategory
  if (activeCategory.value !== resolvedCategory) {
    activeCategory.value = resolvedCategory
  }
})

const scoreSearch = ref('')

const profileTabs = [
  { key: 'scores', label: 'Scores' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'inventory', label: 'Inventory' },
]

const activeStats = computed(() => {
  if (!Array.isArray(stats.value) || stats.value.length === 0) return null
  const categoryId = categoryStore.getCategoryId(activeCategory.value)
  return stats.value.find((s) => s.categoryId === categoryId) ?? null
})

const accent = computed(() => categoryStore.getAccent(activeCategory.value))

const totalXpDiff = computed(() => {
  if (!statsDiff.value) return 0
  return (statsDiff.value.scoreXpDiff ?? 0) + (statsDiff.value.milestoneXpDiff ?? 0) + (statsDiff.value.milestoneSetBonusXpDiff ?? 0)
})

async function fetchStatsDiff() {
  try {
    const { getUserStatsDiff } = await import('@/api/users')
    statsDiff.value = await getUserStatsDiff(userId.value, activeCategory.value)
  } catch {
    statsDiff.value = null
  }
}

const breadcrumbs = computed(() => [
  { label: 'Leaderboards', to: '/leaderboards' },
  { label: user.value?.name ?? 'Player' },
])

const metaTitle = computed(() => {
  if (!user.value) return undefined
  return `${user.value.name} | AccSaber Reloaded`
})

usePageMeta({ title: metaTitle })

const globalRankRoute = computed(() => {
  const ranking = activeStats.value?.ranking
  if (!ranking) return null
  const page = Math.ceil(ranking / 50)
  return {
    name: 'leaderboards-category',
    params: { categoryCode: activeCategory.value },
    query: { page: String(page), highlight: userId.value },
  }
})

const countryRankRoute = computed(() => {
  const ranking = activeStats.value?.countryRanking
  if (!ranking || !user.value) return null
  const page = Math.ceil(ranking / 50)
  return {
    name: 'leaderboards-category',
    params: { categoryCode: activeCategory.value },
    query: { country: user.value.country, page: String(page), highlight: userId.value },
  }
})

function navigateToGlobalRank() {
  if (globalRankRoute.value) router.push(globalRankRoute.value)
}

function navigateToCountryRank() {
  if (countryRankRoute.value) router.push(countryRankRoute.value)
}

async function fetchProfile() {
  loading.value = true
  error.value = false
  user.value = null
  level.value = null
  stats.value = []
  xpStats.value = null
  localEquipped.value = {}
  ownedBadges.value = []

  try {
    const { getUser, getUserLevel, getUserAllStatistics } = await import('@/api/users')

    const userRes = await getUser(userId.value)
    user.value = userRes

    if (userRes.banned || isBlockedByMe.value) {
      loading.value = false
      return
    }

    const itemsApi = await import('@/api/items')
    const equippedPromise = isSelfProfile.value
      ? inventoryStore.fetchEquipped(userId.value, true)
      : itemsApi.getUserEquippedItems(userId.value)
    const [levelRes, allStatsRes, equippedRes, badgesRes] = await Promise.allSettled([
      getUserLevel(userId.value),
      getUserAllStatistics(userId.value),
      equippedPromise,
      itemsApi.getUserItems(userId.value, { typeKey: 'badge' }),
    ])

    if (levelRes.status === 'fulfilled') {
      level.value = levelRes.value
    }
    if (allStatsRes.status === 'fulfilled') {
      xpStats.value = allStatsRes.value
      stats.value = allStatsRes.value.categories
    }
    if (equippedRes.status === 'fulfilled' && !isSelfProfile.value) {
      localEquipped.value = (equippedRes.value as EquippedItemsResponse) ?? {}
    }
    if (badgesRes.status === 'fulfilled') {
      ownedBadges.value = badgesRes.value
    }

    fetchStatsDiff()
  } catch {
    error.value = true
    user.value = null
    level.value = null
    stats.value = []
    xpStats.value = null
    localEquipped.value = {}
    ownedBadges.value = []
  }
  loading.value = false
}

watch(userId, () => { fetchProfile() }, { immediate: true })

watch(
  () => isSelfProfile.value && inventoryStore.equippedUserId === userId.value
    ? inventoryStore.equipped
    : null,
  async () => {
    if (!isSelfProfile.value || !user.value) return
    try {
      const { getUserItems } = await import('@/api/items')
      ownedBadges.value = await getUserItems(userId.value, { typeKey: 'badge' })
    } catch {
    }
  },
  { deep: true },
)
watch(isBlockedByMe, (blocked, wasBlocked) => {
  if (blocked === wasBlocked) return
  fetchProfile()
})
watch(activeCategory, (newCategory) => {
  if (user.value) fetchStatsDiff()

  const queryCategory = (route.query.category as CategoryCode) || 'overall'
  if (queryCategory === newCategory) return

  const query = { ...route.query }
  if (newCategory === 'overall') {
    delete query.category
  } else {
    query.category = newCategory
  }
  delete query.page
  router.replace({ query })
})
</script>

<template>
  <div class="profile-page" :style="{ '--page-accent': accent }">
    <template v-if="loading">
      <div class="profile-page__skeleton-hero">
        <SkeletonLoader variant="avatar" width="96px" height="96px" />
        <SkeletonLoader variant="text" width="200px" />
        <SkeletonLoader variant="text" width="120px" />
        <div class="profile-page__skeleton-stats">
          <SkeletonLoader v-for="i in 4" :key="i" variant="stat-block" />
        </div>
      </div>
    </template>

    <template v-else-if="error || !user">
      <PageHeader title="Player Not Found" />
      <p class="profile-page__error">Could not load this player's profile.</p>
    </template>

    <template v-else>
      <nav class="profile-page__breadcrumbs" aria-label="Breadcrumb">
        <span class="profile-page__breadcrumbs-pill">
          <router-link v-for="(crumb, i) in breadcrumbs" :key="i" :to="crumb.to ?? ''" class="profile-page__crumb"
            :class="{ 'profile-page__crumb--link': !!crumb.to }">
            {{ crumb.label }}
            <span v-if="i < breadcrumbs.length - 1" class="profile-page__crumb-sep">/</span>
          </router-link>
        </span>
      </nav>

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
        <div v-else class="profile-page__bg-image" :style="{ backgroundImage: `url(${user.avatarUrl})` }" />
        <div class="profile-page__bg-fade" />
      </div>

      <div class="profile-hero">
        <div class="profile-hero__level-col">
          <LevelBadge :level="level?.level ?? 0" :current-xp="level?.xpForCurrentLevel ?? 0"
            :required-xp="level?.xpForNextLevel ?? 1" :avatar-url="user.avatarUrl"
            :fallback-title="level?.title"
            :equipped-title="equippedTitleValue"
            :equipped-border-shape="equippedBorderShapeValue"
            :equipped-border-color="equippedBorderColorValue" />
          <span v-if="!user.banned && totalXpDiff" class="profile-hero__xp-trend"
            :class="totalXpDiff > 0 ? 'profile-hero__xp-trend--up' : 'profile-hero__xp-trend--down'">
            {{ totalXpDiff > 0 ? '\u25B2' : '\u25BC' }}
            {{ totalXpDiff > 0 ? '+' : '' }}{{ Math.round(totalXpDiff) }} XP
            <span class="profile-hero__xp-info" tabindex="0" aria-label="XP breakdown">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span class="profile-hero__xp-tooltip">
                <span class="profile-hero__xp-tooltip-row">
                  <span class="profile-hero__xp-tooltip-label">Score XP</span>
                  <span class="profile-hero__xp-tooltip-value">{{ (statsDiff?.scoreXpDiff ?? 0) >= 0 ? '+' : '' }}{{
                    Math.round(statsDiff?.scoreXpDiff ?? 0) }}</span>
                </span>
                <span class="profile-hero__xp-tooltip-row">
                  <span class="profile-hero__xp-tooltip-label">Milestone XP</span>
                  <span class="profile-hero__xp-tooltip-value profile-hero__xp-tooltip-value--milestone">{{
                    (statsDiff?.milestoneXpDiff ?? 0) >= 0 ? '+' : '' }}{{ Math.round(statsDiff?.milestoneXpDiff ?? 0)
                    }}</span>
                </span>
                <span class="profile-hero__xp-tooltip-row">
                  <span class="profile-hero__xp-tooltip-label">Set Bonus XP</span>
                  <span class="profile-hero__xp-tooltip-value profile-hero__xp-tooltip-value--set-bonus">{{
                    (statsDiff?.milestoneSetBonusXpDiff ?? 0) >= 0 ? '+' : '' }}{{
                      Math.round(statsDiff?.milestoneSetBonusXpDiff ?? 0) }}</span>
                </span>
              </span>
            </span>
          </span>
        </div>

        <div class="profile-hero__details">
          <div class="profile-hero__top-row">
            <div class="profile-hero__name-col">
              <div class="profile-hero__name-row">
                <h1 class="profile-hero__name">{{ user.name }}</h1>
                <CountryFlag :country="user.country" />
                <span v-if="user.playerInactive && !user.banned" class="profile-hero__inactive-badge">Inactive</span>
              </div>
              <ProfileBadgesRow v-if="ownedBadges.length" :badges="ownedBadges" class="profile-hero__badges" />
            </div>

            <div class="profile-hero__top-right">
              <div class="profile-hero__links">
                <BaseButton size="sm" :href="`https://www.beatleader.com/u/${user.blId ?? user.id}`"
                  aria-label="View on BeatLeader">
                  <img src="https://beatleader.com/assets/favicon-32x32.png" alt="BeatLeader" width="16" height="16"
                    style="border-radius: 3px;" />
                </BaseButton>
                <BaseButton size="sm" :href="`https://scoresaber.com/u/${user.ssId ?? user.id}`"
                  aria-label="View on ScoreSaber">
                  <img src="https://scoresaber.com/favicon-32x32.png" alt="ScoreSaber" width="16" height="16"
                    style="border-radius: 3px;" />
                </BaseButton>
                <BaseButton v-if="canSnipe" size="sm" variant="primary"
                  aria-label="Snipe this player" title="Snipe this player"
                  @click="router.push({ name: 'player-snipe', params: { userId: userId } })">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                  <span>Snipe</span>
                </BaseButton>
                <RelationActions :target-user-id="userId" :target-name="user.name" />
              </div>
            </div>
          </div>

          <div v-if="user.banned" class="profile-hero__banned">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span>This account is banned.</span>
          </div>

          <div v-else-if="isBlockedByMe" class="profile-hero__banned">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span>You have blocked this user. Their stats and scores are hidden.</span>
          </div>

          <template v-else>
            <div class="profile-hero__category-tabs">
              <CategoryTabs :model-value="activeCategory" :exclude="['xp']"
                @update:model-value="activeCategory = $event" />
            </div>

            <div class="profile-hero__stats">
              <StatBlock label="Total AP" :value="activeStats?.ap ?? 0" :trend="statsDiff?.apDiff" />
              <div class="profile-hero__rank-block profile-hero__rank-block--clickable" role="button" tabindex="0"
                aria-label="View on global leaderboard" @click="navigateToGlobalRank"
                @keydown.enter="navigateToGlobalRank">
                <router-link v-if="globalRankRoute" :to="globalRankRoute" class="profile-hero__rank-link" tabindex="-1"
                  aria-hidden="true" />
                <StatBlock label="Global Rank" :value="activeStats?.ranking ?? 0" :decimals="0"
                  :trend="statsDiff?.rankingDiff ? -statsDiff.rankingDiff : undefined" />
                <span v-if="activeStats?.ranking && activeStats.ranking <= 3" class="profile-hero__rank-badge"
                  :class="getRankClass(activeStats.ranking)">#{{ activeStats.ranking }}</span>
              </div>
              <div class="profile-hero__rank-block profile-hero__rank-block--clickable" role="button" tabindex="0"
                aria-label="View on country leaderboard" @click="navigateToCountryRank"
                @keydown.enter="navigateToCountryRank">
                <router-link v-if="countryRankRoute" :to="countryRankRoute" class="profile-hero__rank-link"
                  tabindex="-1" aria-hidden="true" />
                <StatBlock label="Country Rank" :value="activeStats?.countryRanking ?? 0" :decimals="0"
                  :trend="statsDiff?.countryRankingDiff ? -statsDiff.countryRankingDiff : undefined" />
                <span v-if="activeStats?.countryRanking && activeStats.countryRanking <= 3"
                  class="profile-hero__rank-badge" :class="getRankClass(activeStats.countryRanking)">#{{
                    activeStats.countryRanking }}</span>
              </div>
              <StatBlock label="Ranked Plays" :value="activeStats?.rankedPlays ?? 0" :decimals="0"
                :trend="statsDiff?.rankedPlaysDiff" />
            </div>

            <RelationCountsBar v-if="user.relations" :user-id="userId" :counts="user.relations" />
          </template>
        </div>
      </div>

      <template v-if="!user.banned && !isBlockedByMe">
        <div class="profile-page__tabs-row">
          <BaseTabs :tabs="profileTabs" :model-value="activeTab" @update:model-value="activeTab = $event" />
          <SearchBox v-if="activeTab === 'scores'" v-model="scoreSearch" placeholder="Search maps..." />
        </div>

        <div class="profile-page__content">
          <ProfileScoresTab v-if="activeTab === 'scores'" :user-id="userId" :category="activeCategory"
            :search="scoreSearch" />
          <ProfileStatisticsTab v-if="activeTab === 'statistics'" :user-id="userId" :category="activeCategory"
            :xp-stats="xpStats" />
          <ProfileMilestonesTab v-if="activeTab === 'milestones'" :user-id="userId" />
          <ProfileInventoryTab v-if="activeTab === 'inventory'" :user-id="userId" />
        </div>
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
}

.profile-page>*:not(.profile-page__bg) {
  width: 100%;
  max-width: 1070px;
  position: relative;
  z-index: 1;
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

.profile-page__bg-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom,
      transparent 50%,
      var(--bg-base) 100%);
}

@media (max-width: 767px) {
  .profile-page__bg {
    top: calc(-1 * var(--space-md));
    left: calc(-1 * var(--space-md));
    right: calc(-1 * var(--space-md));
  }
}

.profile-hero {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: stretch;
  gap: var(--space-xl);
  padding: var(--space-xl) 0 var(--space-lg);
}

.profile-hero__top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.profile-hero__top-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
}

.profile-hero__name-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.profile-hero__badges {
  justify-content: flex-start !important;
  max-width: none !important;
}

.profile-hero__category-tabs {
  display: flex;
  justify-content: flex-start;
  margin-top: var(--space-xs);
}

.profile-hero__level-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.profile-hero__xp-trend {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.profile-hero__xp-trend--up {
  color: var(--success);
}

.profile-hero__xp-trend--down {
  color: var(--error);
}

.profile-hero__xp-info {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--text-tertiary);
  cursor: help;
  transition: color 120ms ease;
}

.profile-hero__xp-info:hover,
.profile-hero__xp-info:focus-visible {
  color: var(--text-secondary);
}

.profile-hero__xp-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.profile-hero__xp-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--bg-overlay);
}

.profile-hero__xp-info:hover .profile-hero__xp-tooltip,
.profile-hero__xp-info:focus-visible .profile-hero__xp-tooltip {
  opacity: 1;
}

.profile-hero__xp-tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-lg);
}

.profile-hero__xp-tooltip-label {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.profile-hero__xp-tooltip-value {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--accent-overall);
}

.profile-hero__xp-tooltip-value--milestone {
  color: var(--tier-gold);
}

.profile-hero__xp-tooltip-value--set-bonus {
  color: var(--tier-platinum);
}

.profile-hero__details {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-md);
  width: 100%;
  min-width: 0;
  min-height: 100%;
}

.profile-hero__name-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-sm);
}

.profile-hero__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--space-xs);
}

.profile-hero__name {
  font-size: calc(var(--text-page-title) * 1.15);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.profile-hero__banned {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  border-radius: var(--radius-card);
  color: var(--error);
  font-size: var(--text-body);
  font-weight: 500;
}

.profile-hero__inactive-badge {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--bg-overlay) 60%, transparent);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--bg-overlay);
  letter-spacing: 0.03em;
}

.profile-hero__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin-top: auto;
  border-top: 1px solid var(--bg-overlay);
  border-bottom: 1px solid var(--bg-overlay);
}

.profile-hero__stats > * + * {
  border-inline-start: 1px solid var(--bg-overlay);
}

.profile-hero__stats :deep(.stat-block) {
  padding: var(--space-md) var(--space-lg);
  gap: var(--space-xs);
}

.profile-hero__stats :deep(.stat-block__value) {
  font-size: 2rem;
  line-height: 1;
  letter-spacing: -0.01em;
}

.profile-hero__stats :deep(.stat-block__label) {
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

@media (max-width: 599px) {
  .profile-hero__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-hero__stats > * + * {
    border-inline-start: none;
  }

  .profile-hero__stats > *:nth-child(n + 3) {
    border-block-start: 1px solid var(--bg-overlay);
  }

  .profile-hero__stats :deep(.stat-block__value) {
    font-size: 1.625rem;
  }
}

.profile-hero__rank-block {
  position: relative;
}

.profile-hero__rank-block--clickable {
  cursor: pointer;
  transition: background-color 120ms ease;
}

.profile-hero__rank-link {
  display: block;
  position: absolute;
  inset: 0;
  z-index: 1;
}

.profile-hero__rank-block--clickable:hover {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

.profile-hero__rank-block--clickable:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

.profile-hero__rank-badge {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
  letter-spacing: 0.02em;
}

.profile-hero__rank--gold {
  background: color-mix(in srgb, var(--tier-gold) 20%, transparent);
  color: var(--tier-gold);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tier-gold) 30%, transparent);
}

.profile-hero__rank--silver {
  background: color-mix(in srgb, var(--tier-silver) 20%, transparent);
  color: var(--tier-silver);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tier-silver) 30%, transparent);
}

.profile-hero__rank--bronze {
  background: color-mix(in srgb, var(--tier-bronze) 20%, transparent);
  color: var(--tier-bronze);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tier-bronze) 30%, transparent);
}

.profile-page__tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}


.profile-page__content {
  min-height: 400px;
}

.profile-page__breadcrumbs {
  display: flex;
}

.profile-page__breadcrumbs-pill {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
}

.profile-page__crumb {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-decoration: none;
}

.profile-page__crumb--link {
  color: var(--text-primary);
  transition: color 120ms ease;
}

.profile-page__crumb--link:hover {
  color: var(--accent);
}

.profile-page__crumb-sep {
  margin-left: var(--space-xs);
  color: var(--text-secondary);
}

.profile-page__error {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--space-3xl);
}

.profile-page__skeleton-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
}

.profile-page__skeleton-stats {
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

@media (max-width: 767px) {
  .profile-hero {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: var(--space-md);
    padding: var(--space-lg) 0 var(--space-md);
  }

  .profile-hero__category-tabs {
    justify-content: center;
  }

  .profile-hero__details {
    align-items: center;
  }

  .profile-hero__name-row {
    justify-content: center;
  }

  .profile-hero__name-col {
    align-items: center;
  }

  .profile-hero__badges {
    justify-content: center !important;
  }

  .profile-hero__links {
    justify-content: center;
  }

  .profile-page__tabs-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
