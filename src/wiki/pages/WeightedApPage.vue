<script setup lang="ts">
import { positionWeight } from '@/wiki/apCurve'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import WikiWeightSandbox from '@/wiki/components/WikiWeightSandbox.vue'

const ANCHOR_POSITIONS = [1, 5, 10, 16, 20, 25]

const SAMPLE_PLAYS = [720, 695, 664, 640, 612, 588, 561, 540, 515, 494, 472, 455, 438, 420]

const formatWeight = (position: number) => {
  const weight = positionWeight(position - 1) * 100
  return `${weight.toFixed(weight >= 10 ? 0 : 1)}%`
}
</script>

<template>
  <WikiProse>
    <p>
      Two numbers share the name AP, and mixing them up is the single most common confusion on
      the platform. Each score has its raw AP, straight from
      <RouterLink to="/wiki/accuracy-and-ap">the curve</RouterLink>. Your profile total is
      something else: a weighted sum of all your plays, built so that your best work defines
      you and filler does not. This page is about how that weighting behaves and why your total
      moves the way it does.
    </p>

    <WikiHeading id="how-it-works">Your best plays carry the run</WikiHeading>
    <p>
      Picture your plays in a category lined up from best raw AP to worst. The play at the top
      counts at full value. From there, each spot down the line counts a little less, gently at
      first, then steeply:
    </p>
    <table>
      <thead>
        <tr>
          <th>Your play at</th>
          <th>Counts for</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="position in ANCHOR_POSITIONS" :key="position">
          <td>#{{ position }}</td>
          <td>{{ formatWeight(position) }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      By the mid-twenties a play is contributing pocket change, and past thirty it is
      essentially a spectator. Your total is the sum of every play times its multiplier, which
      is why the top of your list is worth fighting for and the bottom barely matters.
    </p>

    <WikiHeading id="sandbox">Watch a new play land</WikiHeading>
    <p>
      Here is a sample profile. Slide the raw AP of an incoming play and watch what actually
      happens to the total. Notice how a play landing mid-list moves the total by a fraction of
      its raw value: it only counts at its landing spot's multiplier, and it pushes every play
      below it one spot down the scale at the same time.
    </p>
    <WikiWeightSandbox :plays="SAMPLE_PLAYS" :max="900" :initial="560" />
    <p>
      This is the answer to "I set a 500 AP score and my total moved 12". Nothing is broken.
      The play landed low on your list, where the multiplier is small. And you do not have to
      do this math yourself: the small ? next to the total AP on your profile tells you exactly
      how much raw AP a single new play needs to lift your total by one point.
    </p>

    <WikiHeading id="per-category">Each category keeps its own list</WikiHeading>
    <p>
      The weighting runs separately in every category. Your True Acc plays compete for spots on
      your True Acc list, your Tech Acc plays on your Tech Acc list, and the two never see each
      other. That has a consequence worth internalizing: the same 900 raw AP play can be worth
      wildly different amounts depending on where it lands. Dropped into a stacked True Acc
      list it might slot in fifth and add a few hundred; dropped into a nearly empty Tech Acc
      list it lands at number one and adds every bit of its 900. Your Overall total is then
      simply the three category totals added together.
    </p>

    <WikiHeading id="never-down">Your total never goes down</WikiHeading>
    <p>
      Playing is always safe. A worse score than your best on a map is recorded for your
      history and still feeds your XP, but it never replaces the better play and never
      subtracts from your total. The only direction a session can move your AP is up, so there
      is no such thing as ruining your profile by having an off day.
    </p>
  </WikiProse>
</template>
