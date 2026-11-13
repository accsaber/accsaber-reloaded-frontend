<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import { getRankClass } from '@/utils/ranking'
import { computed, useSlots } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'
import { STATS_PAGE_SIZE } from './statsFormat'
import './statsTable.css'

type Row = Record<string, unknown>

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: Row[]
  loading?: boolean
  page?: number
  totalPages?: number
  pageSize?: number
  rowKey?: string | ((row: Row, index: number) => string | number)
  rowTo?: (row: Row) => RouteLocationRaw | undefined
  rowClickable?: boolean
  rowClass?: (row: Row) => string | undefined
  emptyMessage?: string
}>(), {
  page: 1,
  totalPages: 0,
  pageSize: STATS_PAGE_SIZE,
  rowKey: 'rank',
  emptyMessage: 'No records found',
})

const emit = defineEmits<{ rowClick: [row: Row]; 'update:page': [page: number] }>()

const router = useRouter()
const slots = useSlots()

const cellSlots = computed(() => Object.keys(slots).filter((name) => name.startsWith('cell-')))

const hasRank = computed(() => props.columns.some((c) => c.key === 'rank'))
const identity = computed(() => props.columns.find((c) => c.key !== 'rank'))
const primary = computed(() => props.columns.find((c) => c.primary))
const rest = computed(() =>
  props.columns.filter((c) => c.key !== 'rank' && c !== identity.value && c !== primary.value && c.label),
)

function text(col: TableColumn, row: Row): unknown {
  return col.format ? col.format(row[col.key], row) : row[col.key]
}

function onCardClick(row: Row) {
  const target = props.rowTo?.(row)
  if (target) router.push(target)
  else if (props.rowClickable) emit('rowClick', row)
}
</script>

<template>
  <div class="stats-table">
    <DataTable :columns="columns" :rows="rows" :loading="loading && rows.length === 0"
      :refreshing="loading && rows.length > 0" :loading-rows="pageSize" :row-key="rowKey"
      :row-clickable="rowClickable || !!rowTo" :row-to="rowTo" :row-class="rowClass" :empty-message="emptyMessage"
      @row-click="emit('rowClick', $event)">
      <template #cell-rank="{ value }">
        <span class="rank" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>

      <template #cell-player="{ row }">
        <UserChip :user="(row.player as UserRefDisplay)" tooltip />
      </template>

      <template v-for="name in cellSlots" :key="name" #[name]="scope">
        <slot :name="name" v-bind="scope" />
      </template>

      <template #mobile-card="{ row, index }">
        <div class="stats-row" :class="[{ 'stats-row--link': rowClickable || !!rowTo }, rowClass?.(row)]"
          @click="onCardClick(row)">
          <span v-if="hasRank" class="rank stats-row__rank" :class="getRankClass(row.rank as number)">
            #{{ row.rank }}
          </span>
          <div v-if="identity" class="stats-row__identity">
            <UserChip v-if="identity.key === 'player'" :user="(row.player as UserRefDisplay)" size="sm" />
            <slot v-else :name="`cell-${identity.key}`" :row="row" :value="row[identity.key]" :index="index">
              {{ text(identity, row) }}
            </slot>
          </div>
          <span v-if="primary" class="stats-row__primary" :class="primary.cellClass?.(row[primary.key], row)">
            <slot :name="`cell-${primary.key}`" :row="row" :value="row[primary.key]" :index="index">
              {{ text(primary, row) }}
            </slot>
          </span>
          <dl v-if="rest.length" class="stats-row__rest">
            <div v-for="col in rest" :key="col.key" :class="{ 'stats-row__wide': !col.format && !col.mono }">
              <dt v-if="col.format || col.mono" class="caption">{{ col.label }}</dt>
              <dd :class="col.cellClass?.(row[col.key], row)">
                <UserChip v-if="col.key === 'player'" :user="(row.player as UserRefDisplay)" size="sm" />
                <slot v-else :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="index">
                  {{ text(col, row) }}
                </slot>
              </dd>
            </div>
          </dl>
        </div>
      </template>
    </DataTable>

    <div v-if="totalPages > 1 || loading" class="stats-table__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages"
        @update:page="emit('update:page', $event)" />
    </div>
  </div>
</template>

<style scoped>
.stats-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.stats-table__pages {
  min-height: var(--control-h);
}

.stats-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.stats-row--link {
  cursor: pointer;
}

.stats-row__rank {
  min-width: 32px;
  text-align: right;
}

.stats-row__identity {
  grid-column: 2;
  min-width: 0;
}

.stats-row__primary {
  grid-column: 3;
  font-family: var(--font-mono);
}

.stats-row__rest {
  grid-column: 2 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-xs) var(--space-sm);
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-primary);
}

.stats-row__rest div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stats-row__rest .stats-row__wide {
  grid-column: 1 / -1;
}

.stats-row__rest div:not(.stats-row__wide) dd {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.stats-row__rest dd {
  margin: 0;
  min-width: 0;
  font-family: var(--font-mono);
}
</style>
