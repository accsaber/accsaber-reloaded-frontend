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
import { warClan, warSideStyles, warTeamOf, type WarWipe } from '@/utils/clans'
import { formatAccuracy } from '@/utils/formatters'
import { toDifficultyScoreDisplay } from '@/utils/mappers'
import { computed } from 'vue'
import type { WarMapBoard } from './useWarMapBoards'
import { mapOutcome, penaltyPercent, type StrikeOutcome } from './warStrike'
import WarStrikeStatus from './WarStrikeStatus.vue'
import WarGuard from './WarGuard.vue'

const props = defineProps<{
  war: ClanWarResponse
  rules: ClanWarStrikeRulesResponse
  board: WarMapBoard | undefined
  viewer: ClanWarParticipantResponse | null
  wipe: WarWipe | null
  maxScore: number
}>()

const styles = computed(() => warSideStyles(props.war))
const viewerTeam = computed(() => (props.viewer ? warTeamOf(props.war, props.viewer.clanId) : null))
const fighters = computed(() => new Map((props.board?.fighters ?? []).map((f) => [f.player.id, f])))

const columns = computed<TableColumn[]>(() => [
  { key: 'rank', label: '#', align: 'right', mono: true, width: '80px' },
  { key: 'player', label: 'Player', align: 'left', width: '160px', flex: true },
  { key: 'accuracy', label: 'Acc', align: 'right', mono: true, width: '72px' },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '80px' },
  { key: 'guard', label: 'Guard', align: 'left', width: '152px' },
  ...(props.viewer ? [{ key: 'status', label: 'Your PB', align: 'right' as const, width: '120px' }] : []),
])

const viewerScore = computed(() => props.board?.scores?.find((s) => s.userId === props.viewer?.player.id) ?? null)

function status(fighter: ClanWarParticipantResponse) {
  const own = viewerScore.value
  if (!own || !fighter.strikePreview || fighter.guard <= 0) return null
  const preview = fighter.strikePreview
  const map = {
    targetScore: preview.onMap?.targetScore ?? null,
    targetDamage: preview.damage,
    maxScore: props.maxScore,
    mapPenalty: preview.onMap?.mapPenalty,
    repeatMap: preview.onMap?.repeatMap,
  }
  const outcome = mapOutcome(props.rules, preview, fighter.guard, map, own.score)
  return outcome.kind === 'none' ? null : outcome
}

const penaltyTitle = computed(
  () =>
    'They already got broken on this map. Every break here makes your hits on them here weaker, ' +
    `but never below ${Math.round(props.rules.mapBreakFloor * 100)}% damage. Try another map.`,
)

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
      penalty: penaltyPercent(fighter?.strikePreview?.onMap?.mapPenalty),
      clan: fighter ? warClan(props.war, fighter.clanId) : null,
      side: team ? styles.value[team] : undefined,
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
          <UserChip :user="(row.player as UserRefDisplay)" size="sm" link tooltip hide-clan />
          <HintTooltip v-if="row.penalty !== null" variant="inline" class="war-board__penalty" :text="penaltyTitle">
            <template #trigger>Broken here before: {{ row.penalty }}% damage</template>
          </HintTooltip>
        </span>
      </template>
      <template #cell-guard="{ row }">
        <WarGuard
          v-if="row.fighter"
          class="clan-colors war-board__side"
          :style="row.side"
          :fighter="(row.fighter as ClanWarParticipantResponse)"
          :rules="rules"
          :wipe="wipe"
          streak
        />
      </template>
      <template #cell-status="{ row }">
        <WarStrikeStatus v-if="row.status" :outcome="(row.status as StrikeOutcome)" />
      </template>
      <template #mobile-card="{ row }">
        <div class="war-board__card" :class="{ 'war-board__card--self': row._userId === viewer?.player.id }">
          <span class="war-board__rank">#{{ row.rank }}</span>
          <span class="war-board__player">
            <ClanTag v-if="row.clan" :clan="(row.clan as PublicClanResponse)" size="sm" />
            <UserChip :user="(row.player as UserRefDisplay)" size="sm" link tooltip hide-clan />
          </span>
          <span class="war-board__acc">{{ formatAccuracy(row.accuracy as number) }}</span>
          <WarGuard
            v-if="row.fighter"
            class="clan-colors war-board__side war-board__wide"
            :style="row.side"
            :fighter="(row.fighter as ClanWarParticipantResponse)"
            :rules="rules"
            :wipe="wipe"
            streak
          />
          <WarStrikeStatus v-if="row.status" class="war-board__wide" :outcome="(row.status as StrikeOutcome)" />
          <HintTooltip v-if="row.penalty !== null" variant="inline" class="war-board__penalty war-board__wide" :text="penaltyTitle">
            <template #trigger>Broken here before: {{ row.penalty }}% damage</template>
          </HintTooltip>
        </div>
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

.war-board__penalty {
  margin-left: auto;
  color: var(--warning);
  white-space: nowrap;
}

.war-board__card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-body);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-board__card--self {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
}

.war-board__rank {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.war-board__acc {
  font-family: var(--font-mono);
  font-weight: 600;
}

.war-board__side {
  --clan-bar-fill: var(--war-side);
}

.war-board__wide {
  grid-column: 1 / -1;
}

.war-board :deep(.data-table__row.data-table__row--self-highlight) {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
}
</style>
