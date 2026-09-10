<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import type {
  ComparisonScenario,
  ComplexityPlayerRow,
  ComplexityScenario,
} from '@/types/api/complexity'
import type { TableColumn } from '@/types/display'
import { AP_DECIMALS, SCENARIO_ORDER, SCENARIO_SHORT } from '@/utils/complexity'
import { getRankClass } from '@/utils/ranking'
import ScenarioCell from './ScenarioCell.vue'
import { apKey } from './scenarioKeys'
import { useScenarioSort } from './useScenarioSort'
import { computed, toRef } from 'vue'

const props = withDefaults(defineProps<{
  rows: ComplexityPlayerRow[]
  scenario: ComparisonScenario
  columns?: readonly ComplexityScenario[]
  loading?: boolean
}>(), {
  columns: () => SCENARIO_ORDER,
  loading: false,
})

const emit = defineEmits<{
  select: [userId: string]
}>()

const ALL_SCENARIOS: readonly ComplexityScenario[] = [
  'CURRENT',
  'OLD_SCRIPT',
  'NEW_SCRIPT',
  'PREVIEW',
]

function apOf(row: ComplexityPlayerRow, scenario: ComplexityScenario): number | null {
  return row.scenarios[scenario]?.ap ?? null
}

function rankOf(row: ComplexityPlayerRow, scenario: ComplexityScenario): number | null {
  return row.scenarios[scenario]?.rank ?? null
}

const accessors: Record<string, (row: ComplexityPlayerRow) => number | string | null> = {
  rankCurrent: (row) => rankOf(row, 'CURRENT'),
  name: (row) => row.name.toLowerCase(),
  apMove: (row) => row.deltas[props.scenario]?.ap ?? null,
  rankScenario: (row) => rankOf(row, props.scenario),
  rankMove: (row) => row.deltas[props.scenario]?.rank ?? null,
}

for (const key of ALL_SCENARIOS) {
  accessors[apKey(key)] = (row) => apOf(row, key)
}

const { sortState, deltaMode, page, totalPages, visible, onSort, setPage } = useScenarioSort({
  rows: toRef(props, 'rows'),
  deltaKeys: ['apMove', 'rankMove'],
  defaultKey: 'rankCurrent',
  ascendingKeys: ['rankCurrent', 'rankScenario', 'name'],
  revision: () => props.scenario,
  accessors,
})

const tableColumns = computed<TableColumn[]>(() => {
  const tag = SCENARIO_SHORT[props.scenario]
  const apWidth = props.columns.length > 2 ? '108px' : '124px'
  return [
    { key: 'rankCurrent', label: 'Rank now', sortable: true, align: 'right', width: '108px' },
    { key: 'player', label: 'Player', width: '240px', flex: true },
    ...props.columns.map((scenario) => ({
      key: apKey(scenario),
      label: `AP ${SCENARIO_SHORT[scenario]}`,
      sortable: true,
      align: 'right' as const,
      width: apWidth,
    })),
    {
      key: 'apMove',
      label: `Δ AP ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '118px',
    },
    { key: 'rankScenario', label: `Rank ${tag}`, sortable: true, align: 'right', width: '112px' },
    {
      key: 'rankMove',
      label: `Δ rank ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '128px',
    },
  ]
})

const tableRows = computed(() =>
  visible.value.map((row) => ({
    ...Object.fromEntries(props.columns.map((scenario) => [apKey(scenario), apOf(row, scenario)])),
    id: row.userId,
    userId: row.userId,
    name: row.name,
    country: row.country,
    avatarUrl: pickAvatarUrl(row),
    avatarFallbackUrl: pickAvatarFallback(row),
    rankCurrent: rankOf(row, 'CURRENT'),
    apCurrent: apOf(row, 'CURRENT'),
    apScenario: apOf(row, props.scenario),
    apMove: row.deltas[props.scenario]?.ap ?? null,
    rankScenario: rankOf(row, props.scenario),
    rankMove: row.deltas[props.scenario]?.rank ?? null,
  })),
)

function selectPlayer(row: Record<string, unknown>) {
  emit('select', row.userId as string)
}
</script>

<template>
  <div class="complexity-players">
    <DataTable
      dense
      :columns="tableColumns"
      :rows="tableRows"
      :sort-state="sortState"
      :loading="loading"
      :loading-rows="10"
      row-key="id"
      row-clickable
      empty-message="No players on this board yet"
      @sort="onSort"
      @row-click="selectPlayer"
    >
      <template #cell-rankCurrent="{ row }">
        <span class="complexity-players__rank" :class="getRankClass(row.rankCurrent as number)">
          {{ row.rankCurrent != null ? `#${row.rankCurrent}` : '–' }}
        </span>
      </template>

      <template #cell-player="{ row }">
        <div class="complexity-players__player">
          <GlowImage :src="row.avatarUrl as string" :alt="(row.name as string)" :size="30"
            :fallback-src="(row.avatarFallbackUrl as string | null)" />
          <span class="complexity-players__name">{{ row.name }}</span>
          <CountryFlag :country="(row.country as string)" />
        </div>
      </template>

      <template v-for="key in columns" :key="key" #[`cell-${apKey(key)}`]="{ row }">
        <ScenarioCell :value="(row[apKey(key)] as number | null)" :decimals="AP_DECIMALS"
          :emphasis="key === 'CURRENT' || key === scenario" />
      </template>

      <template #cell-apMove="{ row }">
        <ScenarioCell delta-only :value="(row.apMove as number | null)"
          :delta="(row.apMove as number | null)" :decimals="AP_DECIMALS" />
      </template>

      <template #cell-rankScenario="{ row }">
        <span class="complexity-players__rank">
          {{ row.rankScenario != null ? `#${row.rankScenario}` : '–' }}
        </span>
      </template>

      <template #cell-rankMove="{ row }">
        <ScenarioCell delta-only invert :value="(row.rankMove as number | null)"
          :delta="(row.rankMove as number | null)" :decimals="0" />
      </template>

      <template #mobile-card="{ row }">
        <button type="button" class="complexity-players__card" @click="selectPlayer(row)">
          <span class="complexity-players__rank" :class="getRankClass(row.rankCurrent as number)">
            {{ row.rankCurrent != null ? `#${row.rankCurrent}` : '–' }}
          </span>
          <GlowImage :src="row.avatarUrl as string" :alt="(row.name as string)" :size="36"
            :fallback-src="(row.avatarFallbackUrl as string | null)" />
          <div class="complexity-players__card-body">
            <span class="complexity-players__name">{{ row.name }}</span>
            <div class="complexity-players__card-values">
              <ScenarioCell :value="(row.apCurrent as number | null)" :decimals="AP_DECIMALS" emphasis />
              <ScenarioCell :value="(row.apScenario as number | null)"
                :delta="(row.apMove as number | null)" :decimals="AP_DECIMALS" emphasis />
              <ScenarioCell delta-only invert :value="(row.rankMove as number | null)"
                :delta="(row.rankMove as number | null)" :decimals="0" />
            </div>
          </div>
        </button>
      </template>

      <template #empty>
        <EmptyState message="No players on this board yet." />
      </template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages"
      @update:page="setPage" />
  </div>
</template>

<style scoped>
.complexity-players {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.complexity-players__rank {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.complexity-players__player {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.complexity-players__name {
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.complexity-players__card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  text-align: left;
  cursor: pointer;
}

.complexity-players__card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.complexity-players__card-values {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
</style>
