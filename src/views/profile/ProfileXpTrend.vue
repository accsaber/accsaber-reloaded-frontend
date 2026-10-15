<script setup lang="ts">
import type { StatsDiffResponse } from '@/types/api/users'
import { computed } from 'vue'

const props = defineProps<{
  statsDiff: StatsDiffResponse | null
}>()

const SOURCES = [
  { key: 'scoreXpDiff', label: 'Score XP', mod: 'score' },
  { key: 'milestoneXpDiff', label: 'Milestone XP', mod: 'milestone' },
  { key: 'milestoneSetBonusXpDiff', label: 'Set Bonus XP', mod: 'set-bonus' },
  { key: 'missionXpDiff', label: 'Mission XP', mod: 'mission' },
  { key: 'campaignXpDiff', label: 'Campaign XP', mod: 'campaign' },
  { key: 'eventXpDiff', label: 'Event XP', mod: 'event' },
  { key: 'clanXpDiff', label: 'Clan XP', mod: 'clan' },
] as const

const rows = computed(() =>
  SOURCES.map((s) => ({ ...s, value: props.statsDiff?.[s.key] ?? 0 })),
)

const totalXpDiff = computed(() => rows.value.reduce((sum, r) => sum + r.value, 0))

const direction = computed<'up' | 'down' | null>(() => {
  if (!totalXpDiff.value) return null
  return totalXpDiff.value > 0 ? 'up' : 'down'
})

function withSign(value: number | null | undefined): string {
  const n = Math.round(value ?? 0)
  return n >= 0 ? `+${n}` : `${n}`
}
</script>

<template>
  <span v-if="direction" class="xp-trend" :class="`xp-trend--${direction}`">
    {{ direction === 'up' ? '\u25B2' : '\u25BC' }}
    {{ withSign(totalXpDiff) }} XP
    <span class="xp-trend__info" tabindex="0" aria-label="XP breakdown">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span class="xp-trend__tooltip" role="tooltip">
        <span v-for="row in rows" :key="row.key" class="xp-trend__row">
          <span class="xp-trend__label">{{ row.label }}</span>
          <span class="xp-trend__value" :class="`xp-trend__value--${row.mod}`">{{ withSign(row.value) }}</span>
        </span>
      </span>
    </span>
  </span>
</template>

<style scoped>
.xp-trend {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.xp-trend--up {
  color: var(--xp-up);
}

.xp-trend--down {
  color: var(--xp-down);
}

.xp-trend__info {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--text-tertiary);
  cursor: help;
  transition: color 120ms ease;
}

.xp-trend__info:hover,
.xp-trend__info:focus-visible {
  color: var(--text-secondary);
}

.xp-trend__tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.xp-trend__tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--bg-overlay);
}

.xp-trend__info:hover .xp-trend__tooltip,
.xp-trend__info:focus-visible .xp-trend__tooltip {
  opacity: 1;
}

.xp-trend__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-lg);
}

.xp-trend__label {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.xp-trend__value {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.xp-trend__value--score {
  color: var(--xp-score);
}

.xp-trend__value--milestone {
  color: var(--xp-milestone);
}

.xp-trend__value--set-bonus {
  color: var(--xp-set-bonus);
}

.xp-trend__value--mission {
  color: var(--xp-mission);
}

.xp-trend__value--campaign {
  color: var(--xp-campaign);
}

.xp-trend__value--event {
  color: var(--xp-event);
}

.xp-trend__value--clan {
  color: var(--xp-clan);
}
</style>
