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
  { label: 'Ranked', detail: 'released with the next batch', accent: 'var(--accent)' },
]
</script>

<template>
  <WikiProse>
    <p>
      Every ranked map goes through the same steps. The <RouterLink to="/ranked-queue">Ranking
      Queue</RouterLink> page shows every map being considered and its live vote count.
    </p>
    <WikiFlowDiagram :steps="PIPELINE" />

    <WikiHeading id="suggesting">Suggesting a map</WikiHeading>
    <p>
      Map suggestions happen in <a :href="DISCORD_URL" target="_blank" rel="noopener noreferrer">our
      Discord</a> and anyone can make one. If a map looks like a well-built accuracy map the ranking
      team imports it into the queue.
    </p>

    <WikiHeading id="the-vote">The vote</WikiHeading>
    <p>
      Voting is per difficulty and not per map because one difficulty can be great while another is
      filler. Each ranking team member votes up, down or neutral. A difficulty qualifies when it has
      three more upvotes than downvotes and passes the criteria check. The criteria check is a
      separate vote on whether the map follows the <RouterLink to="/wiki/ranking-criteria">ranking
      criteria</RouterLink>. It's decided by simple majority and the ranking heads can override it.
    </p>
    <p>
      A difficulty qualifies automatically the moment both conditions are met. If votes change and a
      qualified difficulty drops below the bar it goes back into the queue.
    </p>

    <WikiHeading id="complexity">Where complexity comes from</WikiHeading>
    <p>
      When a map is imported an algorithm gives it a starting complexity. From there the team can
      vote to raise or lower it and the suggested values get averaged.
    </p>

    <WikiHeading id="border-calls">Borderline categories</WikiHeading>
    <p>
      Maps on <RouterLink to="/wiki/categories#the-fine-line">the line between Standard and
      Tech</RouterLink> get discussed separately by the team before they qualify. If the discussion
      doesn't settle it the ranking heads make the final call. Every difficulty gets one category.
    </p>

    <WikiHeading id="batches">Batches</WikiHeading>
    <p>
      The ranking heads put qualified maps into a batch and release it all at once, usually about
      once a month.
    </p>
  </WikiProse>
</template>
