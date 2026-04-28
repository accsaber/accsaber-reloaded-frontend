<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import SnipeComparisonRow from '@/components/domain/SnipeComparisonRow.vue'
import { useColorExtract } from '@/composables/useColorExtract'
import { usePageMeta } from '@/composables/usePageMeta'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import { buildSnipePlaylistUrl } from '@/api/snipe'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import { useThemeStore } from '@/stores/theme'
import type { SnipeComparisonResponse } from '@/types/api/snipe'
import type { LevelResponse, ScoreResponse, UserResponse } from '@/types/api/users'
import type { ScoreDisplay } from '@/types/display'
import type { Page } from '@/types/pagination'
import { brightenRgb } from '@/utils/color'
import { toScoreDisplay } from '@/utils/mappers'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()
const themeStore = useThemeStore()

const SIZE_VALUES = [10, 20, 50, 100] as const
const DEFAULT_SIZE = 20
const SIZE_OPTIONS = SIZE_VALUES.map((n) => ({ value: String(n), label: `${n} maps` }))

const SNIPE_CATEGORIES = ['true_acc', 'standard_acc', 'tech_acc', 'low_mid_acc', 'overall'] as const

const categoryOptions = computed(() => {
  const labelFor = (code: string) =>
    categoryStore.getCategoryInfo(code)?.name ?? code
  return [
    { value: '', label: 'All categories' },
    ...SNIPE_CATEGORIES.map((code) => ({ value: code, label: labelFor(code) })),
  ]
})

const targetId = computed(() => route.params.userId as string)
const sniperId = computed(() => authStore.userId)

const currentPage = computed<number>(() => {
  const p = Number(route.query.page)
  return p > 0 ? p : 1
})

const currentSize = computed<number>(() => {
  const s = Number(route.query.size)
  return (SIZE_VALUES as readonly number[]).includes(s) ? s : DEFAULT_SIZE
})

const currentCategory = computed<string>(() => {
  const c = route.query.category
  if (typeof c !== 'string') return ''
  return SNIPE_CATEGORIES.includes(c as (typeof SNIPE_CATEGORIES)[number]) ? c : ''
})

function setPage(page: number) {
  const query = { ...route.query }
  if (page <= 1) delete query.page
  else query.page = String(page)
  router.replace({ query })
}

function setSize(value: string) {
  const query = { ...route.query }
  delete query.page
  if (Number(value) === DEFAULT_SIZE) delete query.size
  else query.size = value
  router.replace({ query })
}

function setCategory(value: string) {
  const query = { ...route.query }
  delete query.page
  if (!value) delete query.category
  else query.category = value
  router.replace({ query })
}

const target = ref<UserResponse | null>(null)
const sniper = ref<UserResponse | null>(null)
const targetLevel = ref<LevelResponse | null>(null)
const sniperLevel = ref<LevelResponse | null>(null)
const data = ref<Page<SnipeComparisonResponse> | null>(null)
const loading = ref(false)

const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref<string>('')

const targetAvatar = computed(() => target.value?.avatarUrl ?? '')
const { dominantColor } = useColorExtract(targetAvatar)

const heroAccent = computed(() => {
  const raw = dominantColor.value
  if (!raw) return 'var(--accent-overall)'
  return themeStore.theme === 'dark' ? brightenRgb(raw, 60) : raw
})

const rows = computed(() => data.value?.content ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 0)
const totalElements = computed(() => data.value?.totalElements ?? 0)

const closestGapPct = computed(() => {
  if (rows.value.length === 0) return 0
  const r = rows.value[0]
  return (r.targetScore.accuracy - r.sniperScore.accuracy) * 100
})

const totalPointsToGain = computed(() =>
  rows.value.reduce((sum, r) => sum + r.scoreDelta, 0),
)

const totalApAtStake = computed(() =>
  rows.value.reduce((sum, r) => sum + (r.targetScore.ap - r.sniperScore.ap), 0),
)

const playlistUrl = computed(() =>
  sniperId.value
    ? buildSnipePlaylistUrl(sniperId.value, targetId.value, {
        category: currentCategory.value || undefined,
      })
    : '',
)

const downloadLabel = computed(() => {
  if (!currentCategory.value) return 'Download all snipes'
  const name = categoryStore.getCategoryInfo(currentCategory.value)?.name ?? currentCategory.value
  return `Download all ${name} snipes`
})

