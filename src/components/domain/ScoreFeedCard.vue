<script setup lang="ts">
import GlowImage from '@/components/common/GlowImage.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import PlayerTooltipTrigger from '@/components/domain/PlayerTooltipTrigger.vue'
import { useCategoryStore } from '@/stores/categories'
import type { ScoreFeedEntry } from '@/types/display'
import { formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  entry: ScoreFeedEntry
}>()

const emit = defineEmits<{
  select: [entry: ScoreFeedEntry]
}>()

const router = useRouter()
const categoryStore = useCategoryStore()

const accent = computed(() => categoryStore.getAccent(props.entry.categoryCode))
const categoryName = computed(() =>
  categoryStore.getCategoryInfo(props.entry.categoryCode)?.name ?? props.entry.categoryCode,
)
const relativeTime = computed(() => formatRelativeDate(props.entry.timeSet))

const totalMistakes = computed(() => props.entry.misses + props.entry.badCuts)
const hasObstacleHits = computed(() => props.entry.wallHits > 0 || props.entry.bombHits > 0)
const isFC = computed(() => totalMistakes.value === 0 && !hasObstacleHits.value)
const isXFC = computed(() => totalMistakes.value === 0 && hasObstacleHits.value)

function handleClick() {
  emit('select', props.entry)
}

function goToPlayer() {
  router.push(`/players/${props.entry.userId}`)
}
</script>

<template>
  <div class="feed-card" :style="{ '--card-accent': accent }" @click="handleClick">
    <div class="feed-card__player-tab" @click.stop="goToPlayer">
      <PlayerTooltipTrigger
        :user-id="entry.userId"
        :user-name="entry.userName"
        :avatar-url="entry.avatarUrl"
        :country="entry.country"
      >
        <img
          v-if="entry.avatarUrl"
          :src="entry.avatarUrl"
          :alt="entry.userName"
          class="feed-card__avatar"
          loading="lazy"
        />
        <span class="feed-card__player-name">{{ entry.userName }}</span>
        <CountryFlag :country="entry.country" />
      </PlayerTooltipTrigger>
    </div>

    <div class="feed-card__body">
      <span class="feed-card__rank">#{{ entry.rank }}</span>

      <div class="feed-card__cover">
        <GlowImage v-if="entry.coverUrl" :src="entry.coverUrl" :alt="entry.mapName" :size="48" />
      </div>

      <div class="feed-card__info">
        <span class="feed-card__song">{{ entry.mapName }}</span>
        <span class="feed-card__meta">{{ entry.artistName }} - {{ entry.mapAuthor }}</span>
        <span class="feed-card__row3">
          <span class="feed-card__diff">{{ entry.difficulty }}</span>
          <span class="feed-card__dot" />
          <span class="feed-card__category">{{ categoryName }}</span>
          <template v-if="entry.modifiers.length">
            <span class="feed-card__dot" />
            <span class="feed-card__mods">{{ entry.modifiers.join(', ') }}</span>
          </template>
        </span>
      </div>

      <div class="feed-card__stats">
        <div class="feed-card__stats-top">
          <span class="feed-card__accuracy">{{ (entry.accuracy * 100).toFixed(2) }}%</span>
          <span class="feed-card__ap">{{ entry.ap.toFixed(2) }} <span class="feed-card__ap-label">AP</span></span>
        </div>
        <div class="feed-card__stats-mid">
          <span class="feed-card__score">{{ entry.score.toLocaleString() }}</span>
        </div>
        <div class="feed-card__stats-bottom">
          <span class="feed-card__streak">115s: {{ entry.streak115 }}</span>
          <span v-if="isFC" class="feed-card__fc">FC</span>
          <span v-else-if="isXFC" class="feed-card__xfc">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            FC
          </span>
          <span v-else class="feed-card__misses">{{ totalMistakes }}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
          <span class="feed-card__time">{{ relativeTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed-card {
  position: relative;
  margin-top: 24px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: visible;
  cursor: pointer;
  transition: border-color 120ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.feed-card:hover {
  border-color: var(--text-tertiary);
  transform: scale(1.005);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.feed-card:has(.feed-card__player-tab:hover) {
  z-index: 10;
}

.feed-card__player-tab {
  position: absolute;
  bottom: 100%;
  left: var(--space-sm);
  display: inline-flex;
  border-radius: var(--radius-card) var(--radius-card) 0 0;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-bottom: 1px solid var(--bg-elevated);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  z-index: 1;
}

.feed-card__player-tab:hover {
  z-index: 10000;
}

.feed-card__avatar {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-btn);
  object-fit: cover;
  flex-shrink: 0;
}

:deep(.tooltip-trigger) {
  gap: var(--space-xs);
}

.feed-card__player-name {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.feed-card__body {
  display: grid;
  grid-template-columns: 32px 48px 1fr auto;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-left: 2px solid var(--card-accent, var(--accent));
}

.feed-card__rank {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  white-space: nowrap;
}

.feed-card__cover {
  flex-shrink: 0;
}

.feed-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.feed-card__song {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-card__meta {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-card__row3 {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.feed-card__diff {
  color: var(--text-secondary);
  font-weight: 500;
}

.feed-card__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
}

.feed-card__category {
  color: var(--card-accent, var(--accent));
  font-weight: 500;
  white-space: nowrap;
}

.feed-card__mods {
  font-size: 0.65rem;
  color: var(--text-tertiary);
  padding: 1px 5px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.feed-card__stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.feed-card__stats-top {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.feed-card__accuracy {
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--card-accent, var(--accent));
}

.feed-card__ap {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.feed-card__ap-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-weight: 400;
}

.feed-card__stats-mid {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.feed-card__score {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.feed-card__stats-bottom {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
}

.feed-card__streak {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.feed-card__fc {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--success);
}

.feed-card__xfc {
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--warning);
}

.feed-card__misses {
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-mono);
  color: var(--error);
}

.feed-card__time {
  color: var(--text-tertiary);
}

@media (max-width: 767px) {
  .feed-card__body {
    grid-template-columns: 24px 40px 1fr;
    grid-template-rows: auto auto;
    gap: var(--space-sm);
  }

  .feed-card__rank {
    font-size: var(--text-caption);
    grid-row: 1 / 3;
  }

  .feed-card__cover {
    grid-row: 1 / 3;
  }

  .feed-card__info {
    grid-column: 3;
    grid-row: 1;
  }

  .feed-card__stats {
    grid-column: 3;
    grid-row: 2;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-sm);
  }

  .feed-card__stats-top,
  .feed-card__stats-mid,
  .feed-card__stats-bottom {
    gap: var(--space-xs);
  }

  .feed-card__accuracy {
    font-size: var(--text-body);
  }
}
</style>
