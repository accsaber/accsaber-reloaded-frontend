<script setup lang="ts">
import { parseApiError } from '@/api/client'
import { getAdminCrates } from '@/api/admin/crates'
import { createItem } from '@/api/admin/items'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { CreateItemRequest, ItemRarity, ItemResponse } from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { formatRelativeDate } from '@/utils/formatters'
import { RARITY_ORDER } from '@/utils/items'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const itemTypeStore = useItemTypeStore()
const router = useRouter()

const crates = ref<ItemResponse[]>([])
const loading = ref(true)

const modalOpen = ref(false)
const submitting = ref(false)
const form = ref<{ name: string; rarity: ItemRarity }>({
  name: '',
  rarity: 'common',
})
const createError = ref<string | null>(null)

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const rarityOptions = RARITY_ORDER.map((r) => ({ value: r, label: titleCase(r) }))
const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', primary: true },
  { key: 'rarity', label: 'Rarity', width: '160px' },
  { key: 'status', label: 'Status', width: '140px' },
  { key: 'createdAt', label: 'Created', width: '160px', format: (v) => formatRelativeDate(v as string) },
]

const crateTypeId = computed(() => itemTypeStore.byKey.get('crate')?.id ?? null)

function statusOf(c: ItemResponse): 'Live' | 'Draft' | 'Deprecated' {
  if (c.deprecated) return 'Deprecated'
  if (!c.active) return 'Draft'
  return 'Live'
}

const rows = computed<Record<string, unknown>[]>(() =>
  crates.value.map((crate) => ({
    id: crate.id,
    name: crate.name || 'Untitled Crate',
    rarity: titleCase(crate.rarity),
    rarityKey: crate.rarity,
    status: statusOf(crate),
    createdAt: crate.createdAt,
  })),
)

function crateRoute(row: Record<string, unknown>) {
  return { name: 'admin-crate-editor', params: { crateItemId: row.id as string } }
}

async function fetchCrates() {
  try {
    crates.value = await getAdminCrates()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { name: '', rarity: 'common' }
  createError.value = null
  modalOpen.value = true
}

async function submitCreate() {
  if (!crateTypeId.value) {
    createError.value = 'There is no crate item type'
    return
  }
  if (!form.value.name.trim()) {
    createError.value = 'A name is needed'
    return
  }
  submitting.value = true
  try {
    const req: CreateItemRequest = {
      typeId: crateTypeId.value,
      name: form.value.name.trim(),
      rarity: form.value.rarity,
      visible: false,
      tradeable: false,
      stackable: true,
    }
    const created = await createItem(req)
    modalOpen.value = false
    void router.push(crateRoute({ id: created.id }))
  } catch (e) {
    createError.value = parseApiError(e, 'Could not create the crate').message
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await itemTypeStore.fetchItemTypes()
  await fetchCrates()
})
</script>

<template>
  <div class="crates-list">
    <BaseButton class="crates-list__new" variant="primary" :disabled="!crateTypeId" @click="openCreate">New Crate</BaseButton>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="8" :row-height="56" :row-to="crateRoute" row-key="id"
      empty-message="No crates yet">
      <template #cell-name="{ row }">
        <span class="crates-list__name">{{ row.name }}</span>
      </template>
      <template #cell-rarity="{ row }">
        <span class="crates-list__rarity" :class="`rarity--${row.rarityKey}`">{{ row.rarity }}</span>
      </template>
      <template #cell-status="{ row }">
        <span :class="`crates-list__status--${(row.status as string).toLowerCase()}`">{{ row.status }}</span>
      </template>
    </DataTable>

    <BaseModal :open="modalOpen" title="New Crate" max-width="480px" @close="modalOpen = false">
      <form class="crates-list__form" @submit.prevent="submitCreate">
        <BaseInput v-model="form.name" label="Name" />
        <BaseSelect :model-value="form.rarity" :options="rarityOptions" label="Rarity"
          @update:model-value="(v: string) => (form.rarity = v as ItemRarity)" />
        <p class="caption crates-list__error" role="alert">{{ createError }}</p>
      </form>
      <template #footer>
        <BaseButton @click="modalOpen = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="submitCreate">Create Draft</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.crates-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.crates-list__new {
  align-self: flex-end;
}

.crates-list__name {
  font-weight: 600;
  color: var(--text-primary);
}

.crates-list__rarity {
  color: var(--rarity-color);
}

.crates-list__status--live {
  color: var(--success);
}

.crates-list__status--draft {
  color: var(--text-secondary);
}

.crates-list__status--deprecated {
  color: var(--warning);
}

.crates-list__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.crates-list__error {
  min-height: 1lh;
  color: var(--error);
}
</style>
