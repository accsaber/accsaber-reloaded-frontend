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
      A modifier on AccSaber can never raise your score. No Fail cuts it in half and the rest
      leave it as it was. Faster Song, Ghost Notes and the others are there for your own
      enjoyment.
    </p>

    <WikiHeading id="the-list">Every modifier</WikiHeading>
    <WikiCompareTable :columns="COLUMNS" :rows="MODIFIER_ROWS" />

    <WikiHeading id="banned">Why four of them are banned</WikiHeading>
    <p>
      No Obstacles, No Bombs, Slower Song and Small Notes either make accuracy easier than the
      map intends or change what a clean cut means. Plays with any of these get no AP and no
      leaderboard entry.
    </p>
    <p>
      Campaigns are the one exception. Some campaign challenges ask you to play with modifiers
      that ranked play forbids. Those plays are recorded for the campaign and never touch a
      leaderboard.
    </p>
  </WikiProse>
</template>
