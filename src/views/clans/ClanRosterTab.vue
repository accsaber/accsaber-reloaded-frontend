<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useNow } from '@/composables/useNow'
import type { ClanRole } from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { SortState, TableColumn } from '@/types/display'
import {
  assignableRoles,
  CLAN_ROLE_LABEL,
  CLAN_ROLE_ORDER,
  hasClanRole,
  outranks,
  type RankSlot,
} from '@/utils/clans'
import { formatPercent, formatRelativeDate } from '@/utils/formatters'
import { tableCardQuery } from '@/utils/tableLayout'
import { computed, ref } from 'vue'
import ClanMemberMenu, { type MemberActions, type MemberPick } from './ClanMemberMenu.vue'

const props = defineProps<{
  members: PlayerRef[]
  memberCount: number
  slots: RankSlot[]
  loading: boolean
  viewerRole: ClanRole | null
  viewerId: string | null
}>()

const emit = defineEmits<{
  'change-role': [member: PlayerRef, role: ClanRole]
  kick: [member: PlayerRef]
  wars: [member: PlayerRef]
  transfer: [member: PlayerRef]
  claim: []
}>()

const COLUMNS: TableColumn[] = [
  { key: 'member', label: 'Member', align: 'left', flex: true, noLink: true },
  { key: 'xp', label: 'Season XP', align: 'right', mono: true, sortable: true, width: '128px' },
  { key: 'hits', label: 'Hits', align: 'right', mono: true, sortable: true, width: '88px' },
  { key: 'breaks', label: 'Breaks', align: 'right', mono: true, sortable: true, width: '104px' },
  {
    key: 'strength',
    label: 'Strength',
    align: 'right',
    mono: true,
    sortable: true,
    width: '120px',
  },
  { key: 'skill', label: 'Skill', align: 'right', mono: true, sortable: true, width: '88px' },
  { key: 'played', label: 'Last Played', align: 'right', sortable: true, width: '144px' },
  { key: 'actions', label: '', align: 'right', noLink: true, width: '48px' },
]

const FOUNDER_INACTIVITY_MS = 365 * 24 * 60 * 60 * 1000

const now = useNow()

const canClaim = computed(() => {
  if (props.viewerRole !== 'commander') return false
  const commanders = props.members.filter((m) => m.membership?.role === 'commander')
  const longest = commanders.reduce<PlayerRef | null>(
    (best, m) => (!best || m.membership!.joinedAt < best.membership!.joinedAt ? m : best),
    null,
  )
  if (longest?.id !== props.viewerId) return false
  const founder = props.members.find((m) => m.membership?.role === 'founder')
  const lastPlayed = founder?.membership?.lastPlayedAt
  return !lastPlayed || now.value - new Date(lastPlayed).getTime() > FOUNDER_INACTIVITY_MS
})
const BY_ROLE: SortState = { key: 'rank', direction: 'asc' }
const sortState = ref<SortState>(BY_ROLE)
const split = computed(() => sortState.value.key === BY_ROLE.key)

const mobile = useMediaQuery(tableCardQuery(COLUMNS))

type Tier = 'founder' | 'leader' | null

function tierOf(role: ClanRole | undefined): Tier {
  if (!split.value || !role || role === 'member') return null
  return role === 'founder' ? 'founder' : 'leader'
}

const rows = computed(() => {
  const list = props.members.map((member) => {
    const m = member.membership
    return {
      id: member.id,
      player: member,
      role: m && m.role !== 'member' ? CLAN_ROLE_LABEL[m.role] : null,
      tier: tierOf(m?.role),
      rank: CLAN_ROLE_ORDER.indexOf(m?.role ?? 'member'),
      xp: m?.seasonPlayXp ?? 0,
      hits: m?.seasonHits ?? 0,
      breaks: m?.seasonBreaks ?? 0,
      strength: m?.strengthShare ?? 0,
      skill: m?.skill ?? 0,
      played: m?.lastPlayedAt ? new Date(m.lastPlayedAt).getTime() : 0,
    }
  })
  const { key, direction } = sortState.value
  const sign = direction === 'asc' ? 1 : -1
  return list.sort(
    (a, b) =>
      sign * ((a[key as keyof typeof a] as number) - (b[key as keyof typeof b] as number)) || b.xp - a.xp,
  )
})

