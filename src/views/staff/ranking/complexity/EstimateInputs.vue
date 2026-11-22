<script setup lang="ts">
import type { ComplexityEstimateInfo, EstimateScenario } from '@/types/api/complexity'
import StoredFold from '@/components/common/StoredFold.vue'
import { CX_DECIMALS, SCENARIO_LABELS } from '@/utils/complexity'
import { formatAccuracy, formatCount, formatFixed, formatRelativeDate } from '@/utils/formatters'
import {
  ESTIMATE_GROUPS,
  type EstimateField,
  hasPayFairReading,
  mixLabel,
  readNumber,
  readObject,
  readString,
} from './estimates'
import { COEFFICIENT_FIELDS } from './tuning'
import { computed } from 'vue'

const props = defineProps<{
  scenario: EstimateScenario
  estimate: ComplexityEstimateInfo | null | undefined
  complexity: number | null | undefined
  stale?: boolean
}>()

const inputs = computed(() => props.estimate?.inputs)
const reading = computed(() => hasPayFairReading(inputs.value))

function blank(field: EstimateField): string | null {
  return field.always ? formatFixed(null, 0) : null
}

function formatField(field: EstimateField): string | null {
  if (field.reading && !reading.value) return null
  const value = input(field.key)
  if (value == null) return blank(field)
  if (field.format === 'mix') return mixLabel(value)
  if (field.format === 'percent') return formatAccuracy(value)
  if (field.format === 'count') return formatCount(value)
  return formatFixed(value, field.decimals ?? 3)
}

const chart = computed(() => readObject(inputs.value, 'chart') ?? undefined)

const groups = computed(() =>
  [
    ...ESTIMATE_GROUPS[props.scenario].map((group) => ({
      key: group.key,
      title: group.title,
      fields: group.fields
        .map((field) => ({ key: field.key, label: field.label, value: formatField(field) }))
        .filter((field): field is { key: string; label: string; value: string } => !!field.value),
    })),
    {
      key: 'coefficients',
      title: 'Coefficients',
      fields: chart.value
        ? COEFFICIENT_FIELDS.map((row) => ({
            key: row.key,
            label: row.label,
            value: formatFixed(readNumber(chart.value, row.key), 3),
          }))
        : [],
    },
  ].filter((group) => group.fields.length > 0),
)

const TERMS: [slope: string, term: string][] = [
  ['meanSlope', 'meanTerm'],
  ['resetSlope', 'resetShare'],
  ['dotSlope', 'dotShare'],
  ['bottomUpSlope', 'bottomUpShare'],
  ['crossoverSlope', 'crossoverShare'],
  ['topRowSlope', 'topRowShare'],
  ['diagonalSlope', 'diagonalShare'],
  ['verticalStackSlope', 'verticalStackShare'],
  ['outerSlope', 'outerShare'],
  ['notesSlope', 'notesTerm'],
  ['njsSlope', 'njs'],
]

const botLine = computed(() => {
  const botEstimate = input('botEstimate')
  if (!chart.value || botEstimate == null) return null
  const parts = TERMS
    .map(([slopeKey, termKey]) => {
      const slope = readNumber(chart.value, slopeKey)
      const term = input(termKey)
      if (slope == null || term == null || slope === 0) return null
      return `(${formatFixed(slope, 3)} x ${formatFixed(term, 4)})`
    })
    .filter((part): part is string => !!part)
  const intercept = formatFixed(readNumber(chart.value, 'intercept'), 3)
  return `${[intercept, ...parts].join(' + ')} = ${formatFixed(botEstimate, CX_DECIMALS)}`
})

function input(key: string): number | null {
  return readNumber(inputs.value, key)
}

function payFairParts(): string[] {
  if (!reading.value) return ['no pay-fair reading yet', mixLabel(0)]
  const share = Math.round((input('payWeight') ?? 0) * 100)
  const adjustment = input('payAdjustment') ?? 0
  const earned = `top plays earn ${formatAccuracy(input('payRatio'), 1)} of usual`
  const payFair = `pay-fair ${formatFixed(input('payFair'), CX_DECIMALS)}`
  if (share <= 0) return [earned, `${payFair} doesn't count yet at ${formatCount(input('scores'))} scores`, mixLabel(0)]
  return [
    earned,
    `${payFair} counts ${share}% and the bot ${100 - share}%`,
    `adjustment ${adjustment > 0 ? '+' : ''}${formatFixed(adjustment, 2)}`,
  ]
}

const summary = computed(() => {
  const botEstimate = input('botEstimate')
  if (botEstimate == null) return null
  return [
    `Bot Complexity Estimate ${formatFixed(botEstimate, CX_DECIMALS)}`,
    ...payFairParts(),
    ...(props.complexity == null ? [] : [`complexity ${formatFixed(props.complexity, CX_DECIMALS)}`]),
  ].join(', ')
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
      <span v-if="stale" class="estimate-inputs__flag">Behind the model</span>
    </header>

    <p v-if="!estimate" class="estimate-inputs__empty">
      No estimate stored for this difficulty.
    </p>

    <template v-else>
      <p v-if="summary" class="estimate-inputs__summary">{{ summary }}</p>

      <div v-for="group in groups" :key="group.key" class="estimate-inputs__group">
        <h5 class="estimate-inputs__group-title field-label">{{ group.title }}</h5>
        <dl class="estimate-inputs__grid">
          <div v-for="field in group.fields" :key="field.key" class="estimate-inputs__field">
            <dt class="estimate-inputs__label">{{ field.label }}</dt>
            <dd class="estimate-inputs__value">{{ field.value }}</dd>
          </div>
        </dl>
      </div>

      <StoredFold v-if="botLine" label="Formula" storage-key="script-bot-formula" default-collapsed>
        <p class="estimate-inputs__formula">{{ botLine }}</p>
      </StoredFold>
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
  color: var(--warning);
  font-size: var(--text-caption);
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
}

.estimate-inputs__summary {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-body);
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
