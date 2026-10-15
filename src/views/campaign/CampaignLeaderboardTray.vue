<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { onImageError, pickAvatarFallback, pickAvatarUrl } from '@/utils/media'
import { useMediaQuery } from '@/composables/useMediaQuery'
import type {
  CampaignDetailResponse,
  CampaignLeaderboardEntry,
  CampaignNodeScoreEntry,
} from '@/types/api/campaigns'
import type { PlayerRef } from '@/types/api/common'
import type { CampaignLeaderboardBoard } from '@/types/enums'
import { formatAccuracy, formatRelativeDate } from '@/utils/formatters'
import { formatDifficulty } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { computed, onUnmounted, ref, watch } from 'vue'
import { parseApiError } from '@/api/client'

const props = defineProps<{
  campaign: CampaignDetailResponse
  nodeId: string | null
  spectatingUserId?: string | null
}>()

const emit = defineEmits<{
  'update:nodeId': [id: string | null]
  spectate: [player: PlayerRef]
}>()

const PAGE_SIZE = 50

const isDesktop = useMediaQuery('(min-width: 861px)')
const open = ref(false)

watch(isDesktop, (desktop) => {
  if (!desktop) open.value = false
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

watch([open, isDesktop], ([o, desktop]) => {
  document.body.style.overflow = o && !desktop ? 'hidden' : ''
})

const BOARD_TABS = [
  { key: 'COMPLETIONS', label: 'First to finish' },
  { key: 'AVG_ACCURACY', label: 'Avg acc' },
  { key: 'AVG_AP', label: 'Avg AP' },
  { key: 'PROGRESS', label: 'Progress' },
]

const activeBoard = ref<CampaignLeaderboardBoard>('COMPLETIONS')
const search = ref('')
const page = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)
const entries = ref<CampaignLeaderboardEntry[]>([])
const nodeEntries = ref<CampaignNodeScoreEntry[]>([])

let fetchSeq = 0
let loadedKey = ''

const drillNode = computed(() =>
  props.nodeId
    ? (props.campaign.difficulties.find((d) => d.id === props.nodeId) ?? null)
    : null,
)

const appliedSearch = computed(() =>
  activeBoard.value === 'PROGRESS' && !props.nodeId ? search.value.trim() : '',
)

const queryKey = computed(
  () =>
    `${props.campaign.id}|${props.nodeId ?? ''}|${activeBoard.value}|${appliedSearch.value}|${page.value}`,
)

async function loadBoard() {
  if (!props.campaign.id) return
  const seq = ++fetchSeq
  const key = queryKey.value
  loading.value = true
  error.value = null
  try {
    const { getCampaignLeaderboard, getCampaignNodeLeaderboard } = await import('@/api/campaigns')
    if (props.nodeId) {
      const result = await getCampaignNodeLeaderboard(props.campaign.id, props.nodeId, {
        page: page.value,
        size: PAGE_SIZE,
      })
      if (seq !== fetchSeq) return
      nodeEntries.value = result.content
      totalPages.value = result.totalPages || 1
    } else {
      const result = await getCampaignLeaderboard(props.campaign.id, {
        board: activeBoard.value,
        search: appliedSearch.value || undefined,
        page: page.value,
        size: PAGE_SIZE,
      })
      if (seq !== fetchSeq) return
      entries.value = result.content
      totalPages.value = result.totalPages || 1
    }
    loadedKey = key
  } catch (err) {
    if (seq !== fetchSeq) return
    error.value = parseApiError(err, 'Failed to load the leaderboard').message
  } finally {
    if (seq === fetchSeq) loading.value = false
  }
}

watch([activeBoard, () => props.nodeId, appliedSearch], () => {
  page.value = 0
})

watch(
  [queryKey, open],
  () => {
    if ((open.value || props.nodeId) && queryKey.value !== loadedKey) void loadBoard()
  },
  { immediate: true },
)

watch(
  () => props.nodeId,
  (id) => {
    if (id && isDesktop.value) open.value = true
  },
)

const emptyMessage = computed(() => {
  if (props.nodeId) return 'No scores on this map yet.'
  if (activeBoard.value === 'COMPLETIONS') return 'No completions yet.'
  if (activeBoard.value === 'PROGRESS') {
    return appliedSearch.value ? 'No players match that search.' : "No one's playing yet."
  }
  return 'No qualifying scores yet.'
})

function pct(value?: number): string {
  return value != null ? formatAccuracy(value) : '-'
}

function apText(value?: number): string {
  return value != null ? `${value.toFixed(2)} AP` : '-'
}

interface BoardRow {
  player: PlayerRef
  rank: number | null
  sub: string | null
  progress: { pct: number; count: string } | null
  pill: { text: string; done: boolean } | null
  stat: string | null
  statTitle?: string
  statDate?: boolean
  secondary: string | null
}

function boardRow(entry: CampaignLeaderboardEntry): BoardRow {
  const base = { player: entry.player, rank: entry.rank ?? null, sub: null, progress: null, pill: null, stat: null, secondary: null }
  if (activeBoard.value === 'PROGRESS') {
    const total = entry.totalNodes ?? 0
    const done = entry.completedNodes ?? 0
    return {
      ...base,
      progress: { pct: total ? Math.min(100, Math.round((done / total) * 100)) : 0, count: `${done}/${total}` },
      pill: {
        text: entry.progressStatus === 'COMPLETED' ? 'Completed' : 'In progress',
        done: entry.progressStatus === 'COMPLETED',
      },
    }
  }
  if (activeBoard.value === 'COMPLETIONS') {
    return {
      ...base,
      stat: entry.completedAt ? formatRelativeDate(entry.completedAt) : '-',
      statTitle: entry.completedAt ? new Date(entry.completedAt).toLocaleString() : undefined,
      statDate: true,
    }
  }
  const acc = activeBoard.value === 'AVG_ACCURACY'
  return {
    ...base,
    sub: entry.nodesCounted != null
      ? `avg of ${entry.nodesCounted} ${entry.nodesCounted === 1 ? 'node' : 'nodes'}`
      : null,
    stat: acc ? pct(entry.averageAccuracy) : apText(entry.averageAp),
    secondary: acc ? apText(entry.averageAp) : pct(entry.averageAccuracy),
  }
}

const rows = computed<BoardRow[]>(() =>
  props.nodeId
    ? nodeEntries.value.map((entry) => ({
      player: entry.player,
      rank: entry.rank,
      sub: `${apText(entry.ap)}${entry.score != null ? ` · ${entry.score.toLocaleString()}` : ''}`,
      progress: null,
      pill: null,
      stat: pct(entry.accuracy),
      secondary: null,
    }))
    : entries.value.map(boardRow),
)

function goBack() {
  emit('update:nodeId', null)
}

function isSpectating(player: PlayerRef): boolean {
  return !!props.spectatingUserId && props.spectatingUserId === player.id
}
</script>

<template>
  <div class="lb" :class="{ 'lb--open': open, 'lb--desktop': isDesktop }">
    <button
      v-if="!open"
      type="button"
      class="lb__opener"
      aria-label="Open leaderboard"
      @click="open = true"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      Leaderboard
    </button>

    <div v-if="open && !isDesktop" class="lb__backdrop" aria-hidden="true" @click="open = false" />

    <aside v-if="open" class="lb__panel" aria-label="Campaign leaderboard">
      <header class="lb__head">
        <template v-if="drillNode">
          <button type="button" class="lb__back" aria-label="Back to campaign boards" @click="goBack">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div class="lb__head-meta">
            <h2 class="lb__title">
              <SongTitle :name="drillNode.songName" :sub-name="drillNode.songSubName" />
            </h2>
            <p class="lb__subtitle">{{ formatDifficulty(drillNode.difficulty) }} · map scores</p>
          </div>
        </template>
        <h2 v-else class="lb__title">Leaderboard</h2>
        <button
          type="button"
          class="lb__collapse"
          :aria-label="isDesktop ? 'Collapse leaderboard' : 'Close leaderboard'"
          @click="open = false"
        >
          <svg
            v-if="isDesktop"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <svg
            v-else
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <BaseTabs
        v-if="!drillNode"
        class="lb__tabs"
        :tabs="BOARD_TABS"
        :model-value="activeBoard"
        @update:model-value="activeBoard = $event as CampaignLeaderboardBoard"
      />

      <SearchBox
        v-if="!drillNode && activeBoard === 'PROGRESS'"
        class="lb__search"
        :model-value="search"
        placeholder="Search players..."
        @update:model-value="search = $event"
      />

      <div class="lb__list">
        <template v-if="loading">
          <SkeletonLoader v-for="i in 8" :key="i" variant="table-row" />
        </template>

        <div v-else-if="error" class="lb__error">
          <p role="alert">{{ error }}</p>
          <BaseButton size="sm" @click="loadBoard">Retry</BaseButton>
        </div>

        <EmptyState v-else-if="rows.length === 0" :message="emptyMessage" />

        <button
          v-for="row in rows"
          v-else
          :key="row.player.id"
          type="button"
          class="lb__row"
          :class="{
            'lb__row--tall': !!row.progress,
            'lb__row--active': isSpectating(row.player),
          }"
          :aria-current="isSpectating(row.player) ? 'true' : undefined"
          :title="`View ${row.player.name}'s run`"
          @click="emit('spectate', row.player)"
        >
          <span v-if="row.rank != null" class="lb__rank" :class="getRankClass(row.rank)">#{{ row.rank }}</span>
          <img
            class="lb__avatar"
            :src="pickAvatarUrl(row.player)"
            :alt="row.player.name"
            loading="lazy"
            decoding="async"
            @error="onImageError(pickAvatarFallback(row.player))($event)"
          />
          <span class="lb__who">
            <span class="lb__name">
              {{ row.player.name }}
              <CountryFlag v-if="row.player.country" :country="row.player.country" />
            </span>
            <span v-if="row.sub" class="lb__sub">{{ row.sub }}</span>
            <span v-if="row.progress" class="lb__progress">
              <span class="lb__progress-track" aria-hidden="true">
                <span class="lb__progress-fill" :style="{ transform: `scaleX(${row.progress.pct / 100})` }" />
              </span>
              <span class="lb__progress-count">{{ row.progress.count }}</span>
            </span>
          </span>
          <span v-if="row.pill" class="lb__pill" :class="{ 'lb__pill--done': row.pill.done }">{{ row.pill.text }}</span>
          <span v-else-if="row.secondary" class="lb__stat-col">
            <span class="lb__stat">{{ row.stat }}</span>
            <span class="lb__stat-secondary">{{ row.secondary }}</span>
          </span>
          <span v-else-if="row.stat" class="lb__stat" :class="{ 'lb__stat--date': row.statDate }"
            :title="row.statTitle">{{ row.stat }}</span>
        </button>
      </div>

      <footer v-if="!loading && !error && totalPages > 1" class="lb__foot">
        <PaginationControls
          :page="page + 1"
          :total-pages="totalPages"
          @update:page="page = $event - 1"
        />
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.lb__opener {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-sm) 12px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  cursor: pointer;
  pointer-events: auto;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}

