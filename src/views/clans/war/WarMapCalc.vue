<script setup lang="ts">
import AccuracySlider from '@/components/common/AccuracySlider.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import type { ClanWarStrikePreviewResponse, ClanWarStrikeRulesResponse } from '@/types/api/clans'
import { formatAccuracy } from '@/utils/formatters'
import { computed, ref } from 'vue'
import StrikeLines from './StrikeLines.vue'
import { mapOutcome, type StrikeKind } from './warStrike'

const props = defineProps<{
  rules: ClanWarStrikeRulesResponse
  preview: ClanWarStrikePreviewResponse
  guard: number
  targetScore: number | null
  targetDamage: number
  maxScore: number
  mapPenalty?: number
  repeatMap?: boolean
  viewerScore: number | null
}>()

const KIND_LABEL: Record<StrikeKind, string> = { damage: 'Hit', chip: 'Chip', none: 'Nothing lands' }

const accuracy = ref(
  (props.viewerScore ?? (props.targetScore === null ? props.maxScore : Math.min(props.maxScore, props.targetScore + 1))) /
    props.maxScore,
)

const outcome = computed(() =>
  mapOutcome(
    props.rules,
    props.preview,
    props.guard,
    { targetScore: props.targetScore, targetDamage: props.targetDamage, maxScore: props.maxScore, mapPenalty: props.mapPenalty, repeatMap: props.repeatMap },
    Math.round(accuracy.value * props.maxScore),
  ),
)
</script>

<template>
  <HintTooltip text="Try a score" label="this map" :width="300" more>
    <template #default="{ locked }">
      <span v-if="!locked">Click to try a score on this map.</span>
      <div v-else class="calc">
        <span class="calc__acc">{{ formatAccuracy(accuracy) }}</span>
        <AccuracySlider v-model="accuracy" />
        <div class="calc__result">
          <span class="calc__kind" :class="`calc__kind--${outcome.kind}`">{{ KIND_LABEL[outcome.kind] }}</span>
          <StrikeLines v-if="outcome.lines.length" :lines="outcome.lines" />
        </div>
      </div>
    </template>
  </HintTooltip>
</template>

<style scoped>
.calc {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 268px;
}

.calc__result {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 196px;
}

.calc__acc {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.calc__kind {
  font-weight: 600;
}

.calc__kind--damage {
  color: var(--success);
}

.calc__kind--chip {
  color: var(--warning);
}

.calc__kind--none {
  color: var(--text-secondary);
}
</style>
