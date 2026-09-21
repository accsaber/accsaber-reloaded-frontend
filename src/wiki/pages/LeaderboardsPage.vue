<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>
      Your rank is worked out from where your AP sits against everyone else's. It can move while
      you are not playing.
    </p>

    <WikiHeading id="how-rank-works">How a rank is decided</WikiHeading>
    <p>
      Your rank in a category is the number of ranked players above you on <RouterLink
      to="/wiki/weighted-ap">total AP</RouterLink>, plus one. When somebody below you sets a big
      play and passes you, both ranks get recalculated immediately.
    </p>
    <p>
      Two players on exactly the same total get separated by the age of their top play. The one
      who set their best score first is placed ahead. Banned and deactivated accounts are left
      out of the count.
    </p>

    <WikiHeading id="global-and-country">Global and country</WikiHeading>
    <p>
      Country rank is the same count with only the players from your country. Both numbers are
      on your profile. Clicking either one takes you to the board at the right page with your
      row highlighted.
    </p>

    <WikiHeading id="boards">The boards</WikiHeading>
    <p>
      Every <RouterLink to="/wiki/categories">category</RouterLink> keeps its own board, and
      Overall ranks you on the three added together. There is also an XP board that ignores AP
      and ranks by level and total XP. How XP grows is covered in <RouterLink
      to="/wiki/xp-and-levels">XP &amp; Levels</RouterLink>.
    </p>
    <p>
      They all take the same filters. You can narrow to a single country, search for someone by
      name, show only the people you follow or your rivals, or hide inactive players. The arrow
      at the end of each row compares where that player stands now against seven days ago. A
      player with no arrow either held their spot or has not been ranked for a full week yet.
    </p>

    <WikiHeading id="stats-boards">The other boards</WikiHeading>
    <p>
      The Stats page has smaller boards for everything else. Some are about a single run, like
      the longest 115 streaks and the highest AP ever on one score. Some come from <RouterLink
      to="/wiki/score-history">score history</RouterLink> and rank the most improvements
      overall, the most improvements on one map and the most retried maps. There are also boards
      for the highest average AP on a map, the most milestones, the largest item collections,
      the most crates opened and the most valuable inventories.
    </p>
    <p>
      None of those touch your rank or your AP.
    </p>
    <p>
      If you want to go after one specific player instead of the whole board, that is what
      <RouterLink to="/wiki/snipes">snipes</RouterLink> are for.
    </p>

    <WikiHeading id="inactive">Inactive players</WikiHeading>
    <p>
      An account gets the inactive flag from the platform your profile syncs with, and it clears
      the moment you set any score here. Your AP is not touched while you are away.
    </p>
    <p>
      Inactive players keep their rank number. Hiding them leaves gaps in the numbering where
      those players sit.
    </p>
  </WikiProse>
</template>
