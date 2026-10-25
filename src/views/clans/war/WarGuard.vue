<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import type { ClanWarParticipantResponse, ClanWarStrikeRulesResponse } from '@/types/api/clans'
import { useNow } from '@/composables/useNow'
import { guardBackAt, type WarWipe } from '@/utils/clans'
import { formatDuration } from '@/utils/formatters'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'
import { isNoScore, repeatTitle, streakFactor } from './warStrike'

const props = defineProps<{
  fighter: ClanWarParticipantResponse
  rules: ClanWarStrikeRulesResponse
  wipe: WarWipe | null
  streak?: boolean
}>()

const DOWN_TITLE = "Nobody can hit them until they finish a play on one of the war's maps or their timer runs out."

const percent = (factor: number) => Math.round((factor - 1) * 100)

const preview = computed(() => props.fighter.strikePreview)
const repeatMap = computed(() => !!preview.value?.onMap?.repeatMap)
const boost = computed(() => {
  const p = preview.value
  if (!props.streak || !p || isNoScore(p) || !(p.hitsThisCycle + p.chipsThisCycle)) return 0
  return percent(streakFactor(props.rules, p))
})
const streakTitle = computed(
  () =>
    `Every new map they get hit on makes the next hit ${percent(props.rules.escalation)}% stronger, no matter who on your team lands it. ` +
    `A chip, a hit while they had no score or a hit on a map they were already hit on adds ${percent(props.rules.chipEscalation)}%. ` +
    "It resets once they're broken.",
)
const now = useNow()
const backIn = computed(() => {
  const { brokenAt, reviveAt } = props.fighter
  if (!brokenAt || !reviveAt) return null
  return formatDuration(guardBackAt(brokenAt, reviveAt, props.wipe) - now.value, { zero: 'now' })
})
</script>

<template>
  <span v-if="fighter.guard <= 0" class="war-guard war-guard--down">
    <HintTooltip variant="inline" :text="DOWN_TITLE">
      <template #trigger>Broken<span v-if="backIn" class="war-guard__back">back in {{ backIn }}</span></template>
    </HintTooltip>
  </span>
  <span v-else class="war-guard">
    <span class="war-guard__bar">
      <ClanBar :value="fighter.guard" :max="rules.guard" />
      <span class="war-guard__value">{{ Math.round(fighter.guard) }}/{{ Math.round(rules.guard) }}</span>
    </span>
    <HintTooltip v-if="streak && repeatMap" variant="inline" class="war-guard__note" :text="repeatTitle(rules)">
      <template #trigger>Already hit</template>
    </HintTooltip>
    <HintTooltip v-else-if="boost" variant="inline" class="war-guard__note war-guard__note--streak" :text="streakTitle">
      <template #trigger>+{{ boost }}% on next hit</template>
    </HintTooltip>
  </span>
</template>

<style scoped>
.war-guard {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  font-size: var(--text-body);
  line-height: 1.3;
}

.war-guard__bar {
  display: flex;
  align-self: stretch;
  align-items: center;
  gap: var(--space-sm);
}

.war-guard__value {
  min-width: 7ch;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  text-align: right;
}

.war-guard__note {
  color: var(--text-secondary);
  white-space: nowrap;
}

.war-guard__note--streak {
  color: var(--warning);
}

.war-guard--down {
  color: var(--error);
}

.war-guard__back {
  display: block;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
