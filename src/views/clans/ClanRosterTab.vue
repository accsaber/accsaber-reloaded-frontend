<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanRole } from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { SortState, TableColumn } from '@/types/display'
import {
  assignableRoles,
  CLAN_ROLE_ORDER,
  hasClanRole,
  outranks,
  type LockedRankSlot,
} from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref } from 'vue'
import ClanLeaderTile from './ClanLeaderTile.vue'
import ClanLockedSlot from './ClanLockedSlot.vue'
import ClanMemberMenu, { type MemberActions } from './ClanMemberMenu.vue'

const props = defineProps<{
  members: PlayerRef[]
  lockedSlots: LockedRankSlot[]
  loading: boolean
  viewerRole: ClanRole | null
  viewerId: string | null
}>()

const emit = defineEmits<{
  'change-role': [member: PlayerRef, role: ClanRole]
  kick: [member: PlayerRef]
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
  { key: 'played', label: 'Last played', align: 'right', sortable: true, width: '144px' },
  { key: 'actions', label: '', align: 'right', noLink: true, width: '48px' },
]

const FOUNDER_INACTIVITY_MS = 365 * 24 * 60 * 60 * 1000

const now = useSharedNow()

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
const sortState = ref<SortState>({ key: 'xp', direction: 'desc' })

function seasonXp(member: PlayerRef): number {
  return member.membership?.seasonPlayXp ?? 0
}

const leaderGroups = computed(() =>
  CLAN_ROLE_ORDER.filter((role) => role !== 'member')
    .map((role) => ({
      role,
      members: props.members
        .filter((m) => m.membership?.role === role)
        .sort((a, b) => seasonXp(b) - seasonXp(a)),
      locked: props.lockedSlots.filter((s) => s.role === role),
    }))
    .filter((g) => g.members.length || g.locked.length),
)

const leaderColumns = computed(() =>
  [
    leaderGroups.value.filter((g) => g.role === 'founder'),
    leaderGroups.value.filter((g) => g.role !== 'founder'),
  ].filter((column) => column.length),
)

const rows = computed(() => {
  const list = props.members
    .filter((m) => !m.membership || m.membership.role === 'member')
    .map((member) => {
      const m = member.membership
      return {
        id: member.id,
        player: member,
        xp: m?.seasonPlayXp ?? 0,
        hits: m?.seasonHits ?? 0,
        breaks: m?.seasonBreaks ?? 0,
        strength: m?.strengthShare ?? 0,
        played: m?.lastPlayedAt ? new Date(m.lastPlayedAt).getTime() : 0,
      }
    })
  const { key, direction } = sortState.value
  const sign = direction === 'asc' ? 1 : -1
  return list.sort(
    (a, b) => sign * ((a[key as keyof typeof a] as number) - (b[key as keyof typeof b] as number)),
  )
})

function onSort(key: string) {
  const current = sortState.value
  sortState.value = {
    key,
    direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
  }
}

