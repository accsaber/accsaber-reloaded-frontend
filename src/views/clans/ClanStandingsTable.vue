<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import type { SortState, TableColumn } from '@/types/display'
import { getRankClass } from '@/utils/ranking'
import { computed } from 'vue'
import ClanPacifistBadge from './ClanPacifistBadge.vue'
import ClanPodium from './ClanPodium.vue'

export interface StandingsRow extends Record<string, unknown> {
  rank: number
  clan: PublicClanResponse
  standing: string
  pacifist?: boolean
  meta?: string
}

const props = defineProps<{
  columns: TableColumn[]
  rows: StandingsRow[]
  loading: boolean
  podium: boolean
  page: number
  totalPages: number
  emptyMessage: string
  sortState?: SortState
}>()

const emit = defineEmits<{ page: [page: number]; sort: [key: string] }>()

const podiumEntries = computed(() =>
  props.podium
    ? props.rows.slice(0, 3).map((r) => ({ rank: r.rank, clan: r.clan, value: r.standing, pacifist: r.pacifist }))
    : [],
)
const tableRows = computed(() => (props.podium ? props.rows.slice(3) : props.rows))
const showTable = computed(() => props.loading || tableRows.value.length > 0 || podiumEntries.value.length === 0)

function rowTo(row: Record<string, unknown>) {
  return { name: 'clan-detail', params: { slugOrId: (row.clan as PublicClanResponse).slug } }
}

function asRow(row: Record<string, unknown>): StandingsRow {
  return row as StandingsRow
}
</script>

<template>
  <ClanPodium v-if="podium && (loading || podiumEntries.length)" :entries="podiumEntries" :loading="loading" />

  <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="emit('page', $event)" />

  <DataTable
    v-if="showTable"
    :columns="columns"
    :rows="tableRows"
    :sort-state="sortState"
    :loading="loading"
    :loading-rows="8"
    :row-to="rowTo"
    row-key="rank"
    :empty-message="emptyMessage"
    @sort="emit('sort', $event)"
  >
    <template #cell-rank="{ value }">
      <span class="standings__rank" :class="getRankClass(value as number)">#{{ value }}</span>
    </template>

    <template #cell-clan="{ row }">
      <span class="standings__identity">
        <ClanIcon :clan="asRow(row).clan" :size="32" />
        <ClanTag :clan="asRow(row).clan" size="md" effects />
        <ClanName class="standings__name" :clan="asRow(row).clan" />
        <ClanPacifistBadge v-if="asRow(row).pacifist" />
      </span>
    </template>

    <template #cell-standing="{ value }">
      <span class="standings__standing">{{ value }}</span>
    </template>

    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>

    <template #mobile-card="{ row }">
      <RouterLink :to="rowTo(row)" class="standings-card">
        <span class="standings__rank standings-card__rank" :class="getRankClass(asRow(row).rank)">#{{ asRow(row).rank }}</span>
        <span class="standings-card__identity">
          <ClanIcon :clan="asRow(row).clan" :size="32" />
          <ClanTag :clan="asRow(row).clan" size="md" effects />
          <ClanName class="standings__name" :clan="asRow(row).clan" />
          <ClanPacifistBadge v-if="asRow(row).pacifist" />
          <span v-if="asRow(row).meta" class="standings-card__meta">{{ asRow(row).meta }}</span>
        </span>
        <span class="standings__standing">{{ asRow(row).standing }}</span>
      </RouterLink>
    </template>
  </DataTable>

  <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="emit('page', $event)" />
</template>

<style scoped>
.standings__rank {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-secondary);
}

.standings__rank.rank--gold {
  color: var(--tier-gold);
  font-weight: 700;
}

.standings__rank.rank--silver {
  color: var(--tier-silver);
  font-weight: 700;
}

.standings__rank.rank--bronze {
  color: var(--tier-bronze);
  font-weight: 700;
}

.standings__identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  font-size: var(--text-card-title);
}

.standings__name {
  font-weight: 600;
  color: var(--text-primary);
}

.standings__standing {
  font-weight: 600;
  color: var(--page-accent, var(--accent));
}

.standings-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: inherit;
  text-decoration: none;
}

.standings-card__rank {
  min-width: 36px;
}

.standings-card__identity {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  min-width: 0;
}

.standings-card__meta {
  width: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
