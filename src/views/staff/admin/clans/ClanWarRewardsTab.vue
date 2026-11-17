<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminItemPicker from '@/components/admin/AdminItemPicker.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ClanWarRewardItemResponse } from '@/types/api/clans'
import type { ItemResponse } from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { warRewardReach } from '@/utils/clans'
import { computed, ref } from 'vue'

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Item', primary: true },
  { key: 'quantity', label: 'Quantity', align: 'right', mono: true, width: '110px' },
  { key: 'reach', label: 'Given To', width: '220px' },
  { key: 'active', label: 'Active', width: '90px', noLink: true },
  { key: 'actions', label: '', align: 'right', width: '110px', noLink: true },
]

const itemTypeStore = useItemTypeStore()
const { confirmModal, ask } = useConfirmAction()

const rewards = ref<ClanWarRewardItemResponse[]>([])
const loading = ref(true)
const error = ref('')
const busyId = ref<string | null>(null)
const pickerOpen = ref(false)
const draft = ref({ item: null as ItemResponse | null, quantity: '1', topContributors: '' })

const rows = computed<Record<string, unknown>[]>(() =>
  rewards.value.map((reward) => ({
    id: reward.id,
    reward,
    name: reward.item.name,
    type: itemTypeStore.typeLabel(reward.item.typeKey),
    quantity: reward.quantity,
    reach: warRewardReach(reward.topContributors),
    active: reward.active,
  })),
)

async function load() {
  try {
    const { getClanWarRewards } = await import('@/api/admin/clans')
    rewards.value = await getClanWarRewards()
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the war rewards').message
  } finally {
    loading.value = false
  }
}

void load()

async function run(id: string, fallback: string, action: () => Promise<void>) {
  busyId.value = id
  error.value = ''
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
  void run('add', 'Could not add that reward', async () => {
    const { addClanWarReward } = await import('@/api/admin/clans')
    const saved = await addClanWarReward({
      itemId: item.id,
      quantity: Number(draft.value.quantity) || 1,
      topContributors: draft.value.topContributors === '' ? undefined : Number(draft.value.topContributors),
    })
    rewards.value = [saved, ...rewards.value]
    draft.value = { item: null, quantity: '1', topContributors: '' }
  })
}

function setActive(reward: ClanWarRewardItemResponse, active: boolean) {
  void run(reward.id, 'Could not update that reward', async () => {
    const { updateClanWarReward } = await import('@/api/admin/clans')
    const saved = await updateClanWarReward(reward.id, { active })
    rewards.value = rewards.value.map((r) => (r.id === saved.id ? saved : r))
  })
}

function askRetire(reward: ClanWarRewardItemResponse) {
  ask({
    title: 'Retire Reward',
    message: `Retire ${reward.item.name} as a war reward?`,
    confirmLabel: 'Retire',
    destructive: true,
    run: async () => {
      const { retireClanWarReward } = await import('@/api/admin/clans')
      await retireClanWarReward(reward.id)
      rewards.value = rewards.value.filter((r) => r.id !== reward.id)
    },
  })
}

function pick(item: ItemResponse) {
  draft.value.item = item
  pickerOpen.value = false
}
</script>

<template>
  <div class="war-rewards">
    <form class="war-rewards__form" @submit.prevent="add">
      <BaseButton :disabled="busyId === 'add'" @click="pickerOpen = true">{{ draft.item ? draft.item.name : 'Pick Item' }}</BaseButton>
      <BaseInput v-model="draft.quantity" class="war-rewards__number" type="number" min="1" label="Quantity" />
      <BaseInput v-model="draft.topContributors" class="war-rewards__number" type="number" min="1" label="Top Contributors" placeholder="Everyone" />
      <BaseButton variant="primary" :loading="busyId === 'add'" :disabled="!draft.item" @click="add">Add Reward</BaseButton>
    </form>

    <p v-if="error" class="caption war-rewards__error" role="alert">{{ error }}</p>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="3" :row-height="56" row-key="id"
      empty-message="No war rewards yet">
      <template #cell-name="{ row }">
        <span class="war-rewards__item">
          <span class="war-rewards__name">{{ row.name }}</span>
          <span class="caption">{{ row.type }}</span>
        </span>
      </template>
      <template #cell-active="{ row }">
        <BaseSwitch :model-value="(row.active as boolean)" :aria-label="`${row.name} active`" :disabled="busyId === row.id"
          @update:model-value="setActive(row.reward as ClanWarRewardItemResponse, $event)" />
      </template>
      <template #cell-actions="{ row }">
        <BaseButton size="sm" variant="destructive" @click="askRetire(row.reward as ClanWarRewardItemResponse)">Retire</BaseButton>
      </template>
    </DataTable>

    <AdminItemPicker v-if="pickerOpen" title="Pick a War Reward" :exclude-ids="rewards.map((r) => r.item.id)"
      @close="pickerOpen = false" @pick="pick" />
    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.war-rewards {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.war-rewards__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-sm);
}

.war-rewards__number {
  width: 160px;
}

.war-rewards__error {
  color: var(--error);
}

.war-rewards__item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.war-rewards__name {
  font-weight: 600;
  color: var(--text-primary);
}
</style>