function tierAt(index: number): Tier {
  if (rows.value.length) return rows.value[index]?.tier ?? null
  return index === 0 ? 'founder' : null
}

function rowHeight(index: number): number {
  const tier = tierAt(index)
  if (mobile.value) return tier ? 112 : 64
  if (tier === 'founder') return 112
  return tier ? 88 : 56
}

function rowClass(row: Record<string, unknown>) {
  return {
    'roster-row--self': row.id === props.viewerId,
    'roster-row--founder': row.tier === 'founder',
    'roster-row--leader': row.tier === 'leader',
  }
}

const slotNote = computed(() => {
  const notes: string[] = []
  for (const role of ['commander', 'officer'] as const) {
    const seats = props.slots.filter((s) => s.role === role)
    const held = props.members.filter((m) => m.membership?.role === role).length
    const free = seats.filter((s) => s.open).length - held
    const label = CLAN_ROLE_LABEL[role]
    if (free > 0) notes.push(`${free} open ${label.toLowerCase()} ${free === 1 ? 'slot' : 'slots'}`)
    const next = seats.find((s) => !s.open)
    if (next) notes.push(`${label} slot at level ${next.level}`)
  }
  return notes.join(' · ')
})

function onSort(key: string) {
  const current = sortState.value
  if (current.key !== key) sortState.value = { key, direction: 'desc' }
  else sortState.value = current.direction === 'desc' ? { key, direction: 'asc' } : BY_ROLE
}

const offWars = computed(() => {
  if (props.members.length !== props.memberCount) return null
  return {
    off: props.members.filter((m) => m.membership?.warParticipation === false).length,
    limit: Math.floor(props.memberCount / 2),
  }
})

function actionsFor(member: PlayerRef): MemberActions | null {
  const role = member.membership?.role
  if (!props.viewerRole || !role || member.id === props.viewerId) return null
  const below = outranks(props.viewerRole, role)
  const actions: MemberActions = {
    roles: assignableRoles(props.viewerRole, role),
    kick: below && hasClanRole(props.viewerRole, 'officer'),
    wars: below && hasClanRole(props.viewerRole, 'commander'),
    warsFull: !!offWars.value && offWars.value.off >= offWars.value.limit && !!member.membership?.warParticipation,
    transfer: below && hasClanRole(props.viewerRole, 'founder'),
    claim: role === 'founder' && canClaim.value,
  }
  return actions.roles.length || actions.kick || actions.transfer || actions.claim ? actions : null
}

const memberActions = computed(() => {
  const map = new Map<string, MemberActions>()
  for (const member of props.members) {
    const actions = actionsFor(member)
    if (actions) map.set(member.id, actions)
  }
  return map
})

function onPick(member: PlayerRef, action: MemberPick) {
  if (action === 'kick') emit('kick', member)
  else if (action === 'wars') emit('wars', member)
  else if (action === 'transfer') emit('transfer', member)
  else if (action === 'claim') emit('claim')
  else emit('change-role', member, action)
}

function lastPlayed(member: PlayerRef): string {
  const at = member.membership?.lastPlayedAt
  return at ? formatRelativeDate(at, now.value) : 'never'
}

function asPlayer(row: Record<string, unknown>): PlayerRef {
  return row.player as PlayerRef
}
</script>

