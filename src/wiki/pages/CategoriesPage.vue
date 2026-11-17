<script setup lang="ts">
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import type { CategoryCode } from '@/types/display'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const COMPARISON: { code: CategoryCode; maps: string; skill: string }[] = [
  {
    code: 'true_acc',
    maps: 'slow, spacious, every note fully readable',
    skill: 'pure execution and consistency',
  },
  {
    code: 'standard_acc',
    maps: 'straight-forward mapping with vertical flow',
    skill: 'keeping form while map progresses',
  },
  {
    code: 'tech_acc',
    maps: 'demanding angles and twisty patterns',
    skill: 'holding acc while the map fights back',
  },
]
</script>

<template>
  <WikiProse>
    <p>
      There's more than one way to gain AP and each category gives one of those ways its own fair
      fight. Every ranked map belongs to exactly one category and every category has its own
      leaderboard. Your plays only compete against your other plays in the same category and your
      <RouterLink to="/wiki/weighted-ap">weighted totals</RouterLink> are separate per category too.
    </p>

    <WikiHeading id="at-a-glance">At a glance</WikiHeading>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>The maps</th>
          <th>The skill</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="category in COMPARISON" :key="category.code">
          <td><CategoryBadge :category="category.code" /></td>
          <td>{{ category.maps }}</td>
          <td>{{ category.skill }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      None of the three is the "right" place to start. Browse the <RouterLink to="/maps">ranked
      pool</RouterLink>, play what looks fun and you'll find your lane.
    </p>

    <WikiHeading id="true-acc"><span class="cat cat--true">True Acc</span></WikiHeading>
    <p>
      True Acc is the rawest accuracy on AccSaber. The maps are slow and spacious with wide-open
      swings and all the time in the world to read every note. That's exactly the trap because with
      nothing rushing you there's also nothing to blame. Every point you drop was yours to keep and
      the leaderboards come down to raw execution and staying consistent for a full map. The lower
      complexity maps tend to be all down notes so you focus on only one type of swing. The higher
      complexity ones mostly keep parity and some include unusual angles to test if you can stay
      precise even when the map is trying to throw you off.
    </p>

    <WikiHeading id="standard-acc"><span class="cat cat--standard">Standard Acc</span></WikiHeading>
    <p>
      Standard Acc is the middle ground and the one most players know best. The maps have real flow
      and tempo but they don't give you any angle or positional challenges. The skill here is
      keeping your form while everything is in motion with full swings that stay consistent. The
      higher complexity maps push the limits of Standard Acc with a few angles and wider hits where
      you need to know how to keep your accuracy while repositioning. They still never get as
      demanding as Tech Acc.
    </p>

    <WikiHeading id="tech-acc"><span class="cat cat--tech">Tech Acc</span></WikiHeading>
    <p>
      Tech Acc is the hardest of the three. Its maps throw demanding angles and harder patterns at
      you and dare you to stay precise through them. Repositioning is a huge part of it, angle and
      timing matter and composure matters most of all because the map is actively trying to bend
      your swing out of shape. The lower complexity maps might only include a few horizontal hits.
      The higher complexity ones will have you rotating and repositioning your wrists constantly to
      test if you can keep your accuracy under that kind of pressure.
    </p>

    <WikiHeading id="the-fine-line">The line between Standard and Tech</WikiHeading>
    <p>
      The two categories are close to each other at the edges. The top of Standard Acc has a few
      angles and wider hits and the bottom of Tech Acc might only add a few horizontal ones. What
      separates them is where the challenge comes from. On a Standard map every note is still in the
      same up-down flow. There may be a few palm-in swings and outerlane middle down hits but you
      can still play the map with a vertical flow by using Beat Saber's angle tolerance.
    </p>
    <p>
      The line is usually drawn when the map needs you to adapt to a flow outside of the vertical
      boundaries. Some examples are crossover horizontals, excessive and constant use of palm-in
      swings and wide hits, any angles beyond 90°, palm-ups, wrist-rolls and any other mapping style
      that forces you to break the vertical flow.
    </p>
    <p>
      A good example of a Standard Acc map right on the line is <RouterLink to="/maps/4b10c?difficulty=expert">"Always,
      Everytime"</RouterLink> which has a few crossovers and wide hits in the chorus but never pulls
      away from the vertical flow. Going the other way <RouterLink to="/maps/50017?difficulty=normal">"Ginger
      Lemonade"</RouterLink> is a Tech Acc map on the line with simple patterns that don't need much
      repositioning and a few crossover horizontals that break the vertical flow completely. For
      maps right on the line the ranking team makes the call when ranking and decides which of the
      two skills the map really tests.
    </p>

    <WikiHeading id="overall">Overall</WikiHeading>
    <p>
      Overall is your three category totals added together and it has its own leaderboard. A monster
      in a single category will post a scary number there but topping Overall means you're strong
      everywhere. The <RouterLink to="/leaderboards">leaderboards</RouterLink> let you switch
      between all four views, globally and per country.
    </p>
  </WikiProse>
</template>

<style scoped>
.cat--true {
  color: var(--accent-true-acc);
}

.cat--standard {
  color: var(--accent-standard-acc);
}

.cat--tech {
  color: var(--accent-tech-acc);
}
</style>
