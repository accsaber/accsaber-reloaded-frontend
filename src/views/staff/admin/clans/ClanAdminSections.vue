<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanAllianceResponse,
  ClanItemResponse,
  ClanLevelResponse,
  ClanRivalResponse,
  ClanSeasonResponse,
  ClanStandingEventResponse,
  ClanStandingResponse,
  ClanWarResponse,
  ClanXpGrantResponse,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { MissionResponse } from '@/types/api/missions'
import type { TableColumn } from '@/types/display'
import {
  CLAN_ITEM_SOURCE_LABEL,
  CLAN_ROLE_LABEL,
  CLAN_STANDING_SOURCE_LABEL,
  clanXpGrantLabel,
  clanXpGrantWhen,
  formatClanXp,
  formatSignedStanding,
  formatStanding,
  unlockLines,
  warModeLine,
  warOpponent,
  warResultFor,
} from '@/utils/clans'
import { formatCount, formatFullDate, formatPercent, formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'

const props = defineProps<{
  clanId: string
  members: PlayerRef[]
  level: ClanLevelResponse
  xp: ClanXpGrantResponse[]
  items: ClanItemResponse[]
  alliances: ClanAllianceResponse[]
  rivals: ClanRivalResponse[]
  missions: MissionResponse[]
  wars: ClanWarResponse[]
  seasons: ClanSeasonResponse[]
  season: string
  standing: ClanStandingResponse | null
  standingEvents: ClanStandingEventResponse[]
  standingLoading: boolean
}>()

const emit = defineEmits<{
  'update:season': [season: string]
}>()

const seasonOptions = computed(() => [
  { value: '', label: 'Current season' },
  ...props.seasons.map((s) => ({ value: s.slug, label: s.name })),
])

const unlocks = computed(() => unlockLines(props.level.unlocked))

function lastSeen(member: PlayerRef): string {
  const m = member.membership
  if (!m) return '-'
  if (m.online) return 'Online'
  return m.lastPlayedAt ? formatRelativeDate(m.lastPlayedAt) : 'Never'
}

function missionProgress(mission: MissionResponse): string {
  if (mission.targetValue === undefined) return '-'
  return `${formatCount(Math.round(mission.progressValue ?? 0))} / ${formatCount(mission.targetValue)}`
}

const MEMBER_COLUMNS: TableColumn[] = [
  { key: 'player', label: 'Player', primary: true },
  { key: 'role', label: 'Role', width: '120px' },
  { key: 'joined', label: 'Joined', width: '150px' },
  { key: 'lastPlayed', label: 'Last Played', width: '130px' },
  { key: 'strength', label: 'Strength', align: 'right', mono: true, width: '100px' },
  { key: 'seasonXp', label: 'Season XP', align: 'right', mono: true, width: '120px' },
  { key: 'hits', label: 'Hits', align: 'right', mono: true, width: '80px' },
  { key: 'breaks', label: 'Breaks', align: 'right', mono: true, width: '80px' },
]
const XP_COLUMNS: TableColumn[] = [
  { key: 'source', label: 'Source', primary: true },
  { key: 'raw', label: 'Raw', align: 'right', mono: true, width: '110px' },
  { key: 'factor', label: 'Factor', align: 'right', mono: true, width: '110px' },
  { key: 'granted', label: 'Granted', align: 'right', mono: true, width: '110px' },
  { key: 'when', label: 'When', width: '150px' },
]
const STANDING_COLUMNS: TableColumn[] = [
  { key: 'source', label: 'Source', primary: true },
  { key: 'amount', label: 'Amount', align: 'right', mono: true, width: '130px' },
  { key: 'when', label: 'When', width: '150px' },
]
const WAR_COLUMNS: TableColumn[] = [
  { key: 'against', label: 'Against', primary: true },
  { key: 'mode', label: 'Mode', width: '220px' },
  { key: 'result', label: 'Result', width: '160px' },
  { key: 'declared', label: 'Declared', width: '150px' },
]

const memberRows = computed<Record<string, unknown>[]>(() =>
  props.members.map((member) => ({
    id: member.id,
    member,
    role: member.membership ? CLAN_ROLE_LABEL[member.membership.role] : '-',
    joined: member.membership ? formatFullDate(member.membership.joinedAt) : '-',
    lastPlayed: lastSeen(member),
    strength: `${formatPercent((member.membership?.strengthShare ?? 0) * 100, 2)}%`,
    seasonXp: formatCount(Math.round(member.membership?.seasonPlayXp ?? 0)),
    hits: member.membership?.seasonHits ?? 0,
    breaks: member.membership?.seasonBreaks ?? 0,
  })),
)

const xpRows = computed<Record<string, unknown>[]>(() =>
  props.xp.map((grant, index) => ({
    id: index,
    source: clanXpGrantLabel(grant),
    raw: formatClanXp(grant.rawAmount),
    factor: grant.rosterFactor.toFixed(2),
    granted: formatClanXp(grant.amount),
    when: clanXpGrantWhen(grant),
  })),
)

const standingRows = computed<Record<string, unknown>[]>(() =>
  props.standingEvents.map((event, index) => ({
    id: index,
    source: CLAN_STANDING_SOURCE_LABEL[event.source],
    amount: formatSignedStanding(event.amount),
    when: formatRelativeDate(event.createdAt),
  })),
)

const warRows = computed<Record<string, unknown>[]>(() =>
  props.wars.map((war) => ({
    id: war.id,
    opponent: warOpponent(war, props.clanId),
    mode: warModeLine(war),
    result: warResultFor(war, props.clanId),
    declared: formatRelativeDate(war.declaredAt),
  })),
)

const levelLine = computed(() => {
  const progress = props.level.progress
  const factor = props.level.rosterFactor !== undefined ? `, roster factor ${props.level.rosterFactor.toFixed(2)}` : ''
  return `Level ${progress.level}, ${formatCount(Math.round(progress.totalXp))} XP, ${Math.round(progress.progressPercent)}% to the next level${factor}`
})

const standingLine = computed(() => {
  const s = props.standing
  if (!s) return 'No Standing this season'
  return `Rank #${s.rank} with ${formatStanding(s.standing)}, ${formatStanding(s.baseStanding)} base and ${formatSignedStanding(s.earned)} earned`
})

function warRoute(row: Record<string, unknown>) {
  return { name: 'clan-war', params: { warId: row.id as string } }
}
</script>

<template>
  <div class="sections">
    <section class="sections__block">
      <h3 class="card-title">Members</h3>
      <DataTable :columns="MEMBER_COLUMNS" :rows="memberRows" row-key="id" empty-message="No members">
        <template #cell-player="{ row }">
          <UserChip :user="(row.member as PlayerRef)" link hide-clan />
        </template>
      </DataTable>
    </section>

    <section class="sections__block">
      <h3 class="card-title">Level and XP</h3>
      <p class="sections__line">{{ levelLine }}</p>
      <p v-if="unlocks.length" class="caption">Unlocked: {{ unlocks.join(', ') }}</p>
      <DataTable :columns="XP_COLUMNS" :rows="xpRows" row-key="id" empty-message="No XP yet" />
    </section>

    <section class="sections__block">
      <div class="sections__row">
        <h3 class="card-title">Standing</h3>
        <BaseSelect class="sections__season" :model-value="season" :options="seasonOptions" @update:model-value="emit('update:season', $event)" />
      </div>
      <p class="sections__line" :class="{ refreshing: standingLoading }">{{ standingLine }}</p>
      <DataTable v-if="standing || standingLoading" :columns="STANDING_COLUMNS" :rows="standingRows" :loading="standingLoading && !standingRows.length"
        :refreshing="standingLoading && standingRows.length > 0" :loading-rows="3" row-key="id" empty-message="No Standing events" />
    </section>

    <section class="sections__block">
      <h3 class="card-title">Wars</h3>
      <DataTable :columns="WAR_COLUMNS" :rows="warRows" :row-to="warRoute" row-key="id" empty-message="No wars">
        <template #cell-against="{ row }">
          <span class="sections__clan">
            <ClanTag :clan="(row.opponent as ClanWarResponse['attack']['lead'])" size="sm" />
            {{ (row.opponent as ClanWarResponse['attack']['lead']).name }}
          </span>
        </template>
      </DataTable>
    </section>

    <div class="sections__grid">
      <section class="sections__block">
        <h3 class="card-title">Missions</h3>
        <p v-if="!missions.length" class="caption">No missions this week</p>
        <ul v-else class="sections__list">
          <li v-for="mission in missions" :key="mission.id">
            <span>{{ mission.name }}</span>
            <span class="caption">{{ mission.status ?? '-' }}, {{ missionProgress(mission) }}</span>
          </li>
        </ul>
      </section>

      <section class="sections__block">
        <h3 class="card-title">Items</h3>
        <p v-if="!items.length" class="caption">No items</p>
        <ul v-else class="sections__list">
          <li v-for="owned in items" :key="owned.item.id">
            <span>{{ owned.item.name }}<template v-if="owned.equipped"> (equipped)</template></span>
            <span class="caption">{{ CLAN_ITEM_SOURCE_LABEL[owned.source] }}, {{ formatFullDate(owned.acquiredAt) }}</span>
          </li>
        </ul>
      </section>

      <section class="sections__block">
        <h3 class="card-title">Alliances</h3>
        <p v-if="!alliances.length" class="caption">No alliances</p>
        <ul v-else class="sections__list">
          <li v-for="alliance in alliances" :key="alliance.id">
            <span class="sections__clan"><ClanTag :clan="alliance.ally" size="sm" /> {{ alliance.ally.name }}</span>
            <span class="caption">{{ alliance.status }}, {{ alliance.warsFoughtTogether }} wars together</span>
          </li>
        </ul>
      </section>

      <section class="sections__block">
        <h3 class="card-title">Rivals</h3>
        <p v-if="!rivals.length" class="caption">No rivals</p>
        <ul v-else class="sections__list">
          <li v-for="rival in rivals" :key="rival.clan.id">
            <span class="sections__clan"><ClanTag :clan="rival.clan" size="sm" /> {{ rival.clan.name }}</span>
            <span class="caption">{{ rival.incoming ? 'They declared' : 'This clan declared' }} {{ formatRelativeDate(rival.since) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  min-width: 0;
}

.sections__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.sections__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.sections__season {
  width: 220px;
}

.sections__line {
  margin: 0;
  color: var(--text-secondary);
}

.sections__clan {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.sections__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.sections__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.sections__list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
