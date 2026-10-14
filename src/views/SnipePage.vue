<script setup lang="ts">
import { buildSnipePlaylistUrl } from '@/api/snipe'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SortDirectionToggle from '@/components/common/SortDirectionToggle.vue'
import ThumbnailBackdrop from '@/components/cosmetics/thumbnails/ThumbnailBackdrop.vue'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import SnipeComparisonRow from '@/components/domain/SnipeComparisonRow.vue'
import SnipeTugOfWar from '@/components/domain/SnipeTugOfWar.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { pickAvatarUrl } from '@/composables/useAvatarFallback'
import { useColorExtract } from '@/composables/useColorExtract'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { usePageMeta } from '@/composables/usePageMeta'
import { useQueryParams } from '@/composables/useQueryParams'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useInventoryStore } from '@/stores/inventory'
import { useModifierStore } from '@/stores/modifiers'
import { useThemeStore } from '@/stores/theme'
import type { EquippedItemsResponse } from '@/types/api/items'
import type { SnipeComparisonResponse, SnipeSort, SnipeUnplayed } from '@/types/api/snipe'
import type { LevelResponse, ScoreResponse, UserAllStatisticsResponse } from '@/types/api/users'
import type { ScoreDisplay, SortDirection, UserRefDisplay } from '@/types/display'
import type { Page } from '@/types/pagination'
import { brightenRgb } from '@/utils/color'
import { toScoreDisplay } from '@/utils/mappers'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const inventoryStore = useInventoryStore()
const modifierStore = useModifierStore()
const themeStore = useThemeStore()
const { setQuery } = useQueryParams()

const SIZE_VALUES = [10, 20, 50, 100] as const
const DEFAULT_SIZE = 20
const ALL_SIZE_FOR_LIST = 100
const SIZE_OPTIONS = [
  ...SIZE_VALUES.map((n) => ({ value: String(n), label: `${n} maps` })),
  { value: 'all', label: 'All snipes' },
]

const SORT_OPTIONS: { value: SnipeSort; label: string; defaultDirection: SortDirection }[] = [
  { value: 'GAP', label: 'Closest gap', defaultDirection: 'asc' },
  { value: 'AP_GAP', label: 'Most AP to gain', defaultDirection: 'desc' },
  { value: 'TARGET_AP', label: 'Their AP', defaultDirection: 'desc' },
  { value: 'YOUR_AP', label: 'Your AP', defaultDirection: 'desc' },
  { value: 'RANK_GAP', label: 'Leaderboard gap', defaultDirection: 'desc' },
]
const DEFAULT_SORT: SnipeSort = 'GAP'

const UNPLAYED_OPTIONS: { value: SnipeUnplayed; label: string }[] = [
  { value: 'EXCLUDE', label: 'Hide' },
  { value: 'INCLUDE', label: 'Include' },
  { value: 'ONLY', label: 'Only' },
]
const DEFAULT_UNPLAYED: SnipeUnplayed = 'EXCLUDE'

const snipeCategoryCodes = computed(() =>
  categoryStore.categoryInfoList.filter((c) => c.code !== 'xp' && c.code !== 'overall').map((c) => c.code),
)

const categoryOptions = computed(() => [
  { value: '', label: 'All categories' },
  ...snipeCategoryCodes.value.map((code) => ({ value: code, label: categoryStore.getCategoryInfo(code)?.name ?? code })),
])

const targetId = computed(() => route.params.userId as string)
const sniperId = computed(() => authStore.userId)
const isValidPair = computed(() => !!sniperId.value && sniperId.value !== targetId.value)

const currentPage = computed(() => Math.max(1, Number(route.query.page) || 1))

const currentSize = computed<number | 'all'>(() => {
  if (route.query.size === 'all') return 'all'
  const n = Number(route.query.size)
  return (SIZE_VALUES as readonly number[]).includes(n) ? n : DEFAULT_SIZE
})

const currentCategory = computed(() => {
  const c = route.query.category
  return typeof c === 'string' && snipeCategoryCodes.value.includes(c) ? c : ''
})

const currentSort = computed<SnipeSort>(() => {
  const raw = String(route.query.sort ?? '').toUpperCase()
  return SORT_OPTIONS.find((o) => o.value === raw)?.value ?? DEFAULT_SORT
})

const defaultDirection = computed(() => SORT_OPTIONS.find((o) => o.value === currentSort.value)?.defaultDirection ?? 'asc')

const currentDirection = computed<SortDirection>(() =>
  route.query.dir === 'asc' || route.query.dir === 'desc' ? route.query.dir : defaultDirection.value,
)

