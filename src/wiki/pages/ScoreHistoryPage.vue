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
    label: 'Gives XP',
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
      Only one play per map counts for your AP, and that is your best one. Every other run you
      have submitted on that map is saved below it, and you can see all of them from any score
      on your profile.
    </p>
    <p>
      That history only fills up if you play with the <RouterLink
      to="/wiki/getting-your-scores-counted">AccSaber plugin</RouterLink>, because the plugin is
      the only thing that sends the runs that were not a new best. If your scores reach the site
      through BeatLeader or ScoreSaber, the site only sees your best play on each map and any
      previous bests.
    </p>

    <WikiHeading id="which-play-counts">Which play counts</WikiHeading>
    <p>
      When a run lands, it gets compared against your current best on that difficulty using the
      score before any modifier multiplier. Accuracy and AP are not compared. A run has to beat
      the old score, and an exact tie keeps the play you already had.
    </p>
    <WikiPlayOutcome
      :max-score="DEMO_MAX_SCORE"
      :complexity="DEMO_COMPLEXITY"
      :pb-score="DEMO_PB"
      :initial-score="DEMO_INITIAL"
    />
    <p>
      A play can reach the site from the plugin and then again through a <RouterLink
      to="/wiki/getting-your-scores-counted">BeatLeader backfill</RouterLink>. The second copy
      gets merged into the first.
    </p>

    <WikiHeading id="xp-per-play">Why the same map gives different XP</WikiHeading>
    <p>
      Every completed run gives XP. There are three amounts:
    </p>
    <table>
      <thead>
        <tr>
          <th>The run</th>
          <th>What you get</th>
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
      A big XP number is usually a first clear. Going from 94% to 96% on a map you already
      cleared gives you XP for the two percent you gained, with a boost on top. Where XP comes
      from is covered in <RouterLink to="/wiki/xp-and-levels">XP &amp; Levels</RouterLink>.
    </p>

    <WikiHeading id="what-still-counts">When a run loses</WikiHeading>
    <WikiCompareTable :columns="OUTCOME_COLUMNS" :rows="OUTCOME_ROWS" />
    <p>
      Quit early covers a restart, a quit to menu or a fail. The plugin submits those by
      default, and you can stop it under Disable incomplete submissions in its leaderboard
      settings. An unfinished run cannot become your best or touch your AP, and it still gives
      the flat 25.
    </p>

    <WikiHeading id="legend">Reading your history</WikiHeading>
    <p>
      Open any score and every entry in its history has a label saying why it is there:
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

    <WikiHeading id="rank-drift">Rank when set</WikiHeading>
    <p>
      Each play remembers the leaderboard position it had the day you set it. The score detail
      shows that as set as #N whenever it differs from where the play sits today. The two drift
      apart when other people set scores above yours, when scores above yours get beaten or when
      a map leaves the ranked pool.
    </p>
  </WikiProse>
</template>
