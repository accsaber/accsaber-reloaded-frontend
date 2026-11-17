<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import {
  createItemType,
  setItemTypeActive,
  getAdminItemTypes,
  updateItemType,
} from '@/api/admin/items'
import { parseApiError } from '@/api/client'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useItemTypeStore } from '@/stores/itemTypes'
import type {
  CreateItemTypeRequest,
  ItemTypeResponse,
  UpdateItemTypeRequest,
} from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { computed, ref, watch } from 'vue'

const itemTypeStore = useItemTypeStore()

const types = ref<ItemTypeResponse[]>([])
const loading = ref(false)
const includeInactive = ref(true)

const editing = ref<ItemTypeResponse | null>(null)
const modalOpen = ref(false)
const submitting = ref(false)
const schemaText = ref('')
const schemaError = ref<string | null>(null)
type ItemTypeForm = Omit<CreateItemTypeRequest, 'description'> & { description: string }

const form = ref<ItemTypeForm>({
  parentTypeId: undefined,
  key: '',
  name: '',
  description: '',
  valueSchema: undefined,
})

const parentOptions = computed(() => [
  { value: '', label: 'No Parent' },
  ...types.value.filter((t) => !t.parentTypeId).map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
])

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', primary: true },
  { key: 'key', label: 'Key', width: '240px' },
  { key: 'parent', label: 'Parent', width: '200px' },
  { key: 'active', label: 'Active', width: '90px', noLink: true },
  { key: 'actions', label: '', align: 'right', width: '90px', noLink: true },
]

const { confirmModal, ask } = useConfirmAction()
const busyId = ref<string | null>(null)
const formError = ref('')

const rows = computed<Record<string, unknown>[]>(() =>
  types.value.map((type) => ({
    ...type,
    type,
    parent: type.parentTypeId ? (types.value.find((t) => t.id === type.parentTypeId)?.name ?? '?') : '-',
  })),
)

async function fetchTypes() {
  loading.value = true
  try {
    types.value = await getAdminItemTypes({ includeInactive: includeInactive.value || undefined })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { parentTypeId: undefined, key: '', name: '', description: '', valueSchema: undefined }
  schemaText.value = ''
  schemaError.value = null
  modalOpen.value = true
}

function openEdit(type: ItemTypeResponse) {
  editing.value = type
  form.value = {
    parentTypeId: type.parentTypeId ?? undefined,
    key: type.key,
    name: type.name,
    description: type.description ?? '',
    valueSchema: type.valueSchema ?? undefined,
  }
  schemaText.value = type.valueSchema ? JSON.stringify(type.valueSchema, null, 2) : ''
  schemaError.value = null
  modalOpen.value = true
}

function parseSchema(): Record<string, unknown> | undefined | false {
  const text = schemaText.value.trim()
  if (!text) return undefined
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      schemaError.value = 'The schema has to be a JSON object'
      return false
    }
    schemaError.value = null
    return parsed as Record<string, unknown>
  } catch (e) {
    schemaError.value = e instanceof Error ? e.message : 'This is not valid JSON'
    return false
  }
}

async function submit() {
  const parsed = parseSchema()
  if (parsed === false) return
  submitting.value = true
  formError.value = ''
  try {
    if (editing.value) {
      const req: UpdateItemTypeRequest = {
        name: form.value.name,
        description: form.value.description || undefined,
        valueSchema: parsed,
      }
      const updated = await updateItemType(editing.value.id, req)
      const idx = types.value.findIndex((t) => t.id === updated.id)
      if (idx >= 0) types.value[idx] = updated
    } else {
      const req: CreateItemTypeRequest = {
        ...form.value,
        valueSchema: parsed,
        description: form.value.description || undefined,
        parentTypeId: form.value.parentTypeId || undefined,
      }
      const created = await createItemType(req)
      types.value.unshift(created)
    }
    await itemTypeStore.fetchItemTypes(true)
    modalOpen.value = false
  } catch (err) {
    formError.value = parseApiError(err, 'Could not save the type').message
  } finally {
    submitting.value = false
  }
}

async function applyActive(type: ItemTypeResponse, active: boolean) {
  const updated = await setItemTypeActive(type.id, active)
  types.value = types.value.map((t) => (t.id === updated.id ? updated : t))
  await itemTypeStore.fetchItemTypes(true)
}

async function setActive(type: ItemTypeResponse, active: boolean) {
  if (!active) {
    ask({
      title: 'Deactivate Type',
      message: `Deactivate the type "${type.name}"?`,
      confirmLabel: 'Deactivate',
      destructive: true,
      run: () => applyActive(type, false),
    })
    return
  }
  busyId.value = type.id
  try {
    await applyActive(type, true)
  } finally {
    busyId.value = null
  }
}

watch(includeInactive, fetchTypes, { immediate: true })
</script>

<template>
  <div class="types-mgmt">
    <div class="types-mgmt__bar">
      <BaseSwitch v-model="includeInactive" label="Include Inactive" />
      <BaseButton variant="primary" @click="openCreate">New Type</BaseButton>
    </div>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !types.length" :refreshing="loading && types.length > 0"
      :loading-rows="12" :row-height="56" row-key="id" empty-message="No item types">
      <template #cell-name="{ row }">
        <span class="types-mgmt__name">{{ row.name }}</span>
      </template>
      <template #cell-active="{ row }">
        <BaseSwitch :model-value="(row.active as boolean)" :aria-label="`${row.name} active`" :disabled="busyId === row.id"
          @update:model-value="setActive(row.type as ItemTypeResponse, $event)" />
      </template>
      <template #cell-actions="{ row }">
        <BaseButton size="sm" @click="openEdit(row.type as ItemTypeResponse)">Edit</BaseButton>
      </template>
    </DataTable>

    <BaseModal :open="modalOpen" :title="editing ? 'Edit Type' : 'New Item Type'" max-width="640px" @close="modalOpen = false">
      <form class="types-mgmt__form" @submit.prevent="submit">
        <BaseSelect :model-value="form.parentTypeId ?? ''" :options="parentOptions" label="Parent Type"
          @update:model-value="(v: string) => form.parentTypeId = v || undefined" />
        <BaseInput v-model="form.key" label="Key" :disabled="!!editing" />
        <BaseInput v-model="form.name" label="Name" />
        <BaseInput v-model="form.description" label="Description" />
        <BaseTextarea v-model="schemaText" class="types-mgmt__schema" label="Value Schema (JSON)" :rows="8" spellcheck="false"
          :error="schemaError ?? undefined" />
        <p class="caption types-mgmt__error" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <BaseButton @click="modalOpen = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="submit">{{ editing ? 'Save' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.types-mgmt {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.types-mgmt__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.types-mgmt__name {
  font-weight: 600;
  color: var(--text-primary);
}

.types-mgmt__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.types-mgmt__schema :deep(textarea) {
  font-family: var(--font-code);
}

.types-mgmt__error {
  min-height: 1lh;
  color: var(--error);
}
</style>
