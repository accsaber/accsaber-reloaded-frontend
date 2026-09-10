<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import type {
  ComparisonScenario,
  ComplexityScenario,
  ScenarioLadderValues,
} from '@/types/api/complexity'
import type { TableColumn } from '@/types/display'
import { SCENARIO_LABELS, SCENARIO_ORDER, SCENARIO_SHORT } from '@/utils/complexity'
import ScenarioCell from './ScenarioCell.vue'
import { computed } from 'vue'

type LadderKey = keyof ScenarioLadderValues

const props = withDefaults(defineProps<{
  ladders: Partial<Record<ComplexityScenario, ScenarioLadderValues>>
  scenario: ComparisonScenario
  columns?: readonly ComplexityScenario[]
  metrics?: readonly LadderKey[]
  loading?: boolean
}>(), {
  columns: () => SCENARIO_ORDER,
  metrics: undefined,
  loading: false,
})

const ALL_METRICS: { key: LadderKey; label: string; decimals: number }[] = [
  { key: 'playersWith900', label: 'Players with a 900', decimals: 0 },
  { key: 'playersWith1000', label: 'Players with a 1000', decimals: 0 },
  { key: 'playersWith1100', label: 'Players with an 1100', decimals: 0 },
  { key: 'playsWith1000', label: 'Plays at 1000', decimals: 0 },
  { key: 'playsWith1100', label: 'Plays at 1100', decimals: 0 },
  { key: 'totalAp', label: 'Total AP', decimals: 1 },
  { key: 'topPlayAp', label: 'Top play', decimals: 1 },
  { key: 'players', label: 'Ranked players', decimals: 0 },
]

const metrics = computed(() =>
  props.metrics
    ? ALL_METRICS.filter((metric) => props.metrics?.includes(metric.key))
    : ALL_METRICS,
)

const tableColumns = computed<TableColumn[]>(() => [
  { key: 'metric', label: 'Ladder', width: '220px' },
  ...props.columns.map((scenario) => ({
    key: scenario,
    label: SCENARIO_LABELS[scenario],
    align: 'right' as const,
    width: '150px',
  })),
])

function readValue(scenario: ComplexityScenario, key: LadderKey): number | null {
  const ladder = props.ladders[scenario]
  return ladder ? ladder[key] : null
}

const rows = computed(() =>
  metrics.value.map((metric) => {
    const current = readValue('CURRENT', metric.key)
    const row: Record<string, unknown> = { key: metric.key, metric: metric.label, decimals: metric.decimals }
    for (const scenario of props.columns) {
      const value = readValue(scenario, metric.key)
      row[scenario] = value
      row[`${scenario}Delta`] =
        scenario === 'CURRENT' || value == null || current == null ? null : value - current
    }
    return row
  }),
)
</script>

<template>
  <div class="ladder-strip" :data-emphasis="scenario">
    <DataTable
      :columns="tableColumns"
      :rows="rows"
      :loading="loading"
      :loading-rows="metrics.length"
      row-key="key"
    >
      <template #cell-metric="{ row }">
        <span class="ladder-strip__metric">{{ row.metric }}</span>
      </template>

      <template v-for="scenarioKey in columns" :key="scenarioKey" #[`cell-${scenarioKey}`]="{ row }">
        <ScenarioCell
          :value="(row[scenarioKey] as number | null)"
          :delta="(row[`${scenarioKey}Delta`] as number | null)"
          :decimals="row.decimals as number"
          :emphasis="scenarioKey === 'CURRENT' || scenarioKey === scenario"
        />
      </template>

      <template #mobile-card="{ row }">
        <div class="ladder-strip__card">
          <span class="ladder-strip__metric">{{ row.metric }}</span>
          <div class="ladder-strip__card-values">
            <div v-for="scenarioKey in columns" :key="scenarioKey" class="ladder-strip__card-value">
              <span class="ladder-strip__card-label">{{ SCENARIO_SHORT[scenarioKey] }}</span>
              <ScenarioCell
                :value="(row[scenarioKey] as number | null)"
                :delta="(row[`${scenarioKey}Delta`] as number | null)"
                :decimals="row.decimals as number"
                :emphasis="scenarioKey === 'CURRENT' || scenarioKey === scenario"
              />
            </div>
          </div>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.ladder-strip {
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.ladder-strip__metric {
  color: var(--text-primary);
  font-size: var(--text-body);
}

.ladder-strip[data-emphasis='OLD_SCRIPT'] :deep(.data-table__th:nth-child(3)),
.ladder-strip[data-emphasis='PREVIEW'] :deep(.data-table__th:nth-child(3)),
.ladder-strip[data-emphasis='NEW_SCRIPT'] :deep(.data-table__th:nth-child(4)) {
  color: var(--page-accent, var(--accent));
}

.ladder-strip :deep(.data-table__row) {
  height: 40px;
}

.ladder-strip__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ladder-strip__card-values {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: var(--space-sm);
}

.ladder-strip__card-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 0;
}

.ladder-strip__card-label {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
