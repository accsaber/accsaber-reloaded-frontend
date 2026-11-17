<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import ResourcePicker from './ResourcePicker.vue'
import SupporterGrantForm from './SupporterGrantForm.vue'
import SupporterPlayerPanel from './SupporterPlayerPanel.vue'
import SupporterQueue from './SupporterQueue.vue'
import ToolCard from './ToolCard.vue'
import { KOFI_EVENT_SOURCE, RESOURCE_SOURCES } from './resourceSources'
import { useSupporterAdmin } from './useSupporterAdmin'

const userSource = RESOURCE_SOURCES.USER!

const {
  tiers, queue, queueLoading, queueError,
  panelUserId, account, history, panelLoading, panelError,
  claiming, claimError, grantOp,
  loadQueue, claim, grant,
} = useSupporterAdmin()

function claimForPanel(kofiTransactionId: string) {
  if (panelUserId.value) claim(kofiTransactionId, panelUserId.value)
}
</script>

<template>
  <div class="supporters">
    <p v-if="queueError || claimError" class="caption supporters__error" role="alert">{{ queueError || claimError }}</p>

    <ToolCard title="Unclaimed Ko-fi Payments">
      <template #head>
        <BaseButton size="sm" :loading="queueLoading" @click="loadQueue">Refresh</BaseButton>
      </template>
      <SupporterQueue :events="queue" :loading="queueLoading" :claiming="claiming" :user-source="userSource" @claim="claim" />
    </ToolCard>

    <ToolCard title="Player" :results="[grantOp]">
      <ResourcePicker v-model="panelUserId" :search="userSource.search" :resolve="userSource.resolve" :placeholder="userSource.placeholder" />
      <p v-if="panelError" class="caption supporters__error" role="alert">{{ panelError }}</p>
      <template v-if="panelUserId">
        <SupporterPlayerPanel :account="account" :events="history" :loading="panelLoading" :claiming="claiming"
          :event-source="KOFI_EVENT_SOURCE" @claim="claimForPanel" />
        <SupporterGrantForm :tiers="tiers" :submitting="grantOp.loading" @submit="grant" />
      </template>
    </ToolCard>
  </div>
</template>

<style scoped>
.supporters {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.supporters__error {
  color: var(--error);
}
</style>
