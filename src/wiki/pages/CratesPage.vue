<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { CrateContentResponse, ItemResponse } from '@/types/api/items'
import WikiCrateOdds from '@/wiki/components/WikiCrateOdds.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import { onMounted, ref } from 'vue'

const crate = ref<ItemResponse | null>(null)
const contents = ref<CrateContentResponse[]>([])
const oddsFailed = ref(false)

onMounted(async () => {
  try {
    const [{ getItems }, { getCrateContents }] = await Promise.all([
      import('@/api/items'),
      import('@/api/crates'),
    ])
    const crates = (await getItems()).filter((item) => item.typeKey === 'crate')
    for (const candidate of crates) {
      const list = await getCrateContents(candidate.id)
      if (list.length) {
        crate.value = candidate
        contents.value = list
        return
      }
    }
    oddsFailed.value = true
  } catch {
    oddsFailed.value = true
  }
})
</script>

<template>
  <WikiProse>
    <p>
      A crate is an item like any other and it sits in your inventory next to everything else you
      own until you decide to open it, at which point you find out what you got. Opening consumes
      it. The crate is gone, one reward takes its place, and that reward is yours the same way
      any other item would be.
    </p>

    <WikiHeading id="sources">Where they come from</WikiHeading>
    <p>
      Live events are the main road, where event missions roll them and event objectives hand
      them out, and a campaign built around an event can pay you one for finishing a node.
      Outside an event they still move around, because crates are tradeable like most items, and
      you can pick one up off the market or straight out of a trade with another player. The
      occasional one goes out as an award for reporting a bug worth fixing.
    </p>
    <p>
      The Random Active Crate is not really a crate at all. It is a placeholder that resolves the
      moment somebody hands it to you, and what you get is whatever crate is in season that day.
      A campaign author writing a reward months in advance reaches for that instead of naming a
      crate, and it keeps paying the right thing long after the season it was written in has
      ended.
    </p>

    <WikiHeading id="odds">The odds</WikiHeading>
    <p>
      Every reward inside a crate carries a weight, and those weights decide how often each one
      comes out. Rarer rewards sit on lower weights and the drop between steps is steep enough
      that you will open a lot of commons before anything at the bottom of the table turns up.
    </p>
    <WikiCrateOdds
      v-if="crate && contents.length"
      :contents="contents"
      :crate-name="crate.name"
    />
    <p v-else-if="oddsFailed" class="crates-page__error">
      The odds table could not load right now. Every crate lists its contents in your inventory.
    </p>
    <SkeletonLoader v-else variant="card" />
    <p>
      Every crate sets its own numbers. Read the table above as one crate and not as a rule. What
      holds across all of them is the shape, where common rewards make up most of what comes out
      and the top of the table is genuinely rare.
    </p>
    <p>
      The contents of a crate are public before you open it, and the reward list you can browse is
      the exact list the roll draws from. What you see is what is in there.
    </p>

    <WikiHeading id="modifiers">Modifiers roll separately</WikiHeading>
    <p>
      The reward is one roll and the markers are another, and they do not compete with each other.
      Each marker a crate carries gets its own independent chance. A single open can attach two of
      them or none at all, and rolling Strange never costs you a shot at Holographic.
    </p>
    <p>
      Seasonal markers are worth knowing about, because they ignore which crate you are holding.
      Around Halloween, Haunted rolls on every crate you open, including ones that have nothing to
      do with that event, and Christmas does the same thing with Jolly. The seasonal crate of the
      moment carries its own chance for its own marker on top of that.
    </p>
    <p>
      Unusual is the one marker that pulls a second thing behind it, and rolling it picks a
      particle effect from the list that crate carries. Each crate ships its own set of effects.
    </p>

    <WikiHeading id="seasonal">Seasonal crates</WikiHeading>
    <p>
      Seasonal crates run on a cycle with two halves that happen months apart. When an event ends,
      the next crate becomes visible and obtainable and the Random Active Crate starts pointing at
      it, while its contents stay sealed. That gap is deliberate, and it gives campaign authors
      and everybody else time to build things around a crate before anyone knows what is inside
      it.
    </p>
    <p>
      Then its own event starts, the contents get revealed, and everybody opens at once. When that
      event ends the crate stops being handed out and the next one takes over the rotation.
    </p>
    <p>
      A crate leaving rotation only means it stops arriving as a new reward. The one already
      sitting in your inventory is untouched and opens whenever you feel like opening it.
      Permanent crates that do not depend on a season or an event are planned, and the cycle above
      will not be the only way this works forever.
    </p>
  </WikiProse>
</template>

<style scoped>
.crates-page__error {
  color: var(--text-secondary);
}
</style>