const metaTitle = computed(() => {
  if (!target.value) return undefined
  return `Snipe ${target.value.name} | AccSaber Reloaded`
})

usePageMeta({ title: metaTitle })

async function fetchUsers() {
  if (!sniperId.value) return
  const { getUser, getUserLevel } = await import('@/api/users')
  const [t, s, tl, sl] = await Promise.allSettled([
    getUser(targetId.value),
    getUser(sniperId.value),
    getUserLevel(targetId.value),
    getUserLevel(sniperId.value),
  ])
  if (t.status === 'fulfilled') target.value = t.value
  if (s.status === 'fulfilled') sniper.value = s.value
  if (tl.status === 'fulfilled') targetLevel.value = tl.value
  if (sl.status === 'fulfilled') sniperLevel.value = sl.value
}

async function fetchComparisons() {
  if (!sniperId.value) return
  loading.value = true
  try {
    const { getClosestScores } = await import('@/api/snipe')
    data.value = await getClosestScores(sniperId.value, targetId.value, {
      page: currentPage.value - 1,
      size: currentSize.value,
      category: currentCategory.value || undefined,
    })
  } catch {
    data.value = null
  }
  loading.value = false
}

function openDetail(score: ScoreResponse) {
  const categoryCode = categoryStore.getCategoryCode(score.categoryId)
  detailScore.value = toScoreDisplay(
    score,
    modifierStore.resolveModifierCodes(score.modifierIds),
    categoryCode,
  )
  detailUserId.value = score.userId
  detailOpen.value = true
}

const isValidPair = computed(
  () => !!sniperId.value && sniperId.value !== targetId.value,
)

watch(
  () => [sniperId.value, targetId.value] as const,
  () => {
    if (!isValidPair.value) {
      router.replace({ name: 'player-profile', params: { userId: targetId.value } })
      return
    }
    fetchUsers()
  },
  { immediate: true },
)

watch(
  () => [sniperId.value, targetId.value, currentPage.value, currentSize.value, currentCategory.value] as const,
  () => {
    if (isValidPair.value) fetchComparisons()
  },
  { immediate: true },
)
</script>

