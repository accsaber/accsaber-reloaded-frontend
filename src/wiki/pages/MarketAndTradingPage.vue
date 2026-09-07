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
      There are two ways to move an item from one player to another, and they suit completely
      different situations. The market is a public board where anybody browsing can bid on what
      you put up, and a trade is a direct deal with one person you picked out yourself.
    </p>
    <WikiCompareTable :columns="COLUMNS" :rows="ROWS" />

    <WikiHeading id="listing">Listing something</WikiHeading>
    <p>
      Putting an item on the market takes it out of your inventory and holds it there until the
      listing ends. You cannot wear it, break it down or put it in a trade while it sits there,
      and it comes straight back to you if the listing runs out without a buyer.
    </p>
    <p>
      Every listing needs a starting bid, a buyout price, or both. A starting bid opens an
      auction, which needs a duration somewhere between thirty minutes and a week. A buyout price
      on its own is a straight sale that sits there until somebody takes it, with no clock on it
      at all.
    </p>
    <p>
      Twenty listings can run at once, and supporters have no cap on that. Cancelling works right
      up until the first bid lands, and after that the listing has to play out.
    </p>

    <WikiHeading id="bidding">Bidding</WikiHeading>
    <p>
      A bid holds your <RouterLink to="/wiki/essence">essence</RouterLink> instead of spending it,
      and every bid has to clear the current one by whatever minimum increment the seller set. You
      cannot outbid yourself, and putting in a bid at or above the buyout price buys the thing
      outright instead of pushing the auction higher.
    </p>
    <p>
      Sniping the last second does not work, because any bid landing inside the final hour pushes
      the end out to a full hour from that moment, and it keeps doing that for as long as people
      keep bidding. An auction ends when everybody has stopped.
    </p>
    <p>
      When it settles, the winner's essence goes to the seller in full and the item lands in the
      winner's inventory. A listing that runs out with nobody bidding closes and hands the item
      back.
    </p>

    <WikiHeading id="trades">Trades</WikiHeading>
    <p>
      A trade is aimed at one player and carries whatever the two of you agree on, which can be a
      straight swap, a pile of essence for one item, or anything in between. Items and essence can
      sit on either side, and the part that catches people out is that you can ask for specific
      items out of their inventory as well as offering your own. You build the entire deal and
      they accept or decline it as it stands.
    </p>
    <p>
      Items in a pending trade stay in your inventory, which is the opposite of how a listing
      works. They are locked out of being listed, broken down or added to a second trade while the
      offer is open, and that is the whole restriction. Essence you put on your side is held
      exactly the way a bid holds it.
    </p>
    <p>
      An offer nobody answers expires after fourteen days.
    </p>

    <WikiHeading id="what-moves">What can move</WikiHeading>
    <p>
      Only tradeable items go through either route. Level unlocks, milestone rewards, official
      campaign rewards and event rewards stay bound to whoever earned them, and equipping
      something takes it off the table until you unequip it again.
    </p>
  </WikiProse>
</template>
