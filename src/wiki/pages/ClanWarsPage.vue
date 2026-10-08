<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>
      A war is one clan attacking another on 10 maps. Both sides put standing on the line.
      Whoever drains the other side's stake first wins.
    </p>

    <WikiHeading id="declaring">Declaring</WikiHeading>
    <p>Commanders and the Founder can declare war, but only during a season.</p>
    <ul>
      <li>You can only have one attack going at a time. You can be defending as many as you want.</li>
      <li>You cannot attack allies.</li>
      <li>Both clans need some standing.</li>
      <li>You cannot attack a clan with less than half your standing. If they are attacking you, you can hit back no matter what.</li>
    </ul>

    <WikiHeading id="stake">The stake</WikiHeading>
    <p>
      Both sides put up the same amount, equal to the standing of whichever clan has less. You
      can see each side's bar on the war page. The stake is how much the war can move, not how
      much you can lose.
    </p>
    <p>
      You can only lose <RouterLink to="/wiki/clan-standing#earned">earned standing</RouterLink>,
      the part you picked up this season. Your base standing comes from your members' skill and
      a war can't touch it. So even if your whole side gets drained, the worst case is dropping
      back to your base.
    </p>

    <WikiHeading id="arenas">Arenas</WikiHeading>
    <p>
      The attacker picks the arena when declaring. You unlock more of them as your
      <RouterLink to="/wiki/clan-levels">clan levels up</RouterLink>.
    </p>
    <ul>
      <li>Mixed pools can use any ranked map.</li>
      <li>Random pools are 10 random ranked maps that nobody picks.</li>
      <li>Category turf only uses maps from one category.</li>
      <li>Complexity turf only uses maps in a complexity range.</li>
    </ul>

    <WikiHeading id="picks">Picks</WikiHeading>
    <p>
      Unless it is Random pools, both clans pick maps. The clan with less standing gets more
      picks. Two equal clans get 5 each. A clan with half the other's standing gets 7. One
      with a quarter gets 8.
    </p>
    <p>
      The attacker makes their picks while declaring. The defender then gets 24 hours to make
      theirs. Anything they do not pick gets filled randomly. If they pick a map the attacker
      already picked, it gets swapped for a random one. Nobody sees the other side's picks until
      picking is over.
    </p>

    <WikiHeading id="phases">Phases</WikiHeading>
    <p>
      After picking, both sides get 48 hours to prepare before the war goes active. Random pools
      skip picking. Once picking is done you can download all 10 maps as a playlist. The fighting
      itself is on <RouterLink to="/wiki/war-combat">Hits & Breaks</RouterLink>.
    </p>

    <WikiHeading id="endings">Endings</WikiHeading>
    <p>
      If one side's stake hits 0, the other side wins. If a clan disbands mid-war, the other clan
      wins. A war with no hits for 7 days ends in a draw. Retreating or the season ending also
      ends it with no winner.
    </p>
    <p>
      Standing that already moved stays moved. Only the attacker's lead or Founder can retreat.
      Defenders cannot.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      The winning clan gets 345 clan XP. Everyone who fought gets XP from their contribution. Some
      wars also give items to the top fighters on the winning side.
    </p>
  </WikiProse>
</template>
