<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import IconButton from '@/components/common/IconButton.vue'
import type {
  ClanWarParticipantResponse,
  ClanWarPoolEntryResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import { formatStanding, warSideStyles, warTeamOf, type WarWipe } from '@/utils/clans'
import { formatAccuracy, formatDuration, formatSigned } from '@/utils/formatters'
import { computed, defineAsyncComponent, ref } from 'vue'
import StrikeLines from './StrikeLines.vue'
import type { WarMapBoard } from './useWarMapBoards'
import WarMapCalc from './WarMapCalc.vue'
import WarMapRow from './WarMapRow.vue'
import { formatDamage, hitBreakdown, minChip, minHit, penaltyPercent, repeatShare, repeatTitle } from './warStrike'

const props = defineProps<{
  war: ClanWarResponse
  rules: ClanWarStrikeRulesResponse
  fighter: ClanWarParticipantResponse
  pool: ClanWarPoolEntryResponse[]
  aimed: boolean
  canAim: boolean
  saving: boolean
  viewer: ClanWarParticipantResponse | null
  expanded: string | null
  boards: Record<string, WarMapBoard>
  wipe: WarWipe | null
  now: number
}>()

const emit = defineEmits<{
  aim: [userId: string]
  toggle: [mapId: string]
}>()

const WarMapBoardView = defineAsyncComponent(() => import('./WarMapBoard.vue'))

const CHIP_TITLE = 'Score just under them and you still chip their guard. The closer you get, the more it does.'

const howOpen = ref(false)
const style = computed(() => warSideStyles(props.war)[warTeamOf(props.war, props.fighter.clanId) ?? 'defend'])
const preview = computed(() => props.fighter.strikePreview)
const guard = computed(() => (props.fighter.guard > 0 ? props.fighter.guard : props.rules.guard))
const startsIn = computed(() =>
  props.war.status === 'preparing' && props.war.startsAt
    ? formatDuration(new Date(props.war.startsAt).getTime() - props.now, { zero: 'now' })
    : null,
)
const nextHit = computed(() => (preview.value ? Math.min(preview.value.damage, guard.value) : 0))
const breakdown = computed(() =>
  preview.value ? hitBreakdown(props.rules, preview.value, guard.value, props.fighter.bounty) : [],
)

function pct(score: number, maxScore: number): string {
  return formatAccuracy(score / maxScore)
}

function plan(entry: ClanWarPoolEntryResponse) {
  const maxScore = entry.difficulty.maxScore
  if (entry.target?.id !== props.fighter.player.id || maxScore == null) return null
  const penalty = penaltyPercent(entry.targetMapPenalty)
  const damage = entry.targetDamage == null ? null : Math.min(entry.targetDamage, guard.value)
  const breaks = damage != null && damage >= guard.value
  const repeat = !!entry.targetRepeatMap
  if (!entry.targetScore) return { noScore: true, damage, breaks, penalty, repeat } as const
  const target = entry.targetScore.score
  const hitAt = minHit(target, maxScore)
  const chipAt = minChip(props.rules, target, maxScore)
  return {
    noScore: false,
    hit: hitAt == null ? null : pct(hitAt, maxScore),
    damage,
    chip: chipAt <= 0 ? 'any play' : pct(chipAt, maxScore),
    breaks,
    penalty,
    repeat,
  } as const
}

function scores(entry: ClanWarPoolEntryResponse) {
  const theirs = entry.target?.id === props.fighter.player.id ? entry.targetScore : null
  const mine = entry.viewerScore
  const gap = mine && theirs ? (mine.accuracy - theirs.accuracy) * 100 : null
  return {
    you: mine ? formatAccuracy(mine.accuracy) : '-',
    diff: gap === null ? '-' : `${formatSigned(gap, 2, '-')}%`,
    gap: gap === null ? 0 : Math.sign(gap),
  }
}

const rows = computed(() => props.pool.map((entry) => ({ entry, plan: plan(entry), scores: scores(entry) })))
</script>

<template>
  <section class="target clan-colors" :style="style" :aria-label="`Hitting ${fighter.player.name}`">
    <div class="target__top">
      <div class="target__left">
        <header v-if="!aimed && canAim" class="target__head">
          <span class="caption">Not your target yet</span>
          <BaseButton :loading="saving" @click="emit('aim', fighter.player.id)">Aim at Them</BaseButton>
        </header>
        <p v-if="startsIn" class="target__line">Starts in {{ startsIn }}, hits count from then</p>
        <div v-if="preview" class="target__how">
          <span class="target__line">Next hit {{ formatDamage(nextHit) }} <span class="target__soft">on a new map</span></span>
          <button type="button" class="target__how-toggle" :aria-expanded="howOpen" aria-controls="war-target-how" @click="howOpen = !howOpen">
            How?
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div v-if="preview" class="target__worth">
        <span class="field-label">Breaking them takes</span>
        <span class="target__standing">{{ formatStanding(preview.standingTaken) }} Standing</span>
      </div>
    </div>
    <Transition name="collapse">
      <div v-if="preview && howOpen" id="war-target-how" class="collapsible">
        <div><StrikeLines class="target__lines" :lines="breakdown" /></div>
      </div>
    </Transition>

    <table class="target__table">
      <thead>
        <tr>
          <th scope="col">Map</th>
          <th scope="col" class="target__num">Hit At</th>
          <th scope="col" class="target__num">Damage</th>
          <th scope="col" class="target__num">
            <HintTooltip variant="inline" :text="CHIP_TITLE"><template #trigger>Chip At</template></HintTooltip>
          </th>
          <th scope="col" class="target__num">Your PB</th>
          <th scope="col" aria-label="Tools" />
        </tr>
      </thead>
      <tbody>
        <template v-for="({ entry, plan: p, scores: sc }, index) in rows" :key="entry.difficulty.id">
          <tr class="target__row" :class="{ 'target__row--alt': index % 2 === 1 }" @click="emit('toggle', entry.difficulty.id)">
            <th scope="row" class="target__map"><WarMapRow :difficulty="entry.difficulty" plain /></th>
            <td class="target__num" data-label="Hit At">
              <template v-if="p">{{ p.noScore ? 'Any play' : (p.hit ?? '-') }}</template>
            </td>
            <td class="target__num" data-label="Damage">
              <template v-if="p">
                <span class="target__damage">{{ p.damage != null ? formatDamage(p.damage) : '-' }}</span>
                <span v-if="!p.noScore && p.hit === null" class="caption target__note">cannot be beaten</span>
                <span v-if="p.breaks" class="caption target__note target__note--break">breaks them</span>
                <span v-if="p.penalty !== null" class="caption target__note target__note--penalty">{{ p.penalty }}%, broken here before</span>
                <HintTooltip v-if="p.repeat" variant="inline" class="caption target__note" :text="repeatTitle(rules)">
                  <template #trigger>already hit here, {{ repeatShare(rules) }}% streak</template>
                </HintTooltip>
              </template>
            </td>
            <td class="target__num target__chip" data-label="Chip At">
              <template v-if="p && !p.noScore">{{ p.chip === 'any play' ? 'Any play' : p.chip }}</template>
            </td>
            <td class="target__num" data-label="Your PB">
              {{ sc.you }}
              <span v-if="sc.gap" class="caption target__gap" :class="sc.gap > 0 ? 'target__ahead' : 'target__behind'">{{ sc.diff }}</span>
            </td>
            <td class="target__tools" @click.stop>
              <WarMapCalc
                v-if="preview && entry.targetDamage != null && entry.difficulty.maxScore != null"
                :rules="rules"
                :preview="preview"
                :guard="guard"
                :target-score="entry.targetScore?.score ?? null"
                :target-damage="entry.targetDamage"
                :max-score="entry.difficulty.maxScore"
                :map-penalty="entry.targetMapPenalty"
                :repeat-map="!!entry.targetRepeatMap"
                :viewer-score="entry.viewerScore?.score ?? null"
              />
              <IconButton
                class="target__expand"
                :label="`Leaderboard for ${entry.difficulty.songName}`"
                :aria-expanded="expanded === entry.difficulty.id"
                @click="emit('toggle', entry.difficulty.id)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </IconButton>
            </td>
          </tr>
          <tr v-if="expanded === entry.difficulty.id && entry.difficulty.maxScore != null" class="target__board">
            <td colspan="7">
              <Transition name="collapse" appear>
                <div class="collapsible">
                  <div>
                    <WarMapBoardView
                      :war="war"
                      :rules="rules"
                      :board="boards[entry.difficulty.id]"
                      :max-score="entry.difficulty.maxScore"
                      :viewer="viewer"
                      :wipe="wipe"
                    />
                  </div>
                </div>
              </Transition>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.target {
  --clan-bar-fill: var(--war-side);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.target__head,
.target__how {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.target__line {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-primary);
}

.target__soft {
  color: var(--text-secondary);
}

.target__how-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  font: inherit;
  font-size: var(--text-body);
  color: var(--text-primary);
  background: none;
  border: none;
  cursor: pointer;
}

.target__how-toggle svg,
.target__expand svg {
  transition: transform var(--dur-fast) var(--ease-out);
}

.target__how-toggle[aria-expanded='true'] svg,
.target__expand[aria-expanded='true'] svg {
  transform: rotate(180deg);
}

.target__top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.target__left {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.target__worth {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
}

.target__standing {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  line-height: 1;
  font-weight: 600;
  color: var(--tier-gold);
}

.target__lines {
  max-width: 480px;
  font-size: var(--text-body);
}

.target__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.target__table th,
.target__table td {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  vertical-align: middle;
}

.target__table thead th {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.target__table .target__num {
  font-family: var(--font-mono);
  text-align: right;
  white-space: nowrap;
}

.target__row {
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.target__row--alt {
  background: var(--bg-elevated);
}

.target__row:hover {
  background: var(--bg-overlay);
}

.target__map {
  font-weight: 400;
}

.target__ahead {
  color: var(--success);
}

.target__damage {
  font-weight: 600;
}

.target__table .target__chip {
  color: var(--text-secondary);
}

.target__gap {
  display: inline-block;
  min-width: 7ch;
  font-family: var(--font-mono);
}

.target__behind {
  color: var(--error);
}

.target__note {
  display: block;
  font-family: var(--font-sans);
}

.target__note--break {
  color: var(--success);
}

.target__note--penalty {
  color: var(--warning);
}

.target__table .target__tools {
  width: 1%;
  white-space: nowrap;
}

.target__tools > * {
  vertical-align: middle;
}

.target__table .target__board td {
  padding: 0 0 var(--space-sm);
}

@media (max-width: 767px) {
  .target {
    padding: var(--space-md);
  }

  .target__top {
    flex-direction: column;
  }

  .target__worth {
    align-items: flex-start;
  }

  .target__table thead {
    display: none;
  }

  .target__table,
  .target__table tbody,
  .target__table .target__board,
  .target__table .target__board td {
    display: block;
  }

  .target__row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-xs) var(--space-sm);
    padding: var(--space-sm);
  }

  .target__table .target__row > * {
    padding: 0;
    text-align: left;
    white-space: normal;
  }

  .target__row > .target__map {
    grid-column: 1 / 3;
  }

  .target__table .target__row > .target__tools {
    width: auto;
    text-align: right;
  }

  .target__row > td[data-label]::before {
    content: attr(data-label);
    display: block;
    font-family: var(--font-sans);
    font-size: var(--text-caption);
    color: var(--text-secondary);
  }
}
</style>
