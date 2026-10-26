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
      Both clans have to agree. Your Commanders and Founder can ask an ally for help, or the ally's
      Commander or Founder can offer it. The other clan then accepts or declines.
    </p>
    <ul>
      <li>The ally has to be allied with the clan it is helping.</li>
      <li>It cannot be allied with anyone on the other team.</li>
      <li>It can only help in one war at a time. Its own wars do not count toward that.</li>
      <li>Clans joining the attack need less standing than the defending clan.</li>
      <li>Pacifist clans cannot join.</li>
      <li>A clan counting down to pacifism cannot join the attack.</li>
    </ul>
    <p>
      Allies can join at any point in the war. Everyone in them fights, apart from players who turned off war participation. Once the attacking or
      defending clan falls, its team cannot take any more help. The allies already in are the last
      ones left.
    </p>

    <WikiHeading id="stake">The stake</WikiHeading>
    <p>
      An ally only puts 30% of its standing on the line. Both teams still risk the same total.
      When an ally joins, the stake goes up for both teams.
    </p>
    <p>
      Each clan has its own slice of its team's stake. Breaks on your players only come out of
      your clan's slice. A clan whose slice hits 0 falls. Its players stop hitting and stop getting
      hit. A team loses once every clan on it has fallen or left.
    </p>

    <WikiHeading id="leaving">Leaving</WikiHeading>
    <p>
      An ally can leave whenever. Whatever is left of its slice goes to the other team. Your team
      counts that slice as fully drained. The attacking and defending clans cannot leave.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      Allies fight like anyone else. Their players get the same war XP. Standing they take goes to
      their own clan. If their team wins, the win's clan XP is split between the winning clans by
      the size of their slice. Every winning clan gets the clan cosmetics.
    </p>
  </WikiProse>
</template>
