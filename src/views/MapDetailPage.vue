<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import Breadcrumbs from '@/components/common/Breadcrumbs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ApTweaker from '@/components/domain/ApTweaker.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapChartStats from '@/components/domain/MapChartStats.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { useColorExtract } from '@/composables/useColorExtract'
import { usePageMeta } from '@/composables/usePageMeta'
import { useCategoryStore } from '@/stores/categories'
import { useThemeStore } from '@/stores/theme'
import type { PublicMapDifficultyResponse, PublicMapResponse } from '@/types/api/maps'
import type { DifficultyScoreDisplay } from '@/types/display'
import { brightenRgb } from '@/utils/color'
import { DIFFICULTY_ORDER } from '@/utils/constants'
import { formatDifficulty } from '@/utils/mappers'
import { buildMapRoute, isUuid, slugToDifficulty } from '@/utils/mapRoute'
import { onImageError, pickCoverFallback, pickCoverUrl } from '@/utils/media'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MapScoresSection from './maps/MapScoresSection.vue'
import MapStatisticsSection from './maps/MapStatisticsSection.vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const categoryStore = useCategoryStore()

const map = ref<PublicMapResponse | null>(null)
const activeDifficultyId = ref<string>('')
const topScoresFirstPage = ref<DifficultyScoreDisplay[]>([])

const routeParam = computed(() => route.params.mapId as string)

function onTopScoresLoaded(scores: DifficultyScoreDisplay[]) {
  topScoresFirstPage.value = scores
}
const loading = ref(true)
const error = ref(false)

const activeTab = ref('leaderboard')
const statsVisited = ref(false)
const scoresTableWidth = ref(0)
const contentTabs = [
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'statistics', label: 'Statistics' },
]

const coverUrl = computed(() => pickCoverUrl(map.value))
const coverFallbackUrl = computed(() => pickCoverFallback(map.value))
const { dominantColor } = useColorExtract(coverUrl)
const handleMapCoverError = (e: Event) => onImageError(coverFallbackUrl.value)(e)

const resolvedAccent = computed(() => {
  const raw = dominantColor.value
  if (!raw) return categoryAccent.value
  return themeStore.resolvedBase === 'dark' ? brightenRgb(raw, 60) : raw
})

const rankedDifficulties = computed<PublicMapDifficultyResponse[]>(() => {
  if (!map.value) return []
  return map.value.difficulties
    .filter((d) => d.status === 'RANKED')
    .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty))
})

const activeDifficulty = computed(() =>
  map.value?.difficulties.find((d) => d.id === activeDifficultyId.value) ?? null
)

const diffStats = computed(() => activeDifficulty.value?.statistics ?? null)

const isActiveDifficultyRanked = computed(() => activeDifficulty.value?.status === 'RANKED')

const showApStats = computed(() => {
  const status = activeDifficulty.value?.status
  return status !== 'CAMPAIGN' && status !== 'QUEUE'
})

const hasCategory = computed(() => activeDifficulty.value?.categoryId != null)

const categoryCode = computed(() => {
  if (!activeDifficulty.value) return 'overall'
  return categoryStore.getCategoryCode(activeDifficulty.value.categoryId) ?? 'overall'
})

const categoryAccent = computed(() => categoryStore.getAccent(categoryCode.value))

const categoryName = computed(() => {
  const info = categoryStore.getCategoryInfo(categoryCode.value)
  return info?.name ?? categoryCode.value
})

const scoreCurveId = computed(() => categoryStore.byCode.get(categoryCode.value)?.scoreCurve?.id)
const tweakerOpen = ref(false)
const tweakerAnchor = ref<HTMLElement | null>(null)

function toggleMapTweaker(event: Event) {
  tweakerOpen.value = !tweakerOpen.value
  tweakerAnchor.value = tweakerOpen.value ? (event.currentTarget as HTMLElement) : null
}

