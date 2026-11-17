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
      There are actually two kinds of AP. Every score has its own raw AP from <RouterLink
      to="/wiki/accuracy-and-ap">the curve</RouterLink> and your profile total is all of them
      added up but your best plays count way more than the rest.
    </p>

    <WikiHeading id="how-it-works">Your best plays count the most</WikiHeading>
    <p>
      Picture your plays in a category lined up from best raw AP to worst. The one at the top
      counts in full and each spot under it counts a bit less:
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
      Once you're around your 25th best play it adds almost nothing. Your total is every play
      multiplied by what its spot counts for and then all of that added together.
    </p>

    <WikiHeading id="sandbox">Add a play and watch your total</WikiHeading>
    <p>
      Here's a sample profile. Slide the raw AP of a new play and watch what happens to the
      total. A play that ends up in the middle of your list only counts for what that spot is
      worth and it pushes every play under it one spot down.
    </p>
    <WikiWeightSandbox :plays="SAMPLE_PLAYS" :max="900" :initial="560" />
    <p>
      That's why a 500 AP score can add only 12 to your total. It ended up low on your list
      where the multiplier is small. The little ? next to Total AP on your profile tells you how
      much raw AP one new play needs to raise your total by 1.
    </p>

    <WikiHeading id="per-category">Each category has its own list</WikiHeading>
    <p>
      Your True Acc plays only compete with your other True Acc plays and it's the same for
      Tech Acc. The same 900 raw AP play can be fifth on a stacked True Acc list and add a few
      hundred or be number one on a nearly empty Tech Acc list and add all 900. Your Overall
      total is the three category totals added together.
    </p>

    <WikiHeading id="never-down">Your total never goes down</WikiHeading>
    <p>
      A score that's worse than your best on a map is saved in your history and still gives XP.
      It never replaces your better play and it can't lower your total.
    </p>
  </WikiProse>
</template>