<template>
  <section class="roster">
    <DataTable
      :columns="COLUMNS"
      :rows="rows"
      :sort-state="sortState"
      :loading="loading"
      :loading-rows="memberCount"
      :row-height="rowHeight"
      :row-class="rowClass"
      row-key="id"
      empty-message="Nobody is in this clan yet"
      @sort="onSort"
    >
      <template #cell-member="{ row }">
        <span class="roster__who">
          <UserChip :user="asPlayer(row)" :size="row.tier ? 'lg' : 'md'" link tooltip hide-clan />
          <span v-if="row.role" class="caption">{{ row.role }}</span>
          <span v-if="asPlayer(row).membership?.online" class="caption roster__online">online</span>
          <span v-if="asPlayer(row).membership?.warParticipation === false" class="caption">off wars</span>
        </span>
      </template>
      <template #cell-xp="{ value }">{{ Math.round(value as number).toLocaleString() }}</template>
      <template #cell-strength="{ value }">{{ formatPercent((value as number) * 100, 2) }}%</template>
      <template #cell-skill="{ value }">{{ (value as number).toFixed(1) }}</template>
      <template #cell-played="{ row }">{{ lastPlayed(asPlayer(row)) }}</template>
      <template #cell-actions="{ row }">
        <ClanMemberMenu
          v-if="memberActions.has(asPlayer(row).id)"
          :member="asPlayer(row)"
          :actions="memberActions.get(asPlayer(row).id)!"
          @pick="onPick(asPlayer(row), $event)"
        />
      </template>
      <template #mobile-card="{ row }">
        <div class="member-card" :class="rowClass(row)">
          <div class="member-card__grid">
            <span class="roster__who">
              <UserChip :user="asPlayer(row)" :size="row.tier ? 'lg' : 'sm'" link hide-clan />
              <span v-if="asPlayer(row).membership?.online" class="caption roster__online">online</span>
            </span>
            <span class="member-card__xp">{{ Math.round(row.xp as number).toLocaleString() }} XP</span>
            <span class="caption member-card__stats">
              <template v-if="row.role">{{ row.role }} · </template>
              <template v-if="asPlayer(row).membership?.warParticipation === false">off wars · </template>
              {{ row.hits }} hits · {{ row.breaks }} breaks · {{ formatPercent((row.strength as number) * 100, 2) }}% ·
              {{ (row.skill as number).toFixed(1) }} skill · {{ asPlayer(row).membership?.lastPlayedAt ? `played ${lastPlayed(asPlayer(row))}` : 'never played' }}
            </span>
          </div>
          <ClanMemberMenu
            v-if="memberActions.has(asPlayer(row).id)"
            :member="asPlayer(row)"
            :actions="memberActions.get(asPlayer(row).id)!"
            @pick="onPick(asPlayer(row), $event)"
          />
        </div>
      </template>
    </DataTable>

    <p v-if="slotNote || (viewerRole && offWars)" class="caption roster__notes">
      <span v-if="slotNote">{{ slotNote }}</span>
      <span v-if="viewerRole && offWars">{{ offWars.off }} / {{ offWars.limit }} off wars</span>
    </p>
  </section>
</template>

<style scoped>
.roster {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.roster__who {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.roster__online {
  color: var(--success);
}

.roster__notes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-lg);
}

.roster :deep(.roster-row--self) {
  background: color-mix(in srgb, var(--clan-accent) 6%, var(--bg-surface));
}

.roster :deep(:is(.roster-row--founder, .roster-row--leader) .data-table__td) {
  font-size: var(--text-card-title);
}

.roster :deep(.roster-row--leader .user-chip__avatar) {
  width: 56px;
  height: 56px;
}

.roster :deep(.roster-row--founder .user-chip__avatar) {
  width: 80px;
  height: 80px;
}

.roster :deep(.roster-row--founder .user-chip) {
  font-size: var(--text-section-heading);
}

.member-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 64px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-card);
}

.member-card:is(.roster-row--founder, .roster-row--leader) {
  min-height: 112px;
}

.member-card__grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  min-width: 0;
}

.member-card__xp {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  white-space: nowrap;
}

.member-card__stats {
  grid-column: 1 / -1;
}

@media (max-width: 767px) {
  .roster :deep(.roster-row--founder .user-chip__avatar) {
    width: 56px;
    height: 56px;
  }

  .roster :deep(.roster-row--founder .user-chip) {
    font-size: var(--text-card-title);
  }
}
</style>
