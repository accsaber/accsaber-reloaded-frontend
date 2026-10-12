<script setup lang="ts">
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'

const RULE_GROUPS = [
  {
    id: 'length',
    title: 'Length',
    rules: [
      'At most 6 minutes between the first and last note',
      'At least 115 notes',
      'At least 1.25 seconds before the first note, bomb or wall',
      'At least 1 second after the last one',
      'No unnecessary silence added to the audio',
    ],
  },
  {
    id: 'timing',
    title: 'Timing',
    rules: [
      'The BPM must match the song',
      'The offset must be as close to perfect as possible',
      'Songs with a changing BPM must be timed as closely as possible',
      'Every note must sit on a sound in the music',
      'One sound cannot be mapped as more than one swing',
      'No section can be much harder than the rest of the map unless the music backs it up',
    ],
  },
  {
    id: 'consistency',
    title: 'Consistency',
    rules: [
      'The same sound is mapped the same way every time, so a double stays a double',
      'A sound left unmapped stays unmapped every time, or is mapped every time',
      'A silence left empty stays empty every time it comes back',
      'Repeated parts of the song play the same unless the music changes',
      'Vocals are mapped to their syllables, spaced the way they are sung',
      'Stronger syllables should take priority over weaker ones in the respective language. If unclear, map consistently spaced notes, especially for faster sections.',
      'A section keeps one approach to the vocals, like only the first syllable of each word, or only the beat',
    ],
  },
  {
    id: 'notes',
    title: 'Notes',
    rules: [
      'Each hand starts on a down swing, unless reset by bombs',
      'No note can have an angle that is not a multiple of 45º',
      'Dots count as the most direct straight swing from where the hand is',
      'Same-color notes in one swing lead into each other and share the same angle',
      'No pattern can change your swing speed partway through a swing',
      'No note in the path of the other hand before it cuts.',
      'No note in the follow-through of the other hand unless that saber has time to clear it',
      'No patterns where the two hands cross swing paths after any of the two notes are hit',
      "A note in the other hand's columns that points back toward its own side needs a lead-in: the swing before it sits in that column or further across, at most 700ms earlier",
      'Every note sits inside the 4 by 3 grid',
      'No vision blocks within 400ms. A note in the middle row of column 2 hides columns 1 and 2 behind it, and one in column 3 hides columns 3 and 4',
      'A note in the outer column next to it is only half hidden for the first 150ms, so it can come up to 150ms after it, but not between 150ms and 400ms',
      'Patterns where the hand goes fully palm-up are not allowed'
    ],
  },
  {
    id: 'flicks-and-bursts',
    title: 'Flicks and bursts',
    rules: [
      'Two same-color notes 250ms apart or closer make a flick, three or more make a burst',
      'A flick is horizontal when both notes point left or right',
      'No flick covers all 4 columns',
      'Flicks and bursts only exist because of musical emphasis',
      'Up-notes in a flick or burst stay in the two columns belonging to the hand, unless coming from an inner or outer-lane crossover',
      "Inner-lane crossover flicks cannot go from the opposite hand's inner column to its outer column",
      'Palm-up flicks are not allowed'
    ],
  },
  {
    id: 'rolls',
    title: 'Rolls',
    rules: [
      'A 135° roll comes 450ms to 1250ms after the swing before it',
      "After 1250ms, a 135° roll is fine when it lands on a down note in the hand's inner column, an up note in the top row, or an outward down diagonal in the hand's outer column on the bottom row",
      'The swing before a 135° roll comes at least 225ms after its own previous swing',
      'An arc into a 135° roll is strongly suggested',
    ],
  },
  {
    id: 'walls-and-bombs',
    title: 'Walls and bombs',
    rules: [
      'No 3-wide dodge walls',
      'No walls that force damage or push you into the outer lanes',
      'Walls outside the grid are allowed, but no wall can confuse you or make the map hard to read',
      'Walls spawned over and over right next to notes count as confusing',
      'No walls under the grid',
      'Walls can be any height, inside or outside the grid, but they follow the music and are never a gimmick',
      'A wall in an inner column ends at least 400ms before a note behind it, in its own column or the outer column next to it',
      'A wall in an outer column ends at least 200ms before a note behind it',
      'A 1-tall wall in the bottom row ends at least 500ms before a note behind it',
      'Walls outside the grid cannot get in the way of notes jumping in',
      'A 1-tall wall spawns at least 175ms before or after any note touching it, including diagonally',
      'Bombs follow the music, and no map can be covered in them',
      'At most one bomb for every two notes',
      'At least 150ms of space before a note after a bomb',
      'No bombs in the path of a swing',
      'No bombs that force a saber out of the grid',
      'No bombs or notes inside walls',
      'No bombs on top of other objects',
    ],
  },
  {
    id: 'arcs',
    title: 'Arcs',
    rules: [
      'An arc cannot mislead you about where to swing or where the swing ends',
      'The notes must still be rankable with the arc removed',
      'A maximum of 4 arcs can be used in a single swing',
    ],
  },
  {
    id: 'the-file',
    title: 'The file',
    rules: [
      'Mods must never be required to play the map',
      'NJS stays the same for the whole difficulty',
      'No hand edits to the map file, including fake walls and note jumps',
      'The map has lighting that follows the music',
    ],
  },
]

