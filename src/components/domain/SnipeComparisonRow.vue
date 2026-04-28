<script setup lang="ts">
import GlowImage from '@/components/common/GlowImage.vue'
import { useCategoryStore } from '@/stores/categories'
import type { SnipeComparisonResponse } from '@/types/api/snipe'
import type { ScoreResponse } from '@/types/api/users'
import { formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import CategoryBadge from './CategoryBadge.vue'
import ComplexityBadge from './ComplexityBadge.vue'
import DifficultyBadge from './DifficultyBadge.vue'

const props = defineProps<{
  comparison: SnipeComparisonResponse
  sniperName: string
  targetName: string
}>()

const emit = defineEmits<{
  'open-detail': [score: ScoreResponse]
}>()

const router = useRouter()
const categoryStore = useCategoryStore()

const map = computed(() => props.comparison.mapDifficulty)
const sniper = computed(() => props.comparison.sniperScore)
const target = computed(() => props.comparison.targetScore)

const categoryCode = computed(() => categoryStore.getCategoryCode(map.value.categoryId))
const categoryAccent = computed(() =>
  categoryCode.value ? categoryStore.getAccent(categoryCode.value) : 'var(--accent)',
)

const accDelta = computed(() => (target.value.accuracy - sniper.value.accuracy) * 100)
const apDelta = computed(() => target.value.ap - sniper.value.ap)

const tugFillPercent = computed(() => {
  const t = target.value.accuracy
  if (!t) return 0
  return Math.max(0, Math.min(100, (sniper.value.accuracy / t) * 100))
})

interface SnipeSide {
  kind: 'sniper' | 'target'
  score: ScoreResponse
  name: string
  roleLabel: string
}

const sides = computed<SnipeSide[]>(() => [
  { kind: 'sniper', score: sniper.value, name: props.sniperName, roleLabel: 'You' },
  { kind: 'target', score: target.value, name: props.targetName, roleLabel: 'Target' },
])

const mapTarget = computed(() => ({
  path: `/maps/${map.value.mapId}`,
  query: { difficultyId: map.value.id },
}))

const mapHref = computed(() => router.resolve(mapTarget.value).href)

function navigateToMap(e: MouseEvent) {
  if (e.ctrlKey || e.metaKey || e.button === 1) return
  e.preventDefault()
  router.push(mapTarget.value)
}
</script>

<template>
  <article class="snipe-row" :style="{ '--row-accent': categoryAccent }">
    <a class="snipe-row__quadrant snipe-row__map" :href="mapHref" @click="navigateToMap">
      <GlowImage :src="map.coverUrl" :alt="map.songName" :size="56" />
      <div class="snipe-row__map-info">
        <div class="snipe-row__title-line">
          <span class="snipe-row__category-dot" />
          <span class="snipe-row__song" :title="map.songName">{{ map.songName }}</span>
        </div>
        <span class="snipe-row__artist">
          {{ map.songAuthor }}<template v-if="map.songSubName"> · {{ map.songSubName }}</template>
        </span>
        <span class="snipe-row__mapper">{{ map.mapAuthor }}</span>
        <div class="snipe-row__badges">
          <DifficultyBadge :difficulty="map.difficulty" />
          <ComplexityBadge v-if="map.complexity != null" :complexity="map.complexity" />
          <CategoryBadge v-if="categoryCode" :category="categoryCode" />
          <span v-if="map.characteristic && map.characteristic !== 'Standard'"
            class="snipe-row__characteristic">{{ map.characteristic }}</span>
        </div>
      </div>
    </a>

    <div class="snipe-row__scores">
      <button v-for="side in sides" :key="side.kind" type="button"
        class="snipe-row__quadrant snipe-row__score" :class="`snipe-row__score--${side.kind}`"
        @click="emit('open-detail', side.score)">
        <span class="snipe-row__score-label">
          <span class="snipe-row__player-name">{{ side.name }}</span>
          <span class="snipe-row__role-pill" :class="`snipe-row__role-pill--${side.kind}`">{{ side.roleLabel }}</span>
        </span>
        <span class="snipe-row__accuracy">{{ (side.score.accuracy * 100).toFixed(2) }}<span class="snipe-row__pct">%</span></span>
        <span class="snipe-row__points">{{ side.score.score.toLocaleString() }} pts</span>
        <span class="snipe-row__ap">{{ side.score.ap.toFixed(2) }} AP</span>
        <span class="snipe-row__meta">
          <span>#{{ side.score.rank }}</span>
          <span class="snipe-row__sep">·</span>
          <span>{{ formatRelativeDate(side.score.timeSet) }}</span>
        </span>
      </button>

      <div class="snipe-row__delta">
        <span class="snipe-row__delta-acc">+{{ accDelta.toFixed(2) }}%</span>
        <span class="snipe-row__delta-secondary">
          <span>+{{ comparison.scoreDelta.toLocaleString() }} pts</span>
          <span class="snipe-row__sep">·</span>
          <span>+{{ apDelta.toFixed(2) }} AP</span>
        </span>
        <div class="snipe-row__tug" :aria-label="`You are at ${tugFillPercent.toFixed(1)}% of target accuracy`">
          <div class="snipe-row__tug-fill" :style="{ width: `${tugFillPercent}%` }" />
          <div class="snipe-row__tug-target" />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.snipe-row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 2fr);
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-left: 2px solid transparent;
  border-radius: var(--radius-card);
  transition: border-color 120ms ease;
}

