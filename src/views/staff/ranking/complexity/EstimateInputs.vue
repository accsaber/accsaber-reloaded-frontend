<script setup lang="ts">
import type { ComplexityEstimateInfo, EstimateScenario } from '@/types/api/complexity'
import { CX_DECIMALS, SCENARIO_LABELS } from '@/utils/complexity'
import { formatAccuracy, formatCount, formatFixed, formatRelativeDate } from '@/utils/formatters'
import {
  COEFFICIENT_ROWS,
  COEFFICIENT_SETS,
  ESTIMATE_GROUPS,
  type EstimateField,
  readNumber,
  readObject,
  readString,
  worstShareLabel,
} from './estimates'
import { computed } from 'vue'

const props = defineProps<{
  scenario: EstimateScenario
  estimate: ComplexityEstimateInfo | null | undefined
  maxNudge?: number | null
  stale?: boolean
}>()

const inputs = computed(() => props.estimate?.inputs)

function formatField(field: EstimateField): string | null {
  const source = inputs.value
  if (field.format === 'text') return readString(source, field.key)
  const value = readNumber(source, field.key)
  if (value == null) return null
  if (field.format === 'percent') return formatAccuracy(value)
  if (field.format === 'count') return formatCount(value)
  return formatFixed(value, field.decimals ?? 3)
}

function fieldLabel(field: EstimateField): string {
  const share = worstShareLabel(inputs.value)
  return field.key === 'worstNoteAccuracy' && share ? `Worst ${share} accuracy` : field.label
}

const groups = computed(() =>
  ESTIMATE_GROUPS[props.scenario]
    .map((group) => ({
      key: group.key,
      title: group.title,
      fields: group.fields
        .map((field) => ({ key: field.key, label: fieldLabel(field), value: formatField(field) }))
        .filter((field): field is { key: string; label: string; value: string } => !!field.value),
    }))
    .filter((group) => group.fields.length > 0),
)

const coefficientSets = computed(() =>
  COEFFICIENT_SETS.map((set) => {
    const values = readObject(inputs.value, set.key)
    return {
      key: set.key,
      title: set.title,
      rows: COEFFICIENT_ROWS.map((row) => ({
        key: row.key,
        label: row.label,
        value: formatFixed(readNumber(values ?? undefined, row.key), 3),
      })),
      present: !!values,
    }
  }).filter((set) => set.present),
)

const chartLine = computed(() => {
  const chart = readObject(inputs.value, 'chart')
  const chartComplexity = readNumber(inputs.value, 'chartComplexity')
  if (!chart || chartComplexity == null) return null
  const terms: [string, number | null][] = [
    ['meanSlope', readNumber(inputs.value, 'meanTerm')],
    ['worstSlope', readNumber(inputs.value, 'worstTerm')],
    ['resetSlope', readNumber(inputs.value, 'resetShare')],
    ['dotSlope', readNumber(inputs.value, 'dotShare')],
    ['notesSlope', readNumber(inputs.value, 'notesTerm')],
    ['njsSlope', readNumber(inputs.value, 'njs')],
    ['boardSlope', readNumber(inputs.value, 'boardEase')],
  ]
  const parts = terms
    .map(([slopeKey, term]) => {
      const slope = readNumber(chart, slopeKey)
      if (slope == null || term == null || slope === 0) return null
      return `(${formatFixed(slope, 3)} x ${formatFixed(term, 4)})`
    })
    .filter((part): part is string => !!part)
  const intercept = formatFixed(readNumber(chart, 'intercept'), 3)
  return `${[intercept, ...parts].join(' + ')} = ${formatFixed(chartComplexity, CX_DECIMALS)}`
})

const boardLine = computed(() => {
  const weight = readNumber(inputs.value, 'boardWeight')
  const chartComplexity = readNumber(inputs.value, 'chartComplexity')
  const boardComplexity = readNumber(inputs.value, 'boardComplexity')
  if (!weight || weight <= 0 || chartComplexity == null || boardComplexity == null) return null
  const move = weight * (boardComplexity - chartComplexity)
  const bound = props.maxNudge ?? null
  const clamped = bound == null ? move : Math.max(-bound, Math.min(bound, move))
  const limit = bound == null ? '' : `, ±${formatFixed(bound, 2)}`
  const inner = `${formatFixed(weight, 2)} x (${formatFixed(boardComplexity, CX_DECIMALS)} − ${formatFixed(chartComplexity, CX_DECIMALS)})`
  const final = formatFixed(chartComplexity + clamped, CX_DECIMALS)
  return `${formatFixed(chartComplexity, CX_DECIMALS)} + clamp(${inner}${limit}) = ${final}`
})

const nudgeNote = computed(() => {
  const weight = readNumber(inputs.value, 'boardWeight')
  if (weight != null && weight > 0) return null
  return 'The board line did not apply here.'
})

const meta = computed(() => {
  const model = readString(inputs.value, 'model')
  const mapVersion = readString(inputs.value, 'mapVersion')
  return [model, mapVersion ? `map v${mapVersion}` : null].filter(Boolean).join(' · ')
})

const modelHash = computed(() => readString(inputs.value, 'modelHash'))
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
      <div v-for="group in groups" :key="group.key" class="estimate-inputs__group">
        <h5 class="estimate-inputs__group-title">{{ group.title }}</h5>
        <dl class="estimate-inputs__grid">
          <div v-for="field in group.fields" :key="field.key" class="estimate-inputs__field">
            <dt class="estimate-inputs__label">{{ field.label }}</dt>
            <dd class="estimate-inputs__value">{{ field.value }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="coefficientSets.length" class="estimate-inputs__coefficients">
        <div v-for="set in coefficientSets" :key="set.key" class="estimate-inputs__group">
          <h5 class="estimate-inputs__group-title">{{ set.title }}</h5>
          <dl class="estimate-inputs__grid">
            <div v-for="row in set.rows" :key="row.key" class="estimate-inputs__field">
              <dt class="estimate-inputs__label">{{ row.label }}</dt>
              <dd class="estimate-inputs__value">{{ row.value }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <p v-if="chartLine" class="estimate-inputs__formula">{{ chartLine }}</p>
      <p v-if="boardLine" class="estimate-inputs__formula">{{ boardLine }}</p>
      <p v-else-if="nudgeNote && scenario === 'NEW_SCRIPT'" class="estimate-inputs__hash">
        {{ nudgeNote }}
      </p>
      <p v-if="meta || modelHash" class="estimate-inputs__hash">
        {{ [meta, modelHash].filter(Boolean).join(' · ') }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.estimate-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
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

.estimate-inputs__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.estimate-inputs__group-title {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.estimate-inputs__coefficients {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: var(--space-lg);
}

.estimate-inputs__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(190px, 100%), 1fr));
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
  white-space: normal;
}
</style>
