<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminItemPicker from '@/components/admin/AdminItemPicker.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ClanWarRewardItemResponse } from '@/types/api/clans'
import type { ItemResponse } from '@/types/api/items'
import { onMounted, ref } from 'vue'

const itemTypeStore = useItemTypeStore()

const rewards = ref<ClanWarRewardItemResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const pickerOpen = ref(false)
const draft = ref({ item: null as ItemResponse | null, quantity: '1', topContributors: '' })

async function load() {
  loading.value = true
  error.value = null
  try {
    const { getClanWarRewards } = await import('@/api/admin/clans')
    rewards.value = await getClanWarRewards()
  } catch (err) {
    error.value = parseApiError(err, 'Could not load war rewards.').message
  } finally {
    loading.value = false
  }
}

async function run(id: string, action: () => Promise<void>, fallback: string) {
  busyId.value = id
  error.value = null
  try {
    await action()
  } catch (err) {
    error.value = parseApiError(err, fallback).message
  } finally {
    busyId.value = null
  }
}

function add() {
  const item = draft.value.item
  if (!item) return
  return run(
    'add',
    async () => {
      const { addClanWarReward } = await import('@/api/admin/clans')
      const saved = await addClanWarReward({
        itemId: item.id,
        quantity: Number(draft.value.quantity) || 1,
        topContributors: draft.value.topContributors === '' ? undefined : Number(draft.value.topContributors),
      })
      rewards.value = [saved, ...rewards.value]
      draft.value = { item: null, quantity: '1', topContributors: '' }
    },
    'Could not add that reward.',
  )
}

function setActive(reward: ClanWarRewardItemResponse, active: boolean) {
  return run(
    reward.id,
    async () => {
      const { updateClanWarReward } = await import('@/api/admin/clans')
      const saved = await updateClanWarReward(reward.id, { active })
      rewards.value = rewards.value.map((r) => (r.id === saved.id ? saved : r))
    },
    'Could not update that reward.',
  )
}

function retire(reward: ClanWarRewardItemResponse) {
  return run(
    reward.id,
    async () => {
      const { retireClanWarReward } = await import('@/api/admin/clans')
      await retireClanWarReward(reward.id)
      rewards.value = rewards.value.filter((r) => r.id !== reward.id)
    },
    'Could not retire that reward.',
  )
}

onMounted(load)
</script>

<template>
  <div class="war-rewards">
    <div class="war-rewards__header">
      <div>
        <h2 class="war-rewards__title">War rewards</h2>
        <p class="war-rewards__meta">Paid to the winning side when a war ends. Leave top contributors empty to pay everyone who contributed on the winning side.</p>
      </div>
    </div>

    <form class="war-rewards__form" @submit.prevent="add">
      <BaseButton size="sm" :disabled="busyId === 'add'" @click="pickerOpen = true">
        {{ draft.item ? draft.item.name : 'Pick item' }}
      </BaseButton>
      <BaseInput v-model="draft.quantity" type="number" label="Quantity" />
      <BaseInput v-model="draft.topContributors" type="number" label="Top contributors" placeholder="all" />
      <BaseButton size="sm" variant="primary" :loading="busyId === 'add'" :disabled="!draft.item">Add reward</BaseButton>
    </form>

    <p v-if="error" class="war-rewards__error" role="alert">{{ error }}</p>

    <AdminTable :items="rewards" :loading="loading" :loading-rows="3" empty-message="No war rewards yet">
      <template #head>
        <th>Item</th>
        <th class="right" style="width: 100px">Quantity</th>
        <th style="width: 180px">Paid to</th>
        <th style="width: 100px">Active</th>
        <th class="right" style="width: 200px">Actions</th>
      </template>
      <template #default="{ item: reward }">
        <td>
          <span class="war-rewards__name">{{ reward.item.name }}</span>
          <span class="war-rewards__type">{{ itemTypeStore.typeLabel(reward.item.typeKey) }}</span>
        </td>
        <td class="mono right">{{ reward.quantity }}</td>
        <td>{{ reward.topContributors === null ? 'Every contributor' : `Top ${reward.topContributors} by contribution` }}</td>
        <td>{{ reward.active ? 'Yes' : 'No' }}</td>
        <td class="right">
          <span class="war-rewards__actions">
            <BaseButton size="sm" :loading="busyId === reward.id" @click="setActive(reward, !reward.active)">
              {{ reward.active ? 'Pause' : 'Resume' }}
            </BaseButton>
            <BaseButton size="sm" variant="destructive" :disabled="busyId === reward.id" @click="retire(reward)">Retire</BaseButton>
          </span>
        </td>
      </template>
    </AdminTable>

    <AdminItemPicker
      v-if="pickerOpen"
      title="Pick a war reward"
      :exclude-ids="rewards.map((r) => r.item.id)"
      @close="pickerOpen = false"
      @pick="(item) => { draft.item = item; pickerOpen = false }"
    />
  </div>
</template>

<style scoped>
.war-rewards {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.war-rewards__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.war-rewards__meta {
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-rewards__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-rewards__form :deep(.base-input) {
  width: 140px;
}

.war-rewards__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-rewards__name {
  font-weight: 600;
  color: var(--text-primary);
}

.war-rewards__type {
  margin-left: var(--space-xs);
  font-size: var(--text-caption);
  text-transform: capitalize;
  color: var(--text-tertiary);
}

.war-rewards__actions {
  display: inline-flex;
  gap: var(--space-xs);
}
</style>
