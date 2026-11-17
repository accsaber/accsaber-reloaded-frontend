<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiFlowDiagram, { type WikiFlowStep } from '@/wiki/components/WikiFlowDiagram.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const SCORE_JOURNEY: WikiFlowStep[] = [
  { label: 'You finish a map', detail: 'your mods do the rest' },
  { label: 'The play gets reported', detail: 'by BeatLeader, ScoreSaber or our own plugin' },
  { label: 'AccSaber records it', detail: 'usually within seconds' },
  {
    label: 'Your profile updates',
    detail: 'AP, rank and XP update automatically',
    accent: 'var(--accent-overall)',
  },
]

const PLUGIN_COLUMNS = ['Just BL / SS', 'With the plugin']

const PLUGIN_ROWS: WikiCompareRow[] = [
  { label: 'Ranked scores, AP and rank', values: [true, true] },
  { label: 'Playing campaigns', values: [true, true] },
  { label: 'Failed and quit runs still give XP', values: [false, true] },
  { label: 'Every attempt tracked in your play stats', values: [false, true] },
  { label: 'Wall hits and pauses on your scores', values: ['BeatLeader only', true] },
  { label: 'In-game campaigns, leaderboards and missions', values: [false, true] },
]
</script>

<template>
  <WikiProse>
    <p>
      There's no sign up on AccSaber. The first time you set a score on a ranked map your profile
      gets created with your name, avatar and country.
    </p>

    <WikiHeading id="the-journey">How your score gets to AccSaber</WikiHeading>
    <p>
      AccSaber listens to BeatLeader and ScoreSaber live and the AccSaber plugin sends your play
      straight to us the moment the map ends:
    </p>
    <WikiFlowDiagram :steps="SCORE_JOURNEY" />
    <p>
      If the same play reaches us from more than one of those then whoever reports it first creates
      the score and the others fill in whatever details were missing.
    </p>

    <WikiHeading id="setting-up">Setting up</WikiHeading>
    <p>
      The usual setup is one leaderboard mod which can be BeatLeader or ScoreSaber. Both work on PC
      and Quest. On PC the AccSaber plugin also submits plays directly and it works even with
      neither of them installed. The <RouterLink to="/getting-started">Getting Started</RouterLink>
      page has the downloads and the three-step setup.
    </p>
    <p>
      You log in on the site through Steam or BeatLeader and you can attach Discord to your account
      for community roles. You can't log in before AccSaber has seen at least one ranked score from
      you because that first score is what creates your profile.
    </p>

    <WikiHeading id="the-plugin">What the plugin adds</WikiHeading>
    <p>
      BeatLeader and ScoreSaber only report your finished plays. The AccSaber plugin reports every
      attempt including runs you failed, quit or restarted as long as you got through at least 75%
      of the map. Those attempts never change your leaderboard rank but they count for your XP,
      missions, milestones and play stats. The plugin also has campaigns in-game where you can
      browse them, track your progress and play missions.
    </p>
    <WikiCompareTable :columns="PLUGIN_COLUMNS" :rows="PLUGIN_ROWS" />
    <p>
      The plugin is PC only for now. A failed run never counts for a campaign because campaign
      objectives need the full map cleared.
    </p>

    <WikiHeading id="troubleshooting">When a score doesn't show up</WikiHeading>
    <p>The most common reasons with the most frequent first:</p>
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
            No Obstacles, No Bombs, Slower Song and Small Notes make a play unrankable. Replay it
            without them and it'll count. The full list is on the <RouterLink to="/wiki/modifiers">Modifiers</RouterLink>
            page.
          </td>
        </tr>
        <tr>
          <td>The score looks way lower than what you hit</td>
          <td>
            That's No Fail. It's allowed but it halves your score before anything else is
            calculated.
          </td>
        </tr>
        <tr>
          <td>The map isn't ranked</td>
          <td>
            Only maps in the ranked pool give AP. Look it up on the <RouterLink to="/maps">Maps</RouterLink>
            page and if it isn't there it doesn't count.
          </td>
        </tr>
        <tr>
          <td>Something in your setup blocked it</td>
          <td>
            Practice mode, another mod disabling score submission or quitting before 75% of the map
            (on the plugin) all stop a play from being sent.
          </td>
        </tr>
        <tr>
          <td>It just needs a minute</td>
          <td>
            Scores usually show up within seconds but BeatLeader or ScoreSaber can sometimes take
            longer. If it's still missing the next day ping us in the Discord.
          </td>
        </tr>
      </tbody>
    </table>
  </WikiProse>
</template>
