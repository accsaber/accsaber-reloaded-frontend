<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>Clans have three cosmetic slots:</p>
    <ul>
      <li>Tag card is the card behind the tag next to everyone's name.</li>
      <li>Title effect is how the clan name looks on clan pages.</li>
      <li>Border is the frame around the clan icon.</li>
    </ul>
    <p>
      Tag cards use your tag color and borders use the primary color you picked for the clan.
    </p>

    <WikiHeading id="getting-them">Getting them</WikiHeading>
    <p>
      Clans get cosmetics by leveling up, from season rewards and by winning wars. Staff can give
      some out too and they all belong to the clan.
    </p>

    <WikiHeading id="equipping">Equipping</WikiHeading>
    <p>
      Only the Founder can equip them and it's one per slot. Some have a few variants that the
      Founder can switch between whenever they want.
    </p>
  </WikiProse>
</template>
