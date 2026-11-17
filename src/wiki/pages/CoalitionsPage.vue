<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>
      If your clan is attacking or defending, you can call in
      <RouterLink to="/wiki/alliances-and-rivals">allies</RouterLink> to fight on your team. Only
      Duels take allies.
    </p>

    <WikiHeading id="joining">Joining</WikiHeading>
    <p>
      Both clans have to agree. Your Commanders and Founder can ask an ally for help or the ally's
      Commander or Founder can offer it and the other clan then accepts or declines.
    </p>
    <ul>
      <li>The ally has to be allied with the clan it's helping.</li>
      <li>It can't be allied with anyone on the other team.</li>
      <li>It can only help in one war at a time. Its own wars don't count toward that.</li>
      <li>Clans joining the attack need less standing than the defending clan.</li>
      <li>Pacifist clans can't join.</li>
      <li>A clan counting down to pacifism can't join the attack.</li>
    </ul>
    <p>
      Allies can join at any point in the war. Everyone in them fights apart from players who turned
      off war participation. Once the attacking or defending clan falls its team can't take any more
      help and the allies already in are the last ones left.
    </p>

    <WikiHeading id="stake">The stake</WikiHeading>
    <p>
      An ally only puts 30% of its standing on the line. Both teams still risk the same total so
      when an ally joins the stake goes up for both teams.
    </p>
    <p>
      An ally joining doesn't change what anyone else's players are worth. Breaking an ally's player
      takes 60% of what the same skill takes on the attacking or defending clan. Its stake is
      smaller so an ally falls sooner than the clan it's helping.
    </p>
    <p>
      Each clan has its own slice of its team's stake and breaks on your players only come out of
      your clan's slice. A clan whose slice reaches 0 falls and its players stop hitting and stop
      getting hit. A team loses once every clan on it has fallen or left.
    </p>

    <WikiHeading id="leaving">Leaving</WikiHeading>
    <p>
      An ally can leave whenever. Whatever is left of its slice goes to the other team and your team
      counts that slice as fully drained. The attacking and defending clans can't leave.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      Allies fight like anyone else and their players get the same war XP. Standing they take goes
      to their own clan. If their team wins the win's clan XP is split between the winning clans by
      the size of their slice and every winning clan gets the clan cosmetics.
    </p>
  </WikiProse>
</template>
