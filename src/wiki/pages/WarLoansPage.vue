<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const TRUST: WikiCompareRow[] = [
  { label: 'Trust 0', values: ['Any', 'Any', '1'] },
  { label: 'Trust 1', values: ['30 days', '100', '2'] },
  { label: 'Trust 2', values: ['120 days', '600', '3'] },
  { label: 'Trust 3', values: ['365 days', '3,000', '4'] },
]
</script>

<template>
  <WikiProse>
    <p>
      <RouterLink to="/wiki/alliances-and-rivals">Allies</RouterLink> can lend you players for a
      war. They fight on your side.
    </p>

    <WikiHeading id="lending">Lending</WikiHeading>
    <p>
      A Commander or the Founder of the lending clan sends the offer. The player gets to accept or
      decline.
    </p>
    <ul>
      <li>The lending clan cannot be in that war.</li>
      <li>It needs a free lend slot. You get those at clan levels 7 and 14.</li>
      <li>If you are attacking, you need a free borrow slot. You get those at levels 7 and 18.</li>
      <li>Defenders can borrow as many players as they want.</li>
      <li>A player can only be on one loan at a time. After one ends they wait 3 days for the next.</li>
    </ul>
    <p>Loans end when the war ends or when the player leaves their clan.</p>

    <WikiHeading id="trust">Trust</WikiHeading>
    <p>
      The longer two clans have been allies, and the more their lent players have done, the more
      loans they can have going at once. You need both to go up a level.
    </p>
    <p>
      Loan contribution is the <RouterLink to="/wiki/war-combat#contribution">war contribution</RouterLink>
      every lent player has racked up between your two clans since you allied, both ways. That's
      their damage plus 50 for every break they helped with, so one solo break is about 150. Trust
      1 is roughly one break, trust 2 about four and trust 3 about twenty.
    </p>
    <WikiCompareTable :columns="['Allied for', 'Loan contribution', 'Loans at once']" :rows="TRUST" />

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      A lent player fights like anyone else on the side they joined. They get the same war XP and
      can get the winner's items. Every time they break someone, their own clan gets 6 clan XP.
    </p>
    <p>What they do doesn't count toward either clan's season rewards though.</p>
  </WikiProse>
</template>
