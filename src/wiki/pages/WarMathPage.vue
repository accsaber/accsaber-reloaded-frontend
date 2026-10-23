<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const RULES = {
  baseDamage: 15,
  escalation: 1.45,
  disparityExponent: 1,
  missingScoreMultiplier: 0.3,
  missingScoreEscalation: 1.2,
  chipEscalation: 1.05,
  chipDamage: 3,
  minChipDamage: 1,
  chipWindow: 0.3,
  chipSkillExponent: 2,
  breakShare: 0.5,
  breakDecay: 0.75,
  allyRisk: 0.3,
  engagementFull: 0.5,
  engagementDays: 14,
  breakXp: 50,
  breakContribution: 50,
  xpPerContribution: 0.2,
  breakClanXp: 6,
  winClanXp: 345,
  winStanding: 1000,
  sizeExponent: 0.6,
}

const COLUMNS = ['Value', 'Meaning']

const HIT_PARAMS: WikiCompareRow[] = [
  { label: 'Base damage', values: [`${RULES.baseDamage}`, 'A first hit between equal players'] },
  {
    label: 'Escalation',
    values: [`${RULES.escalation}`, 'Each hit that beat their score since their guard came back multiplies the next one'],
  },
  {
    label: 'No-score escalation',
    values: [`${RULES.missingScoreEscalation}`, 'Each hit on them while they had no score multiplies the next one by this instead'],
  },
  {
    label: 'Chip escalation',
    values: [`${RULES.chipEscalation}`, 'Each chip on them since their guard came back multiplies the next hit by this'],
  },
  { label: 'Hits', values: ['', 'Hits on that player from anyone since their guard last came back that beat a score'] },
  { label: 'No-score hits', values: ['', 'Hits on that player since their guard came back where they had no score on the map'] },
  { label: 'Chips', values: ['', 'Chips on that player since their guard came back, the random extra ones too'] },
  { label: 'Skill', values: ['', 'Overall skill level from the profile, never lower than 1'] },
  {
    label: 'Disparity exponent',
    values: [`${RULES.disparityExponent}`, 'Someone at twice your skill takes double. Half your skill takes half'],
  },
  { label: 'No-score multiplier', values: [`${RULES.missingScoreMultiplier}`, 'They have no score on the map'] },
]

const CHIP_PARAMS: WikiCompareRow[] = [
  {
    label: 'Gap',
    values: ['', 'How far your accuracy is from theirs on the accuracy curve. 99% to 99.5% counts the same as 90% to 95% because the top end is harder'],
  },
  { label: 'Chip window', values: [`${RULES.chipWindow}`, 'You only chip inside it'] },
  { label: 'Chip skill exponent', values: [`${RULES.chipSkillExponent}`, 'Weaker players chip a lot less'] },
  { label: 'Minimum chip', values: [`${RULES.minChipDamage}`, 'The least a chip can do'] },
]

const BREAK_PARAMS: WikiCompareRow[] = [
  { label: 'Break share', values: [`${RULES.breakShare}`, "Breaking every player on the stronger team once moves half its stake. A weaker team loses a bit less per round"] },
  { label: 'Break weight', values: ['', "Their skill squared, over their team's total skill squared, pulled a quarter of the way toward the stronger team's total"] },
  { label: 'Break decay', values: [`${RULES.breakDecay}`, 'Each repeat break on the same player moves 25% less'] },
  { label: 'Risk', values: [`1 or ${RULES.allyRisk}`, `1 for the two lead clans, ${RULES.allyRisk} for allies`] },
]

const XP_PARAMS: WikiCompareRow[] = [
  { label: 'Break XP', values: [`${RULES.breakXp}`, 'Split by damage between everyone who hit or chipped them since their guard came back'] },
  { label: 'Break contribution', values: [`${RULES.breakContribution}`, 'Added to your contribution for every break you helped with'] },
  { label: 'XP per contribution', values: [`${RULES.xpPerContribution}`, 'End-of-war XP for each point of contribution'] },
  { label: 'Clan XP per break', values: [`${RULES.breakClanXp}`, 'Goes to the clan that got the break'] },
  { label: 'Win clan XP', values: [`${RULES.winClanXp}`, 'Split between the winning clans by their slice of the stake'] },
  { label: 'Win standing', values: [`${RULES.winStanding}`, 'Bonus standing, split the same way'] },
]
</script>

