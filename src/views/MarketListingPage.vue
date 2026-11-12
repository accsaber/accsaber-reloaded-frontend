<script setup lang="ts">
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ModifierChip from '@/components/domain/ModifierChip.vue'
import { parseApiError } from '@/api/client'
import { useMarketListingSocket } from '@/composables/useMarketListingSocket'
import { usePageMeta } from '@/composables/usePageMeta'
import { useNow } from '@/composables/useNow'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import { useItemTypeStore } from '@/stores/itemTypes'
import { useModifierColor } from '@/composables/useModifierColor'
import type { ItemModifierRef } from '@/types/api/items'
import type {
  MarketBidResponse,
  MarketListingEvent,
  MarketListingResponse,
} from '@/types/api/market'
import { formatRelativeDate } from '@/utils/formatters'
import {
  displayItemName,
  itemVariantPreviews,
  rarityClass,
  sortModifiersByKey,
  visibleModifiers,
} from '@/utils/items'
import { formatEssence } from '@/utils/essence'
import { isAuction, isSameMarketUser, listingPrice } from '@/utils/market'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import EssenceAmount from '@/components/domain/EssenceAmount.vue'
import ListingCountdown from './market/ListingCountdown.vue'
import MarketBidHistory from './market/MarketBidHistory.vue'
import MarketBidPanel from './market/MarketBidPanel.vue'
import MarketItemTile from './market/MarketItemTile.vue'
import UserChip from '@/components/domain/UserChip.vue'

const route = useRoute()
const authStore = useAuthStore()
const essenceStore = useEssenceStore()
const itemTypeStore = useItemTypeStore()

const listingId = computed(() => String(route.params.listingId ?? ''))

const listing = ref<MarketListingResponse | null>(null)
const bids = ref<MarketBidResponse[]>([])
const loading = ref(true)
const notFound = ref(false)
const actionBusy = ref(false)
const amountError = ref<string | null>(null)
const formError = ref<string | null>(null)
const cancelArmed = ref(false)

const now = useNow(1000)

const viewerId = computed(() => authStore.userId)
const active = computed(() => listing.value?.status === 'active')
const awaitingSettlement = computed(
  () =>
    active.value &&
    listing.value?.endsAt != null &&
    new Date(listing.value.endsAt).getTime() <= now.value,
)
const neutralBanner = computed(() => {
  if (awaitingSettlement.value) return 'Ended, settling now'
  if (listing.value?.status === 'expired') return 'Expired without a sale'
  if (listing.value?.status === 'cancelled') return 'Cancelled by the seller'
  return null
})
const auction = computed(() => (listing.value ? isAuction(listing.value) : false))
const price = computed(() => (listing.value ? listingPrice(listing.value) : null))
const isSeller = computed(() => isSameMarketUser(listing.value?.seller, viewerId.value))
const canCancel = computed(
  () => isSeller.value && active.value && (listing.value?.bidCount ?? 0) === 0,
)

const modifiers = computed<ItemModifierRef[]>(() =>
  sortModifiersByKey(listing.value?.item.modifiers ?? []),
)
const chipModifiers = computed(() => visibleModifiers(modifiers.value))
const { accent } = useModifierColor(modifiers)
const itemName = computed(() =>
  listing.value ? displayItemName(modifiers.value, listing.value.item.item.name) : '',
)
const itemNameStyle = computed(() => (accent.value ? { color: accent.value } : undefined))
const renamed = computed(
  () => itemName.value.trim().toLowerCase() !== (listing.value?.title ?? '').trim().toLowerCase(),
)
const pbCount = computed(() => listing.value?.item.counters?.play_count ?? null)
const typeLabel = computed(() => {
  const typeKey = listing.value?.item.item.typeKey
  if (!typeKey) return ''
  return itemTypeStore.typeLabel(typeKey).toLowerCase()
})

const avatarUrl = computed(() => authStore.userProfile?.avatarUrl ?? null)

const variantPreviews = computed(() =>
  listing.value ? itemVariantPreviews(listing.value.item.item) : null,
)
const pickedVariantKey = ref<string | null>(null)

const activeVariant = computed(() => {
  const previews = variantPreviews.value
  if (!previews) return null
  const key = pickedVariantKey.value ?? listing.value?.item.variantKey
  return previews.find((v) => v.key === key) ?? previews[0]
})

const previewItem = computed(() => activeVariant.value?.item ?? null)

const metaTitle = computed(() =>
  listing.value ? `${listing.value.title} | Market | AccSaber` : 'Market | AccSaber',
)
const metaDescription = computed(() => {
  const l = listing.value
  if (!l) return undefined
  const p = listingPrice(l)
  const priceText = p.amount != null ? `${p.label} ${formatEssence(p.amount)}` : p.label
  return `${itemName.value} on the AccSaber market. ${priceText}.`
})
const metaImage = computed(() => listing.value?.item.item.iconUrl ?? undefined)

usePageMeta({ title: metaTitle, description: metaDescription, image: metaImage })

const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Market Hub', to: { name: 'market' } },
  { label: listing.value?.title ?? 'Listing' },
])

