<script setup lang="ts">
import MilestoneHolderTooltip from '@/components/domain/MilestoneHolderTooltip.vue';
import type { MilestoneCompletionResponse } from '@/types/api/milestones';
import { tierColor as getTierColor, formatPercent } from '@/utils/constants';
import MilestoneBadge from '@/components/domain/MilestoneBadge.vue';
import { resolveMilestoneGlyph, type MilestoneGlyphKey } from '@/utils/milestoneIcons';
import { formatDifficulty } from '@/utils/mappers';
import { computed, ref } from 'vue';

const props = defineProps<{
  milestone: MilestoneCompletionResponse
  compact?: boolean
  loggedIn?: boolean
  glyph?: MilestoneGlyphKey
  pinnable?: boolean
  pinned?: boolean
  pinDisabled?: boolean
  pinPending?: boolean
}>()

const emit = defineEmits<{ 'pin-toggle': [milestoneId: string] }>()

const tierColor = computed(() => getTierColor(props.milestone.tier))
const isCompleted = computed(() => props.milestone.userCompleted === true)
const isNotCompleted = computed(() => !!props.loggedIn && !isCompleted.value)
const isMilestoneType = computed(() => props.milestone.type?.toUpperCase() === 'MILESTONE')
const isApex = computed(() => props.milestone.tier?.toUpperCase() === 'APEX')
const badgeGlyph = computed(() => props.glyph ?? resolveMilestoneGlyph(props.milestone.iconGroup))
const hasScoreInfo = computed(() => isCompleted.value && !!props.milestone.achievedWithScoreId && !!accuracy.value)
const typeLabel = computed(() => isMilestoneType.value ? 'milestone' : 'achievement')
const blTooltip = computed(() => `This ${typeLabel.value} is exclusive to players with the BeatLeader mod.`)

const expanded = ref(false)

const showPin = computed(() => !!props.pinnable && isCompleted.value)

const pinTitle = computed(() => {
  if (props.pinned) return 'Unpin milestone'
  if (props.pinDisabled) return 'Unpin a milestone to free a slot first'
  return 'Pin milestone'
})

function onPinClick(event: Event) {
  event.stopPropagation()
  if (props.pinPending) return
  if (!props.pinned && props.pinDisabled) return
  emit('pin-toggle', props.milestone.milestoneId)
}

const completionText = computed(() => {
  return `${formatPercent(props.milestone.completionPercentage ?? 0)}% of players`
})

const showHolderTooltip = computed(() => (props.milestone.completions ?? 0) > 0 && (props.milestone.completions ?? 0) < 50)

const accuracy = computed(() => {
  if (!props.milestone.score || !props.milestone.maxScore) return null
  return ((props.milestone.score / props.milestone.maxScore) * 100).toFixed(2)
})

const progressPercent = computed(() => {
  if (props.milestone.userNormalizedProgress == null) return null
  return props.milestone.userNormalizedProgress * 100
})

const progressBarWidth = computed(() => Math.min(100, progressPercent.value ?? 0))

