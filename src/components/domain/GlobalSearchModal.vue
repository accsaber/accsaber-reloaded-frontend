<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyResponse, MapResponse } from '@/types/api/maps'
import type { LeaderboardResponse } from '@/types/api/users'
import { getRankClass } from '@/utils/ranking'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const categoryStore = useCategoryStore()

const RESULTS_PER_SECTION = 100
const DEBOUNCE_MS = 200
const MIN_CHARS = 3

const searchValue = ref('')
const debouncedSearch = useDebouncedRef(searchValue, DEBOUNCE_MS)
const players = ref<LeaderboardResponse[]>([])
const maps = ref<MapResponse[]>([])
const loadingPlayers = ref(false)
const loadingMaps = ref(false)
const playersCollapsed = ref(false)
const mapsCollapsed = ref(false)
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

let requestId = 0

watch(() => props.open, async (open) => {
  if (open) {
    searchValue.value = ''
    players.value = []
    maps.value = []
    playersCollapsed.value = false
    mapsCollapsed.value = false
    await nextTick()
    inputRef.value?.focus()
  }
})

watch(searchValue, (val) => {
  const trimmed = val.trim()
  if (trimmed.length < MIN_CHARS) {
    requestId++
    players.value = []
    maps.value = []
    loadingPlayers.value = false
    loadingMaps.value = false
    return
  }
  loadingPlayers.value = true
  loadingMaps.value = true
})

watch(debouncedSearch, (val) => {
  const trimmed = val.trim()
  if (trimmed.length < MIN_CHARS) return
  runSearch(trimmed)
})

async function runSearch(query: string) {
  const id = ++requestId
  const overallCategoryId = categoryStore.getCategoryId('overall')

  const playerPromise = overallCategoryId
    ? import('@/api/leaderboards').then(({ getLeaderboard }) =>
      getLeaderboard(overallCategoryId, { search: query, size: RESULTS_PER_SECTION, page: 0 }),
    )
    : Promise.resolve(null)

  const mapPromise = import('@/api/maps').then(({ getMaps }) =>
    getMaps({ search: query, size: RESULTS_PER_SECTION, page: 0 }),
  )

  try {
    const [playerPage, mapPage] = await Promise.allSettled([playerPromise, mapPromise])
    if (id !== requestId) return
    if (playerPage.status === 'fulfilled' && playerPage.value) {
      players.value = playerPage.value.content
    } else {
      players.value = []
    }
    if (mapPage.status === 'fulfilled') {
      maps.value = mapPage.value.content
    } else {
      maps.value = []
    }
  } finally {
    if (id === requestId) {
      loadingPlayers.value = false
      loadingMaps.value = false
    }
  }
}

function goToPlayer(userId: string) {
  router.push({ name: 'player-profile', params: { userId } })
  emit('close')
}

function goToMap(mapId: string) {
  router.push({ name: 'map-detail', params: { mapId } })
  emit('close')
}

