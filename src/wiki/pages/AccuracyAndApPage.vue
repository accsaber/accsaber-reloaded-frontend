<script setup lang="ts">
import { COMPLEXITY_MAX, COMPLEXITY_MIN, rawAp } from '@/wiki/apCurve'
import WikiCurveExplorer from '@/wiki/components/WikiCurveExplorer.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import { formatAccuracy, formatFixed } from '@/utils/formatters'

const formatApValue = (v: number) => formatFixed(v, 1)
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
      Every ranked score you set gets AP which is short for Accuracy Points. Nothing about it is
      random or hidden, it's just two numbers on one curve.
    </p>

    <WikiHeading id="numbers">The two numbers behind your AP</WikiHeading>
    <p>
      The first one is your accuracy which is your score divided by the max score the map allows.
    </p>
    <p>
      The second one is the map's complexity. That's AccSaber's own measure of how hard a map is to
      acc on and it goes from 0 to 14. A map gets it when it's ranked and it can be reweighted after
      a month or during a global reweight.
    </p>

    <WikiHeading id="the-curve">How accuracy becomes AP</WikiHeading>
    <p>
      Accuracy doesn't become AP in a straight line because it's on a curve. Drag the point around
      and you'll see that going from 97% to 98% gives several times more than going from 90% to 91%.
    </p>
    <WikiCurveExplorer
      :fn="rawAp"
      :x-min="0.9"
      :x-max="1"
      x-label="Accuracy"
      y-label="AP"
      :format-x="formatAccuracy"
      :format-y="formatApValue"
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
      The complexity slider pushes the same curve up or down so the same accuracy on a higher
      complexity gets more AP.
    </p>

    <WikiHeading id="two-roads">Two ways to get big AP</WikiHeading>
    <p>
      Both numbers multiply together so a monster accuracy on a low complexity map can be worth less
      than a good accuracy on a high complexity one. Here are real numbers from the actual curve:
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
          <td>{{ formatFixed(rawAp(example.acc, example.complexity), 1) }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      The 98% on complexity 10 beats the 99% on complexity 3 so raw accuracy alone doesn't decide
      it. But look at the last row where that same easy map at 99.5% beats everything else on the
      table.
    </p>

    <WikiHeading id="ap-vs-weighted">Two kinds of AP</WikiHeading>
    <p>
      The AP on a score and the AP total on your profile are related but they're not the same
      number. Each score has the raw AP from everything above. Your profile total then weights all
      your scores so your best plays count for almost everything and the rest count less the further
      down your list they are. That's why a shiny new 40th best play barely changes your total while
      improving your number one means way more. <RouterLink to="/wiki/weighted-ap">Weighted
      AP</RouterLink> explains how that works.
    </p>
  </WikiProse>
</template>
