<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanJoinRequestResponse, ClanJoinStatus } from '@/types/api/clans'
import { formatRelativeDate } from '@/utils/formatters'
import './actionList.css'

defineProps<{
  requests: ClanJoinRequestResponse[]
  perspective: 'player' | 'clan'
  busyId: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  resolve: [request: ClanJoinRequestResponse, status: ClanJoinStatus]
}>()
</script>

<template>
  <SwapList as="ul" class="action-list" :items="requests" :item-key="(request) => request.id" :loading="loading">
    <template #placeholder>
      <li class="placeholder"><SkeletonLoader height="56px" /></li>
    </template>
    <template #default="{ item: request, swap }">
      <li v-bind="swap" class="action-list__row">
        <span class="field-label">
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

        <span class="caption action-list__when">{{ formatRelativeDate(request.createdAt) }}</span>

        <span class="action-list__actions">
          <template v-if="(perspective === 'player') === (request.direction === 'invite')">
            <BaseButton
              variant="primary"
              :loading="busyId === request.id"
              @click="emit('resolve', request, 'accepted')"
            >
              Accept
            </BaseButton>
            <BaseButton :disabled="busyId === request.id" @click="emit('resolve', request, 'declined')">
              Decline
            </BaseButton>
          </template>
          <BaseButton v-else :loading="busyId === request.id" @click="emit('resolve', request, 'cancelled')">
            Cancel
          </BaseButton>
        </span>
      </li>
    </template>
  </SwapList>
</template>

<style scoped>
.request-list__subject {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  font-size: var(--text-card-title);
}

.request-list__clan {
  overflow: hidden;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.request-list__clan:hover {
  color: var(--page-accent, var(--accent));
}
</style>
