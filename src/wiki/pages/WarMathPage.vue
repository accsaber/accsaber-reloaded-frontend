<script setup lang="ts">
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const RULES = {
  baseDamage: 10,
  escalation: 1.3,
  disparityExponent: 1,
  chipEscalation: 1.05,
  repeatMapShare: 0.4,
  mapBreakDecay: 0.75,
  mapBreakFloor: 0.5,
  lastStandDamage: 0.5,
  chipDamage: 3,
  chipWindow: 0.5,
  chipSkillExponent: 2,
  breakShare: 0.4,
  bountyFloor: 0.25,
  bountyCap: 1.75,
  bountyDamageScale: 150,
  bountyCarry: 0.5,
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
    values: [`${RULES.escalation}`, 'Each map they got hit on with a score since their guard came back multiplies the next hit'],
  },
  {
    label: 'Chip escalation',
    values: [`${RULES.chipEscalation}`, 'Each chip or no-score hit on them since their guard came back multiplies the next hit by this'],
  },
  { label: 'Maps hit', values: ['', 'Maps that player got hit on by anyone since their guard came back, beating a score. A second hit on the same map counts once'] },
  { label: 'Chips', values: ['', 'Chips on that player since their guard came back, the random extra ones too, plus every no-score hit and every repeat hit on a map they were already hit on'] },
  { label: 'Skill', values: ['', 'Overall skill level from the profile, never lower than 1'] },
  {
    label: 'Disparity exponent',
    values: [`${RULES.disparityExponent}`, 'Someone at twice your skill takes double. Half your skill takes half'],
  },
  {
    label: 'Map penalty',
    values: [`${RULES.mapBreakDecay} per break`, `For each time a hit on this map broke them this war (a chip break counts on the last map a hit landed on), never below ${RULES.mapBreakFloor}`],
  },
  {
    label: 'Last stand',
    values: [`1 to ${RULES.lastStandDamage}`, `1 while half their team is up, sliding to ${RULES.lastStandDamage} for the last one standing`],
  },
]

const CHIP_PARAMS: WikiCompareRow[] = [
  {
    label: 'Gap',
    values: ['', 'How far your accuracy is from theirs on the accuracy curve. 99% to 99.5% counts the same as 90% to 95% because the top end is harder'],
  },
  { label: 'Chip window', values: [`${RULES.chipWindow}`, 'You only chip inside it'] },
  { label: 'Chip skill exponent', values: [`${RULES.chipSkillExponent}`, 'Weaker players chip a lot less'] },
]

const BREAK_PARAMS: WikiCompareRow[] = [
  { label: 'Break share', values: [`${RULES.breakShare}`, "Breaking every player on the stronger team once, at a bounty of 1, moves 40% of its stake. A weaker team loses a bit less per round"] },
  { label: 'Break weight', values: ['', "Their skill squared, over the stronger team's total skill squared. Same pool for both teams"] },
  { label: 'Bounty', values: [`${RULES.bountyFloor} to ${RULES.bountyCap}`, 'Starts at 1. When they get broken, the next life starts halfway between the floor and what it was, then climbs toward the cap with every bit of damage they deal'] },
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
      <msup><mn>{{ RULES.escalation }}</mn><mtext>maps hit</mtext></msup><mo>x</mo>
      <msup><mn>{{ RULES.chipEscalation }}</mn><mtext>chips</mtext></msup><mo>x</mo>
      <msup>
        <mrow><mo>(</mo><mfrac><mtext>their skill</mtext><mtext>your skill</mtext></mfrac><mo>)</mo></mrow>
        <mn>{{ RULES.disparityExponent }}</mn>
      </msup>
      <mo>x</mo><mtext>map penalty</mtext><mo>x</mo><mtext>last stand</mtext>
    </math>
    <p>
      If they already got hit on this map since their guard came back, the hit keeps
      {{ RULES.repeatMapShare }} of the streak bonus for every earlier hit on that map, so a 400% bonus becomes 160%, then 64%.
      It only adds to the streak like a chip. If they have no score on the map, the streak doesn't count. The hit is a flat {{ RULES.baseDamage }}, times the map penalty, nothing else. It builds the streak
      the same as a chip. A hit never takes more than the guard they have left.
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
    <p>The last stand factor scales chips too. There is no minimum. A chip near the edge of the window does almost nothing.</p>
    <WikiCompareTable :columns="COLUMNS" :rows="CHIP_PARAMS" />

    <WikiHeading id="break">Standing on a break</WikiHeading>
    <math display="block">
      <mtext>standing</mtext><mo>=</mo><mtext>team stake</mtext><mo>x</mo><mn>{{ RULES.breakShare }}</mn>
      <mo>x</mo><mtext>break weight</mtext><mo>x</mo>
      <mtext>bounty</mtext><mo>x</mo><mtext>risk</mtext>
    </math>
    <math display="block">
      <mtext>bounty</mtext><mo>=</mo><mn>{{ RULES.bountyCap }}</mn><mo>−</mo>
      <mrow><mo>(</mo><mn>{{ RULES.bountyCap }}</mn><mo>−</mo><mtext>start</mtext><mo>)</mo></mrow><mo>x</mo>
      <msup><mi>e</mi><mrow><mo>−</mo><mtext>damage dealt</mtext><mo>/</mo><mn>{{ RULES.bountyDamageScale }}</mn></mrow></msup>
    </math>
    <p>
      Team stake is their team's full stake. It can't move more than what's left in their clan's
      slice. Your clan gets that amount times their team's engagement. Start is 1 if they've never
      been broken this war. After a break it's {{ RULES.bountyFloor }} plus {{ RULES.bountyCarry }} of whatever their
      bounty was above {{ RULES.bountyFloor }} when they went down. Damage dealt is everything they did since
      their last break, chips and no-score hits included. The bounty also scales the break XP.
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
      Two players with the same skill keep hitting one guy. The hits do 10, 13, 16.9, 21.97 and 28.56.
      The 6th would do 37.13. He only has 9.57 left. That hit breaks him. With no score on the map,
      every hit would be 10, so it takes 10.
    </p>
  </WikiProse>
</template>