async function fetchBids() {
  if (!listingId.value) return
  try {
    const { getMarketListingBids } = await import('@/api/market')
    bids.value = await getMarketListingBids(listingId.value)
  } catch {
    return
  }
}

async function fetchAll(background = false) {
  if (!listingId.value) return
  if (!background) loading.value = true
  try {
    const { getMarketListing, getMarketListingBids } = await import('@/api/market')
    const [detail, history] = await Promise.all([
      getMarketListing(listingId.value),
      getMarketListingBids(listingId.value),
    ])
    listing.value = detail
    bids.value = history
    notFound.value = false
  } catch {
    if (!background) {
      notFound.value = true
      listing.value = null
    }
  }
  if (!background) loading.value = false
}

function onSocketEvent(event: MarketListingEvent) {
  const current = listing.value
  if (!current || event.listingId !== current.id) return
  current.endsAt = event.endsAt
  current.status = event.status
  if (event.type === 'bid' && event.amount != null) {
    current.currentBid = event.amount
    current.currentBidder = event.actor
    current.minimumNextBid = event.amount + current.minIncrement
    current.bidCount += 1
    fetchBids()
  } else if (event.type === 'sold') {
    current.winner = event.actor
    current.finalPrice = event.amount
    fetchAll(true)
  } else if (event.type === 'expired' || event.type === 'cancelled') {
    fetchAll(true)
  }
}

const { status: socketStatus } = useMarketListingSocket(
  () => (listing.value && active.value ? listingId.value : null),
  {
    onEvent: onSocketEvent,
    onReconnect: () => fetchAll(true),
  },
)

async function handleBid(amount: number) {
  if (!listing.value) return
  actionBusy.value = true
  amountError.value = null
  formError.value = null
  try {
    const { placeMarketBid } = await import('@/api/market')
    listing.value = await placeMarketBid(listing.value.id, amount)
    await essenceStore.fetchBalance(true)
  } catch (e) {
    const parsed = parseApiError(e, 'Could not place that bid.')
    const field = parsed.fieldErrors.find((f) => f.field === 'amount')
    if (field) amountError.value = field.message
    else formError.value = parsed.fieldErrors[0]?.message ?? parsed.message
  } finally {
    actionBusy.value = false
  }
}

async function handleBuy() {
  if (!listing.value) return
  actionBusy.value = true
  amountError.value = null
  formError.value = null
  try {
    const { buyMarketListing } = await import('@/api/market')
    listing.value = await buyMarketListing(listing.value.id)
    await Promise.all([fetchBids(), essenceStore.fetchBalance(true)])
  } catch (e) {
    const parsed = parseApiError(e, 'Could not complete the purchase.')
    formError.value = parsed.fieldErrors[0]?.message ?? parsed.message
  } finally {
    actionBusy.value = false
  }
}

async function handleCancel() {
  if (!listing.value || actionBusy.value) return
  if (!cancelArmed.value) {
    cancelArmed.value = true
    return
  }
  cancelArmed.value = false
  actionBusy.value = true
  formError.value = null
  try {
    const { cancelMarketListing } = await import('@/api/market')
    listing.value = await cancelMarketListing(listing.value.id)
  } catch (e) {
    const parsed = parseApiError(e, 'Could not cancel this listing.')
    formError.value = parsed.message
  } finally {
    actionBusy.value = false
  }
}

watch(listingId, () => {
  pickedVariantKey.value = null
  cancelArmed.value = false
  fetchAll()
}, { immediate: true })

watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) essenceStore.fetchBalance()
  },
  { immediate: true },
)

itemTypeStore.fetchItemTypes()
</script>

