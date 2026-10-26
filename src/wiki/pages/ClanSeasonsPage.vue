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
    <p>
      Between seasons there's no wars. Clan missions still give clan XP though.
    </p>

    <WikiHeading id="ranking">The ranking</WikiHeading>
    <p>
      Clans are ranked by total <RouterLink to="/wiki/clan-standing">standing</RouterLink>, base +
      earned. Whatever your clan has the moment the season ends is what counts. People joining or
      leaving right before the end still move your base.
    </p>
    <p>Every clan gets ranked, pacifist ones too.</p>

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
      Rewards are set per season by rank range, like 1st, 2nd-3rd or 4th-10th. If your clan's
      outside every range, you don't get anything. Clan cosmetics go to the clan. Everything else goes to the
      players who helped out that season.
    </p>
    <p>
      Helping out means doing damage in its wars or chipping in on clan missions it finished that
      season. Top helpers get theirs first and end up with the lower serials. You still get your reward if you
      left the clan before the season ended.
    </p>
  </WikiProse>
</template>
