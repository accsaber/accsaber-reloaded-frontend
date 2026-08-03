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
      Every ranked map earned its spot the same way, and none of it happens behind closed
      doors. The <RouterLink to="/ranked-queue">Ranking Queue</RouterLink> page shows every map
      under consideration and its live vote tally, and this page explains what you are looking
      at.
    </p>
    <WikiFlowDiagram :steps="PIPELINE" />

    <WikiHeading id="suggesting">Suggesting a map</WikiHeading>
    <p>
      There is no form and no gatekeeping ritual: map suggestions happen in
      <a :href="DISCORD_URL" target="_blank" rel="noopener noreferrer">our Discord</a>, and
      anyone can bring one. If a map looks like a well-built accuracy map, the ranking team
      imports it into the queue and the pipeline takes over from there.
    </p>

    <WikiHeading id="the-vote">The vote</WikiHeading>
    <p>
      Voting happens per difficulty, not per map, because one difficulty can be a brilliant
      while another is filler. Each ranking team member votes up, down or neutral, and two
      bars have to clear before a difficulty qualifies: it needs three more upvotes than
      downvotes, and it needs to pass the criteria check, a separate vote on whether the map
      meets the <RouterLink to="/wiki/ranking-criteria">ranking criteria</RouterLink>, decided
      by simple majority with the ranking heads holding an override.
    </p>
    <p>
      Qualification is automatic the moment both bars clear, and it works in reverse too: if
      votes shift and a qualified difficulty drops below the bar, it slides right back into the
      queue. Nothing is ranked by inertia.
    </p>

    <WikiHeading id="complexity">Where complexity comes from</WikiHeading>
    <p>
      When a map is imported, an algorithm assigns its starting complexity rating. From there
      the team can vote to gently nudge it up or down until it honestly fits the map, and
      suggested values get averaged rather than fought over.
    </p>

    <WikiHeading id="border-calls">Borderline categories</WikiHeading>
    <p>
      Maps sitting on <RouterLink to="/wiki/categories#the-fine-line">the line between
      Standard and Tech</RouterLink> get discussed separately by the team before they qualify,
      and when the discussion does not settle it, the ranking heads make the final call. One
      category per difficulty, no exceptions.
    </p>

    <WikiHeading id="batches">Batches</WikiHeading>
    <p>
      Qualified maps do not trickle out one by one. The ranking heads gather them into a batch
      and release it as one drop, usually about once a month, when it is ready rather than when
      the calendar says so. That keeps every release a coherent set of new maps worth sitting
      down with.
    </p>
  </WikiProse>
</template>
