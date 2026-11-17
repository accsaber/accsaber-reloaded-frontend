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
      Essence is the currency for everything item related. You can see your balance in your
      inventory. It has no effect on your AP, your rank or your level and it's only for items.
    </p>

    <WikiHeading id="sources">Where it comes from</WikiHeading>
    <p>
      Breaking an item down is the reliable way to get essence and it gives whatever that item is
      worth. Selling something on the market is the other way. When a listing ends the winner's
      essence goes into your balance. A trade can have essence on either side too.
    </p>

    <WikiHeading id="spending">What it buys</WikiHeading>
    <p>
      Nothing on AccSaber is sold to you for essence and there's no way to turn it into AP, XP or a
      level either.
    </p>
    <p>
      That makes the whole economy player to player so the price of a thing is whatever somebody
      else will pay for it that day.
    </p>

    <WikiHeading id="disintegrating">Breaking items down</WikiHeading>
    <p>
      Disintegrating an item destroys it and gives you its worth. Worth depends on rarity which the
      <RouterLink to="/wiki/items-and-inventory">items page</RouterLink> explains and it never
      changes for any other reason. Stack a few together and watch what they add up to:
    </p>
    <WikiEssenceCalculator v-if="catalogReady" :items="grinderItems" />
    <p v-else-if="grinderFailed" class="essence-page__error">
      The calculator couldn't load right now. Every item lists its worth in your inventory.
    </p>
    <SkeletonLoader v-else variant="card" />
    <p>
      Untradeable items have no essence value at all which rules out level unlocks, milestone
      rewards, official campaign rewards and event rewards. Anything you have equipped has to be
      unequipped first.
    </p>
    <p>
      None of it comes back. The item is gone and so is the serial number that came with it.
    </p>

    <WikiHeading id="held">Reserved essence</WikiHeading>
    <p>
      The market never spends your essence at the moment you bid, it reserves it instead. A reserved
      amount is still yours and still counted in your balance but you can't spend it twice while the
      bid is up. If you get outbid you get the full amount back right away and if you win the
      auction it becomes the payment.
    </p>
    <p>
      Essence you attach to a trade offer you sent works the same way. It's reserved while the offer
      is open and released the moment it's declined or cancelled.
    </p>

    <WikiHeading id="two-numbers">Market price and essence value</WikiHeading>
    <p>
      A Holographic Black Hole and the plainest Black Hole anybody owns disintegrate for exactly the
      same amount because essence value only depends on the item's rarity and modifiers don't change
      it.
    </p>
    <p>
      What the modifiers change is what another player will pay you. A rare modifier on a mythic
      item can be worth a fortune on the market and it's still worth the same essence when you
      disintegrate it.
    </p>
  </WikiProse>
</template>

<style scoped>
.essence-page__error {
  color: var(--text-secondary);
}
</style>
