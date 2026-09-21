<script setup lang="ts">
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import type { CategoryCode } from '@/types/display'
import WikiFlowDiagram, { type WikiFlowStep } from '@/wiki/components/WikiFlowDiagram.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const SCORE_FLOW: WikiFlowStep[] = [
  { label: 'Play a ranked map', detail: 'any map in the AccSaber pool counts automatically' },
  { label: 'Your score comes in', detail: 'the score you hit against the maximum possible' },
  { label: 'It turns into AP', detail: 'harder maps give more for the same accuracy' },
  {
    label: 'You climb',
    detail: 'your best plays stack up into your rank',
    accent: 'var(--accent-overall)',
  },
]

const CATEGORY_FEELS: { code: CategoryCode; feel: string }[] = [
  { code: 'true_acc', feel: 'slow and deliberate maps where every single cut has room to be perfect' },
  { code: 'standard_acc', feel: 'the middle ground, real flow with precision still in charge' },
  { code: 'tech_acc', feel: 'more demanding patterns that push accuracy to the limit' },
  { code: 'overall', feel: 'all three combined into one rank for the all-rounders' },
]
</script>

<template>
  <WikiProse>
    <p>
      AccSaber is a Beat Saber platform built around one question, which is how precisely you
      can cut. Most ranked ladders reward many different styles of play and accuracy ends up as
      an afterthought. AccSaber has a hand-picked pool of ranked maps where precision is the
      entire point.
    </p>
    <p>
      There are leaderboards for every flavor of accuracy, campaigns that guide you through
      curated maps, levels and milestones to chase, items to unlock and a market to trade them
      on.
    </p>
    <p>
      AccSaber has been part of the community for years. This site is a ground-up rebuild of the
      original project.
    </p>

    <WikiHeading id="how-it-works">From a play to the leaderboard</WikiHeading>
    <WikiFlowDiagram :steps="SCORE_FLOW" />
    <p>
      AP stands for Accuracy Points. Two things feed it, how accurate your play was and how hard
      the map is to acc. Your total is weighted so that your best plays matter the most.
    </p>

    <WikiHeading id="categories">The categories</WikiHeading>
    <p>
      Ranked maps are split into three categories, each with its own leaderboard. Overall
      combines all three.
    </p>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>What it feels like</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="category in CATEGORY_FEELS" :key="category.code">
          <td>
            <CategoryBadge :category="category.code" />
          </td>
          <td>{{ category.feel }}</td>
        </tr>
      </tbody>
    </table>

    <WikiHeading id="jumping-in">Jumping in</WikiHeading>
    <p>
      Getting set up takes a few minutes and one mod. The <RouterLink
      to="/getting-started">Getting Started</RouterLink> page walks you through it in three
      steps. Once you are linked, every ranked map you play counts on its own.
    </p>
  </WikiProse>
</template>
