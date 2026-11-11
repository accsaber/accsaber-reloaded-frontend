<script setup lang="ts">
import { useMediaQuery } from '@/composables/useMediaQuery';
import type { SortState, TableColumn } from '@/types/display';
import { formatSortGlyph } from '@/utils/formatters';
import { columnWidth, tableCardQuery, tableNaturalWidth } from '@/utils/tableLayout';
import { computed, onUnmounted, ref, shallowRef, useSlots, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { useRouter } from 'vue-router';
import DataTableCardFallback from './DataTableCardFallback.vue';
import SkeletonLoader from './SkeletonLoader.vue';

const props = defineProps<{
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  sortState?: SortState
  rowClickable?: boolean
  rowTo?: (row: Record<string, unknown>) => RouteLocationRaw | undefined
  rowKey?: string | ((row: Record<string, unknown>, index: number) => string | number)
  loading?: boolean
  loadingRows?: number
  emptyMessage?: string
  rowClass?: (row: Record<string, unknown>, index: number) => string | Record<string, boolean> | undefined
  dense?: boolean
  refreshing?: boolean
}>()

const emit = defineEmits<{
  sort: [key: string]
  rowClick: [row: Record<string, unknown>, index: number]
}>()

const router = useRouter()
const slots = useSlots()
const skeletonCount = computed(() => props.loadingRows ?? 5)
const minWidth = computed(() => tableNaturalWidth(props.columns) + 'px')
const dense = computed(() => props.dense || props.columns.length >= 13)
const mobile = useMediaQuery(() => tableCardQuery(props.columns))
const MAX_SLIDING_ROWS = 10
const shown = shallowRef(props.rows)
const rowHrefs = computed(() => shown.value.map(resolveRowHref))
const staleFrom = ref<number | null>(null)
const cascade = ref(true)
const batches = new WeakMap<Record<string, unknown>, number>()
let batch = 0
let shape = columnShape()
let skeletonShown = !!props.loading

function columnShape(): string {
  return props.columns.map((col) => col.key).join()
}

let swapTimer: ReturnType<typeof setTimeout> | undefined

function swapStep(count: number): number {
  const style = getComputedStyle(document.documentElement)
  const stagger = parseFloat(style.getPropertyValue('--stagger'))
  const total = parseFloat(style.getPropertyValue('--stagger-total'))
  return Math.min(stagger, total / count)
}

function stamp(rows: Record<string, unknown>[]) {
  for (const row of rows) batches.set(row, batch)
}

function renderKey(row: Record<string, unknown>, index: number): string {
  return `${batches.get(row) ?? 0}:${resolveRowKey(row, index)}`
}

let target: Record<string, unknown>[] | null = null
let cursor = 0
let step = 0

function advance() {
  if (!target) return
  cursor++
  if (cursor >= target.length) {
    shown.value = target
    staleFrom.value = null
    target = null
    return
  }
  const rows = shown.value.slice()
  rows[cursor - 1] = target[cursor - 1]
  shown.value = rows
  staleFrom.value = cursor
  swapTimer = setTimeout(advance, step)
}

function swapRows(next: Record<string, unknown>[]) {
  step = swapStep(next.length)
  cursor = 0
  cascade.value = false
  batch++
  stamp(next)
  target = next
  advance()
}

function sameRows(a: Record<string, unknown>[], b: Record<string, unknown>[]): boolean {
  return a.length === b.length && a.every((row, index) => resolveRowKey(row, index) === resolveRowKey(b[index], index))
}

function retarget(next: Record<string, unknown>[]) {
  stamp(next)
  const rows = shown.value.slice()
  for (let index = 0; index < cursor; index++) rows[index] = next[index]
  shown.value = rows
  target = next
}

watch(() => props.rows, (next) => {
  if (target && sameRows(target, next)) return retarget(next)
  clearTimeout(swapTimer)
  target = null
  const prev = shown.value
  const previous = new Map(prev.map((row, index) => [resolveRowKey(row, index), index]))
  const positions = next.map((row, index) => previous.get(resolveRowKey(row, index)))
  const kept = positions.filter((position) => position !== undefined).length
  const moved = positions.filter((position, index) => position !== undefined && position !== index).length
  const replaced = kept * 2 < next.length || moved > MAX_SLIDING_ROWS
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const restart = skeletonShown || shape !== columnShape()
  shape = columnShape()
  skeletonShown = !!props.loading
  if (restart || !replaced || still || !prev.length || !next.length) {
    if (restart) batch++
    stamp(next)
    shown.value = next
    staleFrom.value = null
    cascade.value = restart || !prev.length
  } else {
    swapRows(next)
  }
})

watch(() => props.loading, (loading) => {
  if (loading) skeletonShown = true
})

watch(() => props.refreshing, (refreshing) => {
  if (refreshing && !target) staleFrom.value = 0
  else if (!refreshing && !target) staleFrom.value = null
})

onUnmounted(() => clearTimeout(swapTimer))

function isStale(index: number): boolean {
  return staleFrom.value !== null && index >= staleFrom.value
}

function resolveRowKey(row: Record<string, unknown>, index: number): string | number {
  if (!props.rowKey) return index
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  return (row[props.rowKey] as string | number) ?? index
}

function resolveRowHref(row: Record<string, unknown>): string | undefined {
  const route = props.rowTo?.(row)
  if (!route) return undefined
  return router.resolve(route).href
}

function handleRowClick(row: Record<string, unknown>, index: number, event: MouseEvent) {
  if (props.rowTo) {
    const route = props.rowTo(row)
    if (!route) return
    if (event.ctrlKey || event.metaKey) return
    event.preventDefault()
    router.push(route)
  } else if (props.rowClickable) {
    emit('rowClick', row, index)
  }
}

function handleSort(col: TableColumn) {
  if (col.sortable) emit('sort', col.key)
}

function sortIcon(col: TableColumn): string {
  if (!col.sortable) return ''
  return formatSortGlyph(props.sortState?.key === col.key ? props.sortState.direction : null)
}
</script>

<template>
  <div class="data-table-wrapper">
    <div v-if="!mobile" class="data-table-scroll">
      <table class="data-table" :class="{ 'data-table--dense': dense }" :style="{ minWidth }">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key" class="data-table__th" :class="{
              'data-table__th--sortable': col.sortable,
              'data-table__th--mono': col.mono,
              [`data-table__th--${col.align ?? 'left'}`]: true,
            }" :style="col.width && !col.flex ? { width: `${columnWidth(col)}px` } : undefined" @click="handleSort(col)">
              <svg v-if="col.icon" class="data-table__th-icon" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" role="img" :aria-label="col.label">
                <title>{{ col.label }}</title>
                <path :d="col.icon" />
              </svg>
              <template v-else>{{ col.label }}</template>
              <span v-if="col.sortable" class="data-table__sort-icon">{{ sortIcon(col) }}</span>
            </th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="row" class="stagger" :style="{ '--n': shown.length }">
          <template v-if="loading">
            <tr v-for="i in skeletonCount" :key="'skel-' + i" class="data-table__row"
              :class="{ 'data-table__row--alt': i % 2 === 0 }">
              <td v-for="col in columns" :key="col.key" class="data-table__td">
                <SkeletonLoader variant="text" />
              </td>
            </tr>
          </template>
          <template v-else-if="shown.length === 0">
            <tr key="empty">
              <td :colspan="columns.length" class="data-table__empty">
                <slot name="empty">
                  {{ emptyMessage ?? 'No data available' }}
                </slot>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="(row, index) in shown" :key="renderKey(row, index)" class="data-table__row"
              :class="[{
                'data-table__row--clickable': rowClickable || !!rowTo,
                'data-table__row--alt': index % 2 === 1,
                'data-table__row--stale': isStale(index),
              }, rowClass?.(row, index)]"
              :style="{ '--i': cascade ? index : 0 }"
              @click="handleRowClick(row, index, $event)">
              <td v-for="col in columns" :key="col.key" class="data-table__td" :class="{
                'data-table__td--mono': col.mono,
                [`data-table__td--${col.align ?? 'left'}`]: true,
                'data-table__td--linked': !!rowHrefs[index] && !col.noLink,
              }">
                <a v-if="rowHrefs[index] && !col.noLink" :href="rowHrefs[index]" class="data-table__cell-link" tabindex="-1">
                  <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="index">
                    {{ row[col.key] }}
                  </slot>
                </a>
                <slot v-else :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="index">
                  {{ row[col.key] }}
                </slot>
              </td>
            </tr>
          </template>
        </TransitionGroup>
      </table>
    </div>

    <div v-else class="data-table-cards">
      <template v-if="loading">
        <SkeletonLoader v-for="i in skeletonCount" :key="'skel-card-' + i" variant="card" />
      </template>
      <template v-else-if="shown.length === 0">
        <div class="data-table__empty-card">
          <slot name="empty">{{ emptyMessage ?? 'No data available' }}</slot>
        </div>
      </template>
      <template v-else-if="slots['mobile-card']">
        <div v-for="(row, index) in shown" :key="renderKey(row, index)" class="data-table-cards__custom"
          :class="{ 'data-table__row--stale': isStale(index) }">
          <slot name="mobile-card" :row="row" :index="index" />
        </div>
      </template>
      <template v-else>
        <DataTableCardFallback v-for="(row, index) in shown" :key="renderKey(row, index)" :columns="columns"
          :row="row" :clickable="rowClickable" :class="{ 'data-table__row--stale': isStale(index) }"
          @click="emit('rowClick', row, index)">
          <template v-for="col in columns" :key="col.key" #[`cell-${col.key}`]="slotProps">
            <slot :name="`cell-${col.key}`" :row="slotProps.row" :value="slotProps.value" :index="index">
              {{ slotProps.value }}
            </slot>
          </template>
        </DataTableCardFallback>
      </template>
    </div>
  </div>