const completedAtFormatted = computed(() => {
  if (!props.milestone.userCompletedAt) return null
  return new Date(props.milestone.userCompletedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
})

function toggleExpand() {
  if (props.compact && hasScoreInfo.value) {
    expanded.value = !expanded.value
  }
}

function handleMilestoneCoverError(event: Event) {
  const img = event.currentTarget as HTMLImageElement
  const cdn = props.milestone.cdnCoverUrl
  const upstream = props.milestone.coverUrl
  if (cdn && upstream && img.src !== upstream) {
    img.src = upstream
  }
}
</script>

<template>
  <div class="milestone-detail" :class="{
    'milestone-detail--compact': compact,
    'milestone-detail--expandable': compact && hasScoreInfo,
    'milestone-detail--expanded': expanded,
    'milestone-detail--dim': isNotCompleted,
    'milestone-detail--apex': isApex,
  }" :style="{ '--tier-color': tierColor }">
    <div class="milestone-detail__header" :tabindex="compact && hasScoreInfo ? 0 : undefined"
      :role="compact && hasScoreInfo ? 'button' : undefined"
      :aria-expanded="compact && hasScoreInfo ? expanded : undefined" @click="toggleExpand"
      @keydown.enter="toggleExpand" @keydown.space.prevent="toggleExpand">
      <MilestoneBadge class="milestone-detail__badge" :glyph="badgeGlyph" :tier="milestone.tier"
        :size="compact ? 44 : 52" :completed="isCompleted" />
      <div class="milestone-detail__title-group">
        <div class="milestone-detail__tier-row">
          <span class="milestone-detail__tier">{{ milestone.tier }}</span>
          <span class="milestone-detail__kind">{{ typeLabel }}</span>
          <span v-if="milestone.blExclusive" class="milestone-detail__bl-badge" :title="blTooltip">BL</span>
        </div>
        <h4 class="milestone-detail__title">
          {{ milestone.title }}
          <span v-if="compact && milestone.description" class="milestone-detail__inline-desc">
            <span class="milestone-detail__inline-desc-sep">· </span>{{ milestone.description }}
          </span>
        </h4>
      </div>
      <div v-if="compact" class="milestone-detail__compact-meta">
        <span class="milestone-detail__xp">{{ milestone.xp }} XP</span>
        <span v-if="progressPercent != null && !isCompleted" class="milestone-detail__progress-label">{{
          formatPercent(progressPercent) }}%</span>
        <span class="milestone-detail__completion">{{ completionText }}</span>
        <MilestoneHolderTooltip v-if="showHolderTooltip" :milestone-id="milestone.milestoneId"
          :completions="milestone.completions ?? 0" />
        <span v-if="isCompleted" class="milestone-detail__completed-inline">
          <svg class="milestone-detail__check-icon" viewBox="0 0 20 20" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="4 10 8 14 16 6" />
          </svg>
          <span v-if="completedAtFormatted" class="milestone-detail__completed-date">{{ completedAtFormatted }}</span>
        </span>
        <button v-if="showPin" class="milestone-detail__pin"
          :class="{
            'milestone-detail__pin--active': pinned,
            'milestone-detail__pin--disabled': !pinned && pinDisabled,
          }"
          :aria-label="pinTitle" :title="pinTitle" :aria-pressed="!!pinned" :disabled="pinPending"
          @click="onPinClick">
          <svg v-if="pinned" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
            stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 4h6l-1 5 4 3v3h-5v6l-1 1-1-1v-6H6v-3l4-3-1-5z" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 4h6l-1 5 4 3v3h-5v6l-1 1-1-1v-6H6v-3l4-3-1-5z" />
          </svg>
        </button>
        <svg v-if="hasScoreInfo" class="milestone-detail__chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 8 10 12 14 8" />
        </svg>
      </div>
    </div>

    <div v-if="compact && progressPercent != null && !isCompleted"
      class="milestone-detail__progress milestone-detail__progress--compact">
      <div class="milestone-detail__progress-bar" :style="{ '--progress': progressBarWidth / 100 }" />
    </div>

    <div v-if="compact && hasScoreInfo" class="milestone-detail__dropdown"
      :class="{ 'milestone-detail__dropdown--open': expanded }">
      <div class="milestone-detail__dropdown-inner">
        <div class="milestone-detail__score">
          <img v-if="milestone.cdnCoverUrl || milestone.coverUrl"
            :src="milestone.cdnCoverUrl ?? milestone.coverUrl" :alt="milestone.songName ?? 'Cover'"
            class="milestone-detail__cover" loading="lazy" decoding="async"
            @error="handleMilestoneCoverError($event)" />
          <div class="milestone-detail__score-info">
            <span class="milestone-detail__score-text">
              <strong>{{ accuracy }}%</strong> on
              <em>{{ milestone.songName ?? 'Unknown Song' }}{{ milestone.songAuthor ? ` - ${milestone.songAuthor}` : ''
              }}</em>
              <template v-if="milestone.difficulty"> ({{ formatDifficulty(milestone.difficulty) }})</template>
            </span>
            <span v-if="milestone.mapAuthor" class="milestone-detail__mapper">Mapped by {{ milestone.mapAuthor }}</span>
            <span v-if="completedAtFormatted" class="milestone-detail__date">{{ completedAtFormatted }}</span>
          </div>
        </div>
      </div>
    </div>

    <template v-if="!compact">
      <p class="milestone-detail__desc">{{ milestone.description }}</p>

      <div class="milestone-detail__stats">
        <span class="milestone-detail__xp">{{ milestone.xp }} XP</span>
        <span class="milestone-detail__completion-row">
          <span class="milestone-detail__completion">{{ completionText }}</span>
          <MilestoneHolderTooltip v-if="showHolderTooltip" :milestone-id="milestone.milestoneId"
            :completions="milestone.completions ?? 0" />
        </span>
      </div>

      <div v-if="progressPercent != null && !isCompleted" class="milestone-detail__progress-row">
        <div class="milestone-detail__progress">
          <div class="milestone-detail__progress-bar" :style="{ '--progress': progressBarWidth / 100 }" />
        </div>
        <span class="milestone-detail__progress-text">{{ formatPercent(progressPercent) }}%</span>
      </div>

      <div v-if="hasScoreInfo" class="milestone-detail__score">
        <img v-if="milestone.coverUrl" :src="milestone.coverUrl" :alt="milestone.songName ?? 'Cover'"
          class="milestone-detail__cover" loading="lazy" decoding="async" />
        <div class="milestone-detail__score-info">
          <span class="milestone-detail__score-text">
            Completed with <strong>{{ accuracy }}%</strong> on
            <em>{{ milestone.songName ?? 'Unknown Song' }}{{ milestone.songAuthor ? ` - ${milestone.songAuthor}` : ''
            }}</em>
            <template v-if="milestone.difficulty"> ({{ formatDifficulty(milestone.difficulty) }})</template>
          </span>
          <span v-if="milestone.mapAuthor" class="milestone-detail__mapper">Mapped by {{ milestone.mapAuthor }}</span>
          <span v-if="completedAtFormatted" class="milestone-detail__date">{{ completedAtFormatted }}</span>
        </div>
      </div>

      <div v-else-if="isCompleted && completedAtFormatted" class="milestone-detail__completed-note">
        <svg class="milestone-detail__check-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="4 10 8 14 16 6" />
        </svg>
        Completed on {{ completedAtFormatted }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.milestone-detail {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg) var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.milestone-detail__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.milestone-detail:not(.milestone-detail--compact) .milestone-detail__badge {
  animation: milestone-badge-in 240ms cubic-bezier(0.25, 1, 0.5, 1);
}

@keyframes milestone-badge-in {
  from {
    transform: scale(0.82);
  }
}

.milestone-detail--dim {
  opacity: 0.5;
}

.milestone-detail--apex {
  border-color: color-mix(in srgb, var(--tier-color) 30%, var(--bg-overlay));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tier-color) 5%, var(--bg-surface)) 0%,
    var(--bg-surface) 100%
  );
}

