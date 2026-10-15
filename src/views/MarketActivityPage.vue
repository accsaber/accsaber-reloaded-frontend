<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useQueryParams } from '@/composables/useQueryParams'
import { useRefetchOnFocus } from '@/composables/useRefetchOnFocus'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import type { MarketListingResponse, MarketListingStatus } from '@/types/api/market'
import type { Tab } from '@/types/display'
import { isSameMarketUser } from '@/utils/market'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarketListingCard, { type ListingCardTag } from './market/MarketListingCard.vue'
import MarketWallet from './market/MarketWallet.vue'

usePageMeta({
  title: 'My Market Activity | AccSaber',
  description: 'Track what you are selling, bidding on, and have won on the AccSaber market.',
})

const router = useRouter()
const { queryRef } = useQueryParams()
const authStore = useAuthStore()
const essenceStore = useEssenceStore()

type TabKey = 'selling' | 'bidding' | 'won'

const involvement = ref<MarketListingResponse[]>([])
const loading = ref(true)
let requestId = 0

const viewerId = computed(() => authStore.userId)

const tabParam = queryRef<TabKey>('tab')
const activeTab = computed<TabKey>({
  get: () => (tabParam.value === 'bidding' || tabParam.value === 'won' ? tabParam.value : 'selling'),
  set: (value) => { tabParam.value = value === 'selling' ? '' : value },
})

const WON: ListingCardTag = { label: 'Won', tone: 'gold' }
const LOST: ListingCardTag = { label: 'Lost', tone: 'neutral' }
const WINNING: ListingCardTag = { label: 'Winning', tone: 'success' }
const OUTBID: ListingCardTag = { label: 'Outbid', tone: 'error' }
const CLOSED_TAG: Partial<Record<MarketListingStatus, ListingCardTag>> = {
  sold: { label: 'Sold', tone: 'success' },
  expired: { label: 'Expired', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

interface Entry {
  listing: MarketListingResponse
  tag: ListingCardTag | null
  rank: number
  order: number
}

function placeOf(l: MarketListingResponse): { tab: TabKey; tag: ListingCardTag | null; rank: number } | null {
  const me = viewerId.value
  const open = l.status === 'active'
  if (isSameMarketUser(l.seller, me)) return { tab: 'selling', tag: CLOSED_TAG[l.status] ?? null, rank: open ? 0 : 1 }
  if (open) return isSameMarketUser(l.currentBidder, me)
    ? { tab: 'bidding', tag: WINNING, rank: 1 }
    : { tab: 'bidding', tag: OUTBID, rank: 0 }
  if (isSameMarketUser(l.winner, me)) return l.status === 'sold' ? { tab: 'won', tag: WON, rank: 0 } : null
  return { tab: 'bidding', tag: LOST, rank: 2 }
}

function sortOrder(l: MarketListingResponse): number {
  if (l.status === 'active') return l.endsAt ? new Date(l.endsAt).getTime() : Number.POSITIVE_INFINITY
  return -new Date(l.settledAt ?? l.endsAt ?? l.createdAt).getTime()
}

const byTab = computed(() => {
  const out: Record<TabKey, Entry[]> = { selling: [], bidding: [], won: [] }
  for (const listing of involvement.value) {
    const place = placeOf(listing)
    if (place) out[place.tab].push({ listing, tag: place.tag, rank: place.rank, order: sortOrder(listing) })
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.rank - b.rank || a.order - b.order)
  return out
})

const tabs = computed<Tab[]>(() => [
  { key: 'selling', label: `Selling (${byTab.value.selling.length})` },
  { key: 'bidding', label: `Bidding (${byTab.value.bidding.length})` },
  { key: 'won', label: `Won (${byTab.value.won.length})` },
])

const EMPTY_MESSAGE: Record<TabKey, string> = {
  selling: 'Nothing listed',
  bidding: 'No bids yet',
  won: 'Nothing won yet',
}

async function fetchActivity(background = false) {
  if (!authStore.isLoggedIn) return
  const id = ++requestId
  if (!background) loading.value = true
  try {
    const { getMyMarketListings } = await import('@/api/market')
    const page = await getMyMarketListings({ page: 0, size: 100 })
    if (id !== requestId) return
    involvement.value = page.content
  } catch {
    if (id !== requestId) return
    if (!background) involvement.value = []
  }
  if (id === requestId && !background) loading.value = false
}

watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      fetchActivity()
      essenceStore.fetchBalance()
    }
  },
  { immediate: true },
)

useRefetchOnFocus(() => fetchActivity(true))

const breadcrumbs: Crumb[] = [
  { label: 'Market Hub', to: { name: 'market' } },
  { label: 'My activity' },
]
</script>

<template>
  <div class="activity-page" :style="{ '--page-accent': 'var(--accent-overall)' }">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="activity-page__header">
      <div>
        <h1 class="activity-page__title">My Market Activity</h1>
      </div>
      <div v-if="authStore.isLoggedIn" class="activity-page__header-actions">
        <MarketWallet
          v-if="essenceStore.balance !== null"
          :balance="essenceStore.balance"
          :reserved="essenceStore.reserved ?? 0"
        />
        <BaseButton variant="primary" href="/market/new">
          List an item
        </BaseButton>
      </div>
    </div>

    <EmptyState v-if="!authStore.isLoggedIn" message="Sign in to see your market activity." />

    <template v-else>
      <BaseTabs :tabs="tabs" :model-value="activeTab" @update:model-value="activeTab = $event as TabKey" />

      <div v-if="loading" class="activity-page__grid">
        <SkeletonLoader v-for="i in 8" :key="i" variant="card" />
      </div>

      <EmptyState
        v-else-if="byTab[activeTab].length === 0"
        :message="EMPTY_MESSAGE[activeTab]"
        :action-label="activeTab === 'selling' ? 'List an item' : 'Browse the market'"
        @action="
          router.push({ name: activeTab === 'selling' ? 'market-new' : 'market' })
        "
      />

      <div v-else class="activity-page__grid">
        <MarketListingCard
          v-for="entry in byTab[activeTab]"
          :key="entry.listing.id"
          :listing="entry.listing"
          :tag="entry.tag"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.activity-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.activity-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.activity-page__header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.activity-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

@media (max-width: 767px) {
  .activity-page__grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>
