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
  { name: 'Unique', does: 'Shows the copy was given out for a specific occasion', from: 'Staff award, Tournaments & Special Events' },
  { name: 'Strange', does: "Counts every ranked personal best you set while it's equipped", from: 'Crate roll' },
  { name: 'Unusual', does: 'Attaches a particle effect that plays on the item', from: 'Crate roll' },
  { name: 'Holographic', does: 'Sweeps a shimmer across the item', from: 'Crate roll, the rarest of the modifiers' },
  { name: 'Battle-Worn', does: 'Chips and cracks the item and flakes fall off it', from: 'Crate roll during an event' },
  { name: 'Haunted', does: 'Phases the item out for a few seconds at a time', from: 'Specific crate roll or roll any between October 25 and November 1' },
  { name: 'Jolly', does: 'Drops holly leaves and berries past the item', from: 'Specific crate roll or roll any between December 20 and December 31' },
  { name: "Founder's", does: "Shows it's one of the first five copies ever given out", from: 'Automatic on serials 1 to 5' },
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
      A modifier is attached to your particular copy of an item and it changes how that copy looks
      and what it's called because the modifier name goes in front of the item name. A Strange Cat
      Ears is the same border you'd get anyway but with an orange counter in the corner.
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

    <WikiHeading id="rolls">How you get them</WikiHeading>
    <p>
      Most modifiers come from a <RouterLink to="/wiki/crates">crate</RouterLink> on a chance
      separate from the reward itself. Each modifier a crate has gets its own roll so one open can
      attach two of them and the next can attach none.
    </p>
    <p>
      Seasonal modifiers ignore which crate you're opening. Around Halloween Haunted rolls on every
      crate you open, including ones with nothing to do with that event. Christmas does the same
      with Jolly.
    </p>
    <p>
      A few modifiers never roll at all. Founder's is added automatically to the first five copies
      of anything, Vintage is added to every existing copy the day an item gets reworked and the
      rest are given by staff.
    </p>

    <WikiHeading id="rendering">How the effects show up</WikiHeading>
    <p>
      Some effects are behind the item, some are on top of it and some cut into the item itself.
      Battle-Worn chips pieces out of the edges and adds cracks going inward from them. Haunted
      phases the whole thing out for a couple of seconds at a time. Holographic sweeps a shimmer
      across the surface.
    </p>
    <p>
      The effect shows up everywhere your item does: on your profile, in the inventory grid and on
      your player card on a leaderboard.
    </p>
    <p>
      A modifier on a theme you have equipped goes full screen. Battle-Worn cracks come in from the
      edges of the page. Haunted adds a few faint ghosts floating up the page. A Haunted thumbnail
      background gets the same ghosts in the scene behind your badge.
    </p>
    <WikiItemBench
      v-if="benchReady"
      :items="benchItems"
      :modifiers="benchModifiers"
      :founders-serial="FOUNDERS_SERIAL"
      :max-serial="MAX_SERIAL"
    />
    <p v-else-if="benchFailed" class="mods-page__error">
      The live example couldn't load right now. Your own inventory looks the same.
    </p>
    <SkeletonLoader v-else variant="card" />

    <WikiHeading id="unusual">Unusual effects</WikiHeading>
    <p>
      Unusual is the one modifier that comes with something else. Rolling it picks a particle effect
      from its crate's list.
    </p>
    <p>
      Every crate has its own set of effects. Some are quiet, like dust coming off the item or
      fireflies circling it. Some aren't, like a clawed hand reaching across it or something
      eldritch behind it.
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
