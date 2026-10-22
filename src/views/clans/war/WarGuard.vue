<script setup lang="ts">
import type { ClanWarParticipantResponse, ClanWarStrikeRulesResponse } from '@/types/api/clans'
import { useNow } from '@/composables/useNow'
import { formatDuration } from '@/utils/formatters'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'
import { streakFactor } from './warStrike'

const props = defineProps<{
  fighter: ClanWarParticipantResponse
  rules: ClanWarStrikeRulesResponse
}>()

const percent = (factor: number) => Math.round((factor - 1) * 100)

const preview = computed(() => props.fighter.strikePreview)
const streak = computed(() => (preview.value
  ? preview.value.hitsThisCycle + preview.value.noScoreHitsThisCycle + preview.value.chipsThisCycle
  : 0))
const boost = computed(() => (preview.value ? percent(streakFactor(props.rules, preview.value)) : 0))
const streakTitle = computed(
  () =>
    `${streak.value} ${streak.value === 1 ? 'hit' : 'hits'} landed on them since their guard came back. ` +
    `Every hit makes the next one ${percent(props.rules.escalation)}% stronger, no matter who on your team lands it. ` +
    `A hit on them while they had no score only adds ${percent(props.rules.missingScoreEscalation)}%, ` +
    `a chip ${percent(props.rules.chipEscalation)}%. ` +
    "It resets once they're broken.",
)
const now = useNow()
const backWithin = computed(() => {
  if (!props.fighter.brokenAt) return null
  const limit = new Date(props.fighter.brokenAt).getTime() + props.rules.brokenDurationHours * 3_600_000
  return formatDuration(limit - now.value)
})
const brokenTitle = computed(
  () =>
    "Nobody can hit them until they finish a play on one of the war's maps, or a week passes. " +
    `Either gives them ${Math.round(props.rules.guard)} guard back.`,
)
</script>

<template>
  <span v-if="fighter.guard <= 0" class="war-guard war-guard__broken" :title="brokenTitle">
    Broken
    <span v-if="backWithin" class="war-guard__limit">for max {{ backWithin }}</span>
  </span>
  <span v-else class="war-guard">
    <span class="war-guard__bar">
      <ClanBar :value="fighter.guard" :max="rules.guard" />
      <span class="war-guard__value">{{ Math.round(fighter.guard) }}</span>
    </span>
    <span v-if="streak" class="war-guard__streak" :title="streakTitle">
      +{{ boost }}% next hit
    </span>
  </span>
</template>

<style scoped>
.war-guard {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.war-guard__bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.war-guard__value {
  min-width: 3ch;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: right;
}

.war-guard__streak,
.war-guard__broken {
  font-size: var(--text-caption);
  font-weight: 600;
  white-space: nowrap;
  cursor: help;
}

.war-guard__streak {
  color: var(--warning);
}

.war-guard__limit {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text-tertiary);
}

.war-guard__broken {
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
