<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useItemCatalog } from '@/composables/useItemCatalog'
import type { ItemRarity, ItemResponse } from '@/types/api/items'
import WikiEssenceCalculator from '@/wiki/components/WikiEssenceCalculator.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import { computed, onMounted, ref } from 'vue'

const RARITY_ORDER: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

const { itemsById, ensureLoaded } = useItemCatalog()
const catalogReady = ref(false)
const grinderFailed = ref(false)

const grinderItems = computed<ItemResponse[]>(() => {
  const pool = [...itemsById.value.values()].filter(
    (item) => item.tradeable && item.visible && item.worth != null && item.worth > 0,
  )
  return RARITY_ORDER.map(
    (rarity) =>
      pool
        .filter((item) => item.rarity === rarity)
        .sort((a, b) => a.name.localeCompare(b.name))[0],
  ).filter((item) => item != null)
})

onMounted(async () => {
  try {
    await ensureLoaded()
    catalogReady.value = grinderItems.value.length > 1
    if (!catalogReady.value) grinderFailed.value = true
  } catch {
    grinderFailed.value = true
  }
})
</script>

<template>
  <WikiProse>
    <p>
      Essence is the currency the item economy runs on, and your balance sits at the top of your
      inventory next to the search box. It has no effect on your AP, your rank or your level, and
      the only thing it ever touches is items.
    </p>

    <WikiHeading id="sources">Where it comes from</WikiHeading>
    <p>
      Breaking an item down is the reliable way to make essence, and it pays out whatever that
      item is worth. Selling something on the market is the other way, and when a listing settles
      the winner's essence lands in your balance in full, because nothing is taken out of it on
      the way through. A trade can carry essence on either side too, and somebody can hand you
      essence for an item you own without either of you touching the market.
    </p>

    <WikiHeading id="spending">What it buys</WikiHeading>
    <p>
      Nothing on AccSaber is sold to you for essence, and there is no way to turn it into AP, XP
      or a level either. What essence buys is what other players have put up for sale, and that
      is the entire list.
    </p>
    <p>
      That makes the whole economy player to player, and it means the price of a thing is whatever
      somebody else will pay for it on the day.
    </p>

    <WikiHeading id="disintegrating">Breaking items down</WikiHeading>
    <p>
      Disintegrating an item destroys it and credits you its worth. Worth follows rarity, which
      the <RouterLink to="/wiki/items-and-inventory">items page</RouterLink> covers, and the
      number never moves for any other reason. Stack a few together and watch what they add up to:
    </p>
    <WikiEssenceCalculator v-if="catalogReady" :items="grinderItems" />
    <p v-else-if="grinderFailed" class="essence-page__error">
      The calculator could not load right now. Every item lists its worth in your inventory.
    </p>
    <SkeletonLoader v-else variant="card" />
    <p>
      Untradeable items have no essence value at all, which rules out level unlocks, milestone
      rewards, official campaign rewards and event rewards. Anything currently equipped has to
      come off first, and anything sitting in a market listing or a pending trade stays locked
      while that is open. Stacks are the one flexible case, where you can break down part of a
      stack and keep the rest.
    </p>
    <p>
      None of it comes back. The item is gone, the serial number that came with it is gone, and
      buying another copy later starts you at whatever serial that item happens to be up to now.
    </p>

    <WikiHeading id="held">Held essence</WikiHeading>
    <p>
      The market never spends your essence at the moment you bid, it holds it instead. A held
      amount is still yours and still counted in your balance, and it simply cannot be spent twice
      while the bid stands. Get outbid and the hold lifts immediately with the full amount back in
      play, win the auction and the hold turns into the payment, and either way you were never at
      risk of losing essence to a bid you did not win.
    </p>
    <p>
      Essence you attach to a trade offer you sent works the same way, held while the offer is
      open and released the moment it is declined or cancelled.
    </p>

    <WikiHeading id="two-numbers">Market price and essence value</WikiHeading>
    <p>
      A Holographic Black Hole and the plainest Black Hole anybody owns disintegrate for exactly
      the same amount, because essence value is set by the item's rarity and nothing else reads
      the markers.
    </p>
    <p>
      What the markers move is what another player will pay you. A rare marker on a mythic item
      can be worth a fortune on the market and it is still worth the same essence in the grinder.
      Anything with a serial worth bragging about is nearly always worth more sold than disintegrated.
    </p>
  </WikiProse>
</template>

<style scoped>
.essence-page__error {
  color: var(--text-secondary);
}
</style>
