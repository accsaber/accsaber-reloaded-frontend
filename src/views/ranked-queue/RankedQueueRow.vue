<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { useCategoryStore } from '@/stores/categories'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { DIFF_COLOR } from '@/utils/constants'
import { formatRelativeDate } from '@/utils/formatters'
import { formatDifficulty } from '@/utils/mappers'
import { buildMapRoute } from '@/utils/mapRoute'
import { computed } from 'vue'

const props = defineProps<{
  entry: PublicMapDifficultyResponse
}>()

const categoryStore = useCategoryStore()

const categoryName = computed(() => {
  const code = categoryStore.getCategoryCode(props.entry.categoryId) ?? 'overall'
  return categoryStore.getCategoryInfo(code)?.name ?? code
})

const to = computed(() => buildMapRoute({
  beatsaverCode: props.entry.beatsaverCode,
  mapId: props.entry.mapId,
  difficulty: props.entry.difficulty,
  difficultyId: props.entry.id,
  characteristic: props.entry.characteristic,
}))

const rating = computed(() => (props.entry.rankUpvotes ?? 0) - (props.entry.rankDownvotes ?? 0))
const ratingTone = computed(() => (rating.value > 0 ? 'up' : rating.value < 0 ? 'down' : 'neutral'))

const VERDICTS = {
  PASSED: { label: 'Criteria Pass', tone: 'up' },
  FAILED: { label: 'Criteria Fail', tone: 'down' },
  UNAVAILABLE: { label: 'Criteria Unavailable', tone: 'warn' },
  PENDING: { label: 'Criteria Pending', tone: 'neutral' },
} as const

const criteria = computed(() => {
  const staff = props.entry.criteriaStatus
  if (staff === 'PASSED' || staff === 'FAILED') return VERDICTS[staff]
  const auto = props.entry.autoCriteriaStatus
  if (auto === 'PASSED' || auto === 'FAILED' || auto === 'UNAVAILABLE') {
    return { label: `Auto ${VERDICTS[auto].label}`, tone: VERDICTS[auto].tone }
  }
  return VERDICTS.PENDING
})

const IMPORT_CUTOFF_MS = Date.parse('2026-04-19T18:00:00Z')

const dateLabel = computed(() =>
  Date.parse(props.entry.createdAt) < IMPORT_CUTOFF_MS ? 'Imported' : formatRelativeDate(props.entry.createdAt),
)
</script>

<template>
  <RouterLink class="queue-row" :to="to">
    <CoverImage class="queue-row__cover" :source="entry" :alt="entry.songName" :size="80" />

    <div class="queue-row__info">
      <SongTitle class="queue-row__song card-title" layout="stacked" :name="entry.songName"
        :sub-name="entry.songSubName" />
      <div class="queue-row__meta">
        <span class="queue-row__artist">{{ entry.songAuthor }}</span>
        <span class="queue-row__sep">/</span>
        <span class="queue-row__mapper">mapped by <strong>{{ entry.mapAuthor }}</strong></span>
      </div>
      <div class="queue-row__pills">
        <span class="queue-row__diff" :style="{ color: DIFF_COLOR[entry.difficulty] ?? 'var(--text-secondary)' }">
          {{ formatDifficulty(entry.difficulty) }}
        </span>
        <span class="queue-row__dot" />
        <span class="queue-row__category">{{ categoryName }}</span>
        <span class="queue-row__dot" />
        <span class="queue-row__criteria" :class="`queue-row--${criteria.tone}`">{{ criteria.label }}</span>
      </div>
    </div>

    <div class="queue-row__right">
      <div class="queue-row__votes">
        <span class="queue-row__rating" :class="`queue-row--${ratingTone}`">
          {{ rating > 0 ? '+' : '' }}{{ rating }}
        </span>
        <span class="queue-row__vote queue-row--up">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {{ entry.rankUpvotes ?? 0 }}
        </span>
        <span v-if="entry.rankNeutrals != null" class="queue-row__vote queue-row--neutral">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 12 18 12" />
          </svg>
          {{ entry.rankNeutrals }}
        </span>
        <span class="queue-row__vote queue-row--down">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {{ entry.rankDownvotes ?? 0 }}
        </span>
      </div>
      <span class="queue-row__date">{{ dateLabel }}</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.queue-row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: inherit;
  text-decoration: none;
  min-height: 88px;
  transition: border-color 120ms ease;
}

.queue-row:hover {
  border-color: var(--text-tertiary);
}

.queue-row:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}

.queue-row__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.queue-row__song {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-row__meta {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  min-width: 0;
}

.queue-row__artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-row__mapper strong {
  color: var(--text-primary);
  font-weight: 500;
}

.queue-row__sep {
  color: var(--text-tertiary);
}

.queue-row__pills {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
  font-size: var(--text-caption);
}

.queue-row__diff {
  font-weight: 600;
}

.queue-row__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.queue-row__category,
.queue-row__criteria {
  font-weight: 500;
}

.queue-row__category {
  color: var(--text-secondary);
}

.queue-row--up {
  color: var(--success);
}

.queue-row--down {
  color: var(--error);
}

.queue-row--warn {
  color: var(--warning);
}

.queue-row--neutral {
  color: var(--text-tertiary);
}

.queue-row__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.queue-row__votes {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.queue-row__rating {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
}

.queue-row__vote {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
}

.queue-row__date {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .queue-row {
    grid-template-columns: 56px 1fr;
    gap: var(--space-sm);
    min-height: 0;
    padding: var(--space-sm);
  }

  .queue-row__cover {
    width: 56px !important;
    height: 56px !important;
  }

  .queue-row__right {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-xs);
    border-top: 1px solid var(--bg-overlay);
  }
}
</style>
