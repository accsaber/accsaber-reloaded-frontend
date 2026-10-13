<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useItemTypeStore } from '@/stores/itemTypes'
import { useQueryParams } from '@/composables/useQueryParams'
import type { ItemResponse } from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { storeCountry } from '@/utils/statsCountry'
import { computed, onMounted, ref, watch } from 'vue'
import ItemStatsTable from './ItemStatsTable.vue'
import LeaderboardPicker from './LeaderboardPicker.vue'
import { useStatsBoard, type StatsBoardDef } from './useStatsBoard'

defineProps<{
  accent: string
  countryOptions: { value: string; label: string }[]
}>()

type ItemStatsBoard =
  | 'most-items'
  | 'most-crates-opened'
  | 'most-valuable-inventory'
  | 'first-editions'
  | 'most-complete-collection'
  | 'biggest-traders'
  | 'rarest-unboxed'
  | 'first-edition-holders'
  | 'rarest-items'

type BoardFilter = 'type' | 'modifier' | 'crate'

interface BoardQuery {
  country?: string
  type?: string
  modifier?: string
  crate?: string
}

interface BoardDef extends StatsBoardDef<ItemStatsBoard, BoardQuery> {
  country: boolean
  filters: BoardFilter[]
}

const rankCol: TableColumn = { key: 'rank', label: '#', align: 'right', mono: true, width: '76px' }
const playerCol: TableColumn = { key: 'player', label: 'Player', align: 'left' }
const itemCol: TableColumn = { key: 'item', label: 'Item', align: 'left' }

const BOARDS: BoardDef[] = [
  {
    key: 'most-items', label: 'Most Items', icon: 'package',
    columns: [rankCol, playerCol, { key: 'itemCount', label: 'Items', align: 'right', mono: true, width: '120px' }],
    sort: 'itemCount,desc', country: true, filters: ['type', 'modifier'],
    fetch: (api, params, q) => api.getMostItems(params, q.type, q.modifier, q.country),
  },
  {
    key: 'most-crates-opened', label: 'Most Crates Opened', icon: 'crate',
    columns: [rankCol, playerCol, { key: 'crateCount', label: 'Crates', align: 'right', mono: true, width: '120px' }],
    sort: 'crateCount,desc', country: true, filters: ['crate'],
    fetch: (api, params, q) => api.getMostCratesOpened(params, q.crate, q.country),
  },
  {
    key: 'most-valuable-inventory', label: 'Most Valuable Inventory', icon: 'gem',
    columns: [
      rankCol, playerCol,
      { key: 'itemsValue', label: 'Items', align: 'right', mono: true, width: '110px' },
      { key: 'essenceBalance', label: 'Essence', align: 'right', mono: true, width: '110px' },
      { key: 'totalValue', label: 'Total', align: 'right', mono: true, width: '120px' },
    ],
    sort: 'totalValue,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getMostValuableInventory(params, q.country),
  },
  {
    key: 'first-editions', label: 'First Editions', icon: 'award',
    columns: [rankCol, playerCol, { key: 'firstEditionCount', label: 'First Editions', align: 'right', mono: true, width: '150px' }],
    sort: 'firstEditionCount,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getFirstEditions(params, q.country),
  },
  {
    key: 'most-complete-collection', label: 'Most Complete Collection', icon: 'layers',
    columns: [
      rankCol, playerCol,
      { key: 'ownedCount', label: 'Owned', align: 'right', mono: true, width: '100px' },
      { key: 'catalogTotal', label: 'Catalog', align: 'right', mono: true, width: '100px' },
      { key: 'completionPercent', label: 'Complete', align: 'right', mono: true, width: '110px' },
    ],
    sort: 'completionPercent,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getMostCompleteCollection(params, q.country),
  },
  {
    key: 'biggest-traders', label: 'Biggest Traders', icon: 'swap',
    columns: [
      rankCol, playerCol,
      { key: 'tradeCount', label: 'Trades', align: 'right', mono: true, width: '110px' },
      { key: 'itemsTraded', label: 'Items Traded', align: 'right', mono: true, width: '140px' },
    ],
    sort: 'tradeCount,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getBiggestTraders(params, q.country),
  },
  {
    key: 'rarest-unboxed', label: 'Rarest Items Unboxed', icon: 'gift',
    columns: [
      rankCol, itemCol,
      { key: 'modifiers', label: 'Modifiers', align: 'left' },
      { key: 'owner', label: 'Owner', align: 'left', width: '220px' },
    ],
    country: true, filters: [],
    fetch: (api, params, q) => api.getRarestUnboxed(params, q.country),
  },
  {
    key: 'first-edition-holders', label: 'First Edition Holders', icon: 'medal',
    columns: [rankCol, itemCol, { key: 'owner', label: 'Holder', align: 'left', width: '220px' }],
    country: true, filters: [],
    fetch: (api, params, q) => api.getFirstEditionHolders(params, q.country),
  },
  {
    key: 'rarest-items', label: 'Item Scarcity', icon: 'gauge',
    columns: [
      rankCol, itemCol,
      { key: 'ownerCount', label: 'Owners', align: 'right', mono: true, width: '110px' },
      { key: 'instanceCount', label: 'Count', align: 'right', mono: true, width: '110px' },
    ],
    sort: 'instanceCount,asc', country: false, filters: [],
    fetch: (api, params) => api.getRarestItems(params),
  },
]