<template>
  <WikiProse>
    <WikiHeading id="hit">Hit damage</WikiHeading>
    <math display="block">
      <mtext>damage</mtext><mo>=</mo><mn>{{ RULES.baseDamage }}</mn><mo>x</mo>
      <msup><mn>{{ RULES.escalation }}</mn><mtext>hits</mtext></msup><mo>x</mo>
      <msup><mn>{{ RULES.missingScoreEscalation }}</mn><mtext>no-score hits</mtext></msup><mo>x</mo>
      <msup><mn>{{ RULES.chipEscalation }}</mn><mtext>chips</mtext></msup><mo>x</mo>
      <msup>
        <mrow><mo>(</mo><mfrac><mtext>their skill</mtext><mtext>your skill</mtext></mfrac><mo>)</mo></mrow>
        <mn>{{ RULES.disparityExponent }}</mn>
      </msup>
    </math>
    <p>
      If they have no score on the map, skill doesn't count. You swap the skill part for
      {{ RULES.missingScoreMultiplier }}. That hit also builds the streak by
      {{ RULES.missingScoreEscalation }} instead of {{ RULES.escalation }}. A hit never takes more than the guard they have left.
    </p>
    <WikiCompareTable :columns="COLUMNS" :rows="HIT_PARAMS" />

    <WikiHeading id="chip">Chip damage</WikiHeading>
    <math display="block">
      <mtext>chip</mtext><mo>=</mo><mn>{{ RULES.chipDamage }}</mn><mo>x</mo>
      <mrow><mo>(</mo><mn>1</mn><mo>−</mo><mfrac><mtext>gap</mtext><mn>{{ RULES.chipWindow }}</mn></mfrac><mo>)</mo></mrow>
      <mo>x</mo>
      <msup>
        <mrow><mi>min</mi><mo>(</mo><mn>1</mn><mo>,</mo><mfrac><mtext>your skill</mtext><mtext>their skill</mtext></mfrac><mo>)</mo></mrow>
        <mn>{{ RULES.chipSkillExponent }}</mn>
      </msup>
    </math>
    <p>A chip never does less than {{ RULES.minChipDamage }}.</p>
    <WikiCompareTable :columns="COLUMNS" :rows="CHIP_PARAMS" />

    <WikiHeading id="break">Standing on a break</WikiHeading>
    <math display="block">
      <mtext>standing</mtext><mo>=</mo><mtext>team stake</mtext><mo>x</mo><mn>{{ RULES.breakShare }}</mn>
      <mo>x</mo><mtext>break weight</mtext><mo>x</mo>
      <msup><mn>{{ RULES.breakDecay }}</mn><mtext>breaks before</mtext></msup><mo>x</mo><mtext>risk</mtext>
    </math>
    <p>
      Team stake is their team's full stake. It can't move more than what's left in their clan's
      slice. Your clan gets that amount times their team's engagement.
    </p>
    <WikiCompareTable :columns="COLUMNS" :rows="BREAK_PARAMS" />

    <WikiHeading id="engagement">Engagement</WikiHeading>
    <math display="block">
      <mtext>engagement</mtext><mo>=</mo><mi>min</mi><mo>(</mo><mn>1</mn><mo>,</mo>
      <mfrac><mtext>share who played</mtext><mn>{{ RULES.engagementFull }}</mn></mfrac><mo>)</mo>
    </math>
    <p>
      Share who played is how much of the team played a ranked map in the
      {{ RULES.engagementDays }} days before the war started. A normal clan sits at 1.
    </p>

    <WikiHeading id="xp">XP</WikiHeading>
    <math display="block">
      <mtext>break XP</mtext><mo>=</mo><mn>{{ RULES.breakXp }}</mn><mo>x</mo><mtext>engagement</mtext>
      <mo>x</mo><mtext>your damage share</mtext>
    </math>
    <math display="block">
      <mtext>contribution</mtext><mo>=</mo><mtext>damage</mtext><mo>+</mo>
      <mn>{{ RULES.breakContribution }}</mn><mo>x</mo><mtext>breaks helped</mtext>
    </math>
    <math display="block">
      <mtext>end-of-war XP</mtext><mo>=</mo><mn>{{ RULES.xpPerContribution }}</mn><mo>x</mo>
      <mtext>contribution</mtext><mo>x</mo><mtext>their engagement</mtext>
    </math>
    <p>
      Your clan gets {{ RULES.breakClanXp }} clan XP per break times engagement. The winning team
      gets {{ RULES.winClanXp }} clan XP and {{ RULES.winStanding }} bonus standing, both split by slice,
      times the losers' engagement. The bonus is new standing. The losers don't pay for it.
    </p>
    <WikiCompareTable :columns="COLUMNS" :rows="XP_PARAMS" />

    <WikiHeading id="size">Berserker size share</WikiHeading>
    <math display="block">
      <mtext>size share</mtext><mo>=</mo>
      <msup>
        <mrow><mo>(</mo><mfrac><mtext>your team size</mtext><mtext>their team size</mtext></mfrac><mo>)</mo></mrow>
        <mn>{{ RULES.sizeExponent }}</mn>
      </msup>
    </math>
    <p>It only scales what you get out of Berserker. Damage stays the same.</p>

    <WikiHeading id="example">An example</WikiHeading>
    <p>
      Two players with the same skill keep hitting one guy. The hits do 15, 22.5 and 33.75. The
      4th would do 50.6. He only has 28.75 left. That hit breaks him. With no score on the map, the
      first hit would be 15 x 0.3 = 4.5. The one after it 15 x 1.2 x 0.3 = 5.4.
    </p>
  </WikiProse>
</template>
