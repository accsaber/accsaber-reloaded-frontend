<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const SHARED: WikiCompareRow[] = [
  { label: 'Clan scores', values: ['12 new scores'] },
  { label: 'Clan playtime', values: ['37 plays'] },
  { label: 'Clan XP drive', values: ['15,000 XP'] },
  { label: 'Mission grind', values: ['15 of your own missions done'] },
  { label: 'True Acc push', values: ['2 True Acc scores'] },
  { label: 'Standard Acc push', values: ['5 Standard Acc scores'] },
  { label: 'Tech Acc push', values: ['4 Tech Acc scores'] },
]
</script>

<template>
  <WikiProse>
    <p>
      Your clan gets 3 missions every week. They reset on Monday at 4am UTC. These are separate
      from your own <RouterLink to="/wiki/missions">missions</RouterLink>.
    </p>
    <p>
      A new clan gets its first missions 2 days after it's made, even mid-week. Targets go off how
      many members you've got when they open.
    </p>

    <WikiHeading id="shared">Shared missions</WikiHeading>
    <p>
      Most of them are one big counter for the whole clan. Everyone's plays add to it. Here are
      the targets for a clan of 5:
    </p>
    <WikiCompareTable :columns="['Target']" :rows="SHARED" />
    <p>Bigger clans get bigger targets. A clan of 10 needs double what a clan of 5 does.</p>
    <p>
      The XP drive counts XP from plays, milestones, campaigns, events and basically every other
      mission. XP from clan missions and clan wars does not count.
    </p>

    <WikiHeading id="everyone-sets-scores">Everyone sets scores</WikiHeading>
    <p>
      Instead of one counter, everyone gets their own card asking for 3 to 6 new scores. Your card
      gives its own XP when you clear it. The clan clears the mission once 1 in 5 members finish
      theirs.
    </p>
    <p>If you join mid-week, your card shows up next time you log in.</p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      When the clan finishes one, it gets 70 clan XP. During a season it also gets 100 standing.
      Everyone who helped gets 150 XP. Some missions drop a crate too.
    </p>
    <p>
      To count as helping on a shared one you need 2 scores on Clan scores, 4 plays on Clan
      playtime or 1,500 XP on the XP drive. Mission grind needs 2 of your missions and a category
      push needs 1 score. The XP shows up as Clan XP on your profile.
    </p>
    <p>If you leave the clan you drop out of its missions.</p>
  </WikiProse>
</template>
