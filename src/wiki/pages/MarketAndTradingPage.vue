<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const COLUMNS = ['The market', 'A trade']

const ROWS: WikiCompareRow[] = [
  { label: 'Who you deal with', values: ['anybody browsing', 'one player you pick'] },
  { label: 'What changes hands', values: ['one item for essence', 'items and essence, both ways'] },
  { label: 'Ask for their items', values: [false, true] },
  { label: 'Your item leaves your inventory', values: [true, false] },
  { label: 'Who sets the price', values: ['whoever bids highest', 'the two of you'] },
  { label: 'Ends on its own', values: ['when the timer ends', 'after 14 days'] },
]
</script>

<template>
  <WikiProse>
    <p>
      There are two ways to get an item from one player to another. The market is a public board
      where anybody can bid on what you put up and a trade is a direct deal with one player you
      picked.
    </p>
    <WikiCompareTable :columns="COLUMNS" :rows="ROWS" />

    <WikiHeading id="listing">Listing something</WikiHeading>
    <p>
      Putting an item on the market takes it out of your inventory until the listing ends. You get
      it back if the listing ends without a buyer.
    </p>
    <p>
      Every listing needs a starting bid, a buyout price or both. A starting bid opens an auction
      which lasts between 30 minutes and a week. A buyout price on its own is a straight sale with
      no timer.
    </p>
    <p>
      You can have 20 listings at once and supporters have no cap. You can cancel a listing until it
      gets its first bid.
    </p>

    <WikiHeading id="bidding">Bidding</WikiHeading>
    <p>
      A bid reserves your <RouterLink to="/wiki/essence">essence</RouterLink> instead of spending
      it. Every bid has to beat the current one by the minimum increment the seller set and you
      can't outbid yourself. A bid at or above the buyout price buys the item outright.
    </p>
    <p>
      Sniping the last second doesn't work because any bid inside the final hour pushes the end to a
      full hour from that moment.
    </p>
    <p>
      When it ends the winner's essence goes to the seller in full and the item goes to the winner's
      inventory.
    </p>

    <WikiHeading id="trades">Trades</WikiHeading>
    <p>
      A trade is for one player. Items and essence can be on either side and you can ask for
      specific items from their inventory as well as offering your own. You build the entire deal
      and they accept or decline it as it is.
    </p>
    <p>
      Items in a pending trade stay in your inventory but they can't be listed, broken down or added
      to a second trade while the offer is open. Essence on your side is reserved the same way a bid
      reserves it.
    </p>
    <p>
      An offer nobody answers expires after 14 days.
    </p>

    <WikiHeading id="what-moves">What can be traded</WikiHeading>
    <p>
      Only tradeable items can be listed or traded. Level unlocks, milestone rewards, official
      campaign rewards and event rewards stay bound to whoever got them. Equipped items have to be
      unequipped first.
    </p>
  </WikiProse>
</template>