const bsrCopied = ref(false)
let bsrCopiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyBsr() {
  if (!map.value?.beatsaverCode) return
  try {
    await navigator.clipboard.writeText(`!bsr ${map.value.beatsaverCode}`)
  } catch {
    return
  }
  bsrCopied.value = true
  if (bsrCopiedTimer) clearTimeout(bsrCopiedTimer)
  bsrCopiedTimer = setTimeout(() => { bsrCopied.value = false }, 1400)
}

const difficultyTabs = computed(() =>
  rankedDifficulties.value.map((d) => ({
    key: d.id,
    label: d.difficulty,
  }))
)

const breadcrumbs = computed(() => [
  { label: 'Maps', to: '/maps' },
  { label: map.value?.songName ?? 'Map' },
])

const metaTitle = computed(() => {
  if (!map.value) return undefined
  return `${map.value.songAuthor} - ${map.value.songName} | AccSaber`
})

usePageMeta({ title: metaTitle })

function goToPlayer(userId: string) {
  router.push({ name: 'player-profile', params: { userId } })
}

function resolveQueryDifficulty(
  difficulties: PublicMapDifficultyResponse[],
): PublicMapDifficultyResponse | null {
  const queryDiffId = route.query.difficultyId as string | undefined
  if (queryDiffId) {
    return difficulties.find((d) => d.id === queryDiffId) ?? null
  }
  const queryDifficulty = route.query.difficulty as string | undefined
  if (!queryDifficulty) return null
  const targetEnum = slugToDifficulty(queryDifficulty)
  const targetChar = ((route.query.characteristic as string | undefined) ?? 'Standard').toLowerCase()
  return (
    difficulties.find(
      (d) => d.difficulty === targetEnum && d.characteristic.toLowerCase() === targetChar,
    ) ?? null
  )
}

let mapRequest = 0

async function fetchMap() {
  const request = ++mapRequest
  loading.value = true
  error.value = false
  map.value = null

  try {
    const { getMap, getMapByCode } = await import('@/api/maps')
    let fetched
    if (isUuid(routeParam.value)) {
      fetched = await getMap(routeParam.value)
    } else {
      const qDifficulty = route.query.difficulty as string | undefined
      const byCodeParams: { difficulty?: string; characteristic?: string } = {}
      if (qDifficulty) {
        byCodeParams.difficulty = slugToDifficulty(qDifficulty)
        byCodeParams.characteristic = (route.query.characteristic as string | undefined) ?? 'Standard'
      }
      fetched = await getMapByCode(routeParam.value, byCodeParams)
    }
    if (request !== mapRequest) return
    map.value = fetched

    const all = fetched.difficulties
    const fallback = resolveQueryDifficulty(all) ?? rankedDifficulties.value[0] ?? all[0]
    if (fallback) activeDifficultyId.value = fallback.id
  } catch {
    if (request !== mapRequest) return
    error.value = true
  }
  loading.value = false
}

watch(() => [route.query.difficultyId, route.query.difficulty, route.query.characteristic], () => {
  if (!map.value) return
  const matched = resolveQueryDifficulty(map.value.difficulties)
  if (matched) {
    if (matched.id !== activeDifficultyId.value) {
      activeDifficultyId.value = matched.id
    }
    return
  }
  if (!isUuid(routeParam.value)) fetchMap()
})

watch(routeParam, (param) => {
  const current = map.value
  if (current && (param === current.id || param === current.beatsaverCode)) return
  void fetchMap()
}, { immediate: true })

watch(activeDifficultyId, (newId) => {
  if (!newId || !map.value) return
  topScoresFirstPage.value = []

  const diff = map.value.difficulties.find((d) => d.id === newId)
  if (!diff) return

  const target = buildMapRoute({
    beatsaverCode: map.value.beatsaverCode,
    mapId: map.value.id,
    difficulty: diff.difficulty,
    difficultyId: diff.id,
    characteristic: diff.characteristic,
  }) as { path: string; query: Record<string, string> }

  if (target.path !== route.path || !sameQuery(target.query, route.query)) {
    router.replace(target)
  }
})

watch(activeTab, (tab) => {
  if (tab === 'statistics') statsVisited.value = true
})

function sameQuery(a: Record<string, string>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every((k) => a[k] === b[k])
}
</script>