.milestone-detail--apex .milestone-detail__title {
  color: var(--tier-color);
}

.milestone-detail__title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.milestone-detail__tier-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.milestone-detail__tier {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tier-color);
}

.milestone-detail__kind {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.milestone-detail__bl-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0 4px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--info) 15%, transparent);
  color: var(--info);
  line-height: 1.4;
}

.milestone-detail__title {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.milestone-detail__desc {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.milestone-detail__stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.milestone-detail__xp {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-primary);
}

.milestone-detail__completion {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.milestone-detail__completion-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.milestone-detail__score {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-elevated);
  border-radius: var(--radius-btn);
}

.milestone-detail__cover {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-btn);
  object-fit: cover;
  flex-shrink: 0;
}

.milestone-detail__score-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.milestone-detail__score-text {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.4;
}

.milestone-detail__score-text strong {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.milestone-detail__score-text em {
  font-style: normal;
  color: var(--text-primary);
}

.milestone-detail__mapper,
.milestone-detail__date {
  font-size: 0.625rem;
  color: var(--text-tertiary);
}

.milestone-detail__date {
  font-family: var(--font-mono);
}

.milestone-detail__completed-note {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--success);
  margin-top: var(--space-xs);
}

.milestone-detail__check-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.milestone-detail--compact {
  padding: var(--space-sm) var(--space-md);
  gap: 0;
}

