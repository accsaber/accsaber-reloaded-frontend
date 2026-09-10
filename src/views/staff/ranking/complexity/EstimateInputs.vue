<script setup lang="ts">
import type { ComplexityEstimateInfo, EstimateScenario } from '@/types/api/complexity'
import { CX_DECIMALS, SCENARIO_LABELS } from '@/utils/complexity'
import { formatAccuracy, formatCount, formatFixed, formatRelativeDate } from '@/utils/formatters'
import { ESTIMATE_FIELDS, readNumber, readString, worstShareLabel } from './estimates'
import { computed } from 'vue'

const props = defineProps<{
  scenario: EstimateScenario
  estimate: ComplexityEstimateInfo | null | undefined
  stale?: boolean
}>()

const fields = computed(() => {
  const inputs = props.estimate?.inputs
  if (!inputs) return []
  const share = worstShareLabel(inputs)
  return ESTIMATE_FIELDS[props.scenario]
    .map((field) => {
      const label = field.key === 'worstNoteAccuracy' && share
        ? `Worst ${share} accuracy`
        : field.label
      if (field.format === 'text') {
        const text = readString(inputs, field.key)
        return text ? { key: field.key, label, value: text, code: true } : null
      }
      const value = readNumber(inputs, field.key)
      if (value == null) return null
      if (field.format === 'percent') {
        return { key: field.key, label, value: formatAccuracy(value), code: false }
      }
      if (field.format === 'count') {
        return { key: field.key, label, value: formatCount(value), code: false }
      }
      return {
        key: field.key,
        label,
        value: formatFixed(value, field.decimals ?? 3),
        code: false,
      }
    })
    .filter((field): field is { key: string; label: string; value: string; code: boolean } => !!field)
})

const formula = computed(() => {
  if (props.scenario !== 'NEW_SCRIPT') return null
  const inputs = props.estimate?.inputs
  const intercept = readNumber(inputs, 'intercept')
  const meanSlope = readNumber(inputs, 'meanSlope')
  const meanTerm = readNumber(inputs, 'meanTerm')
  const worstSlope = readNumber(inputs, 'worstSlope')
  const worstTerm = readNumber(inputs, 'worstTerm')
  if ([intercept, meanSlope, meanTerm, worstSlope, worstTerm].some((v) => v == null)) return null
  const total = intercept! + meanSlope! * meanTerm! + worstSlope! * worstTerm!
  const mean = `${formatFixed(meanSlope, 3)} x ${formatFixed(meanTerm, 4)}`
  const worst = `${formatFixed(worstSlope, 3)} x ${formatFixed(worstTerm, 4)}`
  return `${formatFixed(intercept, 3)} + (${mean}) + (${worst}) = ${formatFixed(total, CX_DECIMALS)}`
})

const modelHash = computed(() => readString(props.estimate?.inputs, 'modelHash'))
</script>

<template>
  <section class="estimate-inputs">
    <header class="estimate-inputs__head">
      <h4 class="estimate-inputs__title">{{ SCENARIO_LABELS[scenario] }}</h4>
      <span v-if="estimate" class="estimate-inputs__meta">
        {{ estimate.version }} · {{ formatRelativeDate(estimate.updatedAt) }}
      </span>
      <span v-if="stale" class="estimate-inputs__flag">behind the model</span>
    </header>

    <p v-if="!estimate" class="estimate-inputs__empty">
      No estimate stored for this difficulty.
    </p>

    <template v-else>
      <dl class="estimate-inputs__grid">
        <div v-for="field in fields" :key="field.key" class="estimate-inputs__field">
          <dt class="estimate-inputs__label">{{ field.label }}</dt>
          <dd class="estimate-inputs__value" :class="{ 'estimate-inputs__value--code': field.code }">
            {{ field.value }}
          </dd>
        </div>
      </dl>
      <p v-if="formula" class="estimate-inputs__formula">{{ formula }}</p>
      <p v-if="modelHash" class="estimate-inputs__hash">model hash {{ modelHash }}</p>
    </template>
  </section>
</template>

<style scoped>
.estimate-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.estimate-inputs__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.estimate-inputs__title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-card-title);
  font-weight: 600;
}

.estimate-inputs__meta {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.estimate-inputs__flag {
  padding: 1px 6px;
  border: 1px solid color-mix(in srgb, var(--warning) 40%, transparent);
  border-radius: var(--radius-pill);
  color: var(--warning);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.estimate-inputs__empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.estimate-inputs__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-sm) var(--space-lg);
  margin: 0;
}

.estimate-inputs__field {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  padding-bottom: 2px;
  border-bottom: 1px solid var(--bg-overlay);
}

.estimate-inputs__label {
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.estimate-inputs__value {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.estimate-inputs__value--code {
  font-family: var(--font-code);
  font-size: var(--text-caption);
}

.estimate-inputs__formula,
.estimate-inputs__hash {
  margin: 0;
  font-family: var(--font-code);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow-x: auto;
  white-space: nowrap;
}

.estimate-inputs__hash {
  color: var(--text-tertiary);
}
</style>