const itemTypeStore = useItemTypeStore()
const modifierStore = useItemModifierStore()
const { queryRef } = useQueryParams()

const countryFilter = queryRef('country')
const typeFilter = queryRef('type')
const modifierFilter = queryRef('modifier')
const crateFilter = queryRef('crate')

function boardFilters(def: BoardDef): BoardQuery {
  return {
    country: def.country ? countryFilter.value || undefined : undefined,
    type: typeFilter.value || undefined,
    modifier: modifierFilter.value || undefined,
    crate: crateFilter.value || undefined,
  }
}

const {
  activeBoard, boardDef, pickerOptions, selectBoard, currentPage, setPage, loading, rows, totalPages, totalElements,
} = useStatsBoard(BOARDS, { size: 50, filters: boardFilters })

function setCountry(country: string) {
  storeCountry(country)
  countryFilter.value = country
}

onMounted(() => {
  itemTypeStore.fetchItemTypes()
  modifierStore.fetchModifiers()
})

const typeOptions = computed(() => [
  { value: '', label: 'All Types' },
  ...itemTypeStore.itemTypes.map((t) => ({ value: t.key, label: t.name })),
])

const modifierOptions = computed(() => [
  { value: '', label: 'All Modifiers' },
  ...modifierStore.modifiers.map((m) => ({ value: m.key, label: m.name })),
])

const crates = ref<ItemResponse[]>([])
const crateOptions = computed(() => [
  { value: '', label: 'All Crates' },
  ...crates.value.map((c) => ({ value: c.id, label: c.name })),
])

async function fetchCrates() {
  if (crates.value.length) return
  await itemTypeStore.fetchItemTypes()
  const crateTypeId = itemTypeStore.byKey.get('crate')?.id
  if (!crateTypeId) return
  try {
    const { getItems } = await import('@/api/items')
    crates.value = await getItems({ typeId: crateTypeId })
  } catch {
    return
  }
}

watch(activeBoard, (board) => {
  if (board === 'most-crates-opened') fetchCrates()
}, { immediate: true })
</script>

<template>
  <div class="item-stats" :style="{ '--accent': accent }">
    <div class="item-stats__filters">
      <BaseSelect v-if="boardDef.country" :model-value="countryFilter" :options="countryOptions"
        placeholder="All Countries" searchable @update:model-value="setCountry" />
      <BaseSelect v-if="boardDef.filters.includes('type')" :model-value="typeFilter" :options="typeOptions"
        placeholder="All Types" searchable @update:model-value="typeFilter = $event" />
      <BaseSelect v-if="boardDef.filters.includes('modifier')" :model-value="modifierFilter" :options="modifierOptions"
        placeholder="All Modifiers" searchable @update:model-value="modifierFilter = $event" />
      <BaseSelect v-if="boardDef.filters.includes('crate')" :model-value="crateFilter" :options="crateOptions"
        placeholder="All Crates" searchable @update:model-value="crateFilter = $event" />
    </div>

    <LeaderboardPicker :model-value="activeBoard" :options="pickerOptions"
      @update:model-value="selectBoard($event, { type: undefined, modifier: undefined, crate: undefined })" />

    <p v-if="totalElements > 0" class="item-stats__count">{{ totalElements.toLocaleString() }} records</p>

    <div class="item-stats__table">
      <ItemStatsTable :columns="boardDef.columns" :rows="rows" :loading="loading" :board="activeBoard" />
    </div>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </div>
</template>

<style scoped>
.item-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  --page-accent: var(--accent);
}

.item-stats__filters {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.item-stats__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  text-align: right;
  margin: 0;
}

.item-stats__table {
  --accent: var(--page-accent);
}
</style>
