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
  { label: 'Lend players', values: [false, false, true, true] },
  { label: 'Make someone a Commander', values: [false, false, false, true] },
  { label: 'Make alliances', values: [false, false, false, true] },
  { label: 'Edit the clan and its cosmetics', values: [false, false, false, true] },
  { label: 'Disband', values: [false, false, false, true] },
]
</script>

<template>
  <WikiProse>
    <p>
      A clan has four ranks, from Member up to Founder. Each rank can do everything the ones below
      it can.
    </p>
    <WikiCompareTable :columns="RANKS" :rows="PERMISSIONS" />
    <p>You can only promote, demote or kick people ranked below you.</p>

    <WikiHeading id="seats">Seats</WikiHeading>
    <p>
      There is only one Founder. A new clan has no Officer or Commander seats yet. They come with
      the <RouterLink to="/wiki/clan-levels">clan's level</RouterLink>, 2 Officers at level 3, a
      Commander at 6, a third Officer at 12 and a second Commander at 14.
    </p>

    <WikiHeading id="handing-over">Handing over</WikiHeading>
    <p>
      The Founder can hand the clan to anyone in it. The two of them swap ranks. Only the new Founder can give it back.
    </p>

    <WikiHeading id="claiming">Claiming</WikiHeading>
    <p>
      If the Founder has not set a score in a year, your longest-serving Commander can take the
      clan over. The old Founder becomes a Commander.
    </p>
    <p>
      If a Founder gets banned, the highest rank who has been around the longest takes over. If
      nobody is left, the clan is disbanded.
    </p>
  </WikiProse>
</template>
