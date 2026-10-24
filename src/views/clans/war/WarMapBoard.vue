<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import ScoreTable from '@/components/domain/ScoreTable.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanWarParticipantResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
  PublicClanResponse,
} from '@/types/api/clans'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import { warClan, warTeamOf, type WarWipe } from '@/utils/clans'
import { toDifficultyScoreDisplay } from '@/utils/mappers'
import { computed } from 'vue'
import type { WarMapBoard } from './useWarMapBoards'
import StrikeLines from './StrikeLines.vue'
import { formatDamage, strikeOutcome, type StrikeOutcome } from './warStrike'
import WarGuard from './WarGuard.vue'

const props = defineProps<{
  war: ClanWarResponse
  rules: ClanWarStrikeRulesResponse
  board: WarMapBoard | undefined
  viewer: ClanWarParticipantResponse | null
  wipe: WarWipe | null
  maxScore: number
}>()

const viewerTeam = computed(() => (props.viewer ? warTeamOf(props.war, props.viewer.clanId) : null))
const fighters = computed(() => new Map((props.board?.fighters ?? []).map((f) => [f.player.id, f])))

const columns = computed<TableColumn[]>(() => [
  { key: 'rank', label: '#', align: 'right', mono: true, width: '56px' },
  { key: 'player', label: 'Player', align: 'left', width: '200px', flex: true },
  { key: 'accuracy', label: 'Acc', align: 'right', mono: true, width: '76px' },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '76px' },
  { key: 'guard', label: 'Guard', align: 'left', width: '136px' },
  ...(props.viewer ? [{ key: 'status', label: '', align: 'right' as const, width: '96px' }] : []),
])

const viewerScore = computed(() => props.board?.scores?.find((s) => s.userId === props.viewer?.player.id) ?? null)

function status(fighter: ClanWarParticipantResponse) {
  const own = viewerScore.value
  if (!own || !fighter.strikePreview || fighter.guard <= 0) return null
  const outcome = strikeOutcome(props.rules, fighter.strikePreview, fighter.guard, own.score, props.maxScore)
  return outcome.kind === 'none' ? null : outcome
}

const penaltyTitle = computed(
  () =>
    'They already got broken on this map. Every break here makes your hits on them here weaker, ' +
    `but never below ${Math.round(props.rules.mapBreakFloor * 100)}% damage. Try another map.`,
)

function penaltyOf(fighter: ClanWarParticipantResponse | null): number | null {
  const penalty = fighter?.strikePreview?.onMap?.mapPenalty
  return penalty !== undefined && penalty < 1 ? Math.round(penalty * 100) : null
}

const rows = computed(() =>
  (props.board?.scores ?? []).map((s, i) => {
    const display = toDifficultyScoreDisplay(s, [])
    const fighter = fighters.value.get(s.userId) ?? null
    const team = fighter ? warTeamOf(props.war, fighter.clanId) : null
    const enemy = !!fighter && !!viewerTeam.value && team !== viewerTeam.value
    return {
      _userId: s.userId,
      rank: i + 1,
      player: display.player,
      accuracy: display.accuracy,
      ap: display.ap,
      fighter,
      penalty: penaltyOf(fighter),
      repeatMap: !!fighter?.strikePreview?.onMap?.repeatMap,
      clan: fighter ? warClan(props.war, fighter.clanId) : null,
      status: enemy && fighter ? status(fighter) : null,
    }
  }),
)

function rowClass(row: Record<string, unknown>) {
  return { 'data-table__row--self-highlight': !!props.viewer && row._userId === props.viewer.player.id }
}
</script>

<template>
  <div class="war-board">
    <p v-if="board?.error" class="war-board__error" role="alert">{{ board.error }}</p>
    <ScoreTable
      v-else
      :columns="columns"
      :rows="rows"
      :loading="!board?.scores"
      :loading-rows="5"
      row-key="_userId"
      :row-class="rowClass"
      empty-message="No fighter has a score here yet."
    >
      <template #cell-player="{ row }">
        <span class="war-board__player">
          <ClanTag v-if="row.clan" :clan="(row.clan as PublicClanResponse)" size="sm" />
          <UserChip :user="(row.player as UserRefDisplay)" size="sm" link hide-clan />
          <HintTooltip v-if="row.penalty !== null" class="war-board__penalty" :text="penaltyTitle">
            <template #trigger>Only takes {{ row.penalty }}% of damage from this map</template>
          </HintTooltip>
        </span>
      </template>
      <template #cell-guard="{ row }">
        <WarGuard v-if="row.fighter" :fighter="(row.fighter as ClanWarParticipantResponse)" :rules="rules" :wipe="wipe"
          :repeat-map="(row.repeatMap as boolean)" />
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.status" class="war-board__status" :class="`war-board__status--${(row.status as StrikeOutcome).kind}`">
          {{ (row.status as StrikeOutcome).kind === 'damage' ? `Hit: ${formatDamage((row.status as StrikeOutcome).damage)}` : 'chip range' }}
          <HintTooltip text="Damage breakdown" :width="320">
            <StrikeLines :lines="(row.status as StrikeOutcome).lines" />
          </HintTooltip>
        </span>
      </template>
    </ScoreTable>
  </div>
</template>

<style scoped>
.war-board {
  padding-top: var(--space-sm);
}

.war-board__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-board__player {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.war-board .war-board__penalty {
  padding: 0;
  border: none;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  margin-left: auto;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  white-space: nowrap;
}


.war-board__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-tertiary);
}

.war-board__status--damage {
  color: var(--success);
}

.war-board__status--chip {
  color: var(--warning);
}

.war-board :deep(.data-table__row.data-table__row--self-highlight) {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
}
</style>
