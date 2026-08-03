<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const COLUMNS = ['Counts for ranked', 'Your score']

const MODIFIER_ROWS: WikiCompareRow[] = [
  { label: 'No Fail (NF)', values: [true, 'cut in half'] },
  { label: 'Faster Song (FS)', values: [true, 'untouched'] },
  { label: 'Super Fast Song (SF)', values: [true, 'untouched'] },
  { label: 'Ghost Notes (GN)', values: [true, 'untouched'] },
  { label: 'Disappearing Arrows (DA)', values: [true, 'untouched'] },
  { label: 'Pro Mode (PM)', values: [true, 'untouched'] },
  { label: 'One Life (IF)', values: [true, 'untouched'] },
  { label: 'Off Platform (OP)', values: [true, 'untouched'] },
  { label: 'No Obstacles (NO)', values: [false, 'not ranked'] },
  { label: 'No Bombs (NB)', values: [false, 'not ranked'] },
  { label: 'Slower Song (SS)', values: [false, 'not ranked'] },
  { label: 'Small Notes (SN)', values: [false, 'not ranked'] },
]
</script>

<template>
  <WikiProse>
    <p>
      One rule covers everything on this page: on AccSaber, a modifier can never raise your
      score. At best it leaves your play exactly as it was, and the one famous exception drags
      it down hard. Faster Song, Ghost Notes and friends are there for your own enjoyment, and
      the leaderboards treat a modified clean run the same as an unmodified one.
    </p>

    <WikiHeading id="the-list">Every modifier, one table</WikiHeading>
    <WikiCompareTable :columns="COLUMNS" :rows="MODIFIER_ROWS" />

    <WikiHeading id="banned">Why four of them are banned</WikiHeading>
    <p>
      No Obstacles, No Bombs, Slower Song and Small Notes all break the same rule: they make
      accuracy easier than the map intends, or change what a clean cut even means. A
      leaderboard only works if everyone is cutting the same map under the same conditions, so
      plays carrying any of these simply never enter the ranked pipeline. No AP, no leaderboard
      entry, no partial credit, and the fix is always the same: play it again clean.
    </p>
    <p>
      There is one fun exception: campaigns. Some campaign challenges deliberately ask you to
      play with modifiers that ranked play forbids, and those plays are recorded for the
      campaign even though they will never touch a leaderboard.
    </p>
  </WikiProse>
</template>
