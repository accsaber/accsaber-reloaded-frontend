<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const RANKS = ['Member', 'Officer', 'Commander', 'Founder']

const PERMISSIONS: WikiCompareRow[] = [
  { label: 'Use clan chat', values: [true, true, true, true] },
  { label: 'See the audit log', values: [true, true, true, true] },
  { label: 'Invite people and answer requests', values: [false, true, true, true] },
  { label: 'Kick lower ranks', values: [false, true, true, true] },
  { label: 'Pick maps when defending a war', values: [false, true, true, true] },
  { label: 'Make someone an Officer', values: [false, false, true, true] },
  { label: 'Call rivals', values: [false, false, true, true] },
  { label: 'Declare war', values: [false, false, true, true] },
  { label: 'Call in allies or help one', values: [false, false, true, true] },
  { label: 'Give war orders to members', values: [false, false, true, true] },
  { label: 'Take lower ranks off wars', values: [false, false, true, true] },
  { label: 'Make someone a Commander', values: [false, false, false, true] },
  { label: 'Make alliances', values: [false, false, false, true] },
  { label: 'Make the clan pacifist', values: [false, false, false, true] },
  { label: 'Edit the clan and its cosmetics', values: [false, false, false, true] },
  { label: 'Disband', values: [false, false, false, true] },
]
</script>

<template>
  <WikiProse>
    <p>
      There are four ranks in a clan and each one can do everything the ranks under it can, plus
      a bit more.
    </p>
    <WikiCompareTable :columns="RANKS" :rows="PERMISSIONS" />
    <p>You can only promote, demote or kick people ranked below you.</p>

    <WikiHeading id="seats">How many of each rank</WikiHeading>
    <p>
      There's only one Founder. A new clan has no Officer or Commander seats yet and you get them
      as <RouterLink to="/wiki/clan-levels">your clan levels up</RouterLink>: 2 Officers at level
      3, a Commander at 6, a third Officer at 12 and a second Commander at 14.
    </p>

    <WikiHeading id="handing-over">Giving the clan to someone else</WikiHeading>
    <p>
      The Founder can give the clan to anyone in it and the two of them swap ranks. After that
      only the new Founder can give it back.
    </p>

    <WikiHeading id="claiming">When the Founder is gone</WikiHeading>
    <p>
      If the Founder hasn't set a score in a year your longest-serving Commander can take over
      the clan and the old Founder becomes a Commander.
    </p>
    <p>
      If a Founder gets banned the highest rank who's been in the clan the longest takes over. If
      nobody's left the clan is disbanded.
    </p>
  </WikiProse>
</template>
