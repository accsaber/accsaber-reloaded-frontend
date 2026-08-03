<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiFlowDiagram, { type WikiFlowStep } from '@/wiki/components/WikiFlowDiagram.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const SCORE_JOURNEY: WikiFlowStep[] = [
  { label: 'You finish a map', detail: 'your mods take it from there' },
  { label: 'The play gets reported', detail: 'by BeatLeader, ScoreSaber or our own plugin' },
  { label: 'AccSaber records it', detail: 'usually within seconds' },
  {
    label: 'Your profile updates',
    detail: 'AP, rank and XP land automatically',
    accent: 'var(--accent-overall)',
  },
]

const PLUGIN_COLUMNS = ['Just BL / SS', 'With the plugin']

const PLUGIN_ROWS: WikiCompareRow[] = [
  { label: 'Ranked scores, AP and rank', values: [true, true] },
  { label: 'Playing campaigns', values: [true, true] },
  { label: 'Failed and quit runs still earn XP', values: [false, true] },
  { label: 'Every attempt tracked in your play stats', values: [false, true] },
  { label: 'Wall hits and pauses on your scores', values: ['BeatLeader only', true] },
  { label: 'In-game campaigns, leaderboards and missions', values: [false, true] },
  { label: 'Works without BL or SS installed', values: [false, true] },
]
</script>

<template>
  <WikiProse>
    <p>
      There is no sign up on AccSaber. The first time you set a score on a ranked map, your
      profile creates itself, name, avatar, country and all. So getting your scores counted
      really comes down to one thing: making sure your plays actually reach us. Here is how that
      works, and what to check when a score seems to be missing.
    </p>

    <WikiHeading id="the-journey">The journey your score takes</WikiHeading>
    <p>
      Your play reaches us on whichever road is available: we listen to BeatLeader and
      ScoreSaber live around the clock, and the AccSaber plugin submits straight to us the
      moment the map ends, no middleman involved:
    </p>
    <WikiFlowDiagram :steps="SCORE_JOURNEY" />
    <p>
      And if the same play reaches us from more than one of those, no drama: whoever reports it
      first creates the score, and everyone arriving after just fills in whatever details were
      missing. You never end up with duplicates.
    </p>

    <WikiHeading id="setting-up">Setting up</WikiHeading>
    <p>
      The usual setup is one leaderboard mod: BeatLeader or ScoreSaber, whichever you prefer.
      Both work on PC and Quest, and both feed AccSaber everything it needs for ranked play. On
      PC, the AccSaber plugin submits plays directly too, so it holds its own even with neither
      installed. The <RouterLink to="/getting-started">Getting Started</RouterLink> page has the
      downloads and the three-step setup.
    </p>
    <p>
      Logging in on the site works through Steam or BeatLeader, and you can attach Discord to
      your account for community roles. One thing that trips people up: you cannot log in before
      AccSaber has seen at least one ranked score from you, because that first score is what
      creates your profile in the first place.
    </p>

    <WikiHeading id="the-plugin">What the plugin adds</WikiHeading>
    <p>
      BeatLeader and ScoreSaber only report your finished plays. The AccSaber plugin reports
      every attempt, including runs you failed, quit or restarted, as long as you got through
      at least three quarters of the map. Those attempts never touch your leaderboard standing,
      but they feed your XP, missions, milestones and play stats, so the grind counts even when
      the run does not. Campaigns also get a full in-game home: browse them, track your progress
      and play missions without ever taking the headset off.
    </p>
    <WikiCompareTable :columns="PLUGIN_COLUMNS" :rows="PLUGIN_ROWS" />
    <p>
      Two things to keep in mind: the plugin is PC only for now, and a failed run never advances
      a campaign. Campaign objectives want the full map cleared.
    </p>

    <WikiHeading id="troubleshooting">When a score does not show up</WikiHeading>
    <p>Straight from the support channel, in order of how often it turns out to be the reason:</p>
    <table>
      <thead>
        <tr>
          <th>Likely cause</th>
          <th>What to do</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>You used a banned modifier</td>
          <td>
            No Obstacles, No Bombs, Slower Song and Small Notes make a play unrankable. Replay
            it without them and it will count.
          </td>
        </tr>
        <tr>
          <td>The score looks way lower than what you hit</td>
          <td>
            That is No Fail. It is allowed, but it halves your score before anything else is
            calculated, and the accuracy math follows it down.
          </td>
        </tr>
        <tr>
          <td>The map is not ranked</td>
          <td>
            Only maps in the ranked pool earn AP. Look it up on the
            <RouterLink to="/maps">Maps</RouterLink> page; if it is not there, it does not count.
          </td>
        </tr>
        <tr>
          <td>Something in your setup blocked it</td>
          <td>
            Practice mode, another mod disabling score submission, or quitting before 75% of the
            map (on the plugin) all stop a play from being sent at all.
          </td>
        </tr>
        <tr>
          <td>It just needs a minute</td>
          <td>
            Scores usually land within seconds, but a rare hiccup on BeatLeader's or
            ScoreSaber's side can take longer. Still missing the next day? Ping us in the
            Discord and we will dig into it.
          </td>
        </tr>
      </tbody>
    </table>
  </WikiProse>
</template>
