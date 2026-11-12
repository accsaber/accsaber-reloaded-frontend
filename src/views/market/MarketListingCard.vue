<script setup lang="ts">
import type { MarketListingResponse } from '@/types/api/market'
import { formatRelativeDate } from '@/utils/formatters'
import { displayItemName, rarityClass } from '@/utils/items'
import { isAuction, listingKind, listingPrice, MARKET_STATUS_LABEL } from '@/utils/market'
import { computed } from 'vue'
import EssenceAmount from '@/components/domain/EssenceAmount.vue'
import ListingCountdown from './ListingCountdown.vue'
import MarketItemTile from './MarketItemTile.vue'
import UserChip from '@/components/domain/UserChip.vue'

export interface ListingCardTag {
  label: string
  tone: 'success' | 'error' | 'neutral' | 'gold'
}

const props = defineProps<{
  listing: MarketListingResponse
  tag?: ListingCardTag | null
}>()

const itemName = computed(() =>
  displayItemName(props.listing.item.modifiers ?? [], props.listing.item.item.name),
)

const active = computed(() => props.listing.status === 'active')
const price = computed(() => listingPrice(props.listing))
const kind = computed(() => listingKind(props.listing))
const auction = computed(() => isAuction(props.listing))
const renamed = computed(() => itemName.value.trim().toLowerCase() !== props.listing.title.trim().toLowerCase())
const settledLabel = computed(() => {
  const label = MARKET_STATUS_LABEL[props.listing.status]
  const when = props.listing.settledAt ? ` ${formatRelativeDate(props.listing.settledAt)}` : ''
  return `${label}${when}`
})
</script>

<template>
  <RouterLink
    class="market-card pressable"
    :class="{
      'market-card--settled': !active,
      'market-card--alert': tag?.tone === 'error',
    }"
    :to="{ name: 'market-listing', params: { listingId: listing.id } }"
  >
    <div class="market-card__art">
      <MarketItemTile :user-item="listing.item" :quantity="listing.quantity" />
      <span v-if="tag" class="market-card__tag" :class="`market-card__tag--${tag.tone}`">
        {{ tag.label }}
      </span>
    </div>

    <div class="market-card__body">
      <span class="market-card__line card-title">{{ listing.title }}</span>
      <span class="market-card__line market-card__item">
        <span class="market-card__rarity" :class="rarityClass(listing.item.item.rarity)">
          {{ listing.item.item.rarity }}
        </span>
        <template v-if="renamed">{{ ` ${itemName}` }}</template>
      </span>

      <div class="market-card__row market-card__price">
        <span class="market-card__amount">
          <span class="caption">{{ price.label }}</span>
          <EssenceAmount v-if="price.amount != null" :amount="price.amount" class="market-card__price-value" />
        </span>
        <span v-if="active && kind === 'auction_buyout' && listing.buyoutPrice != null" class="caption">
          or <EssenceAmount :amount="listing.buyoutPrice" />
        </span>
      </div>

      <div class="market-card__row">
        <UserChip :user="listing.seller" compact hide-clan class="market-card__seller" />
        <span v-if="!active" class="caption">{{ settledLabel }}</span>
        <span v-else-if="auction && listing.bidCount > 0" class="caption market-card__timing">
          {{ listing.bidCount }} {{ listing.bidCount === 1 ? 'bid' : 'bids' }}
          <template v-if="listing.endsAt"> · <ListingCountdown :ends-at="listing.endsAt" bare /></template>
        </span>
        <ListingCountdown v-else-if="listing.endsAt" :ends-at="listing.endsAt" bare />
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.market-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  text-decoration: none;
  color: var(--text-primary);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.market-card:hover {
  border-color: var(--text-tertiary);
}

.market-card:focus-visible {
  outline: 2px solid var(--page-accent, var(--accent));
  outline-offset: 2px;
}

.market-card--alert {
  border-color: var(--error);
}

.market-card__art {
  position: relative;
}

.market-card__art :deep(.market-item-tile) {
  background: var(--bg-base);
  border: none;
  border-radius: 0;
}

.market-card--settled .market-card__art :deep(.market-item-tile) {
  filter: grayscale(0.6);
}

.market-card__tag {
  position: absolute;
  top: var(--space-sm);
  left: var(--space-sm);
  padding: 0 var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1.6;
  border-radius: var(--radius-pill);
  background: var(--bg-surface);
  color: var(--text-secondary);
  z-index: 2;
}

.market-card__tag--success {
  color: var(--success);
}

.market-card__tag--error {
  color: var(--error);
}

.market-card__tag--gold {
  color: var(--tier-gold);
}

.market-card__body {
  --row-h: 24px;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
  padding: var(--space-md);
}

.market-card__line {
  line-height: var(--row-h);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-card__item {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.market-card__rarity {
  font-weight: 600;
  color: var(--rarity-color);
  text-transform: capitalize;
}

.market-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  min-width: 0;
  height: var(--row-h);
  white-space: nowrap;
}

.market-card__price {
  align-items: baseline;
}

.market-card__amount {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
  overflow: hidden;
}

.market-card__price-value {
  font-size: 1.125rem;
}

.market-card__seller {
  flex: 1;
  min-width: 0;
}

.market-card__timing {
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .market-card {
    flex-direction: row;
  }

  .market-card__art {
    flex: 0 0 128px;
    display: flex;
    align-items: center;
    background: var(--bg-base);
  }

  .market-card__body {
    flex: 1;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
  }
}
</style>