.lb__opener:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.lb__panel {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  bottom: var(--space-md);
  z-index: 6;
  display: flex;
  flex-direction: column;
  width: min(340px, calc(100vw - var(--space-md) * 2));
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  pointer-events: auto;
  animation: lb-slide-in 200ms ease-out;
}

@keyframes lb-slide-in {
  from {
    opacity: 0;
    transform: translateX(12px);
  }
}

.lb__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.lb__head-meta {
  flex: 1;
  min-width: 0;
}

.lb__title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb__head-meta .lb__title {
  flex: none;
}

.lb__subtitle {
  margin: 1px 0 0;
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.lb__back,
.lb__collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition:
    color 120ms ease,
    background 120ms ease;
}

.lb__back:hover,
.lb__collapse:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.lb__tabs {
  padding: 0 var(--space-sm);
}

.lb__tabs :deep(.base-tabs__tab) {
  padding: var(--space-sm) 6px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.lb__search {
  margin: var(--space-sm) var(--space-md) 0;
}

.lb__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
}

.lb__list::-webkit-scrollbar {
  width: 5px;
}

.lb__list::-webkit-scrollbar-thumb {
  background: var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.lb__row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px var(--space-sm);
  font: inherit;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  color: inherit;
  cursor: pointer;
  transition:
    background 120ms ease,
    border-color 120ms ease;
}