const currentUnplayed = computed<SnipeUnplayed>(() => {
  const raw = String(route.query.unplayed ?? '').toUpperCase()
  return UNPLAYED_OPTIONS.find((o) => o.value === raw)?.value ?? DEFAULT_UNPLAYED
})

const unplayedParam = computed(() => (currentUnplayed.value === DEFAULT_UNPLAYED ? undefined : currentUnplayed.value))

function setPage(page: number) {
  setQuery({ page: page > 1 ? String(page) : undefined }, { keepPage: true })
}

function toggleDirection() {
  const next: SortDirection = currentDirection.value === 'asc' ? 'desc' : 'asc'
  setQuery({ dir: next === defaultDirection.value ? undefined : next })
}

const target = ref<UserRefDisplay | null>(null)
const targetLevel = ref<LevelResponse | null>(null)
const sniperLevel = ref<LevelResponse | null>(null)
const targetEquipped = ref<EquippedItemsResponse>({})

const sniper = computed<UserRefDisplay | null>(() => {
  const me = authStore.authMe
  return me
    ? { id: me.userId, name: me.name, avatarUrl: me.avatarUrl, cdnAvatarUrl: me.cdnAvatarUrl, country: me.country, clan: me.clan }
    : null
})

const sniperRender = reactive(useEquippedRenderProps(() => inventoryStore.equipped))
const targetRender = reactive(useEquippedRenderProps(targetEquipped))

const players = computed(() => [
  { key: 'sniper', role: 'You', user: sniper.value, level: sniperLevel.value, render: sniperRender },
  { key: 'target', role: 'Target', user: target.value, level: targetLevel.value, render: targetRender },
])

const targetAvatar = computed(() => pickAvatarUrl(target.value))
const { dominantColor } = useColorExtract(targetAvatar)

const heroAccent = computed(() => {
  const raw = dominantColor.value
  if (!raw) return 'var(--accent-overall)'
  return themeStore.resolvedBase === 'dark' ? brightenRgb(raw, 60) : raw
})

const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Leaderboards', to: '/leaderboards' },
  ...(target.value ? [{ label: target.value.name, to: `/players/${targetId.value}` }] : []),
  { label: 'Snipe' },
])

usePageMeta({ title: computed(() => (target.value ? `Snipe ${target.value.name} | AccSaber` : undefined)) })

const data = ref<Page<SnipeComparisonResponse> | null>(null)
const loading = ref(false)
const rows = computed(() => data.value?.content ?? [])

const sniperAllStats = ref<UserAllStatisticsResponse | null>(null)
const targetAllStats = ref<UserAllStatisticsResponse | null>(null)
const rankedTotals = ref<Map<string, number>>(new Map())
const reverseSnipeCount = ref<number | null>(null)
const filteredForwardCount = ref<number | null>(null)

const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref('')

const playlistUrl = computed(() =>
  sniperId.value
    ? buildSnipePlaylistUrl(sniperId.value, targetId.value, {
      size: currentSize.value === 'all' ? undefined : currentSize.value,
      category: currentCategory.value || undefined,
      sort: currentSort.value,
      direction: currentDirection.value,
      unplayed: unplayedParam.value,
    })
    : '',
)

const filterCategoryId = computed(() => (currentCategory.value ? categoryStore.getCategoryId(currentCategory.value) ?? null : null))
const totalsKey = computed(() => filterCategoryId.value ?? 'all')

function playsInScope(stats: UserAllStatisticsResponse | null): number {
  if (!stats) return 0
  const allowed = filterCategoryId.value
    ? new Set([filterCategoryId.value])
    : new Set(snipeCategoryCodes.value.map((code) => categoryStore.getCategoryId(code)))
  return stats.categories.filter((c) => allowed.has(c.categoryId)).reduce((sum, c) => sum + c.rankedPlays, 0)
}

const forwardSnipeCount = computed(() => {
  if (currentUnplayed.value !== DEFAULT_UNPLAYED) return filteredForwardCount.value
  return loading.value ? null : data.value?.totalElements ?? 0
})

const totalMapsInScope = computed(() => rankedTotals.value.get(totalsKey.value) ?? 0)
const sniperWins = computed(() => Math.max(0, playsInScope(sniperAllStats.value) - (forwardSnipeCount.value ?? 0)))
const targetWins = computed(() => Math.max(0, playsInScope(targetAllStats.value) - (reverseSnipeCount.value ?? 0)))
const unplayedCount = computed(() => Math.max(0, totalMapsInScope.value - sniperWins.value - targetWins.value))

const tugReady = computed(
  () =>
    !!sniperAllStats.value && !!targetAllStats.value
    && forwardSnipeCount.value != null && reverseSnipeCount.value != null
    && totalMapsInScope.value > 0,
)

