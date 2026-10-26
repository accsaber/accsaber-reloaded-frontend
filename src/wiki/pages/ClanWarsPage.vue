<script setup lang="ts">
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
</script>

<template>
  <WikiProse>
    <p>
      A war is one clan attacking another on 10 maps. Both teams put standing on the line.
      Whichever team drains the other's stake first wins. Duels can also have
      <RouterLink to="/wiki/coalitions">allies</RouterLink> on each team.
    </p>
    <p>
      In short, one clan declares, both pick maps, everyone gets a day or two to prep, then you fight by
      setting scores on those maps until one team's stake runs out. How the fighting works is on
      <RouterLink to="/wiki/war-combat">Hits & Breaks</RouterLink>.
    </p>

    <WikiHeading id="declaring">Declaring</WikiHeading>
    <p>Commanders and the Founder can declare war, but only during a season.</p>
    <ul>
      <li>You can only have one attack going at a time. You can be defending as many as you want.</li>
      <li>After a war ends, you have to wait 7 days before attacking that same clan again.</li>
      <li>You cannot attack allies or pacifist clans.</li>
      <li>Both clans need some standing.</li>
      <li>You cannot attack a clan with less than half your standing. If they are attacking you, you can hit back no matter what.</li>
    </ul>

    <WikiHeading id="stake">The stake</WikiHeading>
    <p>
      Both teams put up the same amount. It comes from whichever team has less standing at stake.
      You can see each clan's bar on the war page. The stake is how much the war can move, not how
      much you can lose.
    </p>
    <p>
      Hits only make your bar go down. It grows when an ally joins either team. Standing you take
      by breaking someone goes to your clan, not back into your bar.
    </p>
    <p>
      You can only lose <RouterLink to="/wiki/clan-standing#earned">earned standing</RouterLink>,
      the part you picked up this season. Your base standing comes from your members' skill and
      a war cannot touch it. So even if your whole bar gets drained, the worst case is dropping
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
      <li>Modern random is the same thing, but only maps ranked in 2024 or later.</li>
      <li>Category turf only uses maps from one category.</li>
      <li>Complexity turf only uses maps in a complexity range.</li>
    </ul>
    <p>Some songs are war-banned and never show up in pools.</p>

    <WikiHeading id="picks">Picks</WikiHeading>
    <p>
      Unless it is Random pools, both clans pick maps. The clan with less standing gets more
      picks. Two equal clans get 5 each. A clan with half the other's standing gets 7. One
      with a quarter gets 8.
    </p>
    <p>
      The attacker makes their picks while declaring. The defender then gets 24 hours to make
      theirs. They can see the attacker's picks while doing it. Random maps stay hidden until
      picking is over. Anything the defender does not pick gets filled randomly.
    </p>

    <WikiHeading id="phases">Phases</WikiHeading>
    <p>
      Random pools and Modern random skip picking unless the attacker offered Berserker. Once the pool locks in, prep
      runs for somewhere between 24 and 48 hours, picked at random. The war page shows the exact start as soon as it's set, and your clan
      chat gets a message when the pool locks in.
    </p>
    <p>
      Plays during prep don't hit anyone. You can already see the other team and pick your target
      in Duels. Each map in the pool shows who your play would hit. It says auto when auto is
      picking for you. Any PB you set during prep is a score the enemy has to beat. You can
      download all 10 maps as a playlist.
    </p>
    <p>Use that time to pick targets and push your PBs on maps where enemies are close.</p>

    <WikiHeading id="endings">Endings</WikiHeading>
    <p>
      If one team's stake hits 0, the other team wins. If the attacking or defending clan falls,
      its allies keep fighting on their own and no new help can join. If the attacking or defending clan disbands
      mid-war, the other team wins. After 28 days the team that drained more of the other's stake
      wins. A war with no hits for 10 days ends in a draw. Retreating or the season ending also
      ends it with no winner.
    </p>
    <WikiHeading id="retreat">Retreating</WikiHeading>
    <p>
      Only the attacker's lead or Founder can retreat. Defenders can't. Before the war goes active
      it ends right away. Once it's active, a retreat takes 24 hours. For that day your team's
      plays don't hit anyone. The defenders can still hit you. If they drain your stake before it's up, they win. Once you call it, there's no
      taking it back.
    </p>
    <p>Standing that already moved stays moved.</p>

    <WikiHeading id="pacifism">Pacifism</WikiHeading>
    <p>
      The Founder can make the clan pacifist. Pacifist clans cannot declare war, get attacked or
      help in one. You cannot turn it on while your clan is attacking someone. If your clan has
      not attacked anyone in the last 7 days, it starts right away. Otherwise it starts 7 days
      after your last attack ended. Defending does not count. Wars you are already defending in
      keep going.
    </p>
    <p>
      Until it starts, your clan can still be attacked and can still help an ally defend. It
      cannot declare war or join an attack. Turning it off is instant and cancels the countdown.
      If you make your clan pacifist from the start, it's instant.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      The winning team gets 345 clan XP and 1000 bonus standing, split between its clans. Everyone who fought gets XP from
      the damage they did. Everyone on the winning team who dealt damage gets a crate. The top
      fighters can get extra items.
    </p>
    <p>
      If barely anyone on the losing team has played since two weeks before the war started, the
      win is worth a lot less. That goes for the clan XP and the bonus standing.
    </p>
  </WikiProse>
</template>
