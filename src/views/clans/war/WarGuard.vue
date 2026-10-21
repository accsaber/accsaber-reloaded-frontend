<script setup lang="ts">
import type { ClanWarParticipantResponse, ClanWarStrikeRulesResponse } from '@/types/api/clans'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'

const props = defineProps<{
  fighter: ClanWarParticipantResponse
  rules: ClanWarStrikeRulesResponse
}>()

const percent = (factor: number) => Math.round((factor - 1) * 100)

const streak = computed(() => props.fighter.strikePreview?.hitsThisCycle ?? 0)
const streakTitle = computed(
  () =>
    `${streak.value} ${streak.value === 1 ? 'hit' : 'hits'} landed on them since their guard came back. ` +
    `Every hit makes the next one ${percent(props.rules.escalation)}% stronger, no matter who on your team lands it. ` +
    "It resets once they're broken.",
)
const safeTitle = computed(
  () =>
    "Broken. Nobody can hit them until they finish a play on one of the war's maps, " +
    `which gives them ${Math.round(props.rules.guard)} guard back.`,
)
</script>

<template>
  <span v-if="fighter.guard <= 0" class="war-guard__safe" :title="safeTitle">Safe</span>
  <span v-else class="war-guard">
    <span class="war-guard__bar">
      <ClanBar :value="fighter.guard" :max="rules.guard" />
      <span class="war-guard__value">{{ Math.round(fighter.guard) }}</span>
    </span>
    <span v-if="streak" class="war-guard__streak" :title="streakTitle">
      +{{ percent(rules.escalation ** streak) }}% next hit
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
.war-guard__safe {
  font-size: var(--text-caption);
  font-weight: 600;
  white-space: nowrap;
  cursor: help;
}

.war-guard__streak {
  color: var(--warning);
}

.war-guard__safe {
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
