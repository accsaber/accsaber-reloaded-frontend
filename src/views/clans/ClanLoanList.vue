<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarLoanResponse, ClanWarLoanStatus } from '@/types/api/clans'
import { CLAN_ARENA_LABEL, CLAN_LOAN_STATUS_LABEL, CLAN_RULESET_LABEL } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'

defineProps<{
  loans: ClanWarLoanResponse[]
  busyId: string | null
  viewerId: string | null
  canCancel: (loan: ClanWarLoanResponse) => boolean
  showWar?: boolean
}>()

const emit = defineEmits<{
  resolve: [loan: ClanWarLoanResponse, status: ClanWarLoanStatus]
}>()
</script>

<template>
  <ul class="loan-list">
    <li v-for="loan in loans" :key="loan.id" class="loan-list__row">
      <span class="loan-list__status" :class="`loan-list__status--${loan.status}`">
        {{ CLAN_LOAN_STATUS_LABEL[loan.status] }}
      </span>

      <span class="loan-list__subject">
        <UserChip :user="loan.player" size="sm" link tooltip />
        <span class="loan-list__route">
          <ClanTag :clan="loan.lendingClan" size="xs" />
          <span class="loan-list__arrow" aria-hidden="true">→</span>
          <ClanTag :clan="loan.clan" size="xs" />
        </span>
        <RouterLink v-if="showWar" class="loan-list__war" :to="{ name: 'clan-war', params: { warId: loan.war.id } }">
          {{ CLAN_ARENA_LABEL[loan.war.arena] }} · {{ CLAN_RULESET_LABEL[loan.war.ruleset] }}
        </RouterLink>
      </span>

      <span class="loan-list__when">{{ formatRelativeDate(loan.createdAt) }}</span>

      <span class="loan-list__actions">
        <template v-if="loan.status === 'pending' && viewerId === loan.player.id">
          <BaseButton variant="primary" size="sm" :loading="busyId === loan.id" @click="emit('resolve', loan, 'accepted')">
            Accept
          </BaseButton>
          <BaseButton size="sm" :disabled="busyId === loan.id" @click="emit('resolve', loan, 'declined')">Decline</BaseButton>
        </template>
        <BaseButton
          v-else-if="loan.status === 'pending' && canCancel(loan)"
          size="sm"
          :loading="busyId === loan.id"
          @click="emit('resolve', loan, 'cancelled')"
        >
          Cancel
        </BaseButton>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.loan-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.loan-list__row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.loan-list__row:last-child {
  border-bottom: none;
}

.loan-list__row:nth-child(even) {
  background: var(--bg-elevated);
}

.loan-list__status {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.loan-list__status--pending {
  color: var(--warning);
}

.loan-list__status--accepted {
  color: var(--success);
}

.loan-list__subject {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.loan-list__route {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-body);
}

.loan-list__arrow {
  color: var(--text-tertiary);
}

.loan-list__war {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-decoration: none;
}

.loan-list__war:hover {
  color: var(--page-accent, var(--accent));
}

.loan-list__when {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.loan-list__actions {
  display: flex;
  gap: var(--space-xs);
}

@media (max-width: 640px) {
  .loan-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .loan-list__status {
    grid-column: 1 / -1;
  }
}
</style>