<template>
  <div class="map-detail" :style="{ '--page-accent': resolvedAccent, '--scores-column': scoresTableWidth + 'px' }">
    <template v-if="loading">
      <div class="map-detail__hero">
        <SkeletonLoader variant="avatar" width="200px" height="200px" />
        <div class="map-detail__name-col">
          <SkeletonLoader variant="text" width="300px" />
          <SkeletonLoader variant="text" width="200px" />
        </div>
      </div>
    </template>

    <template v-else-if="error || !map">
      <h1 class="map-detail__error-title">Map Not Found</h1>
      <p class="map-detail__error">Could not load this map.</p>
    </template>

    <template v-else>
      <Breadcrumbs :crumbs="breadcrumbs" />

      <div class="map-detail__bg">
        <div class="map-detail__bg-image" :style="{ backgroundImage: `url(${coverUrl})` }" />
      </div>

      <div class="map-detail__hero">
        <img class="map-detail__cover" :src="coverUrl" :alt="map.songName" fetchpriority="high" decoding="async"
          @error="handleMapCoverError" />

        <div class="map-detail__details">
          <div class="map-detail__name-col">
            <h1>
              <SongTitle layout="stacked" :name="map.songName" :sub-name="map.songSubName" />
            </h1>
            <p class="map-detail__artist">{{ map.songAuthor }}</p>
            <p class="map-detail__mapper">Mapped by <strong>{{ map.mapAuthor }}</strong></p>

            <div v-if="activeDifficulty" class="map-detail__diff-meta">
              <BaseTabs v-if="difficultyTabs.length" class="map-detail__picker" variant="segmented" label="Difficulty"
                :tabs="difficultyTabs" :model-value="activeDifficultyId" @update:model-value="activeDifficultyId = $event">
                <template #tab="{ tab }">
                  <DifficultyBadge :difficulty="tab.label" />
                </template>
              </BaseTabs>
              <DifficultyBadge v-else :difficulty="activeDifficulty.difficulty" />
              <ComplexityBadge v-if="isActiveDifficultyRanked" :complexity="activeDifficulty.complexity ?? 0" />
              <span v-if="hasCategory" class="map-detail__category-name" :style="{ color: categoryAccent }">{{ categoryName }}</span>
            </div>
          </div>

          <div class="map-detail__side">
            <div class="map-detail__links">
              <BaseButton v-if="map.beatsaverCode" size="sm" :href="`beatsaver://${map.beatsaverCode}`"
                aria-label="One-Click Install" title="One-Click Install">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12" />
                  <path d="M11 11.5V6.5a1.5 1.5 0 0 1 3 0V12" />
                  <path d="M14 10.5V8.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2a1.5 1.5 0 0 1 3 0V12" />
                </svg>
              </BaseButton>
              <BaseButton v-if="map.beatsaverCode" size="sm" :href="`https://beatsaver.com/maps/${map.beatsaverCode}`"
                aria-label="View on BeatSaver">
                <img src="https://beatsaver.com/static/favicon/favicon-32x32.png" alt="BeatSaver" width="16" height="16"
                  class="map-detail__site-icon" decoding="async" />
              </BaseButton>
              <BaseButton v-if="map.beatsaverCode" size="sm" aria-label="Copy BSR" title="Copy BSR"
                @click="copyBsr">
                <span v-if="bsrCopied" class="map-detail__bsr-label">Copied!</span>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="14" />
                  <line x1="12" y1="18" x2="12" y2="19" />
                </svg>
              </BaseButton>
              <BaseButton v-if="activeDifficulty?.blLeaderboardId" size="sm"
                :href="`https://www.beatleader.com/leaderboard/global/${activeDifficulty.blLeaderboardId}`"
                aria-label="View on BeatLeader">
                <img src="https://beatleader.com/assets/favicon-32x32.png" alt="BeatLeader" width="16" height="16"
                  class="map-detail__site-icon" decoding="async" />
              </BaseButton>
              <BaseButton v-if="activeDifficulty?.ssLeaderboardId" size="sm"
                :href="`https://scoresaber.com/leaderboard/${activeDifficulty.ssLeaderboardId}`"
                aria-label="View on ScoreSaber">
                <img src="https://scoresaber.com/favicon-32x32.png" alt="ScoreSaber" width="16" height="16"
                  class="map-detail__site-icon" decoding="async" />
              </BaseButton>
              <BaseButton v-if="scoreCurveId && activeDifficulty && isActiveDifficultyRanked" size="sm" aria-label="AP Tweaker"
                @click="toggleMapTweaker($event)">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" />
                  <path
                    d="M16.2 12.5a1.4 1.4 0 00.28 1.54l.05.05a1.7 1.7 0 11-2.4 2.4l-.05-.05a1.4 1.4 0 00-1.54-.28 1.4 1.4 0 00-.84 1.28v.14a1.7 1.7 0 11-3.4 0v-.07a1.4 1.4 0 00-.92-1.28 1.4 1.4 0 00-1.54.28l-.05.05a1.7 1.7 0 11-2.4-2.4l.05-.05a1.4 1.4 0 00.28-1.54 1.4 1.4 0 00-1.28-.84H2.3a1.7 1.7 0 110-3.4h.07a1.4 1.4 0 001.28-.92 1.4 1.4 0 00-.28-1.54l-.05-.05a1.7 1.7 0 112.4-2.4l.05.05a1.4 1.4 0 001.54.28h.07a1.4 1.4 0 00.84-1.28V2.3a1.7 1.7 0 113.4 0v.07a1.4 1.4 0 00.84 1.28 1.4 1.4 0 001.54-.28l.05-.05a1.7 1.7 0 112.4 2.4l-.05.05a1.4 1.4 0 00-.28 1.54v.07a1.4 1.4 0 001.28.84h.14a1.7 1.7 0 110 3.4h-.07a1.4 1.4 0 00-1.28.84z"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </BaseButton>
              <ApTweaker v-if="scoreCurveId && activeDifficulty && isActiveDifficultyRanked" :open="tweakerOpen" :curve-id="scoreCurveId"
                :anchor-el="tweakerAnchor" :complexity="activeDifficulty.complexity ?? undefined" :show-weighted="false"
                @update:open="(val: boolean) => { tweakerOpen = val; if (!val) tweakerAnchor = null }" />
            </div>

            <template v-if="showApStats && diffStats">
              <p class="map-detail__summary">{{ diffStats.totalScores }} scores</p>
              <p class="map-detail__summary">{{ diffStats.averageAp?.toFixed(2) ?? '-' }} average AP</p>
            </template>

            <details v-if="activeDifficulty" class="map-detail__chart">
              <summary>Map stats</summary>
              <MapChartStats :source="activeDifficulty" />
            </details>
          </div>
        </div>
      </div>

      <BaseTabs v-if="isActiveDifficultyRanked" :tabs="contentTabs" :model-value="activeTab" @update:model-value="activeTab = $event" />

      <div v-if="isActiveDifficultyRanked" class="map-detail__content">
        <div v-show="activeTab === 'leaderboard'">
          <MapScoresSection v-if="activeDifficultyId" :difficulty-id="activeDifficultyId" :map-id="map?.id"
            :map-name="map?.songName" :map-sub-name="map?.songSubName"
            :artist-name="map?.songAuthor" :map-author="map?.mapAuthor"
            :cover-url="coverUrl" :cover-fallback-url="coverFallbackUrl" :category-code="categoryCode"
            :difficulty="activeDifficulty ? formatDifficulty(activeDifficulty.difficulty) : undefined"
            :complexity="activeDifficulty?.complexity ?? null"
            @top-scores-loaded="onTopScoresLoaded"
            @width-change="scoresTableWidth = $event" />
        </div>

        <MapStatisticsSection v-if="statsVisited && activeDifficultyId" v-show="activeTab === 'statistics'"
          :difficulty-id="activeDifficultyId" :map-id="map.id" :accent-color="resolvedAccent"
          :top-scores-first-page="topScoresFirstPage" @navigate-player="goToPlayer" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.map-detail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  --accent: var(--page-accent, var(--accent-overall));
  --page-column: clamp(1280px, var(--scores-column, 1280px), var(--page-width-wide));
}

