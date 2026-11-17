<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import type { KofiEventResponse } from '@/types/api/supporters'
import { KOFI_EVENT_TYPE_DISPLAY } from '@/types/api/supporters'
import type { TableColumn } from '@/types/display'
import { formatCents, formatRelativeDate } from '@/utils/formatters'
import ResourcePicker from './ResourcePicker.vue'
import type { ResourceSource } from './resourceSources'
import { computed, ref } from 'vue'

const props = defineProps<{
  events: KofiEventResponse[]
  loading: boolean
  claiming: Record<string, boolean>
  userSource: ResourceSource
}>()

const emit = defineEmits<{
  claim: [kofiTransactionId: string, userId: string]
}>()

const COLUMNS: TableColumn[] = [
  { key: 'from', label: 'From', primary: true },
  { key: 'type', label: 'Type', width: '200px' },
  { key: 'amount', label: 'Amount', align: 'right', mono: true, width: '100px' },
  { key: 'tierName', label: 'Tier', width: '120px', format: (v) => (v as string | null) || '-' },
  { key: 'receivedAt', label: 'Received', width: '120px', format: (v) => formatRelativeDate(v as string) },
  { key: 'player', label: 'Player', width: '280px', noLink: true },
  { key: 'actions', label: '', align: 'right', width: '100px', noLink: true },
]

const picks = ref<Record<string, string | null>>({})

const rows = computed<Record<string, unknown>[]>(() =>
  props.events.map((event) => ({
    ...event,
    id: event.kofiTransactionId,
    amount: formatCents(event.amountCents, event.currency),
    type: `${KOFI_EVENT_TYPE_DISPLAY[event.type]}${event.firstSubscription ? ', new' : event.subscription ? ', renewal' : ''}`,
  })),
)

function setPick(id: string, value: string | string[] | null) {
  picks.value[id] = Array.isArray(value) ? (value[0] ?? null) : value
}

function claim(id: string) {
  const userId = picks.value[id]
  if (userId) emit('claim', id, userId)
}
</script>

<template>
  <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !events.length" :refreshing="loading && events.length > 0"
    :loading-rows="4" :row-height="56" row-key="id" empty-message="Every Ko-fi payment is claimed">
    <template #cell-from="{ row }">
      <span class="queue__from">
        <span class="queue__name">{{ row.fromName || '-' }}</span>
        <span v-if="row.email" class="caption">{{ row.email }}</span>
      </span>
    </template>
    <template #cell-player="{ row }">
      <ResourcePicker :model-value="picks[row.id as string] ?? null" :search="userSource.search" :resolve="userSource.resolve"
        :placeholder="userSource.placeholder" @update:model-value="setPick(row.id as string, $event)" />
    </template>
    <template #cell-actions="{ row }">
      <BaseButton size="sm" variant="primary" :loading="claiming[row.id as string]" :disabled="!picks[row.id as string]"
        @click="claim(row.id as string)">
        Claim
      </BaseButton>
    </template>
  </DataTable>
</template>

<style scoped>
.queue__from {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.queue__name {
  font-weight: 600;
  color: var(--text-primary);
}
</style>
