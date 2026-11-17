<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <WikiHeading id="alliances">Alliances</WikiHeading>
    <p>
      Only Founders can make alliances and both clans need one of the free ally slots that come at
      <RouterLink to="/wiki/clan-levels">clan levels</RouterLink> 5, 10, 15 and 20.
    </p>
    <p>Being allies means:</p>
    <ul>
      <li>You can't declare war on each other.</li>
      <li>You can <RouterLink to="/wiki/coalitions">fight in each other's wars</RouterLink>.</li>
      <li>Allies that fought a war this season add to your base standing.</li>
    </ul>
    <p>The Diplomacy tab shows how many wars you've fought together. Either Founder can end it whenever.</p>

    <WikiHeading id="rivals">Rivals</WikiHeading>
    <p>
      Commanders can call another clan a rival but it's only a label and does nothing in wars. The
      other clan sees it on their Diplomacy tab and if you both call each other rivals it shows as
      mutual.
    </p>
    <p>You can't be allies and rivals at the same time.</p>
  </WikiProse>
</template>
