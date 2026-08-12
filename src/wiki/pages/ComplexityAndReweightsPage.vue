<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import { rawAp } from '@/wiki/apCurve'
import { computed } from 'vue'

const SAMPLE_ACCURACY = 0.96
const SAMPLE_COMPLEXITIES = [2, 4, 6, 8, 10, 12, 14]

const ladder = computed(() =>
  SAMPLE_COMPLEXITIES.map((complexity, index) => {
    const ap = rawAp(SAMPLE_ACCURACY, complexity)
    const previous = index === 0 ? null : rawAp(SAMPLE_ACCURACY, SAMPLE_COMPLEXITIES[index - 1])
    return {
      complexity: complexity.toFixed(1),
      ap: ap.toFixed(0),
      gain: previous === null ? null : (ap - previous).toFixed(0),
    }
  }),
)

const nerfBefore = rawAp(0.965, 9)
const nerfAfter = rawAp(0.965, 8)
const nerfLoss = (nerfBefore - nerfAfter).toFixed(0)
const nerfPercent = ((1 - nerfAfter / nerfBefore) * 100).toFixed(1)
const doubleGain = ((rawAp(0.96, 10) / rawAp(0.96, 5) - 1) * 100).toFixed(0)
</script>

<template>
  <WikiProse>
    <p>
      Every ranked difficulty carries a complexity, and that number decides what accuracy on it is
      worth. Two players sitting at the same 96% on two different maps walk away with different AP,
      and complexity is the whole reason why.
    </p>

    <WikiHeading id="what-drives-it">What makes a map complex</WikiHeading>
    <p>
      Complexity tracks how hard a map is to hit cleanly, which is a different question from how hard
      it is to pass. What pushes it up is technicality and note
      density, so anything that forces your swings to be harder to stay consistent on. A map that
      keeps handing you awkward setups will sit high even if you never come close to failing it.
    </p>
    <p>
      A map you can swing through comfortably stays low, and it stays low even when it is fast or
      busy, because speed on its own does not stop you from holding accuracy. The starting number
      comes out of an estimate when the map is imported, and the ranking team adjusts from there.
    </p>

    <WikiHeading id="what-it-does">What complexity does to your AP</WikiHeading>
    <p>
      Here is the same 96% score priced across the complexity range, using the real curve the site
      runs on.
    </p>

    <table>
      <thead>
        <tr>
          <th>Complexity</th>
          <th>AP for a 96% score</th>
          <th>Gained over the row above</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in ladder" :key="row.complexity">
          <td>{{ row.complexity }}</td>
          <td>{{ row.ap }}</td>
          <td>{{ row.gain ? `+${row.gain}` : '' }}</td>
        </tr>
      </tbody>
    </table>

    <p>
      The gain per step is flat, and that is the part worth internalising. Complexity does not
      multiply your AP, it adds to it, because the curve builds in a sizeable head start before
      complexity is applied at all. Going from complexity 5 to complexity 10 doubles the number on the
      badge and only moves your AP by about {{ doubleGain }}%. A hard map pays better than an easy one
      at the same accuracy, and the difference is smaller than the badge makes it look.
    </p>

    <WikiHeading id="reweights">Reweights</WikiHeading>
    <p>
      A reweight is the ranking team changing a map's complexity after it is already ranked. The point
      is balance. Maps sometimes end up with a complexity that sits out of proportion to what they
      actually ask of you, and a reweight levels them back to where they belong.
    </p>
    <p>
      <strong>Reweights are not running at the moment.</strong> When they do run, the usual shape is a
      monthly pass over the batch before last, so a round in August would go over the maps released in
      July. Every so often there is a global reweight instead, which goes over every ranked map at
      once. There is no fixed schedule for that one.
    </p>

    <WikiHeading id="what-changes">What a reweight does to your scores</WikiHeading>
    <p>
      A complexity going up is a buff and a complexity coming down is a nerf, which is the same
      wording the map page uses. Your play itself never changes, since the score you set stays exactly
      the score you set. What changes is what it is worth.
    </p>
    <p>
      Everything downstream is redone from there. Every score on that difficulty gets its AP
      recalculated, the map's own leaderboard is reordered, and then your category total, your rank,
      your Overall standing and the XP those scores paid all follow. Milestones get another look too,
      in case the new numbers push you over a line you were sitting just under.
    </p>
    <p>
      This can move you backwards. If a map you have a strong play on gets nerfed, that play is worth
      less than it was, and a big enough change on a map high in your top plays will show up in your
      total AP and your rank. As an example, a 96.5% on a map nerfed from 9.0 down to 8.0 goes from
      {{ nerfBefore.toFixed(0) }} AP to {{ nerfAfter.toFixed(0) }} AP, so you lose {{ nerfLoss }} AP
      on that score, or about {{ nerfPercent }}% of what it was paying. XP moves with it, though there
      is a floor built into the XP side at complexity 4.5, so nerfs down at the bottom of the range
      leave your XP alone.
    </p>

    <WikiHeading id="history">Reading a map's history</WikiHeading>
    <p>
      Open any map and go to its Statistics tab. The Complexity History there lists every value the
      map has ever carried, tagged INITIAL for the one it launched with and BUFF or NERF for each
      change after that, with the old and new numbers side by side.
    </p>
    <p>
      On your own scores, a play that was repriced by a reweight is labelled Reweighted in its
      history, which is covered over on the score history page.
    </p>
  </WikiProse>
</template>