</template>

<style scoped>
.data-table-scroll {
  overflow-x: auto;
  overflow-y: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.data-table__th,
.data-table__td,
.data-table__cell-link {
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table__td,
.data-table__cell-link {
  white-space: nowrap;
}

.data-table__th {
  position: sticky;
  top: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: 600;
  white-space: nowrap;
  z-index: 1;
}

.data-table__th--sortable {
  cursor: pointer;
  user-select: none;
}

.data-table__th--sortable:hover {
  color: var(--text-primary);
}

.data-table__th--left {
  text-align: left;
}

.data-table__th--center {
  text-align: center;
}

.data-table__th--right {
  text-align: right;
}

.data-table__th--mono {
  font-family: var(--font-mono);
}

.data-table__th-icon {
  display: inline-block;
  vertical-align: middle;
}

.data-table__sort-icon {
  margin-left: var(--space-xs);
  font-size: 0.7rem;
}

.data-table__row {
  height: 48px;
  background: var(--bg-surface);
  border-left: 2px solid transparent;
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}

.row-move {
  transition:
    transform var(--dur-enter) var(--ease-in-out),
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.row-enter-active {
  transition: opacity var(--dur-enter) var(--ease-out);
}

.row-enter-from {
  opacity: 0;
}

.row-leave-active {
  display: none;
  transition: none;
}

.data-table__row--stale {
  opacity: 0.25;
  pointer-events: none;
}

.data-table__row--alt {
  background: var(--bg-elevated);
}

.data-table__row--clickable {
  cursor: pointer;
}

.data-table__row--clickable:hover {
  border-left-color: var(--accent);
  background: color-mix(in srgb, var(--bg-elevated) 80%, var(--accent) 5%);
}

.data-table__td {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-body);
  color: var(--text-primary);
  vertical-align: middle;
}

.data-table__td--linked {
  padding: 0;
}

.data-table--dense .data-table__th,
.data-table--dense .data-table__td,
.data-table--dense .data-table__cell-link {
  padding-inline: calc(var(--space-sm) * 1.25);
}

.data-table--dense .data-table__td--linked {
  padding-inline: 0;
}

.data-table__cell-link {
  display: block;
  padding: var(--space-sm) var(--space-md);
  color: inherit;
  text-decoration: none;
}

.data-table__td--left {
  text-align: left;
}

.data-table__td--center {
  text-align: center;
}

.data-table__td--right {
  text-align: right;
}

.data-table__td--mono {
  font-family: var(--font-mono);
}

.data-table__empty {
  padding: var(--space-3xl) var(--space-md);
  text-align: center;
  color: var(--text-secondary);
}

.data-table__empty-card {
  padding: var(--space-3xl) var(--space-md);
  text-align: center;
  color: var(--text-secondary);
}

.data-table-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
