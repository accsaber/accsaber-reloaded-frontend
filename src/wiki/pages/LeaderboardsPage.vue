<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>
      A rank here is a live count of your standing. It gets
      worked out from where your AP sits against everyone else's, which means it moves on its
      own while you are not playing. This page covers how the count is made, what each board
      shows, and what happens to your place when you take time off.
    </p>

    <WikiHeading id="how-rank-works">How a rank is decided</WikiHeading>
    <p>
      Your rank in a category is the number of ranked players sitting above you on
      <RouterLink to="/wiki/weighted-ap">total AP</RouterLink>, plus one. Nothing more elaborate
      is going on. When somebody below you sets a big play and passes you, both of your numbers
      are recalculated immediately, so ranks shift throughout the day and yours can slide
      without you touching the game.
    </p>
    <p>
      Two players landing on exactly the same total get separated by the age of their top play,
      and the one who set their best score first is placed ahead. Banned and deactivated
      accounts are left out of the count entirely.
    </p>

    <WikiHeading id="global-and-country">Global and country</WikiHeading>
    <p>
      Country rank is the same count run over a smaller pool: only the players carrying the same
      flag as you. Both numbers are on your profile, and clicking either one drops you straight
      into the board at the right page with your row lit up.
    </p>

    <WikiHeading id="boards">The boards</WikiHeading>
    <p>
      Every <RouterLink to="/wiki/categories">category</RouterLink> keeps its own board, and
      Overall ranks you on the three added together. Alongside them sits an XP board, which
      ignores AP completely and ranks by level and total XP instead. That one rewards time and
      breadth rather than peak accuracy, so it tends to read very differently from the AP
      boards. There is more on how that number grows in
      <RouterLink to="/wiki/xp-and-levels">XP &amp; Levels</RouterLink>.
    </p>
    <p>
      They all take the same filters: narrow to a single country, search for someone by name,
      cut the board down to the people you follow or the ones you have marked as rivals, or hide
      players flagged as inactive. The little arrow at the end of each row is movement, comparing
      where that player stands now against where they stood seven days ago. A player with no
      arrow either held their spot or has not been ranked for a full week yet.
    </p>

    <WikiHeading id="stats-boards">The other boards</WikiHeading>
    <p>
      AP is not the only thing worth ranking, and the Stats page keeps a rack of smaller,
      stranger boards for the rest. Some are about a single great run, so the longest 115
      streaks and the highest AP ever put on one score. Some are built out of
      <RouterLink to="/wiki/score-history">score history</RouterLink>, ranking the most
      improvements overall, the most improvements on one map, and the maps the community has
      retried more than any other. There are map boards for the highest average AP, a board for
      the most milestones collected, and a whole item section ranking the largest collections,
      the most crates opened and the most valuable inventories.
    </p>
    <p>
      None of those touch your rank or your AP. They are there because the numbers are
      interesting on their own, and a few of them are far easier to top than the AP boards.
    </p>

    <WikiHeading id="inactive">Inactive players</WikiHeading>
    <p>
      An account picks up the inactive flag from the platform your profile syncs with, and it
      clears the moment any score of yours lands here. There is no penalty attached to it and
      nothing to reclaim when you come back. Your AP was never touched while you were away.
    </p>
    <p>
      Inactive players keep their rank number too. The toggle only decides whether you see them,
      so switching it off leaves visible gaps in the numbering where those players sit rather
      than closing the ranks around them.
    </p>
  </WikiProse>
</template>
