<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useCategoryStore } from '@/stores/categories'
import type { ScoreFeedEntry } from '@/types/display'
import { formatRelativeDate, formatAccuracy } from '@/utils/formatters'
import { getRankClass } from '@/utils/ranking'
import { computed } from 'vue'

const props = defineProps<{
  entry: ScoreFeedEntry
  now: number
  compact?: boolean
}>()

const emit = defineEmits<{
  select: [entry: ScoreFeedEntry]
}>()

const categoryStore = useCategoryStore()

const accent = computed(() => categoryStore.getAccent(props.entry.categoryCode))
const relativeTime = computed(() => {
  void props.now
  return formatRelativeDate(props.entry.timeSet)
})

const totalMistakes = computed(() => props.entry.misses + props.entry.badCuts)
const hasObstacleHits = computed(() => props.entry.wallHits > 0 || props.entry.bombHits > 0)
const isFC = computed(() => totalMistakes.value === 0 && !hasObstacleHits.value)
const isXFC = computed(() => totalMistakes.value === 0 && hasObstacleHits.value)

</script>

<template>
  <div class="feed-card" :style="{ '--card-accent': accent }"
    role="button" tabindex="0" @click="emit('select', entry)" @keydown.enter.self="emit('select', entry)">
    <span class="rank feed-card__rank" :class="getRankClass(entry.rank)">#{{ entry.rank }}</span>
    <CoverImage v-if="entry.coverUrl" :src="entry.coverUrl" :alt="entry.mapName" :size="48"
      :fallback-src="entry.coverFallbackUrl ?? null" />

    <div class="feed-card__info">
      <span class="feed-card__title">
        <SongTitle class="feed-card__song" :class="{ 'feed-card__song--sub': entry.mapSubName }"
          :name="entry.mapName" :sub-name="entry.mapSubName" />
        <DifficultyBadge :difficulty="entry.rawDifficulty ?? entry.difficulty" />
      </span>
      <span class="feed-card__line">
        <span class="feed-card__player" @click.stop>
          <UserChip :user="entry.player" size="sm" tooltip hide-clan />
        </span>
        <span class="feed-card__mapper">Mapped by {{ entry.mapAuthor }}</span>
      </span>
      <span v-if="!compact" class="feed-card__line">{{ entry.artistName }}</span>
    </div>

    <div class="feed-card__stats">
      <span class="feed-card__accuracy">{{ formatAccuracy(entry.accuracy) }}</span>
      <span class="feed-card__ap">{{ entry.ap.toFixed(2) }} AP</span>
      <span class="feed-card__line feed-card__line--end">
        <template v-if="!compact">
          <span>{{ entry.score.toLocaleString() }}</span>
          <span>115s: {{ entry.streak115 }}</span>
          <span v-if="isFC" class="feed-card__fc">FC</span>
          <span v-else-if="isXFC" class="feed-card__xfc">FC with hits</span>
          <span v-else class="feed-card__misses">{{ totalMistakes }} missed</span>
        </template>
        <span v-if="entry.modifiers.length">{{ entry.modifiers.join(', ') }}</span>
        <span>{{ relativeTime }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.feed-card {
  display: grid;
  grid-template-columns: 2.5rem 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 64px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.feed-card:hover,
.feed-card:focus-visible {
  background: var(--bg-elevated);
  outline: none;
}

.feed-card__rank {
  text-align: right;
}

.feed-card__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.feed-card__player {
  flex-shrink: 0;
  max-width: 60%;
  color: var(--text-primary);
}

.feed-card__line {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  max-width: 100%;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.feed-card__line--end {
  justify-content: flex-end;
  grid-column: 1 / -1;
}

.feed-card__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  max-width: 100%;
}

.feed-card__song {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.feed-card__song--sub {
  color: var(--text-secondary);
}

.feed-card__song--sub :deep(.song-title__name-inline) {
  color: var(--text-primary);
}

.feed-card__mapper {
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-card__stats {
  display: grid;
  grid-template-columns: auto 6rem;
  align-items: baseline;
  gap: 2px var(--space-sm);
  text-align: right;
  font-family: var(--font-mono);
}

.feed-card__accuracy {
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--card-accent);
}

.feed-card__ap {
  font-weight: 500;
  color: var(--text-primary);
}

.feed-card__fc {
  color: var(--success);
}

.feed-card__xfc {
  color: var(--warning);
}

.feed-card__misses {
  color: var(--error);
}

@media (max-width: 767px) {
  .feed-card {
    grid-template-columns: 2.5rem 48px minmax(0, 1fr);
    gap: var(--space-sm) var(--space-md);
  }

  .feed-card__stats {
    grid-column: 1 / -1;
    grid-template-columns: auto auto 1fr;
    text-align: left;
  }

  .feed-card__line--end {
    grid-column: auto;
  }
}
</style>
