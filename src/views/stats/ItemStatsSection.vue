<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import { useQueryParams } from '@/composables/useQueryParams'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ItemResponse } from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { computed, onMounted, ref, watch } from 'vue'
import ItemHoldersTooltip from './ItemHoldersTooltip.vue'
import ItemStatsItemCell from './ItemStatsItemCell.vue'
import ItemStatsModifiers from './ItemStatsModifiers.vue'
import StatsBar from './StatsBar.vue'
import StatsBoardPicker from './StatsBoardPicker.vue'
import StatsCountrySelect from './StatsCountrySelect.vue'
import StatsTable from './StatsTable.vue'
import { fmt, mainCol, numCol, playerCol, rankCol } from './statsFormat'
import { useStatsBoard, type StatsBoardDef } from './useStatsBoard'

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

const itemCol: TableColumn = { key: 'item', label: 'Item', align: 'left' }
const ownerCol = (label: string): TableColumn => ({ ...playerCol, label, width: '240px' })

const BOARDS: BoardDef[] = [
  {
    key: 'most-items', label: 'Most Items', icon: 'package', players: true,
    columns: [rankCol, playerCol, mainCol('itemCount', 'Items', 120)],
    sort: 'itemCount,desc', country: true, filters: ['type', 'modifier'],
    fetch: (api, params, q) => api.getMostItems(params, q.type, q.modifier, q.country),
  },
  {
    key: 'most-crates-opened', label: 'Most Crates Opened', icon: 'crate', players: true,
    columns: [rankCol, playerCol, mainCol('crateCount', 'Crates', 120)],
    sort: 'crateCount,desc', country: true, filters: ['crate'],
    fetch: (api, params, q) => api.getMostCratesOpened(params, q.crate, q.country),
  },
  {
    key: 'most-valuable-inventory', label: 'Most Valuable Inventory', icon: 'gem', players: true,
    columns: [
      rankCol, playerCol,
      numCol('itemsValue', 'Items', 110, fmt.essence),
      numCol('essenceBalance', 'Essence', 110, fmt.essence),
      { ...numCol('totalValue', 'Total', 120, fmt.essence), primary: true, cellClass: () => 'stats-essence' },
    ],
    sort: 'totalValue,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getMostValuableInventory(params, q.country),
  },
  {
    key: 'first-editions', label: 'First Editions', icon: 'award', players: true,
    columns: [rankCol, playerCol, mainCol('firstEditionCount', 'First Editions', 150)],
    sort: 'firstEditionCount,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getFirstEditions(params, q.country),
  },
  {
    key: 'most-complete-collection', label: 'Most Complete Collection', icon: 'layers', players: true,
    columns: [
      rankCol, playerCol,
      numCol('ownedCount', 'Owned', 100),
      numCol('catalogTotal', 'Catalog', 100),
      mainCol('completionPercent', 'Complete', 110, fmt.percentPoint),
    ],
    sort: 'completionPercent,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getMostCompleteCollection(params, q.country),
  },
  {
    key: 'biggest-traders', label: 'Biggest Traders', icon: 'swap', players: true,
    columns: [rankCol, playerCol, mainCol('tradeCount', 'Trades', 110), numCol('itemsTraded', 'Items Traded', 140)],
    sort: 'tradeCount,desc', country: true, filters: [],
    fetch: (api, params, q) => api.getBiggestTraders(params, q.country),
  },
  {
    key: 'rarest-unboxed', label: 'Rarest Items Unboxed', icon: 'gift', players: true,
    columns: [rankCol, itemCol, { key: 'modifiers', label: 'Modifiers', align: 'left' }, ownerCol('Owner')],
    country: true, filters: [],
    fetch: (api, params, q) => api.getRarestUnboxed(params, q.country),
  },
  {
    key: 'first-edition-holders', label: 'First Edition Holders', icon: 'medal', players: true,
    columns: [rankCol, itemCol, ownerCol('Holder')],
    country: true, filters: [],
    fetch: (api, params, q) => api.getFirstEditionHolders(params, q.country),
  },
  {
    key: 'rarest-items', label: 'Item Scarcity', icon: 'gauge',
    columns: [rankCol, itemCol, mainCol('ownerCount', 'Owners', 110), numCol('instanceCount', 'Copies', 110)],
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
  activeBoard, boardDef, boardOptions, selectBoard, rowTo, currentPage, setPage, loading, rows, totalPages,
  totalElements,
} = useStatsBoard(BOARDS, { filters: boardFilters })

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
  <div class="stats-section">
    <StatsBoardPicker :model-value="activeBoard" :options="boardOptions"
      @update:model-value="selectBoard($event, { type: undefined, modifier: undefined, crate: undefined })" />

    <StatsBar :count="totalElements">
      <StatsCountrySelect v-if="boardDef.country" />
      <BaseSelect v-if="boardDef.filters.includes('type')" :model-value="typeFilter" :options="typeOptions"
        placeholder="All Types" searchable @update:model-value="typeFilter = $event" />
      <BaseSelect v-if="boardDef.filters.includes('modifier')" :model-value="modifierFilter" :options="modifierOptions"
        placeholder="All Modifiers" searchable @update:model-value="modifierFilter = $event" />
      <BaseSelect v-if="boardDef.filters.includes('crate')" :model-value="crateFilter" :options="crateOptions"
        placeholder="All Crates" searchable @update:model-value="crateFilter = $event" />
    </StatsBar>

    <StatsTable :columns="boardDef.columns" :rows="rows" :loading="loading" :page="currentPage"
      :total-pages="totalPages" :row-to="rowTo" @update:page="setPage">
      <template #cell-item="{ row }">
        <ItemStatsItemCell :item="(row.item as ItemResponse | null | undefined) ?? null"
          :serial="(row.serialNumber as number | null | undefined)">
          <ItemHoldersTooltip v-if="activeBoard === 'rarest-items'" :item-id="(row.itemId as string)"
            :item-name="(row.item as ItemResponse | null | undefined)?.name ?? ''"
            :owner-count="(row.ownerCount as number)" />
        </ItemStatsItemCell>
      </template>
      <template #cell-modifiers="{ row }">
        <ItemStatsModifiers :modifiers="row.modifiers" :unusual-effect="(row.unusualEffect as string | null)" />
      </template>
    </StatsTable>
  </div>
</template>
