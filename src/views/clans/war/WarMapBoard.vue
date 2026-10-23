<script setup lang="ts">
import ScoreTable from '@/components/domain/ScoreTable.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanWarParticipantResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import { warSideStyles, warTeamOf } from '@/utils/clans'
import { toDifficultyScoreDisplay } from '@/utils/mappers'
import { computed } from 'vue'
import type { WarMapBoard } from './useWarMapBoards'
import { accuracyGap } from './warStrike'
import WarGuard from './WarGuard.vue'

const props = defineProps<{
  war: ClanWarResponse
  rules: ClanWarStrikeRulesResponse
  board: WarMapBoard | undefined
  viewer: ClanWarParticipantResponse | null
  wipeAt: number | null
}>()

const STATUS_LABEL = { hit: 'you can hit', chip: 'chip range' } as const

const styles = computed(() => warSideStyles(props.war))
const viewerTeam = computed(() => (props.viewer ? warTeamOf(props.war, props.viewer.clan.id) : null))
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

function status(fighter: ClanWarParticipantResponse, score: number, accuracy: number): keyof typeof STATUS_LABEL | null {
  const own = viewerScore.value
  if (!own || fighter.guard <= 0) return null
  if (own.score > score) return 'hit'
  return accuracyGap(accuracy, own.accuracy) < props.rules.chipWindow ? 'chip' : null
}

const rows = computed(() =>
  (props.board?.scores ?? []).map((s, i) => {
    const display = toDifficultyScoreDisplay(s, [])
    const fighter = fighters.value.get(s.userId) ?? null
    const team = fighter ? warTeamOf(props.war, fighter.clan.id) : null
    const enemy = !!fighter && !!viewerTeam.value && team !== viewerTeam.value
    return {
      _userId: s.userId,
      rank: i + 1,
      player: display.player,
      accuracy: display.accuracy,
      ap: display.ap,
      fighter,
      teamStyle: team ? styles.value[team] : undefined,
      status: enemy && fighter ? status(fighter, s.score, s.accuracy) : null,
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
          <span class="war-board__team clan-colors" :style="row.teamStyle as Record<string, string>" />
          <UserChip :user="(row.player as UserRefDisplay)" size="sm" link hide-clan />
        </span>
      </template>
      <template #cell-guard="{ row }">
        <WarGuard v-if="row.fighter" :fighter="(row.fighter as ClanWarParticipantResponse)" :rules="rules" :wipe-at="wipeAt" />
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.status" class="war-board__status" :class="`war-board__status--${row.status}`">
          {{ STATUS_LABEL[row.status as keyof typeof STATUS_LABEL] }}
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
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.war-board__team {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-xs);
  background: var(--war-side);
}

.war-board__status {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-tertiary);
}

.war-board__status--hit {
  color: var(--success);
}

.war-board__status--chip {
  color: var(--warning);
}

.war-board :deep(.data-table__row.data-table__row--self-highlight) {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
}
</style>
