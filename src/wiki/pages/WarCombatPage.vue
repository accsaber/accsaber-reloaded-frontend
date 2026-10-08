<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const DAMAGE: WikiCompareRow[] = [
  { label: '1st hit', values: ['35', '65'] },
  { label: '2nd hit', values: ['52.5', '12.5'] },
  { label: '3rd hit', values: ['78.75', 'Broken'] },
]
</script>

<template>
  <WikiProse>
    <p>
      Once a war goes active, everyone in both clans is a fighter with 100 guard. People who join
      mid-war get added too.
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
      In Duels you get one opponent around your skill. You can only hit them. In Berserker one
      play can hit everyone on the other side at once. Broken players cannot be hit either way.
    </p>

    <WikiHeading id="breaks">Breaks</WikiHeading>
    <p>
      When someone's guard hits 0 they are broken. Their clan loses standing and yours gets it.
      It comes out of their side's stake. If their clan has no earned standing left, they lose
      nothing, but you still get the full amount.
    </p>
    <p>
      Stronger players are worth more standing. Breaking the same player again is worth 75% of
      the last time.
    </p>
    <p>A broken player gets 100 guard back once they set a new score on one of the war's maps.</p>

    <WikiHeading id="contribution">What you get</WikiHeading>
    <p>You get XP from a war in two ways.</p>
    <ul>
      <li>
        <strong>Right away:</strong> every break gives 250 XP, split between everyone who hit
        that player based on the damage you dealt.
      </li>
      <li>
        <strong>When the war ends:</strong> you get 1 XP for every point of damage you did, plus
        50 for every break you helped with.
      </li>
    </ul>
    <p>
      A player only has 100 guard, so a hit can't count for more than what they had left.
      Breaking someone on your own works out to about 400 XP total.
    </p>
    <p>
      If your side has fewer people, you get a bit less per hit, since you've got more people to
      hit. Your clan also gets 23 clan XP for every break.
    </p>
  </WikiProse>
</template>
