<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>
      A clan is a group of up to 50 players with one tag. Everyone in it gets the tag next to
      their name. Clans level up together, do missions together and go to war with other clans.
    </p>

    <WikiHeading id="making">Making a clan</WikiHeading>
    <p>Making a clan is free as long as you are not in one already. You start as its Founder.</p>
    <p>
      Names can be 3 to 32 characters. Tags are 2 to 5 letters or numbers and always show in
      capitals. Both have to be unique. You also get to pick a tag color and two clan colors. You
      can upload a square icon too, even an animated GIF.
    </p>

    <WikiHeading id="joining">Joining</WikiHeading>
    <p>
      You can send a clan a request, or an Officer can invite you. A clan can turn off requests,
      but invites from it still work. You can ask a bunch of clans at once. Once you get into one,
      the rest get cancelled.
    </p>
    <p>
      The clan needs a free spot for you. It gets more spots as it
      <RouterLink to="/wiki/clan-levels">levels up</RouterLink>.
    </p>
    <p>
      You can take an invite while you are still in another clan. If you do accept, you leave the old one. 
      If you are a Founder you have to hand your clan over first, like many other actions.
    </p>

    <WikiHeading id="cooldown">The cooldown</WikiHeading>
    <p>
      After joining a clan you have to wait 14 days before you can join another one. Leaving does
      not reset the timer. Getting kicked does not either.
    </p>
    <p>If your clan gets disbanded and you were not the one who did it, there is no wait.</p>

    <WikiHeading id="leaving">Leaving</WikiHeading>
    <p>
      You can leave whenever you want. If you're the founder, you'll have to leave the keys to someone else before leaving. If
      the Founder is the last one left, leaving disbands the clan.
    </p>

    <WikiHeading id="disbanding">Disbanding</WikiHeading>
    <p>
      Only the Founder can disband the clan. Everyone else can join a new clan right away. The
      Founder still has to wait out their 14 days, unless they were the only one in the clan. If
      staff disband it, the Founder does not wait either. Alliances end and any open wars are lost.
    </p>
  </WikiProse>
</template>
