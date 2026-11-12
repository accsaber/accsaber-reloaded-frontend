<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import ItemFilterPanel from '@/components/domain/ItemFilterPanel.vue'
import { useItemFilterOptions } from '@/composables/useItemFilterOptions'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useRefetchOnFocus } from '@/composables/useRefetchOnFocus'
import { useRowSwap } from '@/composables/useRowSwap'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import { useTradeStore } from '@/stores/trades'
import type { ItemRarity } from '@/types/api/items'
import type {
  MarketBrowseParams,
  MarketKind,
  MarketListingResponse,
  MarketSortOption,
} from '@/types/api/market'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarketListingCard from './market/MarketListingCard.vue'
import MarketWallet from './market/MarketWallet.vue'

usePageMeta({
  title: 'Market Hub | AccSaber',
  description: 'Buy, sell, bid on, and trade AccSaber items.',
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const essenceStore = useEssenceStore()
const tradeStore = useTradeStore()
const { setQuery, queryRef, queryListRef } = useQueryParams()
const { currentPage, setPage } = usePageableRoute({ defaultSort: 'ending_soon', defaultSize: 30, secondarySort: null })

const { typeGroups, modifierOptions, effectGroups, ungroupedEffects } = useItemFilterOptions({
  effects: true,
})

const SORT_OPTIONS: { value: MarketSortOption; label: string }[] = [
  { value: 'ending_soon', label: 'Ending soon' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

const ALL_KINDS = 'all'
const KIND_TABS = [
  { key: ALL_KINDS, label: 'All' },
  { key: 'auction', label: 'Auctions' },
  { key: 'shop', label: 'Buy now' },
]

const search = queryRef('search')
const rarities = queryListRef<ItemRarity>('rarity')
const typeKeys = queryListRef('type')
const modifierKeys = queryListRef('modifier')
const effectKeys = queryListRef('effect')
const kindParam = queryRef<MarketKind>('kind')
const sortParam = queryRef<MarketSortOption>('sort')

const kind = computed<MarketKind | ''>({
  get: () => (kindParam.value === 'auction' || kindParam.value === 'shop' ? kindParam.value : ''),
  set: (value) => { kindParam.value = value },
})

const sortBy = computed<MarketSortOption>({
  get: () => (SORT_OPTIONS.some((o) => o.value === sortParam.value) ? (sortParam.value as MarketSortOption) : 'ending_soon'),
  set: (value) => { sortParam.value = value === 'ending_soon' ? '' : value },
})

function priceRef(key: string) {
  return computed<number | null>({
    get: () => {
      const value = Number(route.query[key])
      return Number.isSafeInteger(value) && value > 0 ? value : null
    },
    set: (value) => setQuery({ [key]: value != null ? String(value) : undefined }),
  })
}

const minPrice = priceRef('min')
const maxPrice = priceRef('max')

const hasPanelFilters = computed(
  () =>
    rarities.value.length > 0 ||
    typeKeys.value.length > 0 ||
    modifierKeys.value.length > 0 ||
    effectKeys.value.length > 0 ||
    minPrice.value != null ||
    maxPrice.value != null,
)
const hasActiveFilters = computed(() => hasPanelFilters.value || kind.value !== '')

function clearFilters() {
  setQuery({
    rarity: undefined,
    type: undefined,
    modifier: undefined,
    effect: undefined,
    kind: undefined,
    min: undefined,
    max: undefined,
  })
}

const emptyState = computed(() => {
  if (hasActiveFilters.value) return { message: 'No listings match your filters', action: 'Clear filters', run: clearFilters }
  if (search.value) return { message: 'No listings found', action: undefined, run: undefined }
  return {
    message: 'No listings yet',
    action: authStore.isLoggedIn ? 'List an item' : undefined,
    run: () => router.push({ name: 'market-new' }),
  }
})

const filtersOpen = ref(false)
const listings = ref<MarketListingResponse[]>([])
const totalPages = ref(0)
const totalElements = ref(0)
const loading = ref(true)
let requestId = 0

const { shown, cascade, isStale, renderKey } = useRowSwap(() => listings.value, {
  key: (listing) => listing.id,
  refreshing: () => loading.value,
})

const browseParams = computed<MarketBrowseParams>(() => ({
  search: search.value.trim() || undefined,
  rarity: rarities.value.length > 0 ? rarities.value : undefined,
  typeKey: typeKeys.value.length > 0 ? typeKeys.value : undefined,
  modifierKey: modifierKeys.value.length > 0 ? modifierKeys.value : undefined,
  effectKey: effectKeys.value.length > 0 ? effectKeys.value : undefined,
  kind: kind.value || undefined,
  minPrice: minPrice.value ?? undefined,
  maxPrice: maxPrice.value ?? undefined,
  sortBy: sortBy.value,
  page: currentPage.value - 1,
  size: 30,
}))

async function fetchListings(background = false) {
  const id = ++requestId
  if (!background) loading.value = true
  try {
    const { getMarketListings } = await import('@/api/market')
    const page = await getMarketListings(browseParams.value)
    if (id !== requestId) return
    listings.value = page.content
    totalPages.value = page.totalPages
    totalElements.value = page.totalElements
  } catch {
    if (id !== requestId) return
    listings.value = []
    totalPages.value = 0
    totalElements.value = 0
  }
  if (id === requestId) loading.value = false
}

watch(browseParams, () => fetchListings(), { immediate: true })
useRefetchOnFocus(() => fetchListings(true))

watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      essenceStore.fetchBalance()
      tradeStore.refreshIncomingCount()
    }
  },
  { immediate: true },
)

</script>

<template>
  <div class="market-page">
    <div class="market-page__header">
      <div class="market-page__title">
        <h1>Market Hub</h1>
        <span v-if="totalElements" class="caption">
          {{ totalElements.toLocaleString() }} active {{ totalElements === 1 ? 'listing' : 'listings' }}
        </span>
      </div>
      <div v-if="authStore.isLoggedIn" class="market-page__actions">
        <MarketWallet
          v-if="essenceStore.balance !== null"
          :balance="essenceStore.balance"
          :reserved="essenceStore.reserved ?? 0"
        />
        <BaseButton href="/trade-offers">
          Trade offers{{ tradeStore.pendingIncomingCount > 0 ? ` (${tradeStore.pendingIncomingCount})` : '' }}
        </BaseButton>
        <BaseButton href="/market/me">My activity</BaseButton>
        <BaseButton variant="primary" href="/market/new">List an item</BaseButton>
      </div>
    </div>

    <div class="market-page__controls">
      <div class="market-page__controls-left">
        <BaseTabs :tabs="KIND_TABS" :model-value="kind || ALL_KINDS" variant="segmented" label="Listing kind"
          @update:model-value="kind = $event === ALL_KINDS ? '' : ($event as MarketKind)" />
        <SearchBox v-model="search" placeholder="Search titles or item names..." />
      </div>
      <div class="market-page__controls-right">
        <BaseSelect
          :options="SORT_OPTIONS"
          :model-value="sortBy"
          @update:model-value="sortBy = $event as MarketSortOption"
        />
        <FilterPopover :open="filtersOpen" @update:open="filtersOpen = $event">
          <template #trigger>
            <FilterButton :active="filtersOpen || hasPanelFilters" />
          </template>
          <ItemFilterPanel
            :rarities="rarities"
            :type-keys="typeKeys"
            :type-groups="typeGroups"
            :modifier-keys="modifierKeys"
            :modifier-options="modifierOptions"
            :effect-keys="effectKeys"
            :effect-groups="effectGroups"
            :ungrouped-effects="ungroupedEffects"
            show-price
            :min-price="minPrice"
            :max-price="maxPrice"
            :has-active-filters="hasPanelFilters"
            @update:rarities="rarities = $event"
            @update:type-keys="typeKeys = $event"
            @update:modifier-keys="modifierKeys = $event"
            @update:effect-keys="effectKeys = $event"
            @update:min-price="minPrice = $event"
            @update:max-price="maxPrice = $event"
            @clear="clearFilters"
          />
        </FilterPopover>
      </div>
    </div>

    <div v-if="loading && shown.length === 0" class="market-page__reserved" aria-busy="true" />

    <EmptyState
      v-else-if="shown.length === 0"
      :message="emptyState.message"
      :action-label="emptyState.action"
      @action="emptyState.run?.()"
    />

    <template v-else>
      <div class="market-page__grid stagger" :style="{ '--n': shown.length }">
        <MarketListingCard v-for="(listing, i) in shown" :key="renderKey(listing, i)" :listing="listing"
          :class="{ stale: isStale(i) }" :style="{ '--i': cascade ? i : 0 }" />
      </div>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages"
        @update:page="setPage" />
    </template>
  </div>
</template>

<style scoped>
.market-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.market-page__header,
.market-page__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.market-page__title,
.market-page__actions,
.market-page__controls-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.market-page__title {
  align-items: baseline;
  gap: var(--space-md);
}

.market-page__controls-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  flex: 1;
}

.market-page__controls-left :deep(.search-box) {
  flex: 1 1 280px;
  max-width: 420px;
}

.market-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.market-page__reserved {
  min-height: 60vh;
}

@media (max-width: 767px) {
  .market-page__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .market-page__controls-left {
    flex-basis: 100%;
  }

  .market-page__controls-left :deep(.search-box) {
    flex-basis: 100%;
    max-width: none;
  }
}
</style>
