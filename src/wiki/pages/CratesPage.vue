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
      A crate is an item like any other. It stays in your inventory with everything else you own
      until you decide to open it and that's when you find out what you got. Opening uses it up.
    </p>

    <WikiHeading id="sources">Where they come from</WikiHeading>
    <p>
      Live events are the main way to get them because event missions can roll them and event
      objectives give them out. Campaigns built after the previous event can also give them out.
      Outside an event you can still get them because crates are tradeable like most items. You can
      buy one on the market or get one in a trade with another player. Sometimes one is given as a
      reward for reporting a bug.
    </p>
    <p>
      The Random Active Crate isn't really a crate at all. It's a placeholder that becomes a real
      crate the moment somebody gives it to you and what you get is whatever crate is in season that
      day.
    </p>

    <WikiHeading id="odds">The odds</WikiHeading>
    <p>
      Every reward inside a crate has a weight and those weights decide how often each one comes
      out.
    </p>
    <WikiCrateOdds
      v-if="crate && contents.length"
      :contents="contents"
      :crate-name="crate.name"
    />
    <p v-else-if="oddsFailed" class="crates-page__error">
      The odds table couldn't load right now. Every crate lists its contents in your inventory.
    </p>
    <SkeletonLoader v-else variant="card" />
    <p>
      Every crate has its own numbers so read the table above as one crate and not as a rule. What's
      the same for all of them is the shape where common rewards make up most of what comes out and
      the top of the table is rare.
    </p>

    <WikiHeading id="modifiers">Modifiers roll separately</WikiHeading>
    <p>
      The reward is one roll and the modifiers are another so they don't compete with each other.
      Each modifier a crate has gets its own independent chance which means a single open can attach
      two of them or none at all. Rolling Strange never costs you a shot at Holographic.
    </p>
    <p>
      Seasonal modifiers ignore which crate you're opening. Around Halloween Haunted rolls on every
      crate you open, including ones that have nothing to do with that event. Christmas does the
      same thing with Jolly.
    </p>
    <p>
      Unusual is the one modifier that comes with something else. Rolling it picks a particle effect
      from that crate's list and each crate has its own set of effects.
    </p>

    <WikiHeading id="seasonal">Seasonal crates</WikiHeading>
    <p>
      Seasonal crates work in a cycle with two halves that happen months apart. When an event ends
      the next crate becomes visible and obtainable and the Random Active Crate starts pointing at
      it but its contents stay sealed. That gap is on purpose because it gives campaign authors and
      everybody else time to build things around a crate before anyone knows what's inside it.
    </p>
    <p>
      Then its own event starts, the contents get revealed and everyone opens their crates. When
      that event ends the crate stops being given out and the next one takes over the rotation.
    </p>
    <p>
      A crate leaving rotation only means you can't get it as a new reward anymore. The one already
      in your inventory doesn't change and you can open it whenever you feel like it. Permanent
      crates that don't depend on a season or an event are planned so the cycle above won't be the
      only way this works forever.
    </p>
  </WikiProse>
</template>

<style scoped>
.crates-page__error {
  color: var(--text-secondary);
}
</style>
