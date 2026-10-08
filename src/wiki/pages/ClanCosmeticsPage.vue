<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>Clans have four cosmetic slots:</p>
    <ul>
      <li>Tag card, the card behind the tag next to everyone's name.</li>
      <li>Title effect, how the clan name looks on clan pages.</li>
      <li>Border, the frame around the clan icon.</li>
      <li>Banner, the art at the top of the clan page.</li>
    </ul>
    <p>
      Tag cards take your tag color, while borders take the primary color you picked for the
      clan.
    </p>

    <WikiHeading id="getting-them">Getting them</WikiHeading>
    <p>
      Clans get cosmetics by leveling up, from season rewards, special missions, winning wars or events. They belong
      to the clan. New clans start with none.
    </p>

    <WikiHeading id="equipping">Equipping</WikiHeading>
    <p>
      Only the Founder can equip them, one per slot. Some have a few variants that the Founder
      can switch between whenever they want.
    </p>
  </WikiProse>
</template>