async function fetchPlayers() {
  if (!sniperId.value) return
  const [{ getUser, getUserLevel, getUserAllStatistics }, { getUserEquippedItems }] = await Promise.all([
    import('@/api/users'),
    import('@/api/items'),
  ])
  inventoryStore.fetchEquipped(sniperId.value)
  sniperAllStats.value = null
  targetAllStats.value = null
  const [t, tl, sl, te, ss, ts] = await Promise.allSettled([
    getUser(targetId.value),
    getUserLevel(targetId.value),
    getUserLevel(sniperId.value),
    getUserEquippedItems(targetId.value),
    getUserAllStatistics(sniperId.value),
    getUserAllStatistics(targetId.value),
  ])
  target.value = t.status === 'fulfilled' ? t.value : null
  targetLevel.value = tl.status === 'fulfilled' ? tl.value : null
  sniperLevel.value = sl.status === 'fulfilled' ? sl.value : null
  targetEquipped.value = te.status === 'fulfilled' ? te.value : {}
  if (ss.status === 'fulfilled') sniperAllStats.value = ss.value
  if (ts.status === 'fulfilled') targetAllStats.value = ts.value
}

let listRequest = 0

async function fetchComparisons() {
  if (!sniperId.value) return
  const id = ++listRequest
  loading.value = true
  try {
    const { getClosestScores } = await import('@/api/snipe')
    const page = await getClosestScores(sniperId.value, targetId.value, {
      page: currentPage.value - 1,
      size: currentSize.value === 'all' ? ALL_SIZE_FOR_LIST : currentSize.value,
      category: currentCategory.value || undefined,
      sort: currentSort.value,
      direction: currentDirection.value,
      unplayed: unplayedParam.value,
    })
    if (id === listRequest) data.value = page
  } catch {
    if (id === listRequest) data.value = null
  }
  if (id === listRequest) loading.value = false
}

async function fetchRankedTotal() {
  const key = totalsKey.value
  if (rankedTotals.value.has(key)) return
  try {
    const { getDifficulties } = await import('@/api/maps')
    const page = await getDifficulties({ status: 'RANKED', size: 1, categoryId: filterCategoryId.value ?? undefined })
    rankedTotals.value = new Map(rankedTotals.value).set(key, page.totalElements ?? 0)
  } catch {
  }
}

async function countSnipes(from: string, to: string): Promise<number> {
  const { getClosestScores } = await import('@/api/snipe')
  const page = await getClosestScores(from, to, { page: 0, size: 1, category: currentCategory.value || undefined })
  return page.totalElements ?? 0
}

async function fetchReverseCount() {
  if (!sniperId.value) return
  reverseSnipeCount.value = null
  reverseSnipeCount.value = await countSnipes(targetId.value, sniperId.value).catch(() => 0)
}

async function fetchFilteredForwardCount() {
  filteredForwardCount.value = null
  if (!sniperId.value || currentUnplayed.value === DEFAULT_UNPLAYED) return
  filteredForwardCount.value = await countSnipes(sniperId.value, targetId.value).catch(() => 0)
}

function openDetail(score: ScoreResponse) {
  detailScore.value = toScoreDisplay(
    score,
    modifierStore.resolveModifierCodes(score.modifierIds),
    categoryStore.getCategoryCode(score.categoryId),
  )
  detailUserId.value = score.userId
  detailOpen.value = true
}

watch([sniperId, targetId], () => {
  if (!isValidPair.value) {
    router.replace({ name: 'player-profile', params: { userId: targetId.value } })
    return
  }
  fetchPlayers()
}, { immediate: true })

watch(
  () => [sniperId.value, targetId.value, currentPage.value, currentSize.value, currentCategory.value,
    currentSort.value, currentDirection.value, currentUnplayed.value],
  () => { if (isValidPair.value) fetchComparisons() },
  { immediate: true },
)

watch([sniperId, targetId, currentCategory], () => {
  if (!isValidPair.value) return
  fetchRankedTotal()
  fetchReverseCount()
}, { immediate: true })

watch([sniperId, targetId, currentCategory, currentUnplayed], () => {
  if (isValidPair.value) fetchFilteredForwardCount()
}, { immediate: true })
</script>

