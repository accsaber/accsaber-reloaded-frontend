<script setup lang="ts">
import MissionRewards from '@/components/domain/MissionRewards.vue'
import type { MissionResponse } from '@/types/api/missions'
import {
  formatMissionCountdown,
  formatMissionValue,
  missionProgressLabel,
  missionUnitLabel,
} from '@/utils/missions'
import { computed } from 'vue'

const props = defineProps<{
  mission: MissionResponse
  now: number
}>()

const emit = defineEmits<{
  contributors: []
}>()

const URGENT_MS = 24 * 60 * 60 * 1000

const target = computed(() => props.mission.targetValue ?? 0)
const progress = computed(() => props.mission.progressValue ?? 0)
const contributors = computed(() => props.mission.contributors ?? 0)
const yours = computed(() => props.mission.yourContribution ?? 0)

const pct = computed(() =>
  target.value > 0 ? Math.min(100, (progress.value / target.value) * 100) : 0,
)

const yoursPct = computed(() =>
  target.value > 0 ? Math.min(pct.value, (yours.value / target.value) * 100) : 0,
)

const progressLabel = computed(() =>
  missionProgressLabel(props.mission.type, progress.value, target.value),
)

const remainingMs = computed(() => {
  if (!props.mission.expiresAt) return null
  return new Date(props.mission.expiresAt).getTime() - props.now
})

const state = computed<'active' | 'completed' | 'expired'>(() => {
  if (props.mission.status === 'completed') return 'completed'
  const closed = props.mission.endsWithWeek && (remainingMs.value ?? 1) <= 0
  return props.mission.status === 'active' && !closed ? 'active' : 'expired'
})

const deadline = computed(() => {
  if (state.value !== 'active' || !props.mission.endsWithWeek || !props.mission.expiresAt) return null
  return formatMissionCountdown(props.mission.expiresAt, props.now)
})

const urgent = computed(() =>
  deadline.value !== null && (remainingMs.value ?? Number.POSITIVE_INFINITY) <= URGENT_MS,
)

const windowLabel = computed(() => {
  if (props.mission.week == null) return null
  return props.mission.endsWithWeek ? `Week ${props.mission.week} only` : 'Runs all event'
})

const contributorsLabel = computed(() =>
  contributors.value === 1 ? '1 contributor' : `${formatMissionValue(contributors.value)} contributors`,
)

const yourShare = computed(() =>
  yours.value > 0 ? missionUnitLabel(props.mission.type, yours.value) : null,
)
</script>

<template>
  <article class="cm" :class="[`cm--${state}`, { 'cm--urgent': urgent }]">
    <header class="cm__head">
      <h3 class="cm__name">{{ mission.name }}</h3>
      <span v-if="windowLabel" class="cm__window">{{ windowLabel }}</span>
      <MissionRewards :xp-reward="mission.xpReward" :item-reward="mission.itemReward" :size="32" />
    </header>

    <p v-if="mission.description" class="cm__desc">{{ mission.description }}</p>

    <div class="cm__bar">
      <div class="cm__track" role="progressbar" :aria-valuenow="progress" :aria-valuemin="0"
        :aria-valuemax="target">
        <div class="cm__fill" :style="{ width: `${pct}%` }" />
        <div v-if="yoursPct > 0" class="cm__yours" :style="{ width: `${yoursPct}%` }" />
      </div>
      <span class="cm__count">{{ progressLabel }}</span>
    </div>

    <div class="cm__meta">
      <button v-if="contributors > 0" type="button" class="cm__contributors" aria-haspopup="dialog"
        @click="emit('contributors')">
        {{ contributorsLabel }}
      </button>
      <span v-else class="cm__empty">No contributions yet.</span>

      <span v-if="yourShare" class="cm__yours-label">your share {{ yourShare }}</span>

      <span v-if="state === 'completed'" class="cm__flag cm__flag--done">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Complete
      </span>
      <span v-else-if="state === 'expired'" class="cm__flag cm__flag--missed">Expired, no rewards</span>
      <span v-else-if="deadline" class="cm__flag cm__flag--deadline">Ends in {{ deadline }}</span>
    </div>
  </article>
</template>

<style scoped>
.cm {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--bg-overlay);
}

.cm:last-child {
  border-bottom: none;
}

.cm--expired {
  opacity: 0.6;
}

.cm__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.cm__name {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.cm__window {
  flex-shrink: 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.cm--urgent .cm__window {
  color: var(--warning);
}

.cm__desc {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.cm__bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: 2px;
}

.cm__track {
  position: relative;
  flex: 1;
  height: 7px;
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
  overflow: hidden;
}

.cm__fill,
.cm__yours {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: var(--radius-pill);
  transition: width 300ms ease;
}

.cm__fill {
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 40%, var(--bg-overlay));
}

.cm__yours {
  background: var(--page-accent, var(--accent));
}

.cm__count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.cm__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  font-size: 0.8rem;
}

.cm__contributors {
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: inherit;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 1px solid var(--bg-overlay);
  transition: color 120ms ease, border-color 120ms ease;
}

.cm__contributors:hover {
  color: var(--text-primary);
  border-bottom-color: var(--text-tertiary);
}

.cm__yours-label {
  color: var(--page-accent, var(--accent));
  font-variant-numeric: tabular-nums;
}

.cm__flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-weight: 600;
  color: var(--text-tertiary);
}

.cm__flag--done {
  color: var(--success);
}

.cm__flag--missed {
  color: var(--error);
}

.cm__flag--deadline {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.cm--urgent .cm__flag--deadline {
  color: var(--warning);
}

.cm__empty {
  color: var(--text-tertiary);
  font-style: italic;
}

@media (prefers-reduced-motion: reduce) {
  .cm__fill,
  .cm__yours {
    transition: none;
  }
}
</style>
