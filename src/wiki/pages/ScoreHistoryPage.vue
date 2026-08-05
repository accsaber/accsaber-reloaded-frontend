<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiPlayOutcome from '@/wiki/components/WikiPlayOutcome.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const DEMO_MAX_SCORE = 1015565
const DEMO_COMPLEXITY = 8
const DEMO_PB = 968849
const DEMO_INITIAL = 975000

const OUTCOME_COLUMNS = ['First clear', 'New best', 'Worse run', 'Quit early']

const OUTCOME_ROWS: WikiCompareRow[] = [
  { label: 'Becomes your best play', values: [true, true, false, false] },
  { label: 'Moves your AP', values: [true, true, false, false] },
  {
    label: 'Pays XP',
    values: ['25 + full bonus', '25 + boosted gain', '25 flat', '25 flat'],
  },
  { label: 'Saved to your history', values: [true, true, true, true] },
  {
    label: 'Counts toward milestones',
    values: [true, true, 'Some of them', 'Some of them'],
  },
  {
    label: 'Counts toward missions',
    values: [true, true, 'Play count and streak', 'Play count and streak'],
  },
]

const HISTORY_LABELS = [
  ['Current PB', 'The play your AP comes from right now.'],
  ['Previous PB', 'This was your best once, and then you beat it.'],
  ['Worse attempt', 'You finished the map and did not beat your best.'],
  ['Quit early', 'You did not reach the end of the map.'],
  ['Reweighted', "The map's complexity changed, so the play's AP was recalculated."],
  ['XP recomputed', "The XP formula changed, so the play's XP was recalculated."],
  ['Merged account', 'The play came across when two accounts were merged into one.'],
]
</script>

<template>
  <WikiProse>
    <p>
      Only one play per map feeds your AP, and that is your best one. Every other run you have
      ever submitted on that map is still sitting below it, and you can scroll the whole
      pile from any score on your profile. Those older entries keep their own numbers, the
      numbers on them can change long after you set them, and this page is about both halves of
      that.
    </p>
    <p>
      One thing to get out of the way first: that pile only exists if you play with the
      <RouterLink to="/wiki/getting-your-scores-counted">AccSaber plugin</RouterLink>. The plugin
      is the only thing that sends up the runs that lost. If your scores reach the site through a
      BeatLeader or ScoreSaber backfill instead, all it ever sees is your best play on each map,
      and there is nothing sitting underneath it but any previous best plays.
    </p>

    <WikiHeading id="which-play-counts">Which play counts</WikiHeading>
    <p>
      When a run lands, it gets compared against your current best on that difficulty using the
      score you earned before any modifier multiplier touched it. Accuracy is not what gets
      compared, and neither is AP. A run also has to beat the old number outright, so an exact
      tie leaves the play you already had in place.
    </p>
    <WikiPlayOutcome
      :max-score="DEMO_MAX_SCORE"
      :complexity="DEMO_COMPLEXITY"
      :pb-score="DEMO_PB"
      :initial-score="DEMO_INITIAL"
    />
    <p>
      A play can reach the site from the plugin and then again through a
      <RouterLink to="/wiki/getting-your-scores-counted">BeatLeader backfill</RouterLink>, and
      the second copy gets merged into the first instead of being filed as another attempt.
    </p>

    <WikiHeading id="xp-per-play">Why the same map pays different XP</WikiHeading>
    <p>
      Every completed run pays XP, and this is the part that surprises people who beat a map
      twice. There are three payouts:
    </p>
    <table>
      <thead>
        <tr>
          <th>The run</th>
          <th>What it pays</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Your first clear of the map</td>
          <td>The flat 25 plus the full accuracy bonus</td>
        </tr>
        <tr>
          <td>A new best on a map you had already cleared</td>
          <td>The flat 25 plus one and a half times the bonus you gained</td>
        </tr>
        <tr>
          <td>Anything that is not a new best</td>
          <td>The flat 25</td>
        </tr>
      </tbody>
    </table>
    <p>
      So a big XP number is usually a first-clear number. Going from 94% to 96% on a map you
      already own pays you for the two percent you gained rather than for the whole play again,
      with a boost on top to make chasing the improvement worth it. The full picture of where XP
      comes from lives in <RouterLink to="/wiki/xp-and-levels">XP &amp; Levels</RouterLink>.
    </p>

    <WikiHeading id="what-still-counts">What a run does even when it loses</WikiHeading>
    <WikiCompareTable :columns="OUTCOME_COLUMNS" :rows="OUTCOME_ROWS" />
    <p>
      Quit early covers anything you did not take to the end of the map, so a restart, a quit to
      menu, or a fail. The plugin submits those by default and you can stop it under Disable
      incomplete submissions in its leaderboard settings, though leaving it on costs you
      nothing. An unfinished run cannot become your best and cannot touch your AP, and it still
      banks the flat 25.
    </p>

    <WikiHeading id="legend">Reading your history</WikiHeading>
    <p>
      Open any score and every entry in its history carries a label saying why it is there:
    </p>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th>What happened</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[label, meaning] in HISTORY_LABELS" :key="label">
          <td>{{ label }}</td>
          <td>{{ meaning }}</td>
        </tr>
      </tbody>
    </table>

    <WikiHeading id="rank-drift">The rank you set, and the rank now</WikiHeading>
    <p>
      Each play remembers the leaderboard position it landed on the day you set it, and the
      score detail shows that as set as #N whenever it differs from where the play sits today.
      Nothing has gone wrong when the two drift apart. Your play has not changed at all, other
      people have simply put scores above it since, and the same thing happens in reverse when
      scores above yours get beaten or a map leaves the ranked pool.
    </p>
  </WikiProse>
</template>
