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
  { label: 'Level 7', values: ['1,980', '+1 lend slot, +1 borrow slot'] },
  { label: 'Level 8', values: ['2,610', '+5 member spots'] },
  { label: 'Level 9', values: ['3,336', 'Complexity turf'] },
  { label: 'Level 10', values: ['4,160', '+5 member spots, +1 ally'] },
  { label: 'Level 12', values: ['6,109', '+5 member spots, +1 Officer'] },
  { label: 'Level 14', values: ['8,472', '+1 Commander, +1 lend slot'] },
  { label: 'Level 15', values: ['9,812', '+5 member spots, +1 ally'] },
  { label: 'Level 18', values: ['14,485', '+5 member spots, +1 borrow slot'] },
  { label: 'Level 20', values: ['18,158', '+5 member spots, +1 ally'] },
]
</script>

<template>
  <WikiProse>
    <p>Clans level up the same way players do. Clan XP is separate from your own XP.</p>

    <WikiHeading id="clan-xp">Clan XP</WikiHeading>
    <ul>
      <li>Every map a member plays gives 3.</li>
      <li>A finished clan mission gives 70.</li>
      <li>Breaking someone in a war gives 23.</li>
      <li>Your lent player breaking someone gives 6.</li>
      <li>Winning a war gives 345.</li>
    </ul>

    <WikiHeading id="big-clans">Big clans</WikiHeading>
    <p>
      Bigger and stronger clans earn more XP per week, so their XP is scaled to keep every clan
      levelling at the same pace. Your clan's Level tab shows its clan size scaling.
    </p>

    <WikiHeading id="unlocks">Unlocks</WikiHeading>
    <WikiCompareTable :columns="['Total XP', 'Unlocks']" :rows="UNLOCKS" />
    <p>
      A clan maxes out at 50 members at level 20. Levels 1 to 50 also give
      <RouterLink to="/wiki/clan-cosmetics">cosmetics</RouterLink>.
    </p>
  </WikiProse>
</template>
