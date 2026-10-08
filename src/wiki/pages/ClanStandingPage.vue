<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>Standing is what clans get ranked by. It has two parts, base and earned.</p>

    <WikiHeading id="base">Base</WikiHeading>
    <p>
      Base is about how good your members are. It uses everyone's Overall skill level from the
      Statistics tab on their profile. Your best player counts fully. Everyone after them counts
      a bit less, like <RouterLink to="/wiki/weighted-ap">weighted AP</RouterLink>.
    </p>
    <p>
      Allies that fought a war this season add to it too. It updates every 10 minutes and
      whenever someone joins or leaves. The Strength column on the roster shows each member's
      share.
    </p>

    <WikiHeading id="earned">Earned</WikiHeading>
    <p>
      Earned standing starts at 0 every season. Finishing a clan mission gives 100. Breaking
      someone in a war takes standing from their clan and gives it to yours.
    </p>
    <p>
      Earned standing is the only part you can lose, and it never goes below 0. If your clan is
      already at 0 when it gets broken, you lose nothing, but the attacker still gets the full
      amount. The numbers are on
      <RouterLink to="/wiki/war-combat">Hits & Breaks</RouterLink>.
    </p>

    <WikiHeading id="ranking">The ranking</WikiHeading>
    <p>
      Clans are ranked by total standing. If two clans are tied, the one that was made first goes
      higher.
    </p>
  </WikiProse>
</template>
