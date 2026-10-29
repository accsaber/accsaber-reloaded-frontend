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
      'At least 1.25 seconds before the first note, bomb or wall',
      'At least 1 second after the last one',
      'At most 3 seconds of silence at the start and end of the audio',
    ],
  },
  {
    id: 'timing',
    title: 'Timing',
    rules: [
      'The BPM must match the song',
      'The offset must be as close to perfect as possible (<5ms)',
      'Songs with a changing BPM must be timed as closely as possible (<5ms)',
      'Every note must sit on a sound in the music',
    ],
  },
  {
    id: 'consistency',
    title: 'Consistency',
    rules: [
      'Repeated sounds with the same volume and pitch should not excessively change',
      'Repeated parts of the song should play the same unless the music changes',
      'A section keeps one approach to musical representation, whether only vocals, only instruments or a mix of both if musical emphasis is clear',
      "The intensity and density of the map should match the music. Deviation is allowed as long as a section's intensity is not excessively raised or lowered relative to the intensity of the rest of the song.",
      "Even then, no 10 seconds (Peak SPS) can go above 2.5 times the map's average SPS",
      'No metronome mapping (one static rhythm across the whole map)',
    ],
  },
  {
    id: 'notes',
    title: 'Notes',
    rules: [
      'At least 115 notes',
      'Each hand starts on a down swing, unless reset by bombs',
      'No note can have an angle that is not a multiple of 45°',
      'No pattern can change your swing speed partway through a swing',
      "No note of the other hand in a swing's path within 60ms of it",
      "The two hands' swing paths cannot cross within 60ms of each other",
      'Every note sits inside the 4 by 3 grid',
      'No vision blocks within 500ms. A note in the middle row of column 2 hides columns 1 and 2 behind it, and one in column 3 hides columns 3 and 4',
      'A note in the outer column next to it is only half hidden for the first 150ms, so it can come up to 150ms after it, but not between 150ms and 400ms',
      'Fully vertical palm-ups are not allowed: a straight up or down note that has to be hit palm-up',
      'Shrado angles have at least 1400ms of spacing between the two notes',
      '4-wides are not allowed',
      'Chains are not allowed',
    ],
  },
  {
    id: 'sliders',
    title: 'Sliders',
    rules: [
      'Same-color notes in one swing lead into each other and share the same angle',
      'Sliders can be up to 3 notes tall',
      "3-tall sliders' spacing must not go beyond 1/64 of the beat",
      "2-tall sliders' spacing must not go beyond 1/32 of the beat",
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
      'Palm-up flicks are not allowed',
    ],
  },
  {
    id: 'rolls',
    title: 'Rolls',
    rules: [
      'A 135° roll cannot exist in the same row and column as the previous note',
      'A 135° roll comes 450ms to 1250ms after the swing before it',
      "After 1250ms, a 135° roll is fine when it lands on a down note in the hand's inner column, an up note in the top row, or an outward down diagonal in the hand's outer column on the bottom row",
      'A 135° roll cannot be chained to another',
    ],
  },
  {
    id: 'walls-and-bombs',
    title: 'Walls and bombs',
    rules: [
      'No wall can make you move to the outer lanes',
      'No walls covering the whole 4 by 3 grid, and no invisible walls',
      'Walls outside the grid are allowed, but no wall can confuse you or make the map hard to read',
      'Walls spawned over and over right next to notes count as confusing',
      'No walls under the grid',
      'Walls can be any height, inside or outside the grid, but they follow the music and are never a gimmick',
      'A wall in an inner column ends at least 500ms before a note behind it, in its own column or the outer column next to it',
      'A wall in an outer column ends at least 200ms before a note behind it',
      'A 1-tall wall in the bottom row ends at least 500ms before a note behind it. If the wall is in an inner column, that includes the outer column next to it',
      'Walls outside the grid cannot get in the way of notes jumping in',
      'Bombs follow the music, and no map can be covered in them',
      'At most one bomb for every two notes',
      'At least 150ms of space before a note after a bomb',
      "No bombs in a swing's path within 60ms of it",
      'No bombs or notes inside walls',
    ],
  },
  {
    id: 'arcs',
    title: 'Arcs',
    rules: [
      'At least one end of an arc sits on a note of its color',
      'An arc ends before or right as the next note of its color, never after',
      'The notes must still be rankable with the arc removed',
      'Arcs cannot mislead the player into the incorrect direction of the next swing or lead the swing through an opposite colored note',
      'A maximum of 4 arcs can be used in a single swing',
      'Arcs must follow the music and not be a gimmick',
      'At most 1 in 10 arcs can share a swing with another arc',
      'Arcs must be used consistently, so the same sound is always mapped with or without an arc',
      'There can only be one arc for every 4 notes',
    ],
  },
  {
    id: 'the-file',
    title: 'The file',
    rules: [
      'Additional mod requirements must not be needed to play the map',
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
  { label: 'Min gap between two swings', values: ['400ms *', '-', '-'] },
  { label: 'Max notes in a single-hand burst', values: ['-', '4 notes', '6 notes'] },
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
  { label: 'Towers', values: [false, true, true] },
  { label: 'Sliders', values: [false, false, true] },
  { label: 'Windows', values: [false, false, true] },
  { label: 'Palm-ups', values: [false, false, true] },
  { label: 'Double directionals (DDs)', values: ['if consistent', false, false] },
  { label: 'Triangles', values: ['if consistent', false, false] },
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
      ** Only applies when the bomb is in the swing path of the note before it.
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
      A tower's lead-in is that hand's swing before it, at most 400ms earlier. In Standard Acc
      the lead-in must also be on the same row as the tower's top note and carries proper emphasis.
      An arc connecting the previous note and the tower's top note is mandatory.
    </p>

    <WikiHeading id="enforcement">Who enforces this</WikiHeading>
    <p>
      The criteria check is its own vote inside <RouterLink
      to="/wiki/how-maps-get-ranked#the-vote">the ranking vote</RouterLink>, decided by simple
      majority with the ranking heads holding an override. The AccSaber Criteria Script checks a
      map against everything listed here automatically and flags what it finds. If you are not
      sure about an edge case, ask in the Discord before suggesting.
    </p>
    <p>
      A map can stay in the queue for as long as 6 months, after which time it will be removed
      from the queue and deactivated. If you're the mapper, feel free to ask any ranking team member
      for feedback.
    </p>
  </WikiProse>
</template>

<style scoped>
.footnote {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
