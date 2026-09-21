<script setup lang="ts">
import { DISCORD_URL } from '@/utils/constants'
import WikiFlowDiagram, { type WikiFlowStep } from '@/wiki/components/WikiFlowDiagram.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const PIPELINE: WikiFlowStep[] = [
  { label: 'Someone suggests it', detail: 'anyone can, in our Discord' },
  { label: 'It enters the queue', detail: 'the team imports it and voting opens' },
  { label: 'The team votes', detail: 'per difficulty, out in the open' },
  { label: 'Qualified', detail: 'enough votes and a criteria pass' },
  { label: 'Ranked', detail: 'ships with the next batch', accent: 'var(--accent)' },
]
</script>

<template>
  <WikiProse>
    <p>
      Every ranked map goes through the same steps. The <RouterLink to="/ranked-queue">Ranking
      Queue</RouterLink> page shows every map under consideration and its live vote tally.
    </p>
    <WikiFlowDiagram :steps="PIPELINE" />

    <WikiHeading id="suggesting">Suggesting a map</WikiHeading>
    <p>
      Map suggestions happen in <a :href="DISCORD_URL" target="_blank" rel="noopener
      noreferrer">our Discord</a>. Anyone can bring one. If a map looks like a well-built
      accuracy map, the ranking team imports it into the queue.
    </p>

    <WikiHeading id="the-vote">The vote</WikiHeading>
    <p>
      Voting happens per difficulty, not per map, because one difficulty can be great while
      another is filler. Each ranking team member votes up, down or neutral. A difficulty
      qualifies when it has three more upvotes than downvotes and passes the criteria check. The
      criteria check is a separate vote on whether the map meets the <RouterLink
      to="/wiki/ranking-criteria">ranking criteria</RouterLink>, decided by simple majority with
      the ranking heads holding an override.
    </p>
    <p>
      Qualification is automatic the moment both conditions are met. If votes shift and a
      qualified difficulty drops below the bar, it goes back into the queue.
    </p>

    <WikiHeading id="complexity">Where complexity comes from</WikiHeading>
    <p>
      When a map is imported, an algorithm assigns its starting complexity. From there the team
      can vote to move it up or down. Suggested values get averaged.
    </p>

    <WikiHeading id="border-calls">Borderline categories</WikiHeading>
    <p>
      Maps sitting on <RouterLink to="/wiki/categories#the-fine-line">the line between Standard
      and Tech</RouterLink> get discussed separately by the team before they qualify. When the
      discussion does not settle it, the ranking heads make the final call. Every difficulty
      gets one category.
    </p>

    <WikiHeading id="batches">Batches</WikiHeading>
    <p>
      The ranking heads gather qualified maps into a batch and release it all at once, usually
      about once a month.
    </p>
  </WikiProse>
</template>
