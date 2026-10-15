<script setup lang="ts">
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapChartStats from '@/components/domain/MapChartStats.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import { onImageError, pickCoverFallback } from '@/utils/media'
import ComplexityPin from '@/views/staff/ranking/complexity/ComplexityPin.vue'
import ScenarioCell from '@/views/staff/ranking/complexity/ScenarioCell.vue'
import RankDetailLinks from '@/views/staff/ranking/detail/RankDetailLinks.vue'
import RankDetailStatus from '@/views/staff/ranking/detail/RankDetailStatus.vue'
import { computed } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  voteData: VoteListResponse | null
  coverUrl: string
  categoryCode: string
  isHeadRanking: boolean
  isRanking: boolean
}>()

const emit = defineEmits<{
  editCategory: []
  editComplexity: []
}>()

const categoryStore = useCategoryStore()

const onCoverError = computed(() => onImageError(pickCoverFallback(props.difficulty)))
const scoreCurveId = computed(() => categoryStore.byCode.get(props.categoryCode)?.scoreCurve?.id ?? null)
const scriptDelta = computed(() => {
  const { scriptComplexity, complexity } = props.difficulty
  return scriptComplexity == null || complexity == null ? null : scriptComplexity - complexity
})

function editCategory() {
  if (props.isHeadRanking) emit('editCategory')
}
</script>

<template>
  <div class="hero">
    <img class="hero__cover" :src="coverUrl" :alt="difficulty.songName" fetchpriority="high" decoding="async"
      @error="onCoverError" />

    <div class="hero__info">
      <span class="hero__category" :class="{ 'hero__category--editable': isHeadRanking }"
        :role="isHeadRanking ? 'button' : undefined" :tabindex="isHeadRanking ? 0 : undefined"
        @click="editCategory" @keydown.enter="editCategory">
        <CategoryBadge :category="categoryCode" size="sm" />
        <svg v-if="isHeadRanking" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </span>
      <h1 class="hero__song-name">
        <SongTitle layout="stacked" :name="difficulty.songName" :sub-name="difficulty.songSubName" />
      </h1>
      <p class="hero__song-meta">{{ difficulty.songAuthor }} - Mapped by {{ difficulty.mapAuthor }}</p>

      <div class="hero__primary">
        <DifficultyBadge :difficulty="difficulty.difficulty" />
        <span v-if="difficulty.characteristic !== 'Standard'" class="hero__characteristic">
          {{ difficulty.characteristic }}
        </span>
        <span v-if="isHeadRanking || difficulty.complexity != null" class="hero__complexity">
          <span v-if="isHeadRanking" class="hero__complexity-editable" @click="emit('editComplexity')">
            <ComplexityBadge v-if="difficulty.complexity != null" :complexity="difficulty.complexity" />
            <span v-else class="hero__complexity-unset">Set complexity</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
          <ComplexityBadge v-else-if="difficulty.complexity != null" :complexity="difficulty.complexity" />
          <ComplexityPin v-if="difficulty.complexityPinned" />
        </span>
        <span v-if="difficulty.scriptComplexity != null" class="hero__script-chip"
          :title="difficulty.scriptVersion ?? undefined">
          <span class="hero__script-chip-label">Script</span>
          <ScenarioCell :value="difficulty.scriptComplexity" :delta="scriptDelta" :decimals="1" emphasis />
        </span>
      </div>

      <MapChartStats :source="difficulty" class="hero__chart-stats" />

      <RankDetailStatus :difficulty="difficulty" :vote-data="voteData" :is-ranking="isRanking" />

      <RankDetailLinks :difficulty="difficulty" :score-curve-id="scoreCurveId" />
    </div>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  gap: var(--space-xl);
  padding: var(--space-xl);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
  margin-bottom: var(--space-lg);
}

.hero__cover {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-card);
}

.hero__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.hero__category {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: -2px;
  color: var(--text-tertiary);
}

.hero__category--editable {
  cursor: pointer;
  border-radius: var(--radius-btn);
  transition: opacity 120ms ease;
}

.hero__category--editable:hover,
.hero__category--editable:focus-visible {
  opacity: 0.8;
  outline: none;
}

.hero__song-name {
  font-size: var(--text-section);
}

.hero__song-meta {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
}

.hero__primary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md) var(--space-lg);
  margin-top: var(--space-md);
}

.hero__chart-stats {
  margin-top: var(--space-sm);
}

.hero__characteristic {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

.hero__complexity {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.hero__complexity-editable {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  border-radius: var(--radius-pill);
  padding-right: var(--space-xs);
  transition: background 120ms ease;
}

.hero__complexity-editable:hover {
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
}

.hero__complexity-editable svg {
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 120ms ease;
}

.hero__complexity-editable:hover svg {
  opacity: 1;
}

.hero__complexity-unset {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-style: italic;
}

.hero__script-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xs) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  line-height: 1.3;
}

.hero__script-chip-label {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .hero {
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }
}
</style>
