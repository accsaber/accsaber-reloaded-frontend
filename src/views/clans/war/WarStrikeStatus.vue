<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import StrikeLines from './StrikeLines.vue'
import { formatDamage, type StrikeOutcome } from './warStrike'

defineProps<{
  outcome: StrikeOutcome
}>()
</script>

<template>
  <span class="strike-status" :class="`strike-status--${outcome.kind}`">
    {{ outcome.kind === 'damage' ? 'Lands' : 'Chips' }} {{ formatDamage(outcome.damage) }}
    <HintTooltip text="Damage breakdown" label="this damage" :width="320">
      <StrikeLines :lines="outcome.lines" />
    </HintTooltip>
  </span>
</template>

<style scoped>
.strike-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-body);
  font-weight: 600;
  white-space: nowrap;
}

.strike-status--damage {
  color: var(--success);
}

.strike-status--chip {
  color: var(--warning);
}
</style>