<template>
  <div class="snipe-page" :style="{ '--page-accent': heroAccent }">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <header class="snipe-hero">
      <ThumbnailBackdrop v-for="p in players" :key="`thumb-${p.key}`" class="snipe-hero__thumb"
        :class="`snipe-hero__thumb--${p.key}`" :value="p.render.thumbnailValue" :effects="p.render.thumbnailEffects" />

      <template v-for="(p, i) in players" :key="p.key">
        <div v-if="i === 1" class="snipe-hero__vs" aria-hidden="true">
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

        <div class="snipe-hero__player" :class="`snipe-hero__player--${p.key}`">
          <LevelBadge v-if="p.user" :level="p.level?.level ?? 0" :current-xp="p.level?.xpForCurrentLevel ?? 0"
            :required-xp="p.level?.xpForNextLevel ?? 1" :avatar-url="pickAvatarUrl(p.user)"
            :fallback-title="p.level?.title" hide-progress :equipped-title="p.render.titleValue"
            :equipped-border-shape="p.render.borderShapeValue" :equipped-border-color="p.render.borderColorValue"
            :title-effects="p.render.titleEffects" :border-effects="p.render.borderEffects" />
          <SkeletonLoader v-else variant="avatar" width="64px" height="64px" />
          <div class="snipe-hero__player-info">
            <span class="snipe-hero__role" :class="`snipe-hero__role--${p.key}`">{{ p.role }}</span>
            <UserChip v-if="p.user" :user="p.user" size="lg" hide-avatar class="snipe-hero__player-name" />
            <span v-else class="snipe-hero__player-name">...</span>
          </div>
        </div>
      </template>
    </header>

    <SnipeTugOfWar :sniper-wins="sniperWins" :target-wins="targetWins" :unplayed="unplayedCount" :loading="!tugReady" />

    <section class="snipe-page__controls">
      <div class="snipe-page__filters">
        <BaseSelect :model-value="currentCategory" :options="categoryOptions" label="Category"
          @update:model-value="setQuery({ category: $event || undefined })" />
        <BaseSelect :model-value="currentSize === 'all' ? 'all' : String(currentSize)" :options="SIZE_OPTIONS"
          label="Page size" @update:model-value="setQuery({ size: $event === String(DEFAULT_SIZE) ? undefined : $event })" />
        <BaseSelect :model-value="currentUnplayed" :options="UNPLAYED_OPTIONS" label="Unplayed maps"
          @update:model-value="setQuery({ unplayed: $event === DEFAULT_UNPLAYED ? undefined : $event.toLowerCase() })" />
        <div class="snipe-page__sort">
          <span class="snipe-page__sort-label">Sort</span>
          <div class="snipe-page__sort-row">
            <BaseSelect :model-value="currentSort" :options="SORT_OPTIONS"
              @update:model-value="setQuery({ sort: $event === DEFAULT_SORT ? undefined : $event.toLowerCase(), dir: undefined })" />
            <SortDirectionToggle :direction="currentDirection" @toggle="toggleDirection" />
          </div>
        </div>
      </div>
      <BaseButton class="snipe-page__download" variant="primary" size="lg" :href="playlistUrl"
        :disabled="!playlistUrl || rows.length === 0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span>Download playlist</span>
      </BaseButton>
    </section>

    <section class="snipe-page__list">
      <template v-if="loading">
        <SkeletonLoader v-for="i in 5" :key="i" variant="card" height="160px" />
      </template>
      <EmptyState v-else-if="rows.length === 0"
        :message="currentUnplayed === 'ONLY' ? 'No unplayed maps.' : 'No close scores.'" />
      <template v-else>
        <SnipeComparisonRow v-for="comp in rows" :key="comp.mapDifficulty.id" :comparison="comp"
          @open-detail="openDetail" />
      </template>
    </section>

    <PaginationControls v-if="(data?.totalPages ?? 0) > 1" :page="currentPage" :total-pages="data?.totalPages ?? 0"
      @update:page="setPage" />

    <ScoreDetailModal :open="detailOpen" :score="detailScore" :user-id="detailUserId" @close="detailOpen = false" />
  </div>
</template>

<style scoped>
.snipe-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.snipe-page > * {
  width: 100%;
  max-width: 1080px;
}

.snipe-hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.snipe-hero > :not(.thumbnail-backdrop) {
  position: relative;
}

.snipe-hero__thumb {
  border-radius: 0;
  width: 60%;
}

.snipe-hero__thumb--sniper {
  inset: 0 auto 0 0;
  mask-image: linear-gradient(to right, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.2) 50%, transparent);
}

.snipe-hero__thumb--target {
  inset: 0 0 0 auto;
  mask-image: linear-gradient(to left, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.2) 50%, transparent);
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
  color: var(--page-accent);
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
  color: var(--page-accent);
}

.snipe-hero__vs-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.snipe-page__sort {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.snipe-page__sort-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.snipe-page__sort-row {
  display: flex;
  align-items: stretch;
  gap: var(--space-sm);
}

.snipe-page__sort-row :deep(.base-select__trigger) {
  min-width: 170px;
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

  .snipe-page__controls {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
