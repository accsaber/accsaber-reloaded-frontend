<script setup lang="ts">
import type { ComparisonScenario, ComplexityScenario } from '@/types/api/complexity'
import { deltaTone, isBigMove } from '@/utils/complexity'
import { formatFixed, formatSigned } from '@/utils/formatters'
import { computed } from 'vue'

interface ScenarioEntry {
  scenarios: Partial<Record<ComplexityScenario, object>>
  deltas: Partial<Record<ComparisonScenario, object>>
}

const props = withDefaults(defineProps<{
  entry: ScenarioEntry
  field: string
  scenario: ComparisonScenario
  decimals?: number
  invert?: boolean
  emphasis?: boolean
  bigThreshold?: boolean
}>(), {
  decimals: 2,
  invert: false,
  emphasis: false,
  bigThreshold: false,
})

function read(values: object | undefined): number | null {
  return (values as Record<string, number | null | undefined> | undefined)?.[props.field] ?? null
}

const from = computed(() => read(props.entry.scenarios.CURRENT))
const value = computed(() => read(props.entry.scenarios[props.scenario]) ?? from.value)
const delta = computed(() => read(props.entry.deltas[props.scenario]))

const display = computed(() => formatFixed(value.value, props.decimals))
const fromText = computed(() =>
  from.value != null && value.value != null && deltaTone(value.value - from.value) !== 'flat'
    ? formatFixed(from.value, props.decimals)
    : '',
)
const missing = computed(() => value.value == null)
const tone = computed(() => deltaTone(delta.value, props.invert))
const big = computed(() => props.bigThreshold && isBigMove(delta.value))
const deltaText = computed(() => formatSigned(delta.value != null && props.invert ? -delta.value : delta.value, props.decimals))
const showDelta = computed(
  () => delta.value != null && tone.value !== 'flat',
)
</script>

<template>
  <span class="scenario-cell">
    <span class="scenario-cell__line">
      <span v-if="fromText" class="scenario-cell__from">{{ fromText }} &rarr;</span>
      <span class="scenario-cell__value"
        :class="{ 'scenario-cell__value--emphasis': emphasis, 'scenario-cell__value--missing': missing }">
        {{ display }}
      </span>
    </span>
    <span v-if="showDelta" class="scenario-cell__delta" :class="[
      `scenario-cell__delta--${tone}`,
      { 'scenario-cell__delta--big': big },
    ]">
      {{ deltaText }}
    </span>
  </span>
</template>

<style scoped>
.scenario-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  line-height: 1.25;
}

.scenario-cell__line {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-xs);
  white-space: nowrap;
}

.scenario-cell__from {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-tertiary);
}

.scenario-cell__value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.scenario-cell__value--emphasis {
  color: var(--text-primary);
  font-weight: 600;
}

.scenario-cell__value--missing {
  color: var(--text-tertiary);
}

.scenario-cell__delta {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.scenario-cell__delta--up {
  color: var(--xp-up);
}

.scenario-cell__delta--down {
  color: var(--xp-down);
}

.scenario-cell__delta--flat {
  color: var(--text-tertiary);
}

.scenario-cell__delta--big {
  font-weight: 700;
}
</style>
