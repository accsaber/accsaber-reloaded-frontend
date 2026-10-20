<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>Clans have three cosmetic slots:</p>
    <ul>
      <li>Tag card, the card behind the tag next to everyone's name.</li>
      <li>Title effect, how the clan name looks on clan pages.</li>
      <li>Border, the frame around the clan icon.</li>
    </ul>
    <p>
      Tag cards take your tag color, while borders take the primary color you picked for the
      clan.
    </p>

    <WikiHeading id="getting-them">Getting them</WikiHeading>
    <p>
      Clans get cosmetics by leveling up, season rewards and winning wars. Staff can give some out
      too. They belong to the clan.
    </p>

    <WikiHeading id="equipping">Equipping</WikiHeading>
    <p>
      Only the Founder can equip them, one per slot. Some have a few variants that the Founder
      can switch between whenever they want.
    </p>
  </WikiProse>
</template>
