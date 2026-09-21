<script setup lang="ts">
import WikiFlowDiagram, { type WikiFlowStep } from '@/wiki/components/WikiFlowDiagram.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const WEEK_CYCLE: WikiFlowStep[] = [
  { label: 'You join', detail: 'everybody starts at week one' },
  { label: 'The week opens', detail: 'its date has arrived' },
  { label: 'You clear every mission in it', detail: 'community ones do not count' },
  { label: 'The next week opens', detail: 'and the cycle repeats' },
  { label: 'The bonus lands', detail: 'once every week is done', accent: 'var(--accent-overall)' },
]
</script>

<template>
  <WikiProse>
    <p>
      An event is a stretch of a few weeks with its own missions, its own rewards and usually its
      own <RouterLink to="/wiki/crates">crate</RouterLink>.
    </p>

    <WikiHeading id="joining">Joining</WikiHeading>
    <p>
      An event does not start tracking you until you press the button on its page. Anything
      you played before that counts for nothing toward it.
    </p>
    <p>
      Joining late costs you nothing else, because everybody starts at week one whenever they
      arrive and a player showing up three weeks in gets the first week's missions handed to them
      and works forward from there.
    </p>

    <WikiHeading id="weeks">Weeks</WikiHeading>
    <WikiFlowDiagram :steps="WEEK_CYCLE" />
    <p>
      A week whose date passed while you were
      still stuck on the one before it stays shut and it opens the moment you clear what you left
      behind.
    </p>

    <WikiHeading id="missions">The missions</WikiHeading>
    <p>
      Event missions are built by hand instead of being rolled for you, which means the target on
      one is the same number for everybody playing. They do not rotate and they do not expire at
      4am.
    </p>
    <p>
      Some of them only exist inside events at all, like clearing a campaign or playing maps out
      of the newest batch.
    </p>
    <p>
      A repeatable mission comes straight back the moment you finish it, up to whatever cap it
      carries. Every run gives the reward again.
    </p>

    <WikiHeading id="community">Community missions</WikiHeading>
    <p>
      A community mission is one goal shared by everybody on the site. It fills up from every
      contribution at once instead of tracking you on your own. When it lands, every player who
      put something into it gets the full reward.
    </p>

    <WikiHeading id="finishing">Finishing it</WikiHeading>
    <p>
      Clearing every personal mission in every week finishes the event and gives a bonus on top of
      everything the missions already gave.
    </p>
  </WikiProse>
</template>
