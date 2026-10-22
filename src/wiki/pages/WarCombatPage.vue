<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const DAMAGE: WikiCompareRow[] = [
  { label: '1st hit', values: ['15', '85'] },
  { label: '2nd hit', values: ['22.5', '62.5'] },
  { label: '3rd hit', values: ['33.75', '28.75'] },
  { label: '4th hit', values: ['50.63', 'Broken'] },
]
</script>

<template>
  <WikiProse>
    <p>
      Once picking's done, everyone in every clan on both teams is a fighter with 100 guard.
      Rosters never lock. Anyone who joins later becomes a fighter. Anyone who leaves drops out.
    </p>
    <p>
      Guard is a shield. Hits wear it down without moving any standing. Standing only moves when
      guard hits 0, which is a break.
    </p>

    <WikiHeading id="plays">How a play works</WikiHeading>
    <p>
      Every full play on a war map counts, even one worse than your PB. What matters is beating
      their score. Fails and quits don't count. In Duels a play lands on one enemy. In Berserker it
      lands on everyone it beats.
    </p>

    <WikiHeading id="hits">Hits</WikiHeading>
    <p>
      You hit someone by beating their score on a war map. If they have no score there, you hit
      them for 30% of the damage. Only plays after the war starts count. You can hit the same
      person on the same map with every play until they break.
    </p>

    <WikiHeading id="damage">Damage</WikiHeading>
    <p>
      Each hit on a player makes the next one stronger, no matter who on your team lands it.
      Hits on someone with no score count too, but only bump it by 1.2x instead of 1.5x. The
      streak starts over once their guard comes back.
      If you are both the same skill:
    </p>
    <WikiCompareTable :columns="['Damage', 'Guard left']" :rows="DAMAGE" />
    <p>
      Skill uses the Overall skill level from your profile. Hitting someone at twice your level
      does double damage. Hitting someone at half your level does half. The full formula is on
      <RouterLink to="/wiki/war-math#hit">War Math</RouterLink>.
    </p>

    <WikiHeading id="rulesets">Rulesets</WikiHeading>
    <p>
      In Duels you can pick anyone on the other team to hit, whatever their skill. A play hits
      your pick if it beats them. If it just
      comes close, it chips them. Otherwise it goes auto. Someone with no score on that map counts
      as beaten. If your pick is broken, your plays go auto until they're back.
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
      next to theirs. It never goes below 1. Against a 99.25, a strong player on a 99.22 chips about 2.3. A much weaker
      player on a 98.7 chips 1. You can play with these values on your war's page.
    </p>
    <p>
      Chips do not make your next hit stronger. Every hit or chip has a 25% chance to chip one
      more random enemy above you.
    </p>

    <WikiHeading id="breaks">Breaks</WikiHeading>
    <p>
      When someone's guard hits 0 they are broken. Their clan loses standing and yours gets it.
      It comes out of their clan's slice of the stake. If their clan has no earned standing left,
      they lose nothing. You still get yours.
    </p>
    <p>
      Stronger players are worth more standing. Breaking the same player again is worth 75% of
      the last time. <RouterLink to="/wiki/war-math#break">The standing formula</RouterLink> shows how it adds up.
    </p>
    <p>
      Nobody can hit you while you're broken. You get 100 guard back the moment you finish any play
      on a war map. That same play still hits like normal.
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