<template>
  <div class="listing-page">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div v-if="loading" class="listing-page__layout" aria-busy="true">
      <SkeletonLoader class="listing-page__art listing-page__art--loading" height="100%" />
      <SkeletonLoader class="listing-page__deal" height="240px" />
    </div>

    <EmptyState v-else-if="notFound || !listing" message="This listing doesn't exist or was removed." />

    <div v-else class="listing-page__layout">
      <div class="listing-page__art">
        <MarketItemTile
          :user-item="listing.item"
          :quantity="listing.quantity"
          :item-override="previewItem"
          compose-borders
          :avatar-url="avatarUrl"
        />
        <BaseTabs v-if="variantPreviews && activeVariant" :tabs="variantPreviews" :model-value="activeVariant.key"
          variant="segmented" label="Item variant" @update:model-value="pickedVariantKey = $event" />
      </div>

      <section class="listing-page__deal" aria-label="Listing">
        <header class="listing-page__head">
          <h1 class="listing-page__title">{{ listing.title }}</h1>
          <UserChip :user="listing.seller" link />
          <p v-if="listing.description" class="listing-page__text">{{ listing.description }}</p>
        </header>

        <div class="listing-page__figures">
          <div v-if="price" class="listing-page__figure">
            <span class="field-label">{{ price.label }}</span>
            <EssenceAmount v-if="price.amount != null" :amount="price.amount" class="listing-page__number" />
            <span v-if="auction && listing.bidCount > 0" class="caption">
              {{ listing.bidCount }} {{ listing.bidCount === 1 ? 'bid' : 'bids' }}
            </span>
          </div>
          <div v-if="active && listing.endsAt" class="listing-page__figure">
            <span class="field-label">Time left</span>
            <ListingCountdown :ends-at="listing.endsAt" size="lg" bare class="listing-page__number" />
            <span v-if="socketStatus === 'reconnecting'" class="caption">Reconnecting</span>
          </div>
        </div>

        <p v-if="active && listing.currentBidder" class="listing-page__line">
          <span class="field-label">Highest bidder</span>
          <UserChip :user="listing.currentBidder" link />
        </p>

        <BaseBanner v-if="neutralBanner" :dismissible="false">{{ neutralBanner }}</BaseBanner>

        <BaseBanner v-else-if="listing.status === 'sold'" variant="success" :dismissible="false">
          <span class="listing-page__line">
            Sold
            <template v-if="listing.winner">to <UserChip :user="listing.winner" link /></template>
            <span v-if="listing.settledAt" class="caption">{{ formatRelativeDate(listing.settledAt) }}</span>
          </span>
        </BaseBanner>

        <MarketBidPanel
          v-if="active && !awaitingSettlement"
          :listing="listing"
          :viewer-id="viewerId"
          :logged-in="authStore.isLoggedIn"
          :balance="essenceStore.balance"
          :reserved="essenceStore.reserved"
          :busy="actionBusy"
          :amount-error="amountError"
          :form-error="formError"
          @bid="handleBid"
          @buy="handleBuy"
        />

        <BaseButton v-if="canCancel" class="listing-page__cancel" variant="destructive" :loading="actionBusy"
          @click="handleCancel">
          {{ cancelArmed ? 'Confirm cancellation' : 'Cancel listing' }}
        </BaseButton>

        <p v-if="formError && !active" class="caption listing-page__error" role="alert">{{ formError }}</p>
      </section>

      <section class="listing-page__item" aria-label="Item details">
        <p class="listing-page__kind">
          <span class="listing-page__rarity" :class="rarityClass(listing.item.item.rarity)">
            {{ listing.item.item.rarity }}
          </span>
          {{ typeLabel }}
        </p>
        <h2 v-if="renamed" class="section-title" :style="itemNameStyle">{{ itemName }}</h2>
        <p v-if="listing.item.item.description" class="listing-page__text">
          {{ listing.item.item.description }}
        </p>
        <div v-if="chipModifiers.length > 0 || listing.item.unusualEffect" class="listing-page__line">
          <ModifierChip v-for="m in chipModifiers" :key="m.id" :modifier="m" />
          <span v-if="listing.item.unusualEffect" class="listing-page__unusual">
            {{ listing.item.unusualEffect.name }}
          </span>
        </div>
        <dl class="listing-page__facts">
          <template v-if="listing.item.serialNumber != null">
            <dt class="field-label">Serial</dt>
            <dd>#{{ listing.item.serialNumber }}</dd>
          </template>
          <template v-if="pbCount != null">
            <dt class="field-label">PB counter</dt>
            <dd>{{ pbCount }}</dd>
          </template>
          <template v-if="listing.quantity > 1">
            <dt class="field-label">Quantity</dt>
            <dd>{{ listing.quantity }}</dd>
          </template>
          <dt class="field-label">Listed</dt>
          <dd>{{ formatRelativeDate(listing.createdAt) }}</dd>
        </dl>
      </section>

      <MarketBidHistory v-if="auction" class="listing-page__history" :listing="listing" :bids="bids"
        :viewer-id="viewerId" />
    </div>
  </div>
</template>

<style scoped>
.listing-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.listing-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
  grid-template-areas:
    'art deal'
    'item history';
  gap: var(--space-lg) var(--space-xl);
  align-items: start;
}

.listing-page__head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.listing-page__title {
  overflow-wrap: anywhere;
}

.listing-page__art {
  grid-area: art;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-md);
}

.listing-page__art--loading {
  aspect-ratio: 1 / 1;
}

.listing-page__deal {
  grid-area: deal;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.listing-page__figures {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-md) var(--space-xl);
}

.listing-page__figure {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.listing-page__number {
  font-size: 2rem;
  line-height: 1.2;
  color: var(--text-primary);
}

.listing-page__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
}

.listing-page__cancel {
  align-self: flex-start;
}

.listing-page__error {
  color: var(--error);
}

.listing-page__item {
  grid-area: item;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.listing-page__kind {
  margin: 0;
  color: var(--text-secondary);
}

.listing-page__rarity {
  font-weight: 600;
  color: var(--rarity-color);
  text-transform: capitalize;
}

.listing-page__text {
  max-width: 65ch;
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.listing-page__unusual {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--tier-gold);
}

.listing-page__facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-xs) var(--space-md);
  margin: 0;
}

.listing-page__facts dd {
  margin: 0;
}

.listing-page__history {
  grid-area: history;
}

@media (max-width: 900px) {
  .listing-page__layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'art'
      'deal'
      'item'
      'history';
  }

  .listing-page__art {
    max-width: 320px;
  }
}
</style>
