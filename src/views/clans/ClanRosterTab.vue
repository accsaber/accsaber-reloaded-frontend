<script setup lang="ts">
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanMemberResponse, ClanRole } from '@/types/api/clans'
import { assignableRoles, CLAN_ROLE_LABEL, CLAN_ROLE_ORDER, CLAN_ROLE_PLURAL, hasClanRole, outranks } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref } from 'vue'

const props = defineProps<{
  members: ClanMemberResponse[]
  loading: boolean
  viewerRole: ClanRole | null
  viewerId: string | null
}>()

const emit = defineEmits<{
  'change-role': [member: ClanMemberResponse, role: ClanRole]
  kick: [member: ClanMemberResponse]
  transfer: [member: ClanMemberResponse]
  claim: []
}>()

const now = useSharedNow()
const openMenuFor = ref<string | null>(null)

interface RoleGroup {
  role: ClanRole
  label: string
  members: ClanMemberResponse[]
}

const groups = computed<RoleGroup[]>(() =>
  CLAN_ROLE_ORDER.map((role) => ({
    role,
    label: CLAN_ROLE_PLURAL[role],
    members: props.members.filter((m) => m.role === role),
  })).filter((g) => g.members.length > 0),
)

interface RowActions {
  roles: ClanRole[]
  kick: boolean
  transfer: boolean
  claim: boolean
}

function actionsFor(member: ClanMemberResponse): RowActions | null {
  if (!props.viewerRole || member.player.id === props.viewerId) return null
  const below = outranks(props.viewerRole, member.role)
  const actions: RowActions = {
    roles: assignableRoles(props.viewerRole, member.role),
    kick: below && hasClanRole(props.viewerRole, 'officer'),
    transfer: below && hasClanRole(props.viewerRole, 'founder'),
    claim: member.role === 'founder' && props.viewerRole === 'commander',
  }
  return actions.roles.length || actions.kick || actions.transfer || actions.claim ? actions : null
}

function lastPlayed(member: ClanMemberResponse): string {
  return member.lastPlayedAt ? `played ${formatRelativeDate(member.lastPlayedAt, now.value)}` : 'no plays yet'
}

function run(action: () => void) {
  openMenuFor.value = null
  action()
}
</script>

<template>
  <section class="roster">
    <div v-if="loading" class="roster__skeleton">
      <SkeletonLoader v-for="i in 8" :key="i" variant="table-row" />
    </div>

    <EmptyState v-else-if="groups.length === 0" message="Nobody is in this clan yet." />

    <template v-else>
      <div v-for="group in groups" :key="group.role" class="roster__group">
        <h2 class="roster__heading">
          {{ group.label }}
          <span v-if="group.role !== 'founder'" class="roster__count">{{ group.members.length }}</span>
        </h2>
        <ul class="roster__list">
          <li v-for="member in group.members" :key="member.player.id" class="roster__row">
            <span
              class="roster__presence"
              :class="{ 'roster__presence--online': member.online }"
              :title="member.online ? 'Online' : 'Offline'"
              role="img"
              :aria-label="member.online ? 'Online' : 'Offline'"
            />
            <UserChip :user="member.player" link tooltip class="roster__player" />
            <span class="roster__played">{{ lastPlayed(member) }}</span>
            <BaseDropdown
              v-if="actionsFor(member)"
              :open="openMenuFor === member.player.id"
              position="bottom-right"
              @update:open="openMenuFor = $event ? member.player.id : null"
            >
              <template #trigger>
                <button
                  type="button"
                  class="roster__menu-btn"
                  :aria-label="`Manage ${member.player.name}`"
                  :aria-expanded="openMenuFor === member.player.id"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </template>
              <div class="roster__menu" role="menu">
                <button
                  v-for="role in actionsFor(member)!.roles"
                  :key="role"
                  type="button"
                  class="roster__item"
                  role="menuitem"
                  @click="run(() => emit('change-role', member, role))"
                >
                  Make {{ CLAN_ROLE_LABEL[role].toLowerCase() }}
                </button>
                <button
                  v-if="actionsFor(member)!.transfer"
                  type="button"
                  class="roster__item"
                  role="menuitem"
                  @click="run(() => emit('transfer', member))"
                >
                  Transfer founder
                </button>
                <button
                  v-if="actionsFor(member)!.claim"
                  type="button"
                  class="roster__item"
                  role="menuitem"
                  @click="run(() => emit('claim'))"
                >
                  Claim clan
                </button>
                <button
                  v-if="actionsFor(member)!.kick"
                  type="button"
                  class="roster__item roster__item--danger"
                  role="menuitem"
                  @click="run(() => emit('kick', member))"
                >
                  Kick
                </button>
              </div>
            </BaseDropdown>
            <span v-else class="roster__menu-spacer" aria-hidden="true" />
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.roster {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.roster__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.roster__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.roster__heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0;
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--bg-overlay);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.roster__count {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-tertiary);
}

.roster__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.roster__row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto 32px;
  align-items: center;
  gap: var(--space-md);
  min-height: 48px;
  padding: 0 var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.roster__row:nth-child(even) {
  background: var(--bg-elevated);
}

.roster__presence {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.roster__presence--online {
  background: var(--success);
}

.roster__played {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.roster__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.roster__menu-btn:hover,
.roster__menu-btn[aria-expanded='true'] {
  color: var(--text-primary);
  border-color: var(--bg-overlay);
  background: var(--bg-surface);
}

.roster__menu-spacer {
  width: 32px;
}

.roster__menu {
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: var(--space-xs);
}

.roster__item {
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  text-align: left;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.roster__item:hover {
  background: var(--bg-overlay);
}

.roster__item--danger {
  color: var(--error);
}

.roster__item--danger:hover {
  background: color-mix(in srgb, var(--error) 12%, transparent);
}

@media (max-width: 767px) {
  .roster__row {
    grid-template-columns: 12px minmax(0, 1fr) 32px;
    padding: var(--space-xs) var(--space-sm);
  }

  .roster__played {
    grid-column: 2;
    grid-row: 2;
  }
}
</style>
