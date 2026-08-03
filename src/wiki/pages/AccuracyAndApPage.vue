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
      Every ranked score you set gets a number attached to it: its AP, short for Accuracy Points.
      This page is about where that number comes from. There is no randomness in it and nothing
      hidden, just two ingredients and one curve, and once you have seen the curve, AP stops
      feeling arbitrary forever.
    </p>

    <WikiHeading id="ingredients">The two ingredients</WikiHeading>
    <p>
      The first ingredient is your accuracy: your score divided by the maximum score the map
      allows, kept at full precision. A 94.63% is a 94.63%, no rounding, no cutoffs.
    </p>
    <p>
      The second is the map's complexity: AccSaber's own measure of how demanding a map is to
      play accurately, on a scale from 0 to 14. Star ratings and pass difficulty play no part in
      it. A map can be trivial to survive and brutal to acc, and complexity only cares about the
      second part. It is assigned when a map gets ranked, and the harder a map is to acc, the
      more every percent on it pays.
    </p>

    <WikiHeading id="the-curve">The curve</WikiHeading>
    <p>
      Accuracy does not turn into AP in a straight line. It runs through a curve, and the
      curve's defining feature is how steep it gets near the top. Drag the point and watch: the
      climb from 97% to 98% pays several times more than the climb from 90% to 91%. That is the
      whole design. The closer to perfect you get, the harder every extra fraction is to earn,
      so the curve pays accordingly.
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
      The complexity slider moves the same curve up and down. Same accuracy, higher complexity,
      more AP. Which leads to the question everyone asks eventually.
    </p>

    <WikiHeading id="two-roads">Two roads to big AP</WikiHeading>
    <p>
      Because both ingredients multiply together, a monster accuracy on a low-complexity map can
      be worth less than a good accuracy on a high-complexity one. But the curve cuts both ways:
      push that easy map far enough into the steep end and it starts paying like a hard one.
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
      The 98% on complexity 10 beats the 99% on complexity 3, so raw accuracy alone does not
      carry a score. But look at the last row: squeeze that same easy map up to 99.5% and it
      beats everything else on the table. So there are two roads to big AP, playing harder maps
      you can still acc well, and locking in and truly mastering the maps you already own.
      Both are real, and the strongest players work both at once.
    </p>

    <WikiHeading id="ap-vs-weighted">AP on a score vs AP on your profile</WikiHeading>
    <p>
      One last thing, because it causes more confusion than everything above combined: the AP on
      a score and the AP total on your profile are related but different numbers. Each score
      carries its raw AP, which is what this page explained. Your profile total then weighs all
      of your scores, counting your best plays at nearly full value and fading the rest out the
      further down your list they sit. That is why a shiny new 40th-best play barely nudges your
      total while improving your number one sends it flying. How that weighting works is the
      whole subject of <RouterLink to="/wiki/weighted-ap">Weighted AP</RouterLink>.
    </p>
  </WikiProse>
</template>
