<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useCategoryStore } from '@/stores/categories'
import type { SkillCategory, SkillResponse } from '@/types/api/users'
import type { CategoryInfo } from '@/types/display'
import { clamp01 } from '@/utils/math'
import { computed, ref } from 'vue'

const props = defineProps<{
  skill: SkillResponse | null
  loading?: boolean
}>()

const categoryStore = useCategoryStore()

const PADDING = 44
const RADIUS = 100
const SIZE = (RADIUS + PADDING) * 2
const CENTER = SIZE / 2
const RINGS = 4
const ANGLE_OFFSET = -Math.PI / 2

const hoveredIndex = ref<number | null>(null)
const pinnedIndex = ref<number | null>(null)

function infoFor(code: string): CategoryInfo | undefined {
  return (
    categoryStore.getCategoryInfo(code)
    ?? categoryStore.getCategoryInfo(code.replace(/_acc$/, ''))
  )
}

function tierFor(level: number): { label: string; color: string } {
  if (level >= 95) return { label: 'Apex', color: 'var(--tier-diamond)' }
  if (level >= 80) return { label: 'Elite', color: 'var(--tier-platinum)' }
  if (level >= 60) return { label: 'Strong', color: 'var(--tier-gold)' }
  if (level >= 40) return { label: 'Solid', color: 'var(--tier-silver)' }
  if (level >= 20) return { label: 'Novice', color: 'var(--tier-bronze)' }
  return { label: 'Beginner', color: 'var(--text-tertiary)' }
}

const overall = computed<SkillCategory | null>(() => {
  if (!props.skill) return null
  return props.skill.skills.find((s) => s.categoryCode === 'overall') ?? null
})

const overallTier = computed(() =>
  overall.value ? tierFor(overall.value.skillLevel) : null,
)

const categoryEntries = computed(() => {
  if (!props.skill) return []
  return props.skill.skills
    .filter((s) => s.categoryCode !== 'overall' && s.categoryCode !== 'xp')
    .map((s) => ({ ...s, info: infoFor(s.categoryCode) }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
})

const radarAxes = computed(() => {
  const items = categoryEntries.value
  const count = items.length
  if (count === 0) return []
  return items.map((cat, i) => {
    const angle = ANGLE_OFFSET + (2 * Math.PI * i) / count
    const accent = cat.info?.accent ?? 'var(--accent)'
    const normalized = clamp01(cat.skillLevel / 100)
    return {
      label: cat.categoryName,
      value: cat.skillLevel,
      accent,
      components: cat.components,
      x: CENTER + RADIUS * normalized * Math.cos(angle),
      y: CENTER + RADIUS * normalized * Math.sin(angle),
      labelX: CENTER + (RADIUS + 22) * Math.cos(angle),
      labelY: CENTER + (RADIUS + 22) * Math.sin(angle),
    }
  })
})

function polyAt(fraction: number): string {
  const count = radarAxes.value.length
  if (count === 0) return ''
  return Array.from({ length: count }, (_, i) => {
    const angle = ANGLE_OFFSET + (2 * Math.PI * i) / count
    return `${CENTER + RADIUS * fraction * Math.cos(angle)},${CENTER + RADIUS * fraction * Math.sin(angle)}`
  }).join(' ')
}

const gridRings = computed(() =>
  Array.from({ length: RINGS }, (_, i) => polyAt((i + 1) / RINGS)),
)

const spokes = computed(() => {
  const count = radarAxes.value.length
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = ANGLE_OFFSET + (2 * Math.PI * i) / count
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    }
  })
})

const viewHeight = computed(() =>
  Math.max(CENTER, ...radarAxes.value.map((a) => a.labelY)) + PADDING / 2,
)

const dataPolygon = computed(() =>
  radarAxes.value.map((a) => `${a.x},${a.y}`).join(' '),
)

function textAnchor(labelX: number): string {
  if (labelX < CENTER - 2) return 'end'
  if (labelX > CENTER + 2) return 'start'
  return 'middle'
}

function formatRank(rank: number | null): string {
  if (rank == null) return '-'
  return `#${rank.toLocaleString()}`
}

function togglePin(i: number) {
  pinnedIndex.value = pinnedIndex.value === i ? null : i
}

function clearPin() {
  pinnedIndex.value = null
}

