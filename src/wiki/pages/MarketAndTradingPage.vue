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
  { label: 'Runs out on its own', values: ['when the timer ends', 'after fourteen days'] },
]
</script>

<template>
  <WikiProse>
    <p>
      There are two ways to move an item from one player to another. The market is a public
      board where anybody can bid on what you put up. A trade is a direct deal with one player
      you picked.
    </p>
    <WikiCompareTable :columns="COLUMNS" :rows="ROWS" />

    <WikiHeading id="listing">Listing something</WikiHeading>
    <p>
      Putting an item on the market takes it out of your inventory until the listing ends. It
      comes back to you if the listing runs out without a buyer.
    </p>
    <p>
      Every listing needs a starting bid, a buyout price, or both. A starting bid opens an
      auction, which lasts between thirty minutes and a week. A buyout price on its own is a
      straight sale with no timer.
    </p>
    <p>
      Twenty listings can run at once. Supporters have no cap. You can cancel a listing
      until the first bid lands.
    </p>

    <WikiHeading id="bidding">Bidding</WikiHeading>
    <p>
      A bid holds your <RouterLink to="/wiki/essence">essence</RouterLink> instead of spending
      it. Every bid has to beat the current one by the minimum increment the seller set. You
      cannot outbid yourself. A bid at or above the buyout price buys the item outright.
    </p>
    <p>
      Sniping the last second does not work. Any bid inside the final hour pushes the end out to
      a full hour from that moment.
    </p>
    <p>
      When it settles, the winner's essence goes to the seller in full and the item goes to the
      winner's inventory.
    </p>

    <WikiHeading id="trades">Trades</WikiHeading>
    <p>
      A trade is aimed at one player. Items and essence can sit on either side. You can ask
      for specific items out of their inventory as well as offering your own. You build the
      entire deal and they accept or decline it as it stands.
    </p>
    <p>
      Items in a pending trade stay in your inventory. They cannot be listed, broken down or
      added to a second trade while the offer is open. Essence on your side is held the same way
      a bid holds it.
    </p>
    <p>
      An offer nobody answers expires after fourteen days.
    </p>

    <WikiHeading id="what-moves">What can move</WikiHeading>
    <p>
      Only tradeable items go through either route. Level unlocks, milestone rewards, official
      campaign rewards and event rewards stay bound to whoever earned them. Equipped items have
      to be unequipped first.
    </p>
  </WikiProse>
</template>