.map-detail>*:not(.map-detail__bg) {
  width: 100%;
  max-width: var(--page-column);
  position: relative;
  z-index: 1;
}

.map-detail__bg {
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

.map-detail__bg-image {
  position: absolute;
  inset: -80px;
  background-size: cover;
  background-position: center 20%;
  background-repeat: no-repeat;
  filter: blur(40px) brightness(0.55) saturate(1.5);
  opacity: 0.3;
}

.map-detail__hero {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-xl);
  padding: var(--space-xl) 0 var(--space-lg);
}

.map-detail__cover {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  border: 1px solid var(--bg-overlay);
}

.map-detail__details {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg) var(--space-xl);
  min-width: 0;
}

.map-detail__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: none;
  gap: var(--space-md);
  text-align: right;
}

.map-detail__name-col {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.map-detail__name-col h1 {
  font-size: calc(var(--text-page-title) * 1.5);
}

.map-detail__name-col :deep(.song-title__sub) {
  font-size: var(--text-section-heading);
  font-weight: 500;
  color: var(--text-secondary);
}

.map-detail__artist {
  font-size: var(--text-section-heading);
  color: var(--text-primary);
  margin: 0;
}

.map-detail__mapper {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
}

.map-detail__mapper strong {
  color: var(--text-primary);
  font-weight: 500;
}

.map-detail__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.map-detail__links :deep(.base-button) {
  padding: var(--space-sm);
}

.map-detail__links :deep(.base-button :is(svg, img)) {
  width: 18px;
  height: 18px;
}

.map-detail__site-icon {
  border-radius: var(--radius-btn);
}

.map-detail__bsr-label {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.02em;
}

.map-detail__diff-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-lg);
  margin-top: var(--space-sm);
  font-size: var(--text-card-title);
}