<template>
  <div class="snipe-page" :style="{ '--page-accent': heroAccent, '--accent': heroAccent }">
    <div v-if="targetAvatar" class="snipe-page__bg">
      <div class="snipe-page__bg-image" :style="{ backgroundImage: `url(${targetAvatar})` }" />
      <div class="snipe-page__bg-fade" />
    </div>

    <nav class="snipe-page__breadcrumbs" aria-label="Breadcrumb">
      <span class="snipe-page__breadcrumbs-pill">
        <router-link to="/leaderboards" class="snipe-page__crumb snipe-page__crumb--link">
          Leaderboards
          <span class="snipe-page__crumb-sep">/</span>
        </router-link>
        <router-link v-if="target" :to="`/players/${targetId}`" class="snipe-page__crumb snipe-page__crumb--link">
          {{ target.name }}
          <span class="snipe-page__crumb-sep">/</span>
        </router-link>
        <span class="snipe-page__crumb">Snipe</span>
      </span>
    </nav>

    <header class="snipe-hero">
      <div class="snipe-hero__player snipe-hero__player--sniper">
        <LevelBadge v-if="sniper" :level="sniperLevel?.level ?? 0"
          :current-xp="sniperLevel?.xpForCurrentLevel ?? 0" :required-xp="sniperLevel?.xpForNextLevel ?? 1"
          :avatar-url="sniper.avatarUrl" :title="sniperLevel?.title" hide-progress />
        <SkeletonLoader v-else variant="avatar" width="64px" height="64px" />
        <div class="snipe-hero__player-info">
          <span class="snipe-hero__role">You</span>
          <span class="snipe-hero__player-name">
            <CountryFlag v-if="sniper" :country="sniper.country" />
            {{ sniper?.name ?? '...' }}
          </span>
        </div>
      </div>

      <div class="snipe-hero__vs" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
        <span class="snipe-hero__vs-label">Sniping</span>
      </div>

      <div class="snipe-hero__player snipe-hero__player--target">
        <LevelBadge v-if="target" :level="targetLevel?.level ?? 0"
          :current-xp="targetLevel?.xpForCurrentLevel ?? 0" :required-xp="targetLevel?.xpForNextLevel ?? 1"
          :avatar-url="target.avatarUrl" :title="targetLevel?.title" hide-progress />
        <SkeletonLoader v-else variant="avatar" width="64px" height="64px" />
        <div class="snipe-hero__player-info">
          <span class="snipe-hero__role snipe-hero__role--target">Target</span>
          <span class="snipe-hero__player-name">
            {{ target?.name ?? '...' }}
            <CountryFlag v-if="target" :country="target.country" />
          </span>
        </div>
      </div>
    </header>

    <section class="snipe-page__summary">
      <header class="snipe-page__summary-caption">
        Based on {{ rows.length }} visible {{ rows.length === 1 ? 'map' : 'maps' }}:
      </header>
      <div class="snipe-page__summary-grid">
        <StatBlock label="Closest Gap" :value="`+${closestGapPct.toFixed(2)}%`" :accent-color="heroAccent" />
        <StatBlock label="Points to Gain" :value="totalPointsToGain" :decimals="0" />
        <StatBlock label="AP at Stake" :value="totalApAtStake" :decimals="2" />
        <StatBlock label="Snipeable Maps" :value="totalElements" :decimals="0" />
      </div>
    </section>

    <section class="snipe-page__controls">
      <div class="snipe-page__filters">
        <BaseSelect :model-value="currentCategory" :options="categoryOptions" label="Category"
          @update:model-value="setCategory" />
        <BaseSelect :model-value="String(currentSize)" :options="SIZE_OPTIONS" label="Page size"
          @update:model-value="setSize" />
      </div>
      <BaseButton variant="primary" size="lg" :href="playlistUrl" :disabled="!playlistUrl || rows.length === 0"
        aria-label="Download Beat Saber playlist">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span>{{ downloadLabel }}</span>
      </BaseButton>
    </section>

    <section class="snipe-page__list">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 5" :key="i" variant="card" height="160px" />
      </template>

      <template v-else-if="rows.length === 0">
        <EmptyState
          message="No close scores. You've already beaten this player on every overlapping map, or you have no scores in common." />
      </template>

      <template v-else>
        <SnipeComparisonRow v-for="comp in rows" :key="comp.mapDifficulty.id" :comparison="comp"
          :sniper-name="sniper?.name ?? 'You'" :target-name="target?.name ?? 'Target'"
          @open-detail="openDetail" />
      </template>
    </section>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages"
      @update:page="setPage" />

    <ScoreDetailModal :open="detailOpen" :score="detailScore" :user-id="detailUserId"
      @close="detailOpen = false" />
  </div>
</template>

<style scoped>
.snipe-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  --accent: var(--page-accent, var(--accent-overall));
}

.snipe-page > *:not(.snipe-page__bg) {
  width: 100%;
  max-width: 1070px;
  position: relative;
  z-index: 1;
}

.snipe-page__bg {
  position: absolute;
  inset: -32px -32px auto -32px;
  height: 360px;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.snipe-page__bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(80px) saturate(1.3);
  opacity: 0.25;
}

.snipe-page__bg-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent, var(--bg-base));
}

.snipe-page__breadcrumbs {
  display: flex;
  align-items: center;
}

.snipe-page__breadcrumbs-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  background: color-mix(in srgb, var(--bg-surface) 60%, transparent);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(8px);
}

.snipe-page__crumb {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.snipe-page__crumb--link {
  color: var(--text-secondary);
  transition: color 120ms ease;
}

.snipe-page__crumb--link:hover {
  color: var(--accent);
}

.snipe-page__crumb-sep {
  color: var(--text-tertiary);
}

.snipe-hero {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: color-mix(in srgb, var(--bg-surface) 80%, transparent);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  backdrop-filter: blur(12px);
}

.snipe-hero__player {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.snipe-hero__player--target {
  flex-direction: row-reverse;
  text-align: right;
}

.snipe-hero__player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.snipe-hero__role {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.snipe-hero__role--target {
  color: var(--accent);
}

.snipe-hero__player-name {
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snipe-hero__vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  color: var(--accent);
}

.snipe-hero__vs-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.snipe-page__summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm) var(--space-md);
}

.snipe-page__summary-caption {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.snipe-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

.snipe-page__controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.snipe-page__filters {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.snipe-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .snipe-hero {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .snipe-hero__player,
  .snipe-hero__player--target {
    flex-direction: column;
    text-align: center;
  }

  .snipe-page__summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .snipe-page__controls {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
