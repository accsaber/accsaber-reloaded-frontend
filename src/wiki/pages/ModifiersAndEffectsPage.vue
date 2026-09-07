<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useItemCatalog } from '@/composables/useItemCatalog'
import { useItemModifierStore } from '@/stores/itemModifiers'
import type { ItemRarity, ItemResponse, ItemTypeKey } from '@/types/api/items'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiItemBench from '@/wiki/components/WikiItemBench.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import { computed, onMounted, ref } from 'vue'

const BENCH_TYPES: ItemTypeKey[] = ['profile_border_shape']
const BENCH_RARITIES: ItemRarity[] = ['epic', 'legendary', 'mythic']
const VISUAL_MODIFIERS = ['unusual', 'holographic', 'haunted', 'battle_worn', 'strange']
const FOUNDERS_SERIAL = 5
const MAX_SERIAL = 40

const MODIFIERS = [
  { name: 'Unique', does: 'Marks a copy handed out for a specific occasion', from: 'Staff award, Tournaments & Special Events' },
  { name: 'Strange', does: 'Counts every ranked personal best you set while it is equipped', from: 'Crate roll' },
  { name: 'Unusual', does: 'Attaches a particle effect that plays on the item', from: 'Crate roll' },
  { name: 'Holographic', does: 'Sweeps a shimmer across the item', from: 'Crate roll, the rarest of the markers' },
  { name: 'Battle-Worn', does: 'Chips and cracks the item, and flakes fall off it', from: 'Crate roll during an event' },
  { name: 'Haunted', does: 'Phases the item out for a few seconds at a time and opens a pair of eyes in it', from: 'Specific crate roll or roll any between October 25 and November 1' },
  { name: 'Jolly', does: 'Trims the item with festive particles', from: 'Specific crate roll or roll any between December 20 and December 31' },
  { name: "Founder's", does: 'Marks one of the first five copies ever handed out', from: 'Automatic on serials 1 to 5' },
  { name: 'Vintage', does: 'Nothing: Stays as it was', from: 'Automatic on every copy when an item gets reworked' },
  { name: 'Genuine', does: 'Outlines the item', from: 'Promotions run with somebody outside AccSaber, or user resolved a bug that prevented item granting' },
  { name: "Collector's", does: 'Outlines the item and adds particles', from: 'Special, optional collectionist rewards' },
]

const { itemsById, ensureLoaded } = useItemCatalog()
const modifierStore = useItemModifierStore()

const catalogReady = ref(false)
const benchFailed = ref(false)

const benchItems = computed<ItemResponse[]>(() => {
  const pool = [...itemsById.value.values()].filter(
    (item) =>
      item.tradeable && item.serialized && item.visible && BENCH_TYPES.includes(item.typeKey),
  )
  return BENCH_RARITIES.map(
    (rarity) =>
      pool
        .filter((item) => item.rarity === rarity)
        .sort((a, b) => a.name.localeCompare(b.name))[0],
  ).filter((item) => item != null)
})

const benchModifiers = computed(() =>
  VISUAL_MODIFIERS.map((key) => modifierStore.byKey.get(key)).filter((m) => m != null),
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
      A modifier is a marker stuck to your particular copy of an item. It changes how that copy
      looks and what it is called, because the marker name goes in front of the item name. A
      Strange Cat Ears is the same border you would get anyway, with an orange counter bolted
      into the corner.
    </p>
    <p>
      Markers live on your copy and not on the item, which is why two players holding the same
      border can end up looking at completely different things.
    </p>
    <table>
      <thead>
        <tr>
          <th>Modifier</th>
          <th>What it does</th>
          <th>Where it comes from</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in MODIFIERS" :key="row.name">
          <td>{{ row.name }}</td>
          <td>{{ row.does }}</td>
          <td>{{ row.from }}</td>
        </tr>
      </tbody>
    </table>

    <WikiHeading id="rolls">How they land</WikiHeading>
    <p>
      Most markers come out of a <RouterLink to="/wiki/crates">crate</RouterLink>, rolled on a
      chance completely separate from the reward itself, and each marker a crate carries gets its
      own independent roll. One of your opens can attach two of them and the next can attach
      none.
    </p>
    <p>
      Seasonal markers ignore which crate you happen to be holding, and around Halloween Haunted
      rolls on every crate you open, including ones with nothing to do with that event. Christmas
      does the same with Jolly.
    </p>
    <p>
      A few markers never roll at all. Founder's attaches itself to the first five copies of
      anything ever handed out, Vintage lands on every existing copy the day an item gets
      reworked, and the rest are given deliberately by staff.
    </p>

    <WikiHeading id="rendering">How the effects show up</WikiHeading>
    <p>
      Some effects sit behind the item, some sit over the top of it, and some cut into the item
      itself. Battle-Worn chips lumps out of the edges and runs cracks inward from every bite,
      Haunted phases the whole thing out for a couple of seconds at a time and opens a pair of
      eyes in the middle of it, and Holographic just sweeps a shimmer across the surface.
    </p>
    <p>
      Wherever your item gets drawn the effect comes with it, whether that is your profile, the
      inventory grid or a player card sitting on a leaderboard.
    </p>
    <p>
      A marker on a theme you have equipped is the exception, because it goes full screen instead
      of decorating a small tile. Battle-Worn cracks run in from the edges of the page, and
      Haunted veils the whole site and opens its eyes somewhere in the lower half.
    </p>
    <WikiItemBench
      v-if="benchReady"
      :items="benchItems"
      :modifiers="benchModifiers"
      :founders-serial="FOUNDERS_SERIAL"
      :max-serial="MAX_SERIAL"
    />
    <p v-else-if="benchFailed" class="mods-page__error">
      The live example could not load right now. Your own inventory renders the same way.
    </p>
    <SkeletonLoader v-else variant="card" />

    <WikiHeading id="unusual">Unusual effects</WikiHeading>
    <p>
      Unusual is the one marker that pulls something else along behind it. Rolling it picks a
      particle effect out of the list its crate carries, and that effect is what you end up
      looking at. Two Unusual items out of the same crate rarely look alike.
    </p>
    <p>
      Every crate ships its own set and the roster grows with each one that lands. Some are quiet,
      like dust drifting off the item or fireflies circling it, and some are not, like a clawed
      hand reaching across the thing or something eldritch looming up behind it.
    </p>
    <p>
      Unusual effects get the same full screen treatment on a theme.
    </p>
  </WikiProse>
</template>

<style scoped>
.mods-page__error {
  color: var(--text-secondary);
}
</style>