function formatAp(ap: number): string {
  return ap.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function primaryDifficulty(map: MapResponse): MapDifficultyResponse | null {
  if (!map.difficulties?.length) return null
  return map.difficulties.reduce((a, b) => (b.complexity > a.complexity ? b : a))
}

interface MapResult {
  map: MapResponse
  primary: MapDifficultyResponse | null
  accent: string
}

const mapResults = computed<MapResult[]>(() =>
  maps.value.map((map) => {
    const primary = primaryDifficulty(map)
    const code = primary ? categoryStore.getCategoryCode(primary.categoryId) : undefined
    return {
      map,
      primary,
      accent: code ? categoryStore.getAccent(code) : 'var(--accent)',
    }
  }),
)
</script>

<template>
  <BaseModal :open="props.open" title="Search anything" max-width="640px" @close="emit('close')">
    <div class="search-modal">
      <div class="search-modal__input-wrap">
        <svg class="search-modal__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input ref="inputRef" v-model="searchValue" type="text" class="search-modal__input"
          placeholder="Type to search players and maps..." />
      </div>

      <div v-if="!searchValue.trim()" class="search-modal__hint">
        Start typing to search across players and maps.
      </div>

      <div v-else-if="searchValue.trim().length < MIN_CHARS" class="search-modal__hint">
        Type at least {{ MIN_CHARS }} characters to search.
      </div>

      <template v-else>
        <section class="search-modal__section">
          <button type="button" class="search-modal__section-header" :aria-expanded="!playersCollapsed"
            @click="playersCollapsed = !playersCollapsed">
            <svg class="search-modal__section-chevron"
              :class="{ 'search-modal__section-chevron--collapsed': playersCollapsed }" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span class="search-modal__section-title">Players</span>
            <span class="search-modal__section-count">{{ players.length }}</span>
          </button>
          <div v-if="!playersCollapsed" class="search-modal__section-body">
            <div v-if="loadingPlayers" class="search-modal__loading">Searching...</div>
            <div v-else-if="!players.length" class="search-modal__empty">No players found.</div>
            <button v-for="p in players" :key="p.userId" class="search-modal__row" @click="goToPlayer(p.userId)">
              <span class="search-modal__rank" :class="getRankClass(p.ranking)">#{{ p.ranking }}</span>
              <img :src="p.avatarUrl" :alt="p.userName" class="search-modal__avatar" />
              <span class="search-modal__row-main">
                <span class="search-modal__row-title">{{ p.userName }}</span>
                <span class="search-modal__row-sub">
                  <CountryFlag :country="p.country" />
                  <span>{{ p.country }}</span>
                </span>
              </span>
              <span class="search-modal__row-meta">
                <span class="search-modal__stat">{{ formatAp(p.ap) }}</span>
                <span class="search-modal__stat-label">AP</span>
              </span>
            </button>
          </div>
        </section>

        <section class="search-modal__section">
          <button type="button" class="search-modal__section-header" :aria-expanded="!mapsCollapsed"
            @click="mapsCollapsed = !mapsCollapsed">
            <svg class="search-modal__section-chevron"
              :class="{ 'search-modal__section-chevron--collapsed': mapsCollapsed }" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span class="search-modal__section-title">Maps</span>
            <span class="search-modal__section-count">{{ maps.length }}</span>
          </button>
          <div v-if="!mapsCollapsed" class="search-modal__section-body">
            <div v-if="loadingMaps" class="search-modal__loading">Searching...</div>
            <div v-else-if="!mapResults.length" class="search-modal__empty">No maps found.</div>
            <button v-for="r in mapResults" :key="r.map.id" class="search-modal__row" @click="goToMap(r.map.id)">
              <img :src="r.map.coverUrl" :alt="r.map.songName" class="search-modal__cover" />
              <span class="search-modal__row-main">
                <span class="search-modal__row-title">{{ r.map.songName }}</span>
                <span class="search-modal__row-sub">
                  <span>{{ r.map.songAuthor }}</span>
                  <span class="search-modal__row-sub-divider">&middot;</span>
                  <span>mapped by {{ r.map.mapAuthor }}</span>
                </span>
              </span>
              <span class="search-modal__row-meta">
                <template v-if="r.primary">
                  <span class="search-modal__category-dot" :style="{ background: r.accent }" />
                  <ComplexityBadge :complexity="r.primary.complexity" />
                </template>
              </span>
            </button>
          </div>
        </section>
      </template>
    </div>
  </BaseModal>
</template>

<style scoped>
.search-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.search-modal__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-modal__icon {
  position: absolute;
  left: var(--space-md);
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-modal__input {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-md) 0 calc(var(--space-md) + 24px);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.search-modal__input::placeholder {
  color: var(--text-tertiary);
}

.search-modal__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}

.search-modal__hint {
  padding: var(--space-lg) var(--space-md);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-body);
}

.search-modal__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.search-modal__section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-xs) var(--space-sm);
  margin-bottom: var(--space-xs);
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  text-align: left;
  color: var(--text-secondary);
  transition: background 120ms ease, color 120ms ease;
}

.search-modal__section-header:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.search-modal__section-chevron {
  color: var(--text-tertiary);
  transition: transform 150ms ease;
  flex-shrink: 0;
}

.search-modal__section-chevron--collapsed {
  transform: rotate(-90deg);
}

.search-modal__section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.search-modal__section-title {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.search-modal__section-count {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  background: var(--bg-overlay);
  padding: 1px var(--space-xs);
  border-radius: var(--radius-pill);
  min-width: 20px;
  text-align: center;
}

.search-modal__loading,
.search-modal__empty {
  padding: var(--space-md);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-body);
}

.search-modal__row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  color: var(--text-primary);
  transition: background 120ms ease;
}

.search-modal__row:hover {
  background: var(--bg-surface);
}

.search-modal__rank {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}

.search-modal__rank.rank--gold {
  color: var(--tier-gold);
  font-weight: 700;
}

.search-modal__rank.rank--silver {
  color: var(--tier-silver);
  font-weight: 700;
}

.search-modal__rank.rank--bronze {
  color: var(--tier-bronze);
  font-weight: 700;
}

.search-modal__avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  flex-shrink: 0;
}

.search-modal__cover {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  flex-shrink: 0;
}

.search-modal__row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.search-modal__row-title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-modal__row-sub {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-modal__row-sub-divider {
  color: var(--text-tertiary);
}

.search-modal__row-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.search-modal__stat {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.search-modal__stat-label {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.search-modal__category-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .search-modal__row {
    padding: var(--space-sm);
    gap: var(--space-sm);
  }

  .search-modal__rank {
    min-width: 28px;
    font-size: 0.6875rem;
  }

  .search-modal__avatar,
  .search-modal__cover {
    width: 36px;
    height: 36px;
  }

  .search-modal__stat-label {
    display: none;
  }

  .search-modal__row-sub {
    font-size: 0.6875rem;
  }
}
</style>
