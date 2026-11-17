<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarAidDirection, ClanWarAidResponse, ClanWarAidStatus, ClanWarTeam } from '@/types/api/clans'
import { CLAN_ARENA_LABEL, CLAN_WAR_TEAM_LABEL, warRulesetLabel } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import './actionList.css'

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
  loading?: boolean
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
  <SwapList as="ul" class="action-list" :items="aids" :item-key="(aid) => aid.id" :loading="loading" :placeholders="2">
    <template #placeholder>
      <li class="placeholder"><SkeletonLoader height="56px" /></li>
    </template>
    <template #default="{ item: aid, swap }">
      <li v-bind="swap" class="action-list__row">
        <span class="field-label">{{ DIRECTION_LABEL[aid.direction] }}</span>

        <span class="aid-list__subject">
          <span class="aid-list__route">
            <ClanTag :clan="aid.clan" size="xs" />
            <span class="aid-list__arrow" aria-hidden="true">→</span>
            <ClanTag :clan="aid.lead" size="xs" />
            <span class="caption">{{ CLAN_WAR_TEAM_LABEL[aid.team] }}</span>
          </span>
          <RouterLink v-if="showWar" class="caption aid-list__war" :to="{ name: 'clan-war', params: { warId: aid.war.id } }">
            {{ CLAN_ARENA_LABEL[aid.war.arena] }} · {{ warRulesetLabel(aid.war) }}
          </RouterLink>
        </span>

        <span class="caption action-list__when">{{ formatRelativeDate(aid.createdAt) }}</span>

        <span class="action-list__actions">
          <template v-if="canAnswer(aid)">
            <span v-if="fallenTeams?.includes(aid.team)" class="caption aid-list__blocked">Lead has fallen</span>
            <BaseButton
              variant="primary"
              :loading="busyId === aid.id"
              :disabled="fallenTeams?.includes(aid.team)"
              @click="emit('resolve', aid, 'accepted')"
            >
              Accept
            </BaseButton>
            <BaseButton :disabled="busyId === aid.id" @click="emit('resolve', aid, 'declined')">Decline</BaseButton>
          </template>
          <BaseButton
            v-else-if="canCancel(aid)"
            :loading="busyId === aid.id"
            @click="emit('resolve', aid, 'cancelled')"
          >
            Cancel
          </BaseButton>
        </span>
      </li>
    </template>
  </SwapList>
</template>

<style scoped>
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

.aid-list__arrow {
  color: var(--text-tertiary);
}

.aid-list__war {
  text-decoration: none;
}

.aid-list__war:hover {
  color: var(--page-accent, var(--accent));
}

.aid-list__blocked {
  color: var(--warning);
}
</style>
