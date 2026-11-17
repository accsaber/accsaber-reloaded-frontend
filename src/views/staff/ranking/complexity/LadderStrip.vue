<script setup lang="ts">
import StatBlock from '@/components/common/StatBlock.vue'
import type { ComparisonScenario, ComplexityScenario, ScenarioLadderValues } from '@/types/api/complexity'
import { formatCount, formatFixed } from '@/utils/formatters'
import { computed } from 'vue'

type LadderKey = keyof ScenarioLadderValues

const props = defineProps<{
  ladders: Partial<Record<ComplexityScenario, ScenarioLadderValues>>
  scenario: ComparisonScenario
  metrics?: readonly LadderKey[]
}>()

const ALL_METRICS: { key: LadderKey; label: string; decimals: number }[] = [
  { key: 'playersWith900', label: 'Players With 900', decimals: 0 },
  { key: 'playersWith1000', label: 'Players With 1000', decimals: 0 },
  { key: 'playersWith1100', label: 'Players With 1100', decimals: 0 },
  { key: 'playsWith1000', label: 'Plays at 1000', decimals: 0 },
  { key: 'playsWith1100', label: 'Plays at 1100', decimals: 0 },
  { key: 'totalAp', label: 'Total AP', decimals: 0 },
  { key: 'topPlayAp', label: 'Top Play', decimals: 1 },
  { key: 'players', label: 'Ranked Players', decimals: 0 },
]

const cells = computed(() =>
  ALL_METRICS.filter((metric) => !props.metrics || props.metrics.includes(metric.key)).map((metric) => {
    const now = props.ladders.CURRENT?.[metric.key] ?? null
    const after = props.ladders[props.scenario]?.[metric.key] ?? now
    return {
      ...metric,
      value: after == null ? '-' : metric.decimals ? formatFixed(after, metric.decimals) : formatCount(after),
      trend: now != null && after != null ? Number((after - now).toFixed(metric.decimals)) : 0,
    }
  }),
)
</script>

<template>
  <div class="ladder-strip">
    <StatBlock v-for="cell in cells" :key="cell.key" :label="cell.label" :value="cell.value" :trend="cell.trend" />
  </div>
</template>

<style scoped>
.ladder-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  min-height: 104px;
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

@media (max-width: 767px) {
  .ladder-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-height: 0;
  }
}
</style>
