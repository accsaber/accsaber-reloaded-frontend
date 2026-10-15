<script setup lang="ts">
import EssenceAmount from '@/components/domain/EssenceAmount.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { onImageError, pickAvatarFallback, pickAvatarUrl } from '@/utils/media'
import type { MarketBidResponse, MarketListingResponse } from '@/types/api/market'
import { formatRelativeDate } from '@/utils/formatters'
import { isSameMarketUser } from '@/utils/market'
import { computed } from 'vue'

const props = defineProps<{
  listing: MarketListingResponse
  bids: MarketBidResponse[]
  viewerId: string | null
}>()

interface ChatMessage {
  bid: MarketBidResponse
  right: boolean
  mine: boolean
  latest: boolean
}

const leaderId = computed(() => {
  const leader = props.listing.winner ?? props.listing.currentBidder
  return leader?.id ?? null
})

const messages = computed<ChatMessage[]>(() => {
  const chronological = [...props.bids].reverse()
  return chronological.map((bid, index) => ({
    bid,
    right: leaderId.value !== null && bid.bidder.id === leaderId.value,
    mine: isSameMarketUser(bid.bidder, props.viewerId),
    latest: index === chronological.length - 1 && props.listing.status === 'active',
  }))
})
</script>

<template>
  <div class="bid-chat">
    <h2 class="bid-chat__heading section-title">Bid history</h2>

    <p v-if="bids.length === 0" class="bid-chat__empty">No bids yet.</p>

    <ol v-else class="bid-chat__feed">
      <li v-if="listing.startingBid != null" class="bid-chat__system">
        Bidding opened at <EssenceAmount :amount="listing.startingBid" />
      </li>

      <li
        v-for="msg in messages"
        :key="msg.bid.id"
        class="bid-chat__msg"
        :class="{
          'bid-chat__msg--right': msg.right,
          'bid-chat__msg--buyout': msg.bid.buyout,
          'bid-chat__msg--latest': msg.latest,
        }"
      >
        <img
          v-if="pickAvatarUrl(msg.bid.bidder)"
          class="bid-chat__avatar"
          :src="pickAvatarUrl(msg.bid.bidder)"
          :alt="`${msg.bid.bidder.name} avatar`"
          loading="lazy"
          decoding="async"
          @error="onImageError(pickAvatarFallback(msg.bid.bidder))($event)"
        />
        <span v-else class="bid-chat__avatar bid-chat__avatar--initial" aria-hidden="true">
          {{ msg.bid.bidder.name.slice(0, 1).toUpperCase() }}
        </span>

        <div class="bid-chat__bubble">
          <header class="bid-chat__head">
            <span class="bid-chat__name">{{ msg.bid.bidder.name }}</span>
            <CountryFlag v-if="msg.bid.bidder.country" :country="msg.bid.bidder.country" />
            <span v-if="msg.mine" class="bid-chat__you">You</span>
            <time class="bid-chat__time" :datetime="msg.bid.createdAt">
              {{ formatRelativeDate(msg.bid.createdAt) }}
            </time>
          </header>
          <p class="bid-chat__text">
            {{ msg.bid.buyout ? 'Buyout' : 'Bid' }}
            <EssenceAmount :amount="msg.bid.amount" class="bid-chat__amount" />
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.bid-chat__heading {
  margin: 0 0 var(--space-md);
}

.bid-chat__empty {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-tertiary);
}

.bid-chat__feed {
  margin: 0;
  padding: var(--space-md);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.bid-chat__system {
  align-self: center;
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-xs);
  padding: 2px 10px;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.bid-chat__msg {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  max-width: 72%;
  align-self: flex-start;
}

.bid-chat__msg--right {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.bid-chat__avatar {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-card);
  object-fit: cover;
  flex-shrink: 0;
}

.bid-chat__avatar--initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: 700;
}

.bid-chat__bubble {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-xs) var(--space-md) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
  border-bottom-left-radius: var(--radius-btn);
  min-width: 0;
}

.bid-chat__msg--right .bid-chat__bubble {
  border-radius: var(--radius-modal);
  border-bottom-right-radius: var(--radius-btn);
  background: var(--bg-elevated);
}

.bid-chat__msg--latest .bid-chat__bubble {
  border-color: color-mix(in srgb, var(--page-accent, var(--accent)) 55%, transparent);
}

.bid-chat__msg--buyout .bid-chat__bubble {
  border-color: color-mix(in srgb, var(--tier-gold) 55%, transparent);
  background: color-mix(in srgb, var(--tier-gold) 7%, var(--bg-surface));
}

.bid-chat__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-size: var(--text-caption);
}

.bid-chat__name {
  font-weight: 600;
  color: var(--text-primary);
}

.bid-chat__you {
  padding: 0 5px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--info);
  border: 1px solid color-mix(in srgb, var(--info) 45%, transparent);
  border-radius: var(--radius-pill);
}

.bid-chat__time {
  color: var(--text-tertiary);
  margin-left: var(--space-xs);
}

.bid-chat__text {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.6;
}

.bid-chat__amount {
  color: var(--text-primary);
}

.bid-chat__msg--buyout .bid-chat__text {
  color: var(--text-primary);
  font-weight: 600;
}

@media (max-width: 640px) {
  .bid-chat__msg {
    max-width: 92%;
  }
}
</style>