.map-detail__picker :deep(.base-tabs__tab) {
  padding: var(--space-sm) var(--space-md);
}

.map-detail__picker :deep(.base-tabs__tab:not(.base-tabs__tab--active):not(:hover)) {
  opacity: 0.7;
}

.map-detail__category-name {
  font-weight: 600;
}

.map-detail__summary {
  margin: 0;
  font-size: var(--text-card-title);
  color: var(--text-secondary);
}

.map-detail__chart {
  position: relative;
  align-self: stretch;
}

.map-detail__chart summary {
  width: fit-content;
  margin-left: auto;
  font-size: var(--text-body);
  color: var(--text-secondary);
  cursor: pointer;
}

.map-detail__chart :deep(.chart-stats) {
  width: 0;
  min-width: 100%;
  border-top: none;
}

.map-detail__chart summary:hover {
  color: var(--text-primary);
}

@media (min-width: 1280px) {
  .map-detail__chart {
    align-self: flex-end;
    margin-top: var(--space-sm);
  }

  .map-detail__chart :deep(.chart-stats) {
    position: absolute;
    right: calc(100% + var(--space-md));
    bottom: 0;
    width: 480px;
    min-width: 0;
    padding: 0;
  }
}

.map-detail__content {
  min-height: 400px;
}

.map-detail__error-title {
  text-align: center;
}

.map-detail__error {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--space-3xl);
}

@media (max-width: 767px) {
  .map-detail__bg {
    top: calc(-1 * var(--space-md));
    left: calc(-1 * var(--space-md));
    right: calc(-1 * var(--space-md));
  }

  .map-detail__hero {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: var(--space-md);
    text-align: center;
  }

  .map-detail__cover {
    width: 128px;
    height: 128px;
  }

  .map-detail__details,
  .map-detail__name-col,
  .map-detail__side {
    align-items: center;
    text-align: center;
  }

  .map-detail__details {
    flex-direction: column;
  }

  .map-detail__chart summary {
    margin-right: auto;
  }

  .map-detail__links,
  .map-detail__diff-meta {
    justify-content: center;
  }
}
</style>