.lb__row:nth-child(even) {
  background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
}

.lb__row:hover {
  background: var(--bg-elevated);
}

.lb__row:focus-visible {
  outline: none;
  border-color: var(--page-accent, var(--accent));
}

.lb__row--active,
.lb__row--active:nth-child(even) {
  background: var(--bg-elevated);
  border-color: var(--page-accent, var(--accent));
}

.lb__rank {
  flex-shrink: 0;
  min-width: 30px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.lb__rank.rank--gold { color: var(--tier-gold); font-weight: 700; }
.lb__rank.rank--silver { color: var(--tier-silver); font-weight: 700; }
.lb__rank.rank--bronze { color: var(--tier-bronze); font-weight: 700; }

.lb__avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  background: var(--bg-elevated);
}

.lb__who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lb__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb__sub {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb__stat {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: var(--text-primary);
}

.lb__stat--date {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.lb__stat-col {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.lb__stat-secondary {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
}

.lb__progress {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.lb__progress-track {
  position: relative;
  flex: 1;
  max-width: 110px;
  height: 3px;
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.lb__progress-fill {
  position: absolute;
  inset: 0;
  background: var(--page-accent, var(--accent));
  transform-origin: left center;
}

.lb__progress-count {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.lb__pill {
  flex-shrink: 0;
  padding: 2px 6px;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.lb__pill--done {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 45%, transparent);
  background: color-mix(in srgb, var(--success) 10%, transparent);
}

.lb__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
}

.lb__error p {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
  text-align: center;
  line-height: 1.4;
}

.lb__foot {
  display: flex;
  justify-content: center;
  padding: var(--space-sm);
  border-top: 1px solid var(--bg-overlay);
}

.lb__backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

@media (max-width: 860px) {
  .lb__opener {
    position: fixed;
    top: auto;
    right: var(--space-md);
    bottom: var(--space-md);
    z-index: 89;
  }

  .lb__panel {
    position: fixed;
    top: auto;
    right: 0;
    left: 0;
    bottom: 0;
    z-index: 91;
    width: auto;
    height: min(75vh, 640px);
    border-radius: var(--radius-modal) var(--radius-modal) 0 0;
    border-bottom: none;
    background: var(--bg-elevated);
    animation: lb-sheet-in 200ms ease-out;
  }

  @keyframes lb-sheet-in {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .lb__panel {
    animation: none;
  }
}
</style>
