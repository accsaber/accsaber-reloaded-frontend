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
      Once a war goes active, everyone in every clan on both teams is a fighter with 100 guard.
      People who join mid-war get added too.
    </p>

    <WikiHeading id="hits">Hits</WikiHeading>
    <p>
      You hit someone by beating their score on one of the war's maps. If they have no score
      there, you still hit them for about a third of the damage. Only plays after the war started
      count. You can only hit each of their scores once.
    </p>

    <WikiHeading id="damage">Damage</WikiHeading>
    <p>Hits on the same player keep getting stronger. If you are both the same skill:</p>
    <WikiCompareTable :columns="['Damage', 'Guard left']" :rows="DAMAGE" />
    <p>
      Skill matters too. It uses the Overall skill level from your profile. Hitting someone at
      twice your level does double damage. Hitting someone at half your level does half.
    </p>

    <WikiHeading id="rulesets">Rulesets</WikiHeading>
    <p>
      In Duels you can pick who to hit. Anyone above you is fair game. Going down, you can pick
      anyone with at least 80% of your skill. A play hits your pick if it beats them. Otherwise it
      hits the best enemy score it beats. If it beats nobody, it chips the closest score above you.
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
      next to theirs. Against a 99.25, a strong player on a 99.22 chips about 2.3. A much weaker
      player on a 98.7 chips 0.2.
    </p>
    <p>
      Chips do not make your next hit stronger. Every hit or chip has a 25% chance to chip one
      more random enemy above you.
    </p>

    <WikiHeading id="breaks">Breaks</WikiHeading>
    <p>
      When someone's guard hits 0 they are broken. Their clan loses standing and yours gets it.
      It comes out of their clan's slice of the stake. If their clan has no earned standing left,
      they lose nothing, but you still get the full amount.
    </p>
    <p>
      Stronger players are worth more standing. Breaking the same player again is worth 75% of
      the last time.
    </p>
    <p>A broken player gets 100 guard back once they set a new score on one of the war's maps.</p>
    <p>
      If barely anyone on their team has played since two weeks before the war started, breaks
      give a lot less standing and XP.
    </p>

    <WikiHeading id="contribution">What you get</WikiHeading>
    <p>You get XP from a war in two ways.</p>
    <ul>
      <li>
        <strong>Right away:</strong> every break gives 50 XP, split between everyone who hit
        that player based on the damage you dealt.
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
      per hit, per break and in clan XP. They also have more people to hit. One player fighting a
      clan of 50 gets under 1 clan XP per break.
    </p>
  </WikiProse>
</template>
