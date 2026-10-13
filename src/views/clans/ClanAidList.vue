<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarAidDirection, ClanWarAidResponse, ClanWarAidStatus, ClanWarTeam } from '@/types/api/clans'
import { CLAN_ARENA_LABEL, CLAN_WAR_TEAM_LABEL, warRulesetLabel } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'

const DIRECTION_LABEL: Record<ClanWarAidDirection, string> = {
  request: 'Asked',
  offer: 'Offered',
}

const props = defineProps<{
  aids: ClanWarAidResponse[]
  busyId: string | null
  ownClanId: string | null
  canAct: boolean
  showWar?: boolean
  fallenTeams?: ClanWarTeam[]
}>()

const emit = defineEmits<{
  resolve: [aid: ClanWarAidResponse, status: ClanWarAidStatus]
}>()

function answerer(aid: ClanWarAidResponse): string {
  return aid.direction === 'request' ? aid.clan.id : aid.lead.id
}

function canAnswer(aid: ClanWarAidResponse): boolean {
  return props.canAct && props.ownClanId === answerer(aid)
}

function canCancel(aid: ClanWarAidResponse): boolean {
  return props.canAct && !!props.ownClanId && props.ownClanId !== answerer(aid)
}
</script>

<template>
  <ul class="aid-list">
    <li v-for="aid in aids" :key="aid.id" class="aid-list__row">
      <span class="aid-list__direction">{{ DIRECTION_LABEL[aid.direction] }}</span>

      <span class="aid-list__subject">
        <span class="aid-list__route">
          <ClanTag :clan="aid.clan" size="xs" />
          <span class="aid-list__arrow" aria-hidden="true">→</span>
          <ClanTag :clan="aid.lead" size="xs" />
          <span class="aid-list__team">{{ CLAN_WAR_TEAM_LABEL[aid.team] }}</span>
        </span>
        <RouterLink v-if="showWar" class="aid-list__war" :to="{ name: 'clan-war', params: { warId: aid.war.id } }">
          {{ CLAN_ARENA_LABEL[aid.war.arena] }} · {{ warRulesetLabel(aid.war) }}
        </RouterLink>
      </span>

      <span class="aid-list__when">{{ formatRelativeDate(aid.createdAt) }}</span>

      <span class="aid-list__actions">
        <template v-if="canAnswer(aid)">
          <span v-if="fallenTeams?.includes(aid.team)" class="aid-list__blocked">Lead has fallen</span>
          <BaseButton
            variant="primary"
            size="sm"
            :loading="busyId === aid.id"
            :disabled="fallenTeams?.includes(aid.team)"
            @click="emit('resolve', aid, 'accepted')"
          >
            Accept
          </BaseButton>
          <BaseButton size="sm" :disabled="busyId === aid.id" @click="emit('resolve', aid, 'declined')">Decline</BaseButton>
        </template>
        <BaseButton
          v-else-if="canCancel(aid)"
          size="sm"
          :loading="busyId === aid.id"
          @click="emit('resolve', aid, 'cancelled')"
        >
          Cancel
        </BaseButton>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.aid-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.aid-list__row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.aid-list__row:last-child {
  border-bottom: none;
}

.aid-list__row:nth-child(even) {
  background: var(--bg-elevated);
}

.aid-list__direction {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--warning);
}

.aid-list__subject {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.aid-list__route {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-body);
}

.aid-list__arrow,
.aid-list__team {
  color: var(--text-tertiary);
}

.aid-list__team {
  font-size: var(--text-caption);
}

.aid-list__war {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-decoration: none;
}

.aid-list__war:hover {
  color: var(--page-accent, var(--accent));
}

.aid-list__when {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.aid-list__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.aid-list__blocked {
  font-size: var(--text-caption);
  color: var(--warning);
}

@media (max-width: 640px) {
  .aid-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .aid-list__direction {
    grid-column: 1 / -1;
  }
}
</style>