.milestone-detail--compact .milestone-detail__header {
  flex: 1;
  min-width: 0;
  align-items: center;
}

.milestone-detail--compact .milestone-detail__title-group {
  flex-direction: row;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
  overflow: hidden;
}

.milestone-detail--compact .milestone-detail__title {
  font-size: var(--text-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}

.milestone-detail__inline-desc {
  font-weight: 400;
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}

.milestone-detail__compact-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-shrink: 0;
  margin-left: auto;
}

.milestone-detail__completed-inline {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--success);
}

.milestone-detail__completed-date {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  white-space: nowrap;
}

.milestone-detail__compact-meta .milestone-detail__check-icon {
  color: var(--success);
}

.milestone-detail__pin {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background-color 120ms ease;
}

.milestone-detail__pin:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.milestone-detail__pin--active {
  color: var(--page-accent, var(--accent));
  border-color: color-mix(in srgb, var(--page-accent, var(--accent)) 50%, var(--bg-overlay));
}

.milestone-detail__pin--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.milestone-detail__pin--disabled:hover {
  color: var(--text-tertiary);
  border-color: var(--bg-overlay);
  background: transparent;
}

.milestone-detail__chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform 150ms ease;
}

.milestone-detail--expanded .milestone-detail__chevron {
  transform: rotate(180deg);
}

.milestone-detail--expandable .milestone-detail__header {
  cursor: pointer;
}

.milestone-detail--expandable:hover {
  border-color: var(--text-tertiary);
}

.milestone-detail__dropdown {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms ease;
}

.milestone-detail__dropdown--open {
  grid-template-rows: 1fr;
}

.milestone-detail__dropdown-inner {
  overflow: hidden;
}

.milestone-detail__dropdown--open .milestone-detail__dropdown-inner {
  padding-top: var(--space-sm);
}

.milestone-detail__dropdown .milestone-detail__cover {
  width: 40px;
  height: 40px;
}

.milestone-detail__progress-label {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--tier-color);
  font-weight: 500;
}

.milestone-detail__progress {
  position: relative;
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
}

.milestone-detail__progress--compact {
  margin-top: var(--space-xs);
}

.milestone-detail__progress-bar {
  width: 100%;
  height: 100%;
  background: var(--tier-color);
  border-radius: 2px;
  transform-origin: left;
  transform: scaleX(var(--progress, 0));
  transition: transform 300ms ease-out;
}

.milestone-detail__progress-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.milestone-detail__progress-row .milestone-detail__progress {
  flex: 1;
}

.milestone-detail__progress-text {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 767px) {
  .milestone-detail--compact {
    padding: var(--space-md);
    gap: var(--space-xs);
  }

  .milestone-detail--compact .milestone-detail__header {
    flex-wrap: wrap;
  }

  .milestone-detail--compact .milestone-detail__title {
    white-space: normal;
    font-size: var(--text-card-title);
  }

  .milestone-detail--compact .milestone-detail__title-group {
    flex-direction: column;
    gap: 2px;
  }

  .milestone-detail__inline-desc {
    display: block;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    font-size: var(--text-caption);
    line-height: 1.4;
    margin-top: 2px;
  }

  .milestone-detail__inline-desc-sep {
    display: none;
  }

  .milestone-detail__compact-meta {
    width: 100%;
    padding-top: var(--space-xs);
    padding-left: calc(20px + var(--space-md));
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .milestone-detail__tier {
    font-size: var(--text-caption);
  }

  .milestone-detail:not(.milestone-detail--compact) {
    padding: var(--space-md);
  }

  .milestone-detail__desc {
    font-size: var(--text-body);
  }

  .milestone-detail__score-text {
    font-size: var(--text-body);
  }
}

@media (prefers-reduced-motion: reduce) {

  .milestone-detail__chevron,
  .milestone-detail__dropdown,
  .milestone-detail__progress-bar {
    transition: none;
  }

  .milestone-detail:not(.milestone-detail--compact) .milestone-detail__badge {
    animation: none;
  }
}
</style>
