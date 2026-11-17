<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import MapHero from '@/components/domain/MapHero.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
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
import { pickCoverFallback, pickCoverUrl } from '@/utils/media'
import { tableNaturalWidth } from '@/utils/tableLayout'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MapScoresSection from './maps/MapScoresSection.vue'
import MapStatisticsSection from './maps/MapStatisticsSection.vue'
import { useMapScoreColumns } from './maps/useMapScoreColumns'

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
const scoreColumns = useMapScoreColumns(() => false)
const scoresTableWidth = computed(() => tableNaturalWidth(scoreColumns.value))
const contentTabs = [
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'statistics', label: 'Statistics' },
]

const coverUrl = computed(() => pickCoverUrl(map.value))
const coverFallbackUrl = computed(() => pickCoverFallback(map.value))
const { dominantColor } = useColorExtract(coverUrl)

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
const difficultyTabs = computed(() =>
  rankedDifficulties.value.map((d) => ({
    key: d.id,
    label: d.difficulty,
  }))
)

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
    const { getMapByRef } = await import('@/api/maps')
    const fetched = await getMapByRef(
      routeParam.value,
      route.query.difficulty as string | undefined,
      route.query.characteristic as string | undefined,
    )
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
    <h1 v-if="!loading && (error || !map)" class="map-detail__error-title">Map Not Found</h1>

    <template v-else>
      <MapHero
        :song="loading ? null : map"
        :cover-url="coverUrl"
        :cover-fallback="coverFallbackUrl"
        :bl-leaderboard-id="activeDifficulty?.blLeaderboardId"
        :ss-leaderboard-id="activeDifficulty?.ssLeaderboardId"
        :curve-id="scoreCurveId"
        :tweaker-complexity="isActiveDifficultyRanked ? (activeDifficulty?.complexity ?? null) : null"
        :chart="activeDifficulty"
      >
        <template v-if="activeDifficulty" #meta>
              <BaseTabs v-if="difficultyTabs.length" class="map-detail__picker" variant="segmented" label="Difficulty"
                :tabs="difficultyTabs" :model-value="activeDifficultyId" @update:model-value="activeDifficultyId = $event">
                <template #tab="{ tab }">
                  <DifficultyBadge :difficulty="tab.label" />
                </template>
              </BaseTabs>
              <DifficultyBadge v-else :difficulty="activeDifficulty.difficulty" />
              <ComplexityBadge v-if="isActiveDifficultyRanked" :complexity="activeDifficulty.complexity ?? 0" />
              <span v-if="hasCategory" class="map-detail__category-name" :style="{ color: categoryAccent }">{{ categoryName }}</span>
        </template>
        <template v-if="showApStats && diffStats" #side>
          <div class="map-detail__stats">
            <StatBlock label="Scores" :value="diffStats.totalScores" :decimals="0" />
            <StatBlock label="Average AP" :value="diffStats.averageAp ?? '-'" />
          </div>
        </template>
      </MapHero>

      <div v-if="loading || !map" class="map-detail__reserved" />

      <template v-else>
      <BaseTabs v-if="isActiveDifficultyRanked" :tabs="contentTabs" :model-value="activeTab" @update:model-value="activeTab = $event" />

      <div v-if="isActiveDifficultyRanked" class="map-detail__content">
        <div v-show="activeTab === 'leaderboard'">
          <MapScoresSection v-if="activeDifficultyId" :difficulty-id="activeDifficultyId" :map-id="map?.id"
            :map-name="map?.songName" :map-sub-name="map?.songSubName"
            :artist-name="map?.songAuthor" :map-author="map?.mapAuthor"
            :cover-url="coverUrl" :cover-fallback-url="coverFallbackUrl" :category-code="categoryCode"
            :difficulty="activeDifficulty ? formatDifficulty(activeDifficulty.difficulty) : undefined"
            :complexity="activeDifficulty?.complexity ?? null"
            @top-scores-loaded="onTopScoresLoaded" />
        </div>

        <MapStatisticsSection v-if="statsVisited && activeDifficultyId" v-show="activeTab === 'statistics'"
          :difficulty-id="activeDifficultyId" :map-id="map.id" :accent-color="resolvedAccent"
          :top-scores-first-page="topScoresFirstPage" @navigate-player="goToPlayer" />
      </div>
      </template>
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
  --page-column: max(1280px, var(--scores-column, 1280px));
}

.map-detail > *:not(.map-hero) {
  width: 100%;
  max-width: var(--page-column);
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .map-detail__reserved {
    height: 2607px;
  }
}

.map-detail__category-name {
  font-weight: 600;
}

.map-detail__stats {
  display: grid;
  grid-template-columns: repeat(2, 120px);
  gap: var(--space-md);
}

.map-detail__stats :deep(.stat-block) {
  align-items: flex-end;
  padding: 0;
}

.map-detail__content {
  min-height: 400px;
}

.map-detail__error-title {
  text-align: center;
}

@media (max-width: 767px) {
  .map-detail__stats :deep(.stat-block) {
    align-items: center;
  }
}
</style>
