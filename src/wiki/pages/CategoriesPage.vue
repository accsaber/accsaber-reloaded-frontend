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
      There is more than one way to gain AP, and the categories exist so that each way gets
      its own fair fight. Every ranked map belongs to exactly one category, every category has
      its own leaderboard, and your plays only ever compete against your other plays in the same
      category. Your <RouterLink to="/wiki/weighted-ap">weighted totals</RouterLink> are kept
      separately per category too.
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
      None of the three is the "right" place to start. Browse the
      <RouterLink to="/maps">ranked pool</RouterLink>, play what looks fun, and your lane will
      find you.
    </p>

    <WikiHeading id="true-acc"><span class="cat cat--true">True Acc</span></WikiHeading>
    <p>
      The rawest form of accuracy on the platform. True Acc maps are slow and spacious, with wide-open
      swings and all the time in the world to read every note. That generosity is the trap:
      with nothing rushing you, there is also nothing to blame. Every point you drop was
      yours to keep, so the leaderboards come down to raw execution and the nerve to stay
      consistent across a full map.
      The lower complexity maps tend to be all-down notes to focus on only one type of swing, while
      the higher complexity ones mostly maintain parity and some include out of the ordinary angles
      to test your ability to stay precise even when the map is trying to throw you off.
    </p>

    <WikiHeading id="standard-acc"><span class="cat cat--standard">Standard Acc</span></WikiHeading>
    <p>
      The middle ground, and for most players the most familiar one. Standard Acc maps move
      like regular Beat Saber mapping, with real flow and tempo, but they do not pose any angle or positional challenges. 
      The skill here is keeping your form intact while everything is in motion: full swings that stay consistent, 
      angles that stay feasible. The higher complexity maps in this category push the limits of standard acc, 
      posing a few angles and wider hits that, while not as demanding as Tech Acc, still require
      a good understanding of how to maintain accuracy while repositioning.
    </p>

    <WikiHeading id="tech-acc"><span class="cat cat--tech">Tech Acc</span></WikiHeading>
    <p>
      The most challenging one. Tech Acc maps throw demanding angles and harder patterns at you and dare
      you to stay precise through them. Repositioning takes a huge role, angle and timing matter, and composure
      matters most of all, because the map is actively trying to bend your swing out of shape.
      While the lower complexity maps might only include a few horizontal hits, the higher complexity ones will
      have you rotating and repositioning your wrists constantly, testing your ability to maintain accuracy under pressure.
    </p>

    <WikiHeading id="the-fine-line">The line between Standard and Tech</WikiHeading>
    <p>
      The two categories brush against each other at the edges: the top of Standard Acc allows
      itself a few angles and wider hits, and the bottom of Tech Acc might only add a few
      horizontal ones. What separates them is where the challenge comes from. On a Standard
      map, every note still sits in the same up-down flow. While there may be a few palm-in
      swings and outerlane middle down hits, the map can still be played with a vertical flow
      while making use of Beat Saber's angle tolerance.
    </p>
    <p>
      The line is usually drawn when the map requires adapting to a flow outside of the
      vertical boundaries. Some examples are crossover horizontals, excessive and constant use
      of palm-in swings and wide hits, any angles beyond 90°, palm-ups, wrist-rolls, and any
      other mapping style that forces you to break the vertical flow.
    </p>
    <p>
      A good example of a Standard Acc map that sits on the line is
      <RouterLink to="/maps/4b10c?difficulty=expert">"Always, Everytime"</RouterLink>, which has
      a few crossovers and wide hits in the chorus, but will never pull away from the vertical
      flow. On the other hand, a Tech Acc map that sits on the line is
      <RouterLink to="/maps/50017?difficulty=normal">"Ginger Lemonade"</RouterLink>, which
      features simple patterns that don't require much repositioning, but has a few crossover
      horizontals which deviate completely from the vertical flow. For maps that sit right on
      the line, the ranking team makes the call when the map gets ranked, judging which of the
      two skills the map truly tests.
    </p>

    <WikiHeading id="overall">Overall</WikiHeading>
    <p>
      Overall is simply your three category totals added together, with its own leaderboard on
      top. That makes it the all-rounder's crown: a monster in a single category will post a
      scary number there, but topping Overall means holding your own in all three at once. Your
      per-category ranks stay visible either way, so specializing is always a valid way to
      play. The <RouterLink to="/leaderboards">leaderboards</RouterLink> let you flip between
      all four views, globally and per country.
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
