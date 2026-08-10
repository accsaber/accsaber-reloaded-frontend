<script setup lang="ts">
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ResourcePicker from '@/components/domain/ResourcePicker.vue'
import SupporterTierIcon from '@/components/domain/SupporterTierIcon.vue'
import type { KofiEventResponse, SupporterStateResponse } from '@/types/api/supporters'
import { KOFI_CLAIM_SOURCE_DISPLAY, KOFI_EVENT_TYPE_DISPLAY } from '@/types/api/supporters'
import { formatCents, formatRelativeDate } from '@/utils/formatters'
import { computed, ref } from 'vue'
import type { ResourceSource } from './resourceSources'

const props = defineProps<{
  account: SupporterStateResponse | null
  events: KofiEventResponse[]
  loading: boolean
  claiming: Record<string, boolean>
  eventSource: ResourceSource
}>()

const emit = defineEmits<{
  claim: [kofiTransactionId: string]
}>()

const pickedEvent = ref<string | null>(null)

const tierLabel = computed(() => props.account?.currentTierDisplayName ?? 'No active tier')

const stats = computed(() => {
  const state = props.account
  if (!state) return []
  return [
    { label: 'Balance', value: formatCents(state.balanceCents) },
    { label: 'Lifetime', value: formatCents(state.lifetimeSupportedCents) },
    { label: 'Tier started', value: state.tierStartedAt ? formatRelativeDate(state.tierStartedAt) : '-' },
    { label: 'Last debit', value: state.lastDebitAt ? formatRelativeDate(state.lastDebitAt) : '-' },
  ]
})

function claimPicked() {
  if (pickedEvent.value) emit('claim', pickedEvent.value)
}
</script>

<template>
  <div class="panel">
    <SkeletonLoader v-if="loading && !account" variant="text" />
    <div v-else-if="account" class="panel__summary">
      <span class="panel__tier">
        <SupporterTierIcon :tier="account.currentTier" :size="16" />
        {{ tierLabel }}
      </span>
      <span v-for="stat in stats" :key="stat.label" class="panel__stat">
        <span class="panel__stat-label">{{ stat.label }}</span>
        <span class="panel__stat-value">{{ stat.value }}</span>
      </span>
    </div>

    <div class="panel__claim">
      <ResourcePicker v-model="pickedEvent" :search="eventSource.search" :resolve="eventSource.resolve"
        :placeholder="eventSource.placeholder" />
      <BaseButton size="sm" :loading="!!pickedEvent && claiming[pickedEvent]" :disabled="!pickedEvent"
        @click="claimPicked">
        Claim for this player
      </BaseButton>
    </div>

    <AdminTable :items="events" :loading="loading" :loading-rows="4"
      empty-message="No Ko-fi events on this account.">
      <template #head>
        <th style="width: 140px">Type</th>
        <th class="right" style="width: 90px">Amount</th>
        <th style="width: 110px">Tier</th>
        <th class="mono" style="width: 110px">Received</th>
        <th class="mono" style="width: 110px">Claimed</th>
        <th style="width: 130px">Source</th>
      </template>
      <template #default="{ item }">
        <td class="muted">{{ KOFI_EVENT_TYPE_DISPLAY[item.type] }}</td>
        <td class="mono right">{{ formatCents(item.amountCents, item.currency) }}</td>
        <td class="muted">{{ item.tierName || '-' }}</td>
        <td class="mono muted">{{ formatRelativeDate(item.receivedAt) }}</td>
        <td class="mono muted">{{ item.claimedAt ? formatRelativeDate(item.claimedAt) : '-' }}</td>
        <td class="muted">{{ item.claimSource ? KOFI_CLAIM_SOURCE_DISPLAY[item.claimSource] : '-' }}</td>
      </template>
    </AdminTable>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.panel__summary {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.panel__tier {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.panel__stat {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-size: var(--text-caption);
}

.panel__stat-label {
  color: var(--text-secondary);
}

.panel__stat-value {
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.panel__claim {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.panel__claim > :first-child {
  max-width: 340px;
}
</style>
