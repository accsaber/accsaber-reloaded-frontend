<script setup lang="ts">
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const GENERAL_RULES = [
  'At most 6 minutes between the first and last note',
  'At least 115 notes',
  'No hot starts',
  'No audible off-time notes',
  'Each hand must start on a downswing (down or down-diagonal)',
  'No bad cut patterns',
  'No curved sliders',
  'No 3-wide dodge walls',
  'At least 150ms of space before a note after a bomb',
  'Mods must never be required to play the map',
]

const NUMBER_ROWS = [
  { label: 'Minimum length (first to last note)', values: ['2:00', '1:45', '1:45'] },
  { label: 'NJS limit (note jump speed)', values: ['12', '16', '16'] },
  { label: 'Max peak SPS (swings per second)', values: ['1.75 *', '6.25', '6.25'] },
  { label: 'Max average SPS', values: ['1.5 *', '4', '4'] },
  { label: 'Gap after notes before a bomb **', values: ['500ms', '250ms', '250ms'] },
]

const PATTERN_COLUMNS = ['True', 'Standard', 'Tech']

const PATTERN_ROWS: WikiCompareRow[] = [
  { label: 'Stacks', values: [false, true, true] },
  { label: 'Towers', values: [false, 'lead-in required', true] },
  { label: 'Sliders', values: [false, false, true] },
  { label: 'Windows', values: [false, false, true] },
  { label: 'Wristrolls', values: [false, false, true] },
  { label: 'Double directionals (DDs)', values: ['if consistent', false, false] },
  { label: 'Triangles', values: [false, false, false] },
]
</script>

<template>
  <WikiProse>
    <p>
      Before the ranking team ever votes on a difficulty, it has to clear these standards. They
      exist so that every ranked map is fun, fair, and quality-assured. This
      page uses mapping vocabulary freely, refer to the
      <a href="https://bsmg.wiki/wiki/Mapping" target="_blank" rel="noopener noreferrer">BSMG Wiki</a> if you need a refresher.
    </p>

    <WikiHeading id="general">General rules</WikiHeading>
    <ul>
      <li v-for="rule in GENERAL_RULES" :key="rule">{{ rule }}</li>
    </ul>

    <WikiHeading id="numbers">Category limits</WikiHeading>
    <table>
      <thead>
        <tr>
          <th></th>
          <th><CategoryBadge category="true_acc" /></th>
          <th><CategoryBadge category="standard_acc" /></th>
          <th><CategoryBadge category="tech_acc" /></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in NUMBER_ROWS" :key="row.label">
          <td>{{ row.label }}</td>
          <td v-for="(value, index) in row.values" :key="index">{{ value }}</td>
        </tr>
      </tbody>
    </table>
    <p class="footnote">* True Acc counts doubles as one swing.</p>
    <p class="footnote">
      ** Only applies when the bomb affects the swing path of the notes around it.
    </p>

    <WikiHeading id="patterns">Pattern rules by category</WikiHeading>
    <p>
      A check means the pattern is welcome in that category, a cross means it is not:
    </p>
    <WikiCompareTable :columns="PATTERN_COLUMNS" :rows="PATTERN_ROWS" />
    <p>
      Resets in True Acc are tolerated only when they are consistent, the same
      pattern resolved the same way every time it appears. A map that makes you guess is a map
      that fails.
    </p>
    <p>
      Towers in Standard Acc are allowed only when their lead-in sits on
      the same row as the tower's top note and carries proper emphasis, so the player reads the
      full swing before committing. An arc is heavily suggested.
    </p>

    <WikiHeading id="enforcement">Who enforces this</WikiHeading>
    <p>
      The criteria check is its own vote inside
      <RouterLink to="/wiki/how-maps-get-ranked#the-vote">the ranking vote</RouterLink>,
      decided by simple majority with the ranking heads holding an override. And backing the
      team up is the AccSaber Criteria Script, which automatically checks a map against
      everything listed on this page and flags what it finds. The standards themselves evolve
      with the game, so when in doubt about an edge case, ask in the Discord before suggesting.
    </p>
  </WikiProse>
</template>

<style scoped>
.footnote {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