const hasNoActivity = computed(() => {
  if (!props.skill) return false
  if (props.skill.skills.length === 0) return true
  return categoryEntries.value.every((c) => c.components.categoryRank == null)
})

const activeIndex = computed(() => pinnedIndex.value ?? hoveredIndex.value)

const active = computed(() =>
  activeIndex.value != null ? radarAxes.value[activeIndex.value] : null,
)

const tooltipStyle = computed(() => {
  if (!active.value) return undefined
  const left = (active.value.x / SIZE) * 100
  const top = (active.value.y / viewHeight.value) * 100
  const placeAbove = active.value.y > CENTER
  return {
    left: `clamp(calc(var(--tip-w) / 2), ${left}%, calc(100% - var(--tip-w) / 2))`,
    top: `${top}%`,
    transform: placeAbove
      ? 'translate(-50%, calc(-100% - 12px))'
      : 'translate(-50%, 12px)',
  }
})
</script>

<template>
  <div class="skill-panel">
    <template v-if="loading && !skill">
      <SkeletonLoader variant="text" width="120px" height="1.5rem" />
      <SkeletonLoader variant="card" class="skill-panel__radar-skeleton" />
    </template>

    <template v-else-if="skill">
      <p v-if="overall" class="skill-panel__headline">
        <span class="skill-panel__headline-value">{{ overall.skillLevel.toFixed(1) }}</span>
        <span v-if="overallTier" class="skill-panel__headline-tier" :style="{ color: overallTier.color }">
          {{ overallTier.label }}
        </span>
        <HintTooltip text="Your average skill between all categories." />
      </p>

      <p v-if="hasNoActivity" class="caption">Play a ranked map to start your skill rating</p>

      <div v-else-if="radarAxes.length >= 3" class="skill-panel__radar">
        <svg :viewBox="`0 0 ${SIZE} ${viewHeight}`" class="skill-panel__svg">
          <polygon
            v-for="(ring, i) in gridRings"
            :key="'r' + i"
            :points="ring"
            class="skill-panel__ring"
          />

          <line
            v-for="(pt, i) in spokes"
            :key="'s' + i"
            :x1="CENTER"
            :y1="CENTER"
            :x2="pt.x"
            :y2="pt.y"
            class="skill-panel__spoke"
          />

          <polygon :points="dataPolygon" class="skill-panel__data" />

          <g v-for="(axis, i) in radarAxes" :key="'l' + i">
            <text
              :x="axis.labelX"
              :y="axis.labelY - 4"
              :text-anchor="textAnchor(axis.labelX)"
              dominant-baseline="auto"
              class="skill-panel__axis-label"
            >{{ axis.label }}</text>
            <text
              :x="axis.labelX"
              :y="axis.labelY + 10"
              :text-anchor="textAnchor(axis.labelX)"
              :fill="axis.accent"
              dominant-baseline="auto"
              class="skill-panel__axis-value"
            >{{ axis.value.toFixed(1) }}</text>
          </g>

          <g
            v-for="(axis, i) in radarAxes"
            :key="'d' + i"
            class="skill-panel__dot-group"
            :class="{ 'skill-panel__dot-group--pinned': pinnedIndex === i }"
            @mouseenter="hoveredIndex = i"
            @mouseleave="hoveredIndex = null"
            @focus="hoveredIndex = i"
            @blur="hoveredIndex = null"
            @click.stop="togglePin(i)"
            @keydown.enter.prevent="togglePin(i)"
            @keydown.space.prevent="togglePin(i)"
            tabindex="0"
            role="button"
            :aria-pressed="pinnedIndex === i"
            :aria-label="`${axis.label} skill ${axis.value.toFixed(1)}`"
          >
            <circle
              :cx="axis.x"
              :cy="axis.y"
              r="12"
              fill="transparent"
              class="skill-panel__dot-hit"
            />
            <circle
              :cx="axis.x"
              :cy="axis.y"
              :r="activeIndex === i ? 5 : 3"
              :fill="axis.accent"
              class="skill-panel__dot"
            />
          </g>
        </svg>

        <div
          v-if="active"
          class="skill-panel__tooltip"
          :class="{ 'skill-panel__tooltip--pinned': pinnedIndex != null }"
          :style="{ ...tooltipStyle, '--card-accent': active.accent }"
          role="tooltip"
          @click.stop
        >
          <button
            v-if="pinnedIndex != null"
            type="button"
            class="skill-panel__tooltip-close"
            aria-label="Close breakdown"
            @click="clearPin"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>

          <div class="field-label">{{ active.label }}</div>
          <div class="skill-panel__tooltip-level">{{ active.value.toFixed(1) }}</div>

          <div class="skill-panel__tooltip-meta">
            {{ formatRank(active.components.categoryRank) }}
            <span class="skill-panel__tooltip-of">of {{ active.components.activePlayers.toLocaleString() }}</span>
          </div>

          <div class="skill-panel__bars">
            <div class="skill-panel__bar">
              <div class="field-label">Rank</div>
              <div class="skill-panel__bar-track">
                <div class="skill-panel__bar-fill" :style="{ width: `${active.components.rank}%` }" />
              </div>
              <div class="skill-panel__bar-value">{{ active.components.rank.toFixed(0) }}</div>
            </div>
            <div class="skill-panel__bar">
              <div class="field-label">Sustained</div>
              <div class="skill-panel__bar-track">
                <div class="skill-panel__bar-fill" :style="{ width: `${active.components.sustained}%` }" />
              </div>
              <div class="skill-panel__bar-value">{{ active.components.sustained.toFixed(0) }}</div>
            </div>
            <div class="skill-panel__bar">
              <div class="field-label">Peak</div>
              <div class="skill-panel__bar-track">
                <div class="skill-panel__bar-fill" :style="{ width: `${active.components.peak}%` }" />
              </div>
              <div class="skill-panel__bar-value">{{ active.components.peak.toFixed(0) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.skill-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  max-width: 360px;
}

.skill-panel__radar-skeleton {
  aspect-ratio: 288 / 227;
}

.skill-panel__headline {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0;
}

.skill-panel__headline-value {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  line-height: 1;
  color: var(--text-primary);
}

.skill-panel__headline-tier {
  font-size: var(--text-body);
  font-weight: 600;
}

.skill-panel__radar {
  position: relative;
  width: 100%;
}

.skill-panel__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.skill-panel__ring,
.skill-panel__spoke {
  fill: none;
  stroke: var(--bg-overlay);
  stroke-width: 0.5;
}

.skill-panel__data {
  fill: var(--page-accent, var(--accent));
  fill-opacity: 0.15;
  stroke: var(--page-accent, var(--accent));
  stroke-width: 1;
  stroke-linejoin: round;
}

.skill-panel__dot {
  transition: r var(--dur-fast) var(--ease-out);
}

.skill-panel__dot-group {
  cursor: pointer;
  outline: none;
}

.skill-panel__dot-group:focus-visible .skill-panel__dot {
  r: 5;
}

.skill-panel__dot-hit {
  pointer-events: all;
}

.skill-panel__axis-label {
  fill: var(--text-secondary);
  font-size: 9px;
  font-family: var(--font-sans);
  font-weight: 500;
  pointer-events: none;
}

.skill-panel__axis-value {
  font-size: 9px;
  font-family: var(--font-mono);
  font-weight: 500;
  pointer-events: none;
}

.skill-panel__tooltip {
  --card-accent: var(--text-secondary);
  --tip-w: min(280px, 100%);
  position: absolute;
  z-index: 10;
  width: var(--tip-w);
  padding: var(--space-md);
  background: var(--bg-overlay);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  pointer-events: none;
}

.skill-panel__tooltip--pinned {
  pointer-events: auto;
}

.skill-panel__tooltip-close {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  display: flex;
  padding: var(--space-xs);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-btn);
  transition: color var(--dur-fast) var(--ease-out);
}

.skill-panel__tooltip-close:hover {
  color: var(--text-primary);
}

.skill-panel__tooltip-level {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  line-height: 1;
  color: var(--card-accent);
}

.skill-panel__tooltip-meta {
  font-size: var(--text-caption);
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.skill-panel__tooltip-of {
  color: var(--text-secondary);
}

.skill-panel__bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.skill-panel__bar {
  display: grid;
  grid-template-columns: 76px 1fr 28px;
  align-items: center;
  gap: var(--space-sm);
}

.skill-panel__bar-track {
  height: 4px;
  background: var(--bg-base);
  border-radius: var(--radius-xs);
  overflow: hidden;
}

.skill-panel__bar-fill {
  height: 100%;
  background: var(--card-accent);
}

.skill-panel__bar-value {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-primary);
  text-align: right;
}
</style>
