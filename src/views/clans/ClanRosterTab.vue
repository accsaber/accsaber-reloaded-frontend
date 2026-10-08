<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanRole } from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { SortState, TableColumn } from '@/types/display'
import { assignableRoles, CLAN_ROLE_ORDER, hasClanRole, outranks } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref } from 'vue'
import ClanLeaderTile from './ClanLeaderTile.vue'
import ClanMemberMenu, { type MemberActions } from './ClanMemberMenu.vue'

const props = defineProps<{
  members: PlayerRef[]
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
  { key: 'strength', label: 'Strength', align: 'right', mono: true, sortable: true, width: '120px' },
  { key: 'played', label: 'Last played', align: 'right', sortable: true, width: '144px' },
  { key: 'actions', label: '', align: 'right', noLink: true, width: '48px' },
]

const now = useSharedNow()
const sortState = ref<SortState>({ key: 'xp', direction: 'desc' })

function seasonXp(member: PlayerRef): number {
  return member.membership?.seasonPlayXp ?? 0
}

function roleIndex(member: PlayerRef): number {
  return CLAN_ROLE_ORDER.indexOf(member.membership?.role ?? 'member')
}

const leaders = computed(() =>
  props.members
    .filter((m) => m.membership && m.membership.role !== 'member')
    .sort((a, b) => roleIndex(a) - roleIndex(b) || seasonXp(b) - seasonXp(a)),
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
  return list.sort((a, b) => sign * ((a[key as keyof typeof a] as number) - (b[key as keyof typeof b] as number)))
})

function onSort(key: string) {
  const current = sortState.value
  sortState.value = { key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }
}

function actionsFor(member: PlayerRef): MemberActions | null {
  const role = member.membership?.role
  if (!props.viewerRole || !role || member.id === props.viewerId) return null
  const below = outranks(props.viewerRole, role)
  const actions: MemberActions = {
    roles: assignableRoles(props.viewerRole, role),
    kick: below && hasClanRole(props.viewerRole, 'officer'),
    transfer: below && hasClanRole(props.viewerRole, 'founder'),
    claim: role === 'founder' && props.viewerRole === 'commander',
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
        <SkeletonLoader variant="card" class="roster__skeleton-founder" />
        <SkeletonLoader v-for="i in 3" :key="i" variant="card" height="120px" class="roster__skeleton-wide" />
      </div>
      <SkeletonLoader v-for="i in 6" :key="`row-${i}`" variant="table-row" />
    </template>

    <EmptyState v-else-if="members.length === 0" message="Nobody is in this clan yet." />

    <template v-else>
      <div v-if="leaders.length" class="roster__mosaic">
        <ClanLeaderTile
          v-for="member in leaders"
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
      </div>

      <section v-if="rows.length" class="roster__members">
        <h2 class="roster__title">Members <span class="roster__count">{{ rows.length }}</span></h2>
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
          <template #cell-xp="{ value }">{{ Math.round(value as number).toLocaleString() }}</template>
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
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-flow: dense;
  gap: var(--space-md);
}

.roster__skeleton-founder {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 260px;
}

.roster__skeleton-wide {
  grid-column: span 2;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