function actionsFor(member: PlayerRef): MemberActions | null {
  const role = member.membership?.role
  if (!props.viewerRole || !role || member.id === props.viewerId) return null
  const below = outranks(props.viewerRole, role)
  const actions: MemberActions = {
    roles: assignableRoles(props.viewerRole, role),
    kick: below && hasClanRole(props.viewerRole, 'officer'),
    transfer: below && hasClanRole(props.viewerRole, 'founder'),
    claim: role === 'founder' && canClaim.value,
  }
  return actions.roles.length || actions.kick || actions.transfer || actions.claim ? actions : null
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
    <template v-if="loading">
      <div class="roster__mosaic">
        <SkeletonLoader variant="card" class="roster__column" />
        <div class="roster__column">
          <SkeletonLoader v-for="i in 3" :key="i" variant="card" height="120px" />
        </div>
      </div>
      <SkeletonLoader v-for="i in 6" :key="`row-${i}`" variant="table-row" />
    </template>

    <EmptyState v-else-if="members.length === 0" message="Nobody is in this clan yet." />

    <template v-else>
      <div v-if="leaderGroups.length" class="roster__mosaic">
        <div v-for="(column, c) in leaderColumns" :key="c" class="roster__column">
          <template v-for="group in column" :key="group.role">
            <ClanLeaderTile
              v-for="member in group.members"
              :key="member.id"
              :member="member"
              :last-played="lastPlayed(member)"
              :self="member.id === viewerId"
            >
              <ClanMemberMenu
                v-if="actionsFor(member)"
                :member="member"
                :actions="actionsFor(member)!"
                @change-role="emit('change-role', member, $event)"
                @kick="emit('kick', member)"
                @transfer="emit('transfer', member)"
                @claim="emit('claim')"
              />
            </ClanLeaderTile>
            <ClanLockedSlot
              v-for="(slot, i) in group.locked"
              :key="`${group.role}-${i}`"
              :role="slot.role"
              :level="slot.level"
            />
          </template>
        </div>
      </div>

      <section v-if="rows.length" class="roster__members">
        <h2 class="roster__title">
          Members <span class="roster__count">{{ rows.length }}</span>
        </h2>
        <DataTable
          :columns="COLUMNS"
          :rows="rows"
          :sort-state="sortState"
          row-key="id"
          :row-class="(row) => ({ 'roster__row--self': row.id === viewerId })"
          @sort="onSort"
        >
          <template #cell-member="{ row }">
            <span class="roster__who">
              <UserChip :user="asPlayer(row)" link tooltip hide-clan />
              <span v-if="asPlayer(row).membership?.online" class="roster__online">online</span>
            </span>
          </template>
          <template #cell-xp="{ value }">{{
            Math.round(value as number).toLocaleString()
          }}</template>
          <template #cell-strength="{ value }">{{ Math.round((value as number) * 100) }}%</template>
          <template #cell-played="{ row }">{{ lastPlayed(asPlayer(row)) }}</template>
          <template #cell-actions="{ row }">
            <ClanMemberMenu
              v-if="actionsFor(asPlayer(row))"
              :member="asPlayer(row)"
              :actions="actionsFor(asPlayer(row))!"
              @change-role="emit('change-role', asPlayer(row), $event)"
              @kick="emit('kick', asPlayer(row))"
              @transfer="emit('transfer', asPlayer(row))"
              @claim="emit('claim')"
            />
          </template>
          <template #mobile-card="{ row }">
            <div class="member-card" :class="{ 'member-card--self': row.id === viewerId }">
              <div class="member-card__grid">
                <span class="roster__who">
                  <UserChip :user="asPlayer(row)" size="sm" link hide-clan />
                  <span v-if="asPlayer(row).membership?.online" class="roster__online">online</span>
                </span>
                <span class="member-card__xp">{{ Math.round(row.xp as number).toLocaleString() }} XP</span>
                <span class="member-card__played">{{ lastPlayed(asPlayer(row)) }}</span>
                <span class="member-card__stats">
                  {{ row.hits }} hits · {{ row.breaks }} breaks · {{ Math.round((row.strength as number) * 100) }}%
                </span>
              </div>
              <ClanMemberMenu
                v-if="actionsFor(asPlayer(row))"
                :member="asPlayer(row)"
                :actions="actionsFor(asPlayer(row))!"
                @change-role="emit('change-role', asPlayer(row), $event)"
                @kick="emit('kick', asPlayer(row))"
                @transfer="emit('transfer', asPlayer(row))"
                @claim="emit('claim')"
              />
            </div>
          </template>
        </DataTable>
      </section>
    </template>
  </section>
</template>

<style scoped>
.roster {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.roster__mosaic {
  display: flex;
  gap: var(--space-md);
}

.roster__column {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  min-height: 260px;
}

.roster__column > :only-child {
  flex: 1;
}

.roster__members {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.roster__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.roster__count {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-tertiary);
}

.roster__who {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.roster__online {
  font-size: var(--text-caption);
  color: var(--success);
}

:deep(.roster__row--self) {
  background: color-mix(in srgb, var(--clan-accent) 6%, transparent);
}

@media (max-width: 767px) {
  .roster__mosaic {
    flex-direction: column;
  }

  .roster__column {
    flex: none;
    min-height: 0;
  }
}

.member-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 48px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.member-card--self {
  background: color-mix(in srgb, var(--clan-accent) 6%, var(--bg-surface));
}

.member-card__grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px var(--space-sm);
  min-width: 0;
}

.member-card__xp {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  white-space: nowrap;
}

.member-card__played,
.member-card__stats {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  white-space: nowrap;
}

.member-card__stats {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  justify-self: end;
}
</style>
