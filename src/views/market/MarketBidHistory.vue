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

const leaderId = computed(() => (props.listing.winner ?? props.listing.currentBidder)?.id ?? null)

const messages = computed(() => {
  const chronological = [...props.bids].reverse()
  return chronological.map((bid, index) => ({
    bid,
    leading: leaderId.value !== null && bid.bidder.id === leaderId.value,
    mine: isSameMarketUser(bid.bidder, props.viewerId),
    latest: index === chronological.length - 1 && props.listing.status === 'active',
  }))
})
</script>

<template>
  <section class="bid-chat">
    <h2 class="section-title">Bid history</h2>

    <p v-if="bids.length === 0" class="caption">No bids yet</p>

    <ol v-else class="bid-chat__feed stagger" :style="{ '--n': messages.length }">
      <li v-if="listing.startingBid != null" class="caption bid-chat__opening">
        Bidding opened at <EssenceAmount :amount="listing.startingBid" />
      </li>

      <li
        v-for="(msg, i) in messages"
        :key="msg.bid.id"
        class="bid-chat__msg"
        :class="{
          'bid-chat__msg--leading': msg.leading,
          'bid-chat__msg--buyout': msg.bid.buyout,
          'bid-chat__msg--latest': msg.latest,
        }"
        :style="{ '--i': i + 1 }"
      >
        <RouterLink class="bid-chat__avatar"
          :to="{ name: 'player-profile', params: { userId: msg.bid.bidder.id } }"
          :aria-label="`${msg.bid.bidder.name} profile`">
          <img
            v-if="pickAvatarUrl(msg.bid.bidder)"
            data-shared="avatar"
            :src="pickAvatarUrl(msg.bid.bidder)"
            alt=""
            loading="lazy"
            decoding="async"
            @error="onImageError(pickAvatarFallback(msg.bid.bidder))($event)"
          />
        </RouterLink>

        <div class="bid-chat__bubble">
          <header class="bid-chat__head">
            <span class="bid-chat__name">{{ msg.bid.bidder.name }}</span>
            <CountryFlag v-if="msg.bid.bidder.country" :country="msg.bid.bidder.country" />
            <span v-if="msg.mine" class="caption">You</span>
            <time class="caption" :datetime="msg.bid.createdAt">{{ formatRelativeDate(msg.bid.createdAt) }}</time>
          </header>
          <p class="bid-chat__text">
            {{ msg.bid.buyout ? 'Bought it for' : 'Bid' }}
            <EssenceAmount :amount="msg.bid.amount" class="bid-chat__amount" />
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.bid-chat {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.bid-chat__feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bid-chat__opening {
  align-self: center;
}

.bid-chat__msg {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  max-width: 72%;
  align-self: flex-start;
}

.bid-chat__msg--leading {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.bid-chat__avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-avatar);
  background: var(--bg-elevated);
  overflow: hidden;
}

.bid-chat__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bid-chat__bubble {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
  border-bottom-left-radius: var(--radius-xs);
}

.bid-chat__msg--leading .bid-chat__bubble {
  background: var(--bg-elevated);
  border-radius: var(--radius-modal);
  border-bottom-right-radius: var(--radius-xs);
}

.bid-chat__msg--latest .bid-chat__bubble {
  border-color: var(--page-accent, var(--accent));
}

.bid-chat__msg--buyout .bid-chat__bubble {
  border-color: var(--tier-gold);
}

.bid-chat__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  font-size: var(--text-caption);
}

.bid-chat__name {
  font-weight: 600;
}

.bid-chat__text {
  margin: 0;
  color: var(--text-secondary);
}

.bid-chat__amount {
  font-size: var(--text-card-title);
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .bid-chat__msg {
    max-width: 92%;
  }
}
</style>