.snipe-row:hover {
  border-left-color: var(--row-accent);
}

.snipe-row__quadrant {
  display: flex;
  align-items: stretch;
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  padding: var(--space-sm);
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  color: inherit;
  font: inherit;
  transition: background-color 120ms ease;
  min-width: 0;
}

.snipe-row__quadrant:hover {
  background: color-mix(in srgb, var(--row-accent) 8%, transparent);
}

.snipe-row__map {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
}

.snipe-row__map-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.snipe-row__title-line {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.snipe-row__category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--row-accent);
  flex-shrink: 0;
}

.snipe-row__song {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snipe-row__artist {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snipe-row__mapper {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snipe-row__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  margin-top: var(--space-xs);
}


.snipe-row__characteristic {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.snipe-row__scores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--space-sm) var(--space-md);
  align-items: stretch;
}

.snipe-row__score {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.snipe-row__score--sniper {
  align-items: flex-end;
  text-align: right;
}

.snipe-row__score--sniper .snipe-row__score-label,
.snipe-row__score--sniper .snipe-row__meta {
  flex-direction: row-reverse;
}

.snipe-row__score-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.snipe-row__role-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px var(--space-xs);
  border-radius: var(--radius-pill);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid currentColor;
}

.snipe-row__role-pill--sniper {
  color: var(--text-tertiary);
}

.snipe-row__role-pill--target {
  color: var(--row-accent);
}

.snipe-row__player-name {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.snipe-row__accuracy {
  font-family: var(--font-mono);
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.1;
}

.snipe-row__score--target .snipe-row__accuracy {
  color: var(--row-accent);
}

.snipe-row__pct {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin-left: 2px;
}

.snipe-row__points {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.snipe-row__ap {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.snipe-row__meta {
  display: flex;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.snipe-row__sep {
  color: var(--text-tertiary);
}

.snipe-row__delta {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--bg-overlay);
  margin-top: var(--space-xs);
}

.snipe-row__delta-acc {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 600;
  color: var(--row-accent);
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.snipe-row__delta-secondary {
  display: flex;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.snipe-row__tug {
  position: relative;
  width: 100%;
  height: 6px;
  background: var(--bg-overlay);
  border-radius: 3px;
  margin-top: var(--space-xs);
  overflow: hidden;
}

.snipe-row__tug-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--row-accent) 50%, transparent),
    var(--row-accent)
  );
  border-radius: 3px;
  transition: width 240ms ease-out;
}

.snipe-row__tug-target {
  position: absolute;
  top: -2px;
  bottom: -2px;
  right: 0;
  width: 2px;
  background: var(--row-accent);
}

@media (max-width: 768px) {
  .snipe-row {
    grid-template-columns: 1fr;
  }

  .snipe-row__scores {
    grid-template-columns: 1fr 1fr;
  }

  .snipe-row__accuracy {
    font-size: 1.5rem;
  }

  .snipe-row__delta-acc {
    font-size: 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .snipe-row__tug-fill {
    transition: none;
  }
}
</style>
