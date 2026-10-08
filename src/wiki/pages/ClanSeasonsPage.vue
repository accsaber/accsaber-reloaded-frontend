<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>
      A season usually lasts about half a year. You can only declare wars during a season. Clan
      missions only give standing during one too.
    </p>

    <WikiHeading id="season-end">Season end</WikiHeading>
    <p>When a season ends:</p>
    <ul>
      <li>Open wars end with no winner.</li>
      <li>The final ranking gets saved on the season's page.</li>
      <li>Rewards go out.</li>
    </ul>
    <p>
      Earned <RouterLink to="/wiki/clan-standing">standing</RouterLink> goes back to 0 for the
      next season. Base standing stays.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      The top clans get exclusive rewards at the end of each season. Clan cosmetics go to the
      clan. Everything else goes to the players who helped out that season.
    </p>
    <p>
      Helping out means fighting in its wars or doing its clan missions. You still get your
      reward if you left the clan before the season ended.
    </p>
  </WikiProse>
</template>
