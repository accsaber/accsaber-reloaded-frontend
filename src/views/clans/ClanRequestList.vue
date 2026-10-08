<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanJoinRequestResponse, ClanJoinStatus } from '@/types/api/clans'
import { formatRelativeDate } from '@/utils/formatters'

defineProps<{
  requests: ClanJoinRequestResponse[]
  perspective: 'player' | 'clan'
  busyId: string | null
}>()

const emit = defineEmits<{
  resolve: [request: ClanJoinRequestResponse, status: ClanJoinStatus]
}>()
</script>

<template>
  <ul class="request-list">
    <li v-for="request in requests" :key="request.id" class="request-list__row">
      <span class="request-list__kind">
        {{ request.direction === 'invite' ? 'Invite' : 'Request' }}
      </span>

      <span v-if="perspective === 'player'" class="request-list__subject">
        <ClanIcon :clan="request.clan" :size="32" />
        <ClanTag :clan="request.clan" size="md" effects />
        <RouterLink
          class="request-list__clan"
          :to="{ name: 'clan-detail', params: { slugOrId: request.clan.slug } }"
        >{{ request.clan.name }}</RouterLink>
      </span>
      <UserChip v-else :user="request.player" link tooltip class="request-list__subject" />

      <span class="request-list__when">{{ formatRelativeDate(request.createdAt) }}</span>

      <span class="request-list__actions">
        <template v-if="(perspective === 'player') === (request.direction === 'invite')">
          <BaseButton
            variant="primary"
            size="sm"
            :loading="busyId === request.id"
            @click="emit('resolve', request, 'accepted')"
          >
            Accept
          </BaseButton>
          <BaseButton size="sm" :disabled="busyId === request.id" @click="emit('resolve', request, 'declined')">
            Decline
          </BaseButton>
        </template>
        <BaseButton v-else size="sm" :loading="busyId === request.id" @click="emit('resolve', request, 'cancelled')">
          Cancel
        </BaseButton>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.request-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.request-list__row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.request-list__row:last-child {
  border-bottom: none;
}

.request-list__row:nth-child(even) {
  background: var(--bg-elevated);
}

.request-list__kind {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.request-list__subject {
  font-size: var(--text-card-title);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.request-list__clan {
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.request-list__clan:hover {
  color: var(--page-accent, var(--accent));
}

.request-list__when {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.request-list__actions {
  display: flex;
  gap: var(--space-xs);
}

@media (max-width: 767px) {
  .request-list__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .request-list__kind,
  .request-list__when {
    display: none;
  }
}
</style>
