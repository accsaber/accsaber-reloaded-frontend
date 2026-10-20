<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const UNLOCKS: WikiCompareRow[] = [
  { label: 'New clan', values: ['0', '10 member spots, Mixed pools, Duels'] },
  { label: 'Level 2', values: ['171', '+5 member spots'] },
  { label: 'Level 3', values: ['365', '+2 Officers, Random pools'] },
  { label: 'Level 5', values: ['997', '+5 member spots, +1 ally, Berserker'] },
  { label: 'Level 6', values: ['1,443', '+1 Commander, Category turf'] },
  { label: 'Level 8', values: ['2,610', '+5 member spots'] },
  { label: 'Level 9', values: ['3,336', 'Complexity turf'] },
  { label: 'Level 10', values: ['4,160', '+5 member spots, +1 ally'] },
  { label: 'Level 12', values: ['6,109', '+5 member spots, +1 Officer'] },
  { label: 'Level 14', values: ['8,472', '+1 Commander'] },
  { label: 'Level 15', values: ['9,812', '+5 member spots, +1 ally'] },
  { label: 'Level 18', values: ['14,485', '+5 member spots'] },
  { label: 'Level 20', values: ['18,158', '+5 member spots, +1 ally'] },
]
</script>

<template>
  <WikiProse>
    <p>Clans level up the same way players do. Clan XP is separate from your own XP.</p>

    <WikiHeading id="clan-xp">Clan XP</WikiHeading>
    <ul>
      <li>Every ranked play a member sets gives 3. Partials don't count.</li>
      <li>A finished clan mission gives 70.</li>
      <li>Breaking someone in a war gives 6. In Berserker the smaller side gets less per break.</li>
      <li>Winning a war gives 345, split between the clans on the winning team.</li>
    </ul>

    <WikiHeading id="big-clans">Big clans</WikiHeading>
    <p>
      Bigger and stronger clans earn more XP per week. To even it out, their XP from plays, breaks
      and wins gets divided by their clan size scaling. You can see it on your clan's Level tab.
      Small clans never get a boost though. Mission XP never gets scaled at all.
    </p>

    <WikiHeading id="unlocks">Unlocks</WikiHeading>
    <WikiCompareTable :columns="['Total XP', 'Unlocks']" :rows="UNLOCKS" />
    <p>
      A clan maxes out at 50 members at level 20. Levels 1 to 50 also give
      <RouterLink to="/wiki/clan-cosmetics">cosmetics</RouterLink>.
    </p>
  </WikiProse>
</template>
