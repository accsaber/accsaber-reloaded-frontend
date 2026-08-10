<script setup lang="ts">
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ResourcePicker from '@/components/domain/ResourcePicker.vue'
import type { KofiEventResponse } from '@/types/api/supporters'
import { KOFI_EVENT_TYPE_DISPLAY } from '@/types/api/supporters'
import { formatCents, formatRelativeDate } from '@/utils/formatters'
import { ref } from 'vue'
import type { ResourceSource } from './resourceSources'

defineProps<{
  events: KofiEventResponse[]
  loading: boolean
  claiming: Record<string, boolean>
  userSource: ResourceSource
}>()

const emit = defineEmits<{
  claim: [kofiTransactionId: string, userId: string]
}>()

const picks = ref<Record<string, string | null>>({})

function setPick(kofiTransactionId: string, value: string | string[] | null) {
  picks.value[kofiTransactionId] = Array.isArray(value) ? (value[0] ?? null) : value
}

function claim(kofiTransactionId: string) {
  const userId = picks.value[kofiTransactionId]
  if (!userId) return
  emit('claim', kofiTransactionId, userId)
}
</script>

<template>
  <AdminTable :items="events" :loading="loading" :loading-rows="4"
    empty-message="Every Ko-fi event has been claimed.">
    <template #head>
      <th>From</th>
      <th>Email</th>
      <th style="width: 190px">Type</th>
      <th class="right" style="width: 90px">Amount</th>
      <th style="width: 110px">Tier</th>
      <th class="mono" style="width: 110px">Received</th>
      <th style="width: 260px">Player</th>
      <th class="right" style="width: 100px" />
    </template>
    <template #default="{ item }">
      <td>{{ item.fromName || '-' }}</td>
      <td class="muted">{{ item.email || '-' }}</td>
      <td class="muted">
        {{ KOFI_EVENT_TYPE_DISPLAY[item.type] }}
        <span v-if="item.firstSubscription" class="queue__flag queue__flag--first">new sub</span>
        <span v-else-if="item.subscription" class="queue__flag">renewal</span>
      </td>
      <td class="mono right">{{ formatCents(item.amountCents, item.currency) }}</td>
      <td class="muted">{{ item.tierName || '-' }}</td>
      <td class="mono muted">{{ formatRelativeDate(item.receivedAt) }}</td>
      <td class="tight">
        <ResourcePicker :model-value="picks[item.kofiTransactionId] ?? null" :search="userSource.search"
          :resolve="userSource.resolve" :placeholder="userSource.placeholder"
          @update:model-value="setPick(item.kofiTransactionId, $event)" />
      </td>
      <td class="right">
        <BaseButton size="sm" variant="primary" :loading="claiming[item.kofiTransactionId]"
          :disabled="!picks[item.kofiTransactionId]" @click="claim(item.kofiTransactionId)">
          Claim
        </BaseButton>
      </td>
    </template>
  </AdminTable>
</template>

<style scoped>
.queue__flag {
  margin-left: var(--space-xs);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--info);
}

.queue__flag--first {
  color: var(--warning);
}
</style>
