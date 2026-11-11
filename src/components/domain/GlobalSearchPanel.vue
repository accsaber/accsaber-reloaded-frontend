<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useCategoryStore } from '@/stores/categories'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import type { LeaderboardResponse } from '@/types/api/users'
import { formatFixed } from '@/utils/formatters'
import { buildMapRoute } from '@/utils/mapRoute'
import { toUserRef } from '@/utils/mappers'
import { onImageError, pickCoverFallback, pickCoverUrl } from '@/utils/media'
import { getRankClass } from '@/utils/ranking'
import { isStaffSubdomain, mainSiteUrl, playerProfileHref } from '@/utils/subdomain'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const categoryStore = useCategoryStore()

const RESULTS_PER_SECTION = 100
const DEBOUNCE_MS = 200
const MIN_CHARS = 3

const searchValue = ref('')
const debouncedSearch = useDebouncedRef(searchValue, DEBOUNCE_MS)
const players = ref<LeaderboardResponse[]>([])
const difficulties = ref<PublicMapDifficultyResponse[]>([])
const loading = ref(false)
const searched = ref(false)
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

const tooShort = computed(() => {
  const length = searchValue.value.trim().length
  return length > 0 && length < MIN_CHARS && !searched.value
})

let requestId = 0

onMounted(() => inputRef.value?.focus())

watch(searchValue, (value) => {
  searched.value = false
  if (value.trim().length >= MIN_CHARS) {
    loading.value = true
    return
  }
  requestId++
  players.value = []
  difficulties.value = []
  loading.value = false
})

watch(debouncedSearch, (value) => {
  const query = value.trim()
  if (query.length >= MIN_CHARS) void runSearch(query)
})

function onEnter() {
  const query = searchValue.value.trim()
  if (query) void runSearch(query)
}

async function runSearch(query: string) {
  const id = ++requestId
  loading.value = true
  searched.value = true
  const overallCategoryId = categoryStore.getCategoryId('overall')

  const playerPromise = overallCategoryId
    ? import('@/api/leaderboards').then(({ getLeaderboard }) =>
      getLeaderboard(overallCategoryId, { search: query, size: RESULTS_PER_SECTION, page: 0 }),
    )
    : Promise.resolve(null)

  const diffPromise = import('@/api/maps').then(({ getDifficulties }) =>
    getDifficulties({ search: query, size: RESULTS_PER_SECTION, page: 0, status: 'RANKED' }),
  )

  const [playerPage, diffPage] = await Promise.allSettled([playerPromise, diffPromise])
  if (id !== requestId) return
  players.value = playerPage.status === 'fulfilled' && playerPage.value ? playerPage.value.content : []
  difficulties.value = diffPage.status === 'fulfilled' ? diffPage.value.content : []
  loading.value = false
}

function playerHref(userId: string): string {
  if (isStaffSubdomain) return playerProfileHref(userId)
  return router.resolve({ name: 'player-profile', params: { userId } }).href
}

function difficultyRoute(diff: PublicMapDifficultyResponse) {
  return buildMapRoute({
    beatsaverCode: diff.beatsaverCode,
    mapId: diff.mapId,
    difficulty: diff.difficulty,
    difficultyId: diff.id,
    characteristic: diff.characteristic,
  })
}

function diffHref(diff: PublicMapDifficultyResponse): string {
  const target = difficultyRoute(diff) as {
    path: string
    query: Record<string, string>
  }
  if (isStaffSubdomain) {
    const qs = new URLSearchParams(target.query).toString()
    return mainSiteUrl(qs ? `${target.path}?${qs}` : target.path)
  }
  return router.resolve(target).href
}

