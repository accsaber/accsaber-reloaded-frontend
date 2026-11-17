<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import ResourcePicker from '@/views/staff/admin/operations/ResourcePicker.vue'
import SupporterTierIcon from '@/components/domain/SupporterTierIcon.vue'
import type { KofiEventResponse, SupporterStateResponse } from '@/types/api/supporters'
import { KOFI_CLAIM_SOURCE_DISPLAY, KOFI_EVENT_TYPE_DISPLAY } from '@/types/api/supporters'
import type { TableColumn } from '@/types/display'
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

const COLUMNS: TableColumn[] = [
  { key: 'type', label: 'Type', primary: true },
  { key: 'amount', label: 'Amount', align: 'right', mono: true, width: '110px' },
  { key: 'tierName', label: 'Tier', width: '130px', format: (v) => (v as string | null) || '-' },
  { key: 'receivedAt', label: 'Received', width: '130px', format: (v) => formatRelativeDate(v as string) },
  { key: 'claimedAt', label: 'Claimed', width: '130px', format: (v) => (v ? formatRelativeDate(v as string) : '-') },
  { key: 'source', label: 'Source', width: '150px' },
]

const pickedEvent = ref<string | null>(null)

const rows = computed<Record<string, unknown>[]>(() =>
  props.events.map((event) => ({
    ...event,
    type: KOFI_EVENT_TYPE_DISPLAY[event.type],
    amount: formatCents(event.amountCents, event.currency),
    source: event.claimSource ? KOFI_CLAIM_SOURCE_DISPLAY[event.claimSource] : '-',
  })),
)

const tierLabel = computed(() => props.account?.currentTierDisplayName ?? 'No active tier')

const stats = computed(() => {
  const state = props.account
  if (!state) return []
  return [
    { label: 'Balance', value: formatCents(state.balanceCents) },
    { label: 'Lifetime', value: formatCents(state.lifetimeSupportedCents) },
    { label: 'Tier Started', value: state.tierStartedAt ? formatRelativeDate(state.tierStartedAt) : '-' },
    { label: 'Last Debit', value: state.lastDebitAt ? formatRelativeDate(state.lastDebitAt) : '-' },
  ]
})

function claimPicked() {
  if (pickedEvent.value) emit('claim', pickedEvent.value)
}
</script>

<template>
  <div class="panel">
    <div class="panel__summary">
      <span class="panel__fact">
        <span class="field-label">Tier</span>
        <span class="panel__value">
          <SupporterTierIcon v-if="account" :tier="account.currentTier" :size="16" />
          {{ account ? tierLabel : '-' }}
        </span>
      </span>
      <span v-for="stat in stats" :key="stat.label" class="panel__fact">
        <span class="field-label">{{ stat.label }}</span>
        <span class="panel__value">{{ stat.value }}</span>
      </span>
    </div>

    <div class="panel__claim">
      <ResourcePicker v-model="pickedEvent" :search="eventSource.search" :resolve="eventSource.resolve"
        :placeholder="eventSource.placeholder" />
      <BaseButton :loading="!!pickedEvent && claiming[pickedEvent]" :disabled="!pickedEvent" @click="claimPicked">
        Claim for This Player
      </BaseButton>
    </div>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !events.length" :refreshing="loading && events.length > 0"
      :loading-rows="4" row-key="kofiTransactionId" empty-message="No Ko-fi payments on this account" />
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.panel__summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md) var(--space-2xl);
}

.panel__fact {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.panel__value {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-weight: 600;
  color: var(--text-primary);
}

.panel__claim {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
