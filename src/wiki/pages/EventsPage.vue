<script setup lang="ts">
import WikiFlowDiagram, { type WikiFlowStep } from '@/wiki/components/WikiFlowDiagram.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const WEEK_CYCLE: WikiFlowStep[] = [
  { label: 'You join', detail: 'everybody starts at week one' },
  { label: 'The week opens', detail: 'its date has arrived' },
  { label: 'You clear every mission in it', detail: "community ones don't count" },
  { label: 'The next week opens', detail: 'and the cycle repeats' },
  { label: 'You get the bonus', detail: 'once every week is done', accent: 'var(--accent-overall)' },
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
      An event doesn't start tracking you until you press the button on its page and nothing you
      played before that counts for it.
    </p>
    <p>
      Joining late doesn't cost you anything else because everybody starts at week one whenever they
      join. A player who shows up three weeks in gets the first week's missions and works forward
      from there.
    </p>

    <WikiHeading id="weeks">Weeks</WikiHeading>
    <WikiFlowDiagram :steps="WEEK_CYCLE" />
    <p>
      If a week's date passed while you were still stuck on the one before it that week stays locked
      and opens the moment you clear what you had left.
    </p>

    <WikiHeading id="missions">The missions</WikiHeading>
    <p>
      Event missions are built by hand instead of being rolled for you so the target is the same
      number for everybody. They don't rotate and they don't expire at 4am.
    </p>
    <p>
      Some of them only exist in events, like clearing a campaign or playing maps from the newest
      batch.
    </p>
    <p>
      A repeatable mission comes right back the moment you finish it until it reaches its cap and
      every time you finish it you get the reward again.
    </p>

    <WikiHeading id="community">Community missions</WikiHeading>
    <p>
      A community mission is one goal shared by everybody on the site. It fills up from every
      contribution at once instead of tracking you on your own and when it's complete every player
      who contributed gets the full reward.
    </p>

    <WikiHeading id="finishing">Finishing it</WikiHeading>
    <p>
      Clearing every personal mission in every week finishes the event and gives a bonus on top of
      everything the missions already gave.
    </p>
  </WikiProse>
</template>