function isPlainClick(event: MouseEvent): boolean {
  return !isStaffSubdomain && !(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
}

function goToPlayer(userId: string, event: MouseEvent) {
  if (!isPlainClick(event)) return
  event.preventDefault()
  void router.push({ name: 'player-profile', params: { userId } })
}

function goToDifficulty(diff: PublicMapDifficultyResponse, event: MouseEvent) {
  if (!isPlainClick(event)) return
  event.preventDefault()
  void router.push(difficultyRoute(diff))
}

function categoryCode(diff: PublicMapDifficultyResponse): string {
  return categoryStore.getCategoryCode(diff.categoryId) ?? 'overall'
}
</script>

<template>
  <div class="search-panel">
    <div class="search-panel__field">
      <svg class="search-panel__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input ref="inputRef" v-model="searchValue" type="text" class="search-panel__input"
        placeholder="Search players and maps" aria-label="Search players and maps" @keydown.enter="onEnter" />
    </div>

    <p v-if="tooShort" class="caption search-panel__note">{{ MIN_CHARS }} characters or more, or press Enter</p>

    <div v-else-if="loading || searched" class="search-panel__results">
      <section v-for="section in (['players', 'maps'] as const)" :key="section" class="search-panel__section">
        <h3 class="field-label search-panel__label">{{ section === 'players' ? 'Players' : 'Maps' }}</h3>

        <template v-if="loading">
          <SkeletonLoader v-for="i in 3" :key="i" width="100%" height="52px" />
        </template>

        <template v-else-if="section === 'players'">
          <p v-if="!players.length" class="caption search-panel__note">No players</p>
          <a v-for="p in players" :key="p.userId" :href="playerHref(p.userId)" class="search-panel__row"
            @click="goToPlayer(p.userId, $event)">
            <span class="rank search-panel__rank" :class="getRankClass(p.ranking)">#{{ p.ranking }}</span>
            <UserChip :user="toUserRef(p)" class="search-panel__player" />
            <span class="search-panel__ap">{{ formatFixed(p.ap, 2) }} AP</span>
          </a>
        </template>

        <template v-else>
          <p v-if="!difficulties.length" class="caption search-panel__note">No maps</p>
          <a v-for="diff in difficulties" :key="diff.id" :href="diffHref(diff)" class="search-panel__row"
            @click="goToDifficulty(diff, $event)">
            <img :src="pickCoverUrl(diff)" :alt="diff.songName" class="search-panel__cover" width="36" height="36"
              loading="lazy" decoding="async" @error="onImageError(pickCoverFallback(diff))($event)" />
            <span class="search-panel__main">
              <span class="search-panel__title">
                <span class="search-panel__song">{{ diff.songName }}</span>
                <DifficultyBadge :difficulty="diff.difficulty" />
                <ComplexityBadge :complexity="diff.complexity ?? 0" />
                <span v-if="diff.characteristic && diff.characteristic !== 'Standard'" class="caption">
                  {{ diff.characteristic }}
                </span>
              </span>
              <span class="caption search-panel__sub">{{ diff.songAuthor }}, mapped by {{ diff.mapAuthor }}</span>
            </span>
            <CategoryBadge :category="categoryCode(diff)" size="sm" />
          </a>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.search-panel__field {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.search-panel__icon {
  position: absolute;
  left: var(--space-sm);
  color: var(--text-secondary);
  pointer-events: none;
}

.search-panel__input {
  width: 100%;
  height: 36px;
  padding: 0 var(--space-sm) 0 calc(var(--space-sm) + 22px);
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  outline: none;
}

.search-panel__input::placeholder {
  color: var(--text-secondary);
}

.search-panel__note {
  padding: var(--space-sm) var(--space-md);
}

.search-panel__results {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 0;
  padding: var(--space-sm) var(--space-xs) var(--space-xs);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.search-panel__section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-panel__label {
  margin: 0;
  padding: 0 var(--space-sm) var(--space-xs);
}

.search-panel__row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-height: 52px;
  padding: var(--space-sm);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  text-decoration: none;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.search-panel__row:hover,
.search-panel__row:focus-visible {
  background: var(--bg-overlay);
  outline: none;
}

.search-panel__rank {
  min-width: 2.5rem;
  text-align: right;
}

.search-panel__cover {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-card);
  object-fit: cover;
  flex-shrink: 0;
}

.search-panel__player {
  flex: 1;
  min-width: 0;
}

.search-panel__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.search-panel__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
}

.search-panel__song {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.search-panel__sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-panel__ap {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-weight: 500;
}
</style>
