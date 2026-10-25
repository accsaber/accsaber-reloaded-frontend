<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import type {
  ClanWarParticipantResponse,
  ClanWarPoolEntryResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import { formatStanding, warSideStyles, warTeamOf, type WarWipe } from '@/utils/clans'
import { formatAccuracy, formatDuration } from '@/utils/formatters'
import { computed, ref } from 'vue'
import StrikeLines from './StrikeLines.vue'
import type { WarMapBoard } from './useWarMapBoards'
import WarMapCalc from './WarMapCalc.vue'
import WarPoolEntry from './WarPoolEntry.vue'
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

const CHIP_TITLE = 'Score just under them and you still chip their guard. The closer you get, the more it does.'

const howOpen = ref(false)
const style = computed(() => warSideStyles(props.war)[warTeamOf(props.war, props.fighter.clanId) ?? 'defend'])
const preview = computed(() => props.fighter.strikePreview)
const up = computed(() => props.fighter.guard > 0)
const startsIn = computed(() =>
  props.war.status === 'preparing' && props.war.startsAt
    ? formatDuration(new Date(props.war.startsAt).getTime() - props.now, { zero: 'now' })
    : null,
)
const nextHit = computed(() => (preview.value ? Math.min(preview.value.damage, props.fighter.guard) : 0))
const breakdown = computed(() =>
  preview.value ? hitBreakdown(props.rules, preview.value, props.fighter.guard, props.fighter.bounty) : [],
)

function pct(score: number, maxScore: number): string {
  return formatAccuracy(score / maxScore)
}

function plan(entry: ClanWarPoolEntryResponse) {
  const maxScore = entry.difficulty.maxScore
  if (entry.target?.id !== props.fighter.player.id || maxScore == null) return null
  const guard = props.fighter.guard
  const penalty = penaltyPercent(entry.targetMapPenalty)
  const damage = entry.targetDamage == null ? null : Math.min(entry.targetDamage, guard)
  const breaks = damage != null && damage >= guard
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

const rows = computed(() => props.pool.map((entry) => ({ entry, plan: up.value ? plan(entry) : null })))
</script>

<template>
  <section class="target clan-colors" :style="style" :aria-label="`Hitting ${fighter.player.name}`">
    <div class="target__top">
      <div class="target__left">
        <header v-if="!aimed && canAim" class="target__head">
          <span class="target__preview">Not your target yet</span>
          <BaseButton size="sm" :loading="saving" @click="emit('aim', fighter.player.id)">Aim at them</BaseButton>
        </header>
        <p v-if="startsIn" class="target__line">Starts in {{ startsIn }}. Hits count from then.</p>
        <div v-if="preview" class="target__how">
          <span v-if="up" class="target__line">Next hit {{ formatDamage(nextHit) }} <span class="target__soft">on a new map</span></span>
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
        <span class="target__label">Breaking them takes</span>
        <span class="target__standing">{{ formatStanding(preview.standingTaken) }} Standing</span>
      </div>
    </div>
    <StrikeLines v-if="preview && howOpen" id="war-target-how" class="target__lines" :lines="breakdown" />

    <h3 class="target__label target__where">Where to hit them</h3>
    <ul class="target__maps">
      <li v-for="{ entry, plan: p } in rows" :key="entry.difficulty.id" class="target__map">
        <WarPoolEntry
          :entry="entry"
          :war="war"
          :rules="rules"
          :viewer="viewer"
          :expanded="expanded"
          :boards="boards"
          :wipe="wipe"
          expandable
          @toggle="emit('toggle', $event)"
        >
          <span v-if="entry.viewerScore" class="target__soft">Your PB {{ formatAccuracy(entry.viewerScore.accuracy) }}</span>
          <template #below>
            <p v-if="p" class="target__plan">
              <template v-if="p.noScore">
                They haven't played it<template v-if="p.damage != null">: any play does <span class="target__lands">{{ formatDamage(p.damage) }}</span></template>
              </template>
              <template v-else>
                <template v-if="p.hit">
                  Beat {{ p.hit }}<template v-if="p.damage != null"> → <span class="target__lands">{{ formatDamage(p.damage) }} dmg</span></template>
                </template>
                <template v-else>Nobody can beat their score here</template>
                · Get {{ p.chip }} to <HintTooltip variant="inline" :text="CHIP_TITLE"><template #trigger>chip</template></HintTooltip>
              </template>
              <span v-if="p.penalty !== null" class="target__penalty">(broken here before: {{ p.penalty }}% damage)</span>
              <span v-if="p.breaks" class="target__lands">· Breaks them</span>
              <span v-if="p.repeat" class="target__repeat">
                · <HintTooltip variant="inline" :text="repeatTitle(rules)"><template #trigger>Already hit here: repeat hits keep {{ repeatShare(rules) }}% of the streak bonus</template></HintTooltip>
              </span>
              <WarMapCalc
                v-if="preview && entry.targetDamage != null && entry.difficulty.maxScore != null"
                class="target__calc"
                :rules="rules"
                :preview="preview"
                :guard="fighter.guard"
                :target-score="entry.targetScore?.score ?? null"
                :target-damage="entry.targetDamage"
                :max-score="entry.difficulty.maxScore"
                :map-penalty="entry.targetMapPenalty"
                :repeat-map="!!entry.targetRepeatMap"
                :viewer-score="entry.viewerScore?.score ?? null"
              />
            </p>
          </template>
        </WarPoolEntry>
      </li>
    </ul>
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
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.target__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.target__preview {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.target__how {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.target__label {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
}

.target__line,
.target__plan {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--text-primary);
}

.target__soft {
  font-size: var(--text-body);
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

.target__how-toggle[aria-expanded='true'] svg {
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
  font-size: 2rem;
  line-height: 1;
  font-weight: 600;
  color: var(--tier-gold);
}

.target__lines {
  max-width: 480px;
  font-size: var(--text-body);
}

.target__where {
  margin-top: var(--space-sm);
}

.target__maps {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.target__map {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.target__map:last-child {
  border-bottom: none;
}

.target__plan {
  padding-left: calc(40px + var(--space-md));
}

.target__calc {
  margin-left: var(--space-xs);
  vertical-align: middle;
}

.target__lands {
  font-weight: 600;
  color: var(--success);
}

.target__repeat {
  margin-left: var(--space-xs);
  color: var(--text-secondary);
}

.target__penalty {
  margin-left: var(--space-xs);
  font-weight: 600;
  color: var(--warning);
}

@media (max-width: 600px) {
  .target {
    padding: var(--space-md);
  }

  .target__plan {
    padding-left: 0;
  }

  .target__top {
    flex-direction: column;
  }

  .target__worth {
    align-items: flex-start;
  }
}
</style>
