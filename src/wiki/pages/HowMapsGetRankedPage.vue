<script setup lang="ts">
import WikiFlowDiagram, { type WikiFlowStep } from '@/wiki/components/WikiFlowDiagram.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const PIPELINE: WikiFlowStep[] = [
  { label: 'Someone suggests it', detail: 'anyone can, in the Ranking Hub' },
  { label: 'It enters the queue', detail: 'the team adds it and voting opens' },
  { label: 'The team votes', detail: 'per difficulty, out in the open' },
  { label: 'Qualified', detail: 'enough votes and a criteria pass' },
  { label: 'Ranked', detail: 'released with the next batch', accent: 'var(--accent)' },
]
</script>

<template>
  <WikiProse>
    <p>
      Every ranked map goes through the same steps. The <RouterLink to="/ranked-queue">Ranking
      Hub</RouterLink> shows every map that's been suggested, queued or rejected and its live vote
      count.
    </p>
    <WikiFlowDiagram :steps="PIPELINE" />

    <WikiHeading id="suggesting">Suggesting a map</WikiHeading>
    <p>
      Anyone who's logged in can <RouterLink to="/ranked-queue/suggest">suggest a map</RouterLink>
      from the Ranking Hub. You paste its BeatSaver code and pick the difficulty and category and
      it shows up in the Suggested tab for everyone to see. You can have 5 open suggestions at a
      time and you can withdraw one any time before the team queues it.
    </p>
    <p>
      If it looks like a well-built accuracy map the ranking team adds it to the queue and if it
      doesn't they reject it with a reason you can read. The hub also has a Criteria Checker where
      you paste a BeatSaver code or upload a zip and see if the map would fail the criteria before
      you suggest it.
    </p>

    <WikiHeading id="following">Following and commenting on a map</WikiHeading>
    <p>
      Every map in the hub has comments and anyone logged in can write one. If you follow a map
      you get a notification when it's queued, qualified, ranked or rejected and also when the team
      votes on it or new comments come in. You follow your own suggestions automatically.
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
      You can read every vote and its reason in the hub but each voter shows up under a random
      nickname and gets a different one on every map. You may suggest new, funny nicknames in the Discord.
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
