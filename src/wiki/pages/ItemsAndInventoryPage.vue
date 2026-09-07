<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useItemCatalog } from '@/composables/useItemCatalog'
import { useItemModifierStore } from '@/stores/itemModifiers'
import type { ItemRarity, ItemResponse, ItemTypeKey } from '@/types/api/items'
import { formatEssence } from '@/utils/essence'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiItemBench from '@/wiki/components/WikiItemBench.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import { computed, onMounted, ref } from 'vue'

const RARITY_ORDER: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
const RARITY_WORTH = [2, 5, 10, 25, 50, 100]
const BENCH_TYPES: ItemTypeKey[] = ['profile_border_shape', 'title', 'profile_border_color']
const BENCH_MODIFIERS = ['unusual', 'holographic', 'haunted', 'battle_worn', 'strange', 'founders']
const FOUNDERS_SERIAL = 5
const MAX_SERIAL = 40

const SLOTS = [
  { slot: 'Title', changes: 'The line that sits under your name' },
  { slot: 'Border shape', changes: 'The frame cut around your avatar' },
  { slot: 'Border color', changes: 'What that frame is filled with' },
  { slot: 'Badge', changes: 'All your badges show on your profile, and the equipped one leads the row' },
  { slot: 'Theme', changes: 'The colors of the whole site while you are logged in' },
  { slot: 'Profile background', changes: 'The image behind your profile page' },
  { slot: 'Thumbnail background', changes: 'The scene behind your small player card' },
]


const { itemsById, ensureLoaded } = useItemCatalog()
const modifierStore = useItemModifierStore()

const catalogReady = ref(false)
const benchFailed = ref(false)

const benchItems = computed<ItemResponse[]>(() => {
  const pool = [...itemsById.value.values()].filter(
    (item) =>
      item.tradeable &&
      item.serialized &&
      item.visible &&
      item.worth != null &&
      BENCH_TYPES.includes(item.typeKey),
  )
  const used = new Map<ItemTypeKey, number>()
  const picked: ItemResponse[] = []
  for (const rarity of RARITY_ORDER) {
    const candidates = pool
      .filter((item) => item.rarity === rarity)
      .sort(
        (a, b) =>
          (used.get(a.typeKey) ?? 0) - (used.get(b.typeKey) ?? 0) ||
          BENCH_TYPES.indexOf(a.typeKey) - BENCH_TYPES.indexOf(b.typeKey) ||
          a.name.localeCompare(b.name),
      )
    const chosen = candidates[0]
    if (!chosen) continue
    used.set(chosen.typeKey, (used.get(chosen.typeKey) ?? 0) + 1)
    picked.push(chosen)
  }
  return picked
})

const benchModifiers = computed(() =>
  BENCH_MODIFIERS.map((key) => modifierStore.byKey.get(key)).filter((m) => m != null),
)

const benchReady = computed(
  () => catalogReady.value && benchItems.value.length > 1 && benchModifiers.value.length > 1,
)

onMounted(async () => {
  try {
    await Promise.all([ensureLoaded(), modifierStore.fetchModifiers()])
    catalogReady.value = itemsById.value.size > 0
    if (!benchReady.value) benchFailed.value = true
  } catch {
    benchFailed.value = true
  }
})
</script>

<template>
  <WikiProse>
    <p>
      Anything you can put on your profile is an item. Titles, avatar borders, site themes and
      the little scene behind your player card all live in the Inventory tab on your profile,
      sitting next to the crates you have not opened yet and the sabers that get pulled down
      into the game as files.
    </p>

    <WikiHeading id="slots">Slots</WikiHeading>
    <p>
      You wear one item per slot, and the slots do not fight each other. A title, a border
      shape, a border color, a theme, a badge and both backgrounds can all be on at once.
    </p>
    <table>
      <thead>
        <tr>
          <th>Slot</th>
          <th>What it changes</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in SLOTS" :key="row.slot">
          <td>{{ row.slot }}</td>
          <td>{{ row.changes }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      Swapping costs nothing and lands the moment you click. Some items carry variants, which
      are alternate looks packed into the same item, and you pick the one you want as part of
      equipping it. Sabers and pedestals sit outside all of this, since they are files you
      install into Beat Saber by hand and they never touch a slot on the site.
    </p>

    <WikiHeading id="rarity">Rarity</WikiHeading>
    <p>
      Six steps run from common up to mythic, and where an item sits on that ladder decides two
      numbers. Rarer items come out of crates less often, and they hand you back more essence
      when you break them down.
    </p>
    <table>
      <thead>
        <tr>
          <th>Rarity</th>
          <th>Essence</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(rarity, index) in RARITY_ORDER" :key="rarity">
          <td class="items-page__rarity">{{ rarity }}</td>
          <td>{{ formatEssence(RARITY_WORTH[index]) }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      A mythic border you pulled on your first ever crate and a mythic border pulled by somebody
      four hundred opens deep are worth exactly the same 100.
    </p>

    <WikiHeading id="modifiers">Modifiers</WikiHeading>
    <p>
      A modifier is a marker stuck to your particular copy of an item, and it changes how that
      copy looks and what it is called. Most of them roll out of a crate on a chance separate
      from the item itself.
      <RouterLink to="/wiki/modifiers-and-effects">Item Modifiers &amp; Effects</RouterLink> goes
      through every marker, where each one comes from and what it does to the thing it lands on.
    </p>

    <WikiHeading id="serials">Serials</WikiHeading>
    <p>
      A serialized item hands out its numbers in the order players earn it. If you are the
      eleventh person ever awarded a title, your copy reads number 11 for good, and nobody can
      take the number off you.
    </p>
    <p>
      The first five copies of anything pick up Founder's for free. It attaches on its own the
      moment your serial lands. Being early is the whole requirement.
    </p>
    <p>
      A Strange item runs a total of every ranked personal best you set while it is equipped,
      the count sits on that copy permanently, and taking the item off just freezes the number
      where it stands.
    </p>

    <WikiHeading id="bench">Try it</WikiHeading>
    <p>
      Here is a real item off the live catalog with the markers and the serial under your
      control. Switch items to walk the rarity ladder, stack markers on, and drag the serial
      through 5 to watch Founder's attach itself:
    </p>
    <WikiItemBench
      v-if="benchReady"
      :items="benchItems"
      :modifiers="benchModifiers"
      :founders-serial="FOUNDERS_SERIAL"
      :max-serial="MAX_SERIAL"
    />
    <p v-else-if="benchFailed" class="items-page__error">
      The item bench could not load right now. Your own inventory shows the same thing.
    </p>
    <SkeletonLoader v-else variant="card" />

    <WikiHeading id="bound">Locked to you</WikiHeading>
    <p>
      Level unlocks, milestone rewards, official campaign rewards and event rewards are bound to
      the account that earned them. You cannot trade them, you cannot list them on the market,
      and breaking them down pays out nothing. Everything that falls out of a crate is the
      opposite, free to move between players and worth its full rarity value on the day
      somebody decides they are finished with it.
    </p>
  </WikiProse>
</template>

<style scoped>
.items-page__rarity {
  text-transform: capitalize;
}

.items-page__error {
  color: var(--text-secondary);
}
</style>
