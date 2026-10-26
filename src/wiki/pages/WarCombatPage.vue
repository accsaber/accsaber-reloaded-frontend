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
      Once picking's done, everyone in every clan on both teams is a fighter with 100 guard.
      Rosters never lock. Anyone who joins later becomes a fighter. Anyone who leaves drops out.
    </p>
    <p>
      You can turn off Participate in clan wars in your settings. You stay in your clan but sit
      out its new wars. Turn it off during prep and you drop out right away. Once a war starts,
      turning it off does nothing until that war ends. Turning it back on mid-war does not put you
      in. If you join a clan mid-war with it off, you stay out of that war.
    </p>
    <p>
      Guard is a shield. Hits wear it down without moving any standing. Standing only moves when
      guard hits 0, which is a break.
    </p>

    <WikiHeading id="plays">How a play works</WikiHeading>
    <p>
      Every full play on a war map counts, even one worse than your PB. What matters is beating
      their score. Fails and quits don't count. Neither do plays with Faster Song or Super Fast
      Song, since a shorter map is just a quicker hit. In Duels a play lands on one enemy. In Berserker it
      lands on everyone it beats.
    </p>

    <WikiHeading id="hits">Hits</WikiHeading>
    <p>
      You hit someone by beating their score on a war map. If they have no score there, every hit
      does a flat 10 (less on a map they've been broken on before). Only plays after the war starts count. You can hit the same
      person on the same map with every play, but replaying one map won't get you far. More on
      that below.
    </p>

    <WikiHeading id="damage">Damage</WikiHeading>
    <p>
      Every map a player gets hit on makes the next hit on them stronger, no matter who on your
      team lands it. Hits on someone with no score never get stronger and only bump the
      next real hit as much as a chip does. Hitting them again on a map they already got hit on only keeps 40% of the streak bonus, and
      40% of that again the time after. It only builds the streak as much as a chip. Spamming one map
      fades out fast, so spread your hits across maps. The streak starts over once their guard comes back.
      If you are both the same skill and every hit is on a new map:
    </p>
    <WikiCompareTable :columns="['Damage', 'Guard left']" :rows="DAMAGE" />
    <p>
      Skill uses the Overall skill level from your profile. Hitting someone at twice your level
      does double damage. Hitting someone at half your level does half. The full formula is on
      <RouterLink to="/wiki/war-math#hit">War Math</RouterLink>.
    </p>
    <p>
      Two things make hits softer. A map someone already got broken on hits them for 75% for the
      rest of the war, and 50% once it's broken them three times, so you can't keep farming the
      same person on your comfort map. And once less than half of a team is still standing, hits
      and chips on them get weaker, down to half for the last one up. Coming back into a beaten
      team isn't just painting a target on yourself anymore. None of this changes how much
      standing a break moves.
    </p>

    <WikiHeading id="rulesets">Rulesets</WikiHeading>
    <p>
      By default you just follow your commanders. If they haven't told you anything, your plays
      go auto. They can send you at a specific enemy, or tell you to hold fire for a bit, which
      means your plays don't hit anyone until they lift it. Your guard still comes back when you
      play though. If you'd rather do your own thing, switch to auto or pick someone yourself
      on the war page.
    </p>
    <p>
      In Duels you can pick anyone on the other team to hit, whatever their skill. A play hits
      your pick if it beats them. If it just
      comes close, it chips them. Otherwise it goes auto. Someone with no score on that map counts
      as beaten. If your pick is broken, your plays go auto until they're back. The same goes for
      someone your commander sent you at. The other team can see who you picked, but not your
      commander's orders.
    </p>
    <p>
      Auto breaks someone if your play can. It picks whoever is worth the most standing. If nobody
      breaks, it takes the biggest hit or chip it can land. Skill closeness doesn't matter. The pool
      on the war page shows who auto would hit on each map.
    </p>
    <p>
      In Berserker one play can hit everyone on the other team at once. Broken players cannot be
      hit either way.
    </p>
    <p>
      Berserker has to be accepted. The attacker offers it and the defender takes it or turns it
      down while picking. If they turn it down or miss the window, the war is a Duel.
    </p>

    <WikiHeading id="chips">Chips</WikiHeading>
    <p>
      In Duels, a play that comes close to an enemy's score without beating it chips them. A chip
      does up to 3 damage. It gets smaller the further off you are and the lower your skill is
      next to theirs, all the way down to almost nothing. Against a 99.25, someone at the same
      skill on a 99.22 chips about 2.9, on a 98.7 about 1.6, and on a 97.7 barely 0.1. Below about
      97.6 it doesn't chip at all. You can play with these values on your war's page.
    </p>
    <p>
      Each chip makes the next hit on them 5% stronger, so getting close still softens them up for
      your team. Every hit or chip has a 25% chance to chip one
      more random enemy above you.
    </p>

    <WikiHeading id="breaks">Breaks</WikiHeading>
    <p>
      When someone's guard hits 0 they are broken. Their clan loses standing and yours gets it.
      It comes out of their clan's slice of the stake. If their clan has no earned standing left,
      they lose nothing. You still get yours.
    </p>
    <p>
      Stronger players are worth more standing and the same skill is worth the same on both
      teams, however deep either roster is. Players who sit out do not count. A weaker team takes more breaks to drain. Everyone also has a bounty which starts at 1. Get broken
      and you come back with about half of it (a 1.7 comes back near 1), then every bit of damage you
      deal climbs it again, up to 1.75. Around 100 damage is enough to get from the bottom back to 1.
      Keep going down without hitting back and it sinks toward 0.25. So someone on a rampage is worth
      a lot to take down, and someone who gets up and does nothing is cheap. Break XP goes up and down with it too. <RouterLink to="/wiki/war-math#break">The standing formula</RouterLink> shows how it adds up.
      Hover the damage on the war page to see how much standing breaking someone would move.
    </p>
    <p>
      Nobody can hit you while you're broken. You get 100 guard back the moment you finish any play
      on a war map. That same play still hits like normal. If you don't play, your guard comes back
      on its own after a week, so you can't hide forever, and being away for a while only costs one
      break a week.
    </p>
    <p>
      That week runs faster the fewer of your team are still up. With half the team standing it's
      a normal week. The moment you drop under half it jumps to double speed, and keeps climbing to
      3.5x for the last one standing, so a week turns into two days. It's everyone's clock on the team, even if you were broken
      days ago. Time you already waited always counts. The war page shows your team's speed and
      when you're back.
    </p>
    <p>
      If a whole team gets broken, the whole team comes back together, exactly two days after the
      last one goes down. Anyone broken on the other
      team comes back then too or sooner if their own clock runs out first. Getting up early doesn't
      cancel it for anyone else. But if you get up and get broken again, that one's on you, you're back
      on your own clock.
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
      Go after people whose guard is already low. A 4th hit does over three times the first.
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
      A player has 100 guard. A hit cannot count for more than what they had left.
      Breaking someone on your own works out to about 80 XP total.
    </p>
    <p>
      Your clan gets 6 clan XP for every break. In Berserker, a side with fewer people gets less
      XP per hit, per break and in clan XP. Their damage stays the same. One player fighting a
      clan of 50 gets under 1 clan XP per break.
    </p>
  </WikiProse>
</template>
