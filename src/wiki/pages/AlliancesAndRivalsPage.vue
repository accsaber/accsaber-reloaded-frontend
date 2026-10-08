<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <WikiHeading id="alliances">Alliances</WikiHeading>
    <p>
      Only Founders can make alliances. Both clans need one of the free ally slots that come at
      <RouterLink to="/wiki/clan-levels">clan levels</RouterLink> 5, 10, 15 and 20.
    </p>
    <p>Being allies means:</p>
    <ul>
      <li>You cannot declare war on each other.</li>
      <li>You can <RouterLink to="/wiki/war-loans">lend players</RouterLink> to each other's wars.</li>
      <li>Allies that fought a war this season add to your base standing.</li>
    </ul>
    <p>Either Founder can end it whenever.</p>

    <WikiHeading id="rivals">Rivals</WikiHeading>
    <p>
      Commanders can call another clan a rival. It is only a label. It does nothing in wars. The
      other clan sees it on their Diplomacy tab. If you both call each other rivals it shows as
      mutual.
    </p>
    <p>You cannot be allies and rivals at the same time.</p>
  </WikiProse>
</template>
