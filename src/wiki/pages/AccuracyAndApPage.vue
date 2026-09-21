<script setup lang="ts">
import { COMPLEXITY_MAX, COMPLEXITY_MIN, rawAp } from '@/wiki/apCurve'
import WikiCurveExplorer from '@/wiki/components/WikiCurveExplorer.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const formatAccuracy = (v: number) => `${(v * 100).toFixed(2)}%`
const formatAp = (v: number) => v.toFixed(1)
const formatAccuracyTick = (v: number) => `${(v * 100).toFixed(1).replace('.0', '')}%`
const formatApTick = (v: number) => String(Math.round(v))

const EXAMPLES = [
  { acc: 0.99, complexity: 3 },
  { acc: 0.98, complexity: 10 },
  { acc: 0.96, complexity: 13 },
  { acc: 0.995, complexity: 3 },
]
</script>

<template>
  <WikiProse>
    <p>
      Every ranked score you set gets a number attached to it, its AP, short for Accuracy
      Points. There is no randomness in it and nothing hidden, just two numbers and one
      curve. It might be a little confusing at first, but this page will walk you through the process.
    </p>

    <WikiHeading id="numbers">The two numbers</WikiHeading>
    <p>
      The first number is your accuracy, your score divided by the maximum score the map
      allows.
    </p>
    <p>
      The second is the map's complexity, which is AccSaber's own measure of how hard a map
      is to acc on, on a scale from 0 to 14. It is assigned when a map gets ranked and can be
      reweighted after a month or during a global reweight.
    </p>

    <WikiHeading id="the-curve">The curve</WikiHeading>
    <p>
      Accuracy does not turn into AP in a straight line. It runs through a curve. Drag the point around and the
      climb from 97% to 98% gives several times more than the climb from 90% to 91%. That is the
      whole design.
    </p>
    <WikiCurveExplorer
      :fn="rawAp"
      :x-min="0.9"
      :x-max="1"
      x-label="Accuracy"
      y-label="AP"
      :format-x="formatAccuracy"
      :format-y="formatAp"
      :format-x-tick="formatAccuracyTick"
      :format-y-tick="formatApTick"
      :initial-x="0.96"
      param-label="Complexity"
      :param-min="COMPLEXITY_MIN"
      :param-max="COMPLEXITY_MAX"
      :param-step="0.5"
      :initial-param="7"
    />
    <p>
      The complexity slider moves the same curve up and down. The same accuracy on a higher
      complexity gets more AP.
    </p>

    <WikiHeading id="two-roads">Two roads to big AP</WikiHeading>
    <p>
      Because both numbers multiply together, a monster accuracy on a low-complexity map can
      be worth less than a good accuracy on a high-complexity one. The curve compensates for both.
      Real numbers, straight from the actual curve:
    </p>
    <table>
      <thead>
        <tr>
          <th>Accuracy</th>
          <th>Complexity</th>
          <th>AP</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="example in EXAMPLES" :key="`${example.acc}-${example.complexity}`">
          <td>{{ (example.acc * 100).toFixed(1).replace('.0', '') }}%</td>
          <td>{{ example.complexity }}</td>
          <td>{{ formatAp(rawAp(example.acc, example.complexity)) }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      The 98% on complexity 10 beats the 99% on complexity 3. Raw accuracy does not carry
      a score, and yet the last row squeezes that same easy map up to 99.5% and beats everything
      else on the table.
    </p>

    <WikiHeading id="ap-vs-weighted">Two kinds of AP</WikiHeading>
    <p>
      The AP on a
      score and the AP total on your profile are related but different numbers. Each score
      carries the raw AP everything above works out. Your profile total then weighs all of your
      scores, counts your best plays at nearly full value and fades the rest out the further
      down your list they sit. That is why a shiny new 40th-best play barely nudges your total
      while improving your number one means way more. How that weighting works is covered in
      <RouterLink to="/wiki/weighted-ap">Weighted AP</RouterLink>.
    </p>
  </WikiProse>
</template>
