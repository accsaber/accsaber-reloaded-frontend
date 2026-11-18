<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const DAMAGE: WikiCompareRow[] = [
  { label: '1st hit', values: ['10', '90'] },
  { label: '2nd hit', values: ['13', '77'] },
  { label: '3rd hit', values: ['16.9', '60.1'] },
  { label: '4th hit', values: ['21.97', '38.13'] },
  { label: '5th hit', values: ['28.56', '9.57'] },
  { label: '6th hit', values: ['37.13', 'Broken'] },
]
</script>

<template>
  <WikiProse>
    <p>
      Once picking's done everyone in every clan on both teams is a fighter with 100 guard. Rosters
      never lock so anyone who joins later becomes a fighter and anyone who leaves is out.
    </p>
    <p>
      You can turn off Participate in clan wars in your settings. You stay in your clan but you're
      not in its new wars. Turn it off during prep and you're out right away. Once a war starts
      turning it off does nothing until that war ends and turning it back on mid-war doesn't put you
      in. If you join a clan mid-war with it off you stay out of that war. Commanders and the
      Founder can turn it off for anyone ranked below them before a war starts. At most half the
      clan can be out of a war and the Founder and Commanders count too.
    </p>
    <p>
      Guard is a shield. Hits wear it down without taking any standing. Standing only changes hands
      when guard reaches 0 which is a break.
    </p>

    <WikiHeading id="plays">How a play works</WikiHeading>
    <p>
      Every full play on a war map counts, even one worse than your PB, because what matters is
      beating their score. Fails and quits don't count and neither do plays with Faster Song or
      Super Fast Song because a shorter map is just a quicker hit. In Duels a play hits one enemy
      and in Berserker it hits everyone it beats.
    </p>

    <WikiHeading id="hits">Hits</WikiHeading>
    <p>
      You hit someone by beating their score on a war map. If they have no score there every hit
      does a flat 10 (less on a map they've been broken on before or once under half their team is
      up). Only plays after the war starts count. You can hit the same person on the same map with
      every play but replaying one map won't get you far. More on that below.
    </p>

    <WikiHeading id="damage">Damage</WikiHeading>
    <p>
      Every map a player gets hit on makes the next hit on them stronger no matter who on your team
      hits them. Hits on someone with no score never get stronger and only raise the next real hit
      as much as a chip does. Hitting them again on a map they already got hit on only keeps 40% of
      the streak bonus and 40% of that again the time after. It only builds the streak as much as a
      chip. Spamming one map fades out fast so spread your hits across maps. The streak starts over
      once their guard comes back. If you're both the same skill and every hit is on a new map:
    </p>
    <WikiCompareTable :columns="['Damage', 'Guard left']" :rows="DAMAGE" />
    <p>
      Skill uses the Overall skill level from your profile. Hitting someone at twice your level
      does double damage. Hitting someone at half your level does half. The full formula is on
      <RouterLink to="/wiki/war-math#hit">War Math</RouterLink>.
    </p>
    <p>
      Two things make hits weaker. A map someone already got broken on hits them for 75% for the
      rest of the war and 50% once it's broken them three times so you can't keep farming the same
      person on your comfort map. And once less than half of a team is still standing, hits and
      chips on them get weaker, down to half for the last one up. Coming back into a beaten team
      isn't just painting a target on yourself anymore. None of this changes how much standing a
      break takes.
    </p>

    <WikiHeading id="rulesets">Rulesets</WikiHeading>
    <p>
      By default you just follow your commanders and if they haven't told you anything your plays go
      auto. They can send you at a specific enemy or tell you to halt for a bit which means
      your plays don't hit anyone until they lift it. Your guard still comes back when you play
      though. If you'd rather do your own thing switch to auto or pick someone yourself on the war
      page.
    </p>
    <p>
      In Duels you can pick anyone on the other team to hit whatever their skill. A play hits your
      pick if it beats them and if it just comes close it chips them. Otherwise it goes auto.
      Someone with no score on that map counts as beaten. If your pick is broken your plays go auto
      until they're back and the same goes for someone your commander sent you at. The other team
      can see who you picked but not your commander's orders.
    </p>
    <p>
      Auto breaks someone if your play can and it picks whoever is worth the most standing. If
      nobody breaks it takes the biggest hit or chip it can do. Skill closeness doesn't matter. The
      pool on the war page shows who auto would hit on each map.
    </p>
    <p>
      In Berserker one play can hit everyone on the other team at once. Broken players can't be hit
      either way.
    </p>
    <p>
      Berserker has to be accepted. The attacker offers it and the defender takes it or turns it
      down while picking. If they turn it down or miss the window, the war is a Duel.
    </p>

    <WikiHeading id="chips">Chips</WikiHeading>
    <p>
      In Duels a play that comes close to an enemy's score without beating it chips them. A chip
      does up to 3 damage and it gets smaller the further off you are and the lower your skill is
      next to theirs, all the way down to almost nothing. Against a 99.25, someone at the same skill
      on a 99.22 chips about 2.9, on a 98.7 about 1.6 and on a 97.7 barely 0.1. Below about 97.6 it
      doesn't chip at all. You can play with these values on your war's page.
    </p>
    <p>
      Each chip makes the next hit on them 5% stronger so getting close still softens them up for
      your team. Every hit or chip has a 25% chance to chip one more random enemy above you.
    </p>

    <WikiHeading id="breaks">Breaks</WikiHeading>
    <p>
      When someone's guard reaches 0 they're broken. Their clan loses standing and yours gets it. It
      comes out of their clan's slice of the stake. If their clan has no earned standing left they
      lose nothing but you still get yours.
    </p>
    <p>
      Stronger players are worth more standing and in a close war the same skill is worth the same
      on both teams however deep either roster is. An ally joining doesn't change that. An ally's players are
      worth 60% of what the same skill is on the attacking or defending clan. Players who are out of
      the war don't count. A weaker team takes more breaks to drain but if the attacking or defending clan
      is way weaker than the other one its players are worth more so breaking all of them once is
      always at least 45% of breaking the whole other clan. The war page shows it above that
      team's players as Outmatched with how many times more they're worth. Allies don't count for
      that and their players never get it. Everyone also has a bounty
      which starts at 1 and it's how much extra standing you're worth when broken. Get broken and
      you come back with about half of it (a 1.7 comes back near 1). It grows with the damage you
      deal, weighted by the bounty of whoever you hit, up to 1.75. Hitting a low bounty player
      barely raises yours and hitting a high bounty player raises it more.
    </p>
    <p>
      Nobody can hit you while you're broken. You get 100 guard back the moment you finish any play
      on a war map and that same play still hits like normal. If you don't play your guard comes
      back on its own after a week so you can't hide forever and being away for a while only costs
      one break a week.
    </p>
    <p>
      That week goes faster the fewer of your team are still up. With half the team standing it's a
      normal week. The moment you drop under half it jumps to double speed and keeps climbing to
      3.5x for the last one standing so a week becomes two days. It's everyone's clock on the team
      even if you were broken days ago. Time you already waited always counts. The war page shows
      your team's speed and when you're back.
    </p>
    <p>
      If a whole team gets broken the whole team comes back together exactly two days after the last
      one goes down. Anyone broken on the other team comes back then too or sooner if their own
      clock ends first. Getting up early doesn't cancel it for anyone else. But if you get up and
      get broken again that one's on you and you're back on your own clock.
    </p>
    <p>
      If barely anyone on their team has played in the two weeks before the war, you get a lot
      less standing and XP from breaks. Your end-of-war XP drops too. That's
      <RouterLink to="/wiki/war-math#engagement">engagement</RouterLink>.
    </p>

    <WikiHeading id="strategy">Playing it smart</WikiHeading>
    <p>
      The other team has to beat your scores to hit you. Pushing your PBs on the pool during prep
      makes you harder to hit.
    </p>
    <p>
      Go after people whose guard is already low because a 4th hit does over three times the first.
      Picking the same target as your team breaks someone who keeps coming back. Auto is a fine
      default. Hover the damage on the war page to see what a play would do to each enemy.
    </p>

    <WikiHeading id="contribution">What you get</WikiHeading>
    <p>You get XP from a war in two ways.</p>
    <ul>
      <li>
        <strong>Right away:</strong> every break gives 50 XP. It's split by damage between everyone
        who hit or chipped that player since their guard came back.
      </li>
      <li>
        <strong>When the war ends:</strong> you get 0.2 XP for every point of damage you did, plus
        10 for every break you helped with.
      </li>
    </ul>
    <p>
      A player has 100 guard and a hit can't count for more than what they had left. Breaking
      someone on your own works out to about 80 XP total.
    </p>
    <p>
      Your clan gets 6 clan XP for every break. In Berserker, a side with fewer people gets less
      XP per hit, per break and in clan XP. Their damage stays the same. One player fighting a
      clan of 50 gets under 1 clan XP per break.
    </p>
  </WikiProse>
</template>
