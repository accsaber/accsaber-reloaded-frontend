<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import type { ComplexityPlayerRow, EstimateScenario } from '@/types/api/complexity'
import type { TableColumn } from '@/types/display'
import { AP_DECIMALS, SCENARIO_SHORT } from '@/utils/complexity'
import { getRankClass } from '@/utils/ranking'
import ScenarioCell from './ScenarioCell.vue'
import { useScenarioSort } from './useScenarioSort'
import { computed, toRef } from 'vue'

const props = withDefaults(defineProps<{
  rows: ComplexityPlayerRow[]
  scenario: EstimateScenario
  loading?: boolean
}>(), {
  loading: false,
})

function apOf(row: ComplexityPlayerRow, scenario: EstimateScenario | 'CURRENT'): number | null {
  return row.scenarios[scenario]?.ap ?? null
}

function rankOf(row: ComplexityPlayerRow, scenario: EstimateScenario | 'CURRENT'): number | null {
  return row.scenarios[scenario]?.rank ?? null
}

const { sortState, deltaMode, page, totalPages, visible, onSort, setPage } = useScenarioSort({
  rows: toRef(props, 'rows'),
  deltaKeys: ['apMove', 'rankMove'],
  defaultKey: 'rankCurrent',
  ascendingKeys: ['rankCurrent', 'rankScenario', 'name'],
  revision: () => props.scenario,
  accessors: {
    rankCurrent: (row) => rankOf(row, 'CURRENT'),
    name: (row) => row.name.toLowerCase(),
    apCurrent: (row) => apOf(row, 'CURRENT'),
    apOld: (row) => apOf(row, 'OLD_SCRIPT'),
    apNew: (row) => apOf(row, 'NEW_SCRIPT'),
    apMove: (row) => row.deltas[props.scenario]?.ap ?? null,
    rankScenario: (row) => rankOf(row, props.scenario),
    rankMove: (row) => row.deltas[props.scenario]?.rank ?? null,
  },
})

const columns = computed<TableColumn[]>(() => {
  const tag = SCENARIO_SHORT[props.scenario]
  return [
    { key: 'rankCurrent', label: 'Rank now', sortable: true, align: 'right', width: '108px' },
    { key: 'player', label: 'Player', sortable: false, width: '240px', flex: true },
    { key: 'apCurrent', label: 'AP now', sortable: true, align: 'right', width: '108px' },
    { key: 'apOld', label: 'AP old', sortable: true, align: 'right', width: '108px' },
    { key: 'apNew', label: 'AP new', sortable: true, align: 'right', width: '108px' },
    {
      key: 'apMove',
      label: `Δ AP ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '118px',
    },
    { key: 'rankScenario', label: `Rank ${tag}`, sortable: true, align: 'right', width: '104px' },
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
    id: row.userId,
    userId: row.userId,
    name: row.name,
    country: row.country,
    avatarUrl: pickAvatarUrl(row),
    avatarFallbackUrl: pickAvatarFallback(row),
    rankCurrent: rankOf(row, 'CURRENT'),
    apCurrent: apOf(row, 'CURRENT'),
    apOld: apOf(row, 'OLD_SCRIPT'),
    apNew: apOf(row, 'NEW_SCRIPT'),
    apMove: row.deltas[props.scenario]?.ap ?? null,
    rankScenario: rankOf(row, props.scenario),
    rankMove: row.deltas[props.scenario]?.rank ?? null,
  })),
)

function playerRoute(row: Record<string, unknown>) {
  return { name: 'player-profile', params: { userId: row.userId as string } }
}
</script>

<template>
  <div class="complexity-players">
    <DataTable
      dense
      :columns="columns"
      :rows="tableRows"
      :sort-state="sortState"
      :loading="loading"
      :loading-rows="10"
      row-key="id"
      :row-to="playerRoute"
      empty-message="No players on this board yet"
      @sort="onSort"
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

      <template #cell-apCurrent="{ row }">
        <ScenarioCell :value="(row.apCurrent as number | null)" :decimals="AP_DECIMALS" emphasis />
      </template>

      <template #cell-apOld="{ row }">
        <ScenarioCell :value="(row.apOld as number | null)" :decimals="AP_DECIMALS"
          :emphasis="scenario === 'OLD_SCRIPT'" />
      </template>

      <template #cell-apNew="{ row }">
        <ScenarioCell :value="(row.apNew as number | null)" :decimals="AP_DECIMALS"
          :emphasis="scenario === 'NEW_SCRIPT'" />
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
        <RouterLink class="complexity-players__card" :to="playerRoute(row)">
          <span class="complexity-players__rank" :class="getRankClass(row.rankCurrent as number)">
            {{ row.rankCurrent != null ? `#${row.rankCurrent}` : '–' }}
          </span>
          <GlowImage :src="row.avatarUrl as string" :alt="(row.name as string)" :size="36"
            :fallback-src="(row.avatarFallbackUrl as string | null)" />
          <div class="complexity-players__card-body">
            <span class="complexity-players__name">{{ row.name }}</span>
            <div class="complexity-players__card-values">
              <ScenarioCell :value="(row.apCurrent as number | null)" :decimals="AP_DECIMALS" emphasis />
              <ScenarioCell
                :value="((scenario === 'NEW_SCRIPT' ? row.apNew : row.apOld) as number | null)"
                :delta="(row.apMove as number | null)" :decimals="AP_DECIMALS" emphasis />
              <ScenarioCell delta-only invert :value="(row.rankMove as number | null)"
                :delta="(row.rankMove as number | null)" :decimals="0" />
            </div>
          </div>
        </RouterLink>
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
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  text-decoration: none;
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