const NUMBER_ROWS = [
  { label: 'Minimum length (first to last note)', values: ['2:00', '1:45', '1:45'] },
  { label: 'NJS limit (note jump speed)', values: ['12', '16', '16'] },
  { label: 'Max peak SPS (swings per second)', values: ['1.5 *', '6', '6'] },
  { label: 'Max average SPS', values: ['1.25 *', '4', '4'] },
  { label: 'Max notes in a single-hand burst', values: ['1 note', '4 notes', '6 notes'] },
  { label: 'Min gap in a flick', values: ['-', '135ms', '135ms'] },
  { label: 'Min gap in a flick covering 3 columns and 3 rows', values: ['-', '200ms', '200ms'] },
  { label: 'Min gap in a horizontal flick', values: ['-', '200ms', '200ms'] },
  { label: 'Min gap in a palm-up', values: ['-', '-', '350ms'] },
  { label: 'Min gap in a single-hand burst', values: ['-', '175ms', '175ms'] },
  { label: 'Max roll', values: ['90° (with parity)', '90°', '135°'] },
  { label: 'Gap after notes before a bomb **', values: ['500ms', '250ms', '250ms'] },
]

const PATTERN_COLUMNS = ['True', 'Standard', 'Tech']

const PATTERN_ROWS: WikiCompareRow[] = [
  { label: 'Stacks', values: [false, true, true] },
  { label: 'Towers', values: [false, 'lead-in required', 'lead-in required'] },
  { label: 'Sliders', values: [false, false, false] },
  { label: 'Windows', values: [false, false, 'lead-in suggested'] },
  { label: 'Palm-ups', values: [false, false, true] },
  { label: 'Double directionals (DDs)', values: ['if consistent', false, false] },
  { label: 'Triangles', values: [false, false, false] },
  { label: 'Chains', values: [false, false, false] },
  { label: '4-wides', values: [false, false, false] },
  { label: 'Outer-lane crossovers', values: [true, 'only bottom-row diagonals ***', true] },
]
</script>

<template>
  <WikiProse>
    <p>
      A difficulty has to meet these standards before the ranking team votes on it. Mapping terms
      are not explained here. The
      <a href="https://bsmg.wiki/wiki/Mapping" target="_blank" rel="noopener noreferrer">BSMG Wiki</a>
      covers all of them.
    </p>

    <WikiHeading id="general">General rules</WikiHeading>
    <template v-for="group in RULE_GROUPS" :key="group.id">
      <WikiHeading :id="group.id" :level="3">{{ group.title }}</WikiHeading>
      <ul>
        <li v-for="rule in group.rules" :key="rule">{{ rule }}</li>
      </ul>
    </template>

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

    <p>
      SPS counts swings, not notes. Average SPS is the number of swings divided by the time from the
      first swing to the last. Peak SPS is the most swings in any 10 seconds, divided by 10.
    </p>

    <WikiHeading id="patterns">Pattern rules by category</WikiHeading>
    <p>
      A check means the pattern is allowed in that category.
    </p>
    <WikiCompareTable :columns="PATTERN_COLUMNS" :rows="PATTERN_ROWS" />
    <p class="footnote">
      *** Middle-row diagonals into the outer lane are allowed in Standard Acc when they are rare, at least 500ms
      from any other note and on a clear musical emphasis.
    </p>
    <p>
      Resets in True Acc are allowed only when they are consistent, the same pattern resolved
      the same way every time it appears.
    </p>
    <p>
      Towers in Standard Acc are allowed only when their lead-in sits on
      the same row as the tower's top note and carries proper emphasis. An arc
      connecting the previous note and the tower's top note is mandatory.
    </p>

    <WikiHeading id="enforcement">Who enforces this</WikiHeading>
    <p>
      The criteria check is its own vote inside <RouterLink
      to="/wiki/how-maps-get-ranked#the-vote">the ranking vote</RouterLink>, decided by simple
      majority with the ranking heads holding an override. The AccSaber Criteria Script checks a
      map against everything listed here automatically and flags what it finds. If you are not
      sure about an edge case, ask in the Discord before suggesting.
    </p>
  </WikiProse>
</template>

<style scoped>
.footnote {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
