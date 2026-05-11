<script setup lang="ts">
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import {
  createItem,
  deleteItem,
  deprecateItem,
  getAdminItems,
  reactivateItem,
  updateItem,
} from '@/api/admin/items'
import { useItemTypeStore } from '@/stores/itemTypes'
import type {
  CreateItemRequest,
  ItemRarity,
  ItemResponse,
  UpdateItemRequest,
} from '@/types/api/items'
import { parseNullableNumber } from '@/utils/formatters'
import { RARITY_ORDER } from '@/utils/items'
import { computed, onMounted, ref, watch } from 'vue'

const itemTypeStore = useItemTypeStore()

const items = ref<ItemResponse[]>([])
const loading = ref(false)
const includeInactive = ref(false)
const typeFilter = ref<string>('')

const editing = ref<ItemResponse | null>(null)
const modalOpen = ref(false)
const submitting = ref(false)
const valueText = ref('')
const valueError = ref<string | null>(null)
const form = ref<CreateItemRequest>({
  typeId: '',
  name: '',
  description: '',
  iconUrl: '',
  value: undefined,
  tradeable: false,
  visible: true,
  rarity: 'common',
  stackable: false,
  worth: null,
  requirement: null,
})

const rarityOptions = RARITY_ORDER.map((r) => ({ value: r, label: r }))

const typeOptions = computed(() => [
  { value: '', label: 'All types' },
  ...itemTypeStore.itemTypes.map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
])

const typeOptionsRequired = computed(() =>
  itemTypeStore.itemTypes
    .filter((t) => t.active)
    .map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
)

const selectedTypeSchema = computed(() => {
  const id = form.value.typeId
  if (!id) return null
  const t = itemTypeStore.byId.get(id)
  return t?.valueSchema ?? null
})

const visibleItems = computed(() =>
  typeFilter.value
    ? items.value.filter((i) => i.typeId === typeFilter.value)
    : items.value,
)

async function fetchItems() {
  loading.value = true
  try {
    items.value = await getAdminItems({
      typeId: typeFilter.value || undefined,
      includeInactive: includeInactive.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = {
    typeId: itemTypeStore.itemTypes[0]?.id ?? '',
    name: '',
    description: '',
    iconUrl: '',
    value: undefined,
    tradeable: false,
    visible: true,
    rarity: 'common',
    stackable: false,
    worth: null,
    requirement: null,
  }
  valueText.value = ''
  valueError.value = null
  modalOpen.value = true
}

function openEdit(item: ItemResponse) {
  editing.value = item
  form.value = {
    typeId: item.typeId,
    name: item.name,
    description: item.description ?? '',
    iconUrl: item.iconUrl ?? '',
    value: item.value ?? undefined,
    tradeable: item.tradeable,
    visible: item.visible,
    rarity: item.rarity,
    stackable: item.stackable,
    worth: item.worth,
    requirement: item.requirement,
  }
  valueText.value = item.value ? JSON.stringify(item.value, null, 2) : ''
  valueError.value = null
  modalOpen.value = true
}

function parseValue(): Record<string, unknown> | undefined | false {
  const text = valueText.value.trim()
  if (!text) return undefined
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      valueError.value = 'value must be a JSON object'
      return false
    }
    valueError.value = null
    return parsed as Record<string, unknown>
  } catch (e) {
    valueError.value = (e as Error).message
    return false
  }
}

async function submit() {
  const parsed = parseValue()
  if (parsed === false) return
  submitting.value = true
  try {
    if (editing.value) {
      const req: UpdateItemRequest = {
        name: form.value.name,
        description: form.value.description,
        iconUrl: form.value.iconUrl,
        value: parsed,
        tradeable: form.value.tradeable,
        visible: form.value.visible,
        rarity: form.value.rarity,
        stackable: form.value.stackable,
        worth: form.value.worth,
        requirement: form.value.requirement,
      }
      const updated = await updateItem(editing.value.id, req)
      const idx = items.value.findIndex((i) => i.id === updated.id)
      if (idx >= 0) items.value[idx] = updated
    } else {
      const req: CreateItemRequest = {
        ...form.value,
        value: parsed,
        description: form.value.description || undefined,
        iconUrl: form.value.iconUrl || undefined,
      }
      const created = await createItem(req)
      items.value.unshift(created)
    }
    modalOpen.value = false
  } finally {
    submitting.value = false
  }
}

const actionBusy = ref<Record<string, boolean>>({})

async function withBusy(id: string, fn: () => Promise<void>) {
  actionBusy.value[id] = true
  try {
    await fn()
  } finally {
    delete actionBusy.value[id]
  }
}

async function handleDeprecate(item: ItemResponse) {
  if (item.deprecated) return
  await withBusy(item.id, async () => {
    const updated = await deprecateItem(item.id)
    const idx = items.value.findIndex((i) => i.id === updated.id)
    if (idx >= 0) items.value[idx] = updated
  })
}

async function handleDelete(item: ItemResponse) {
  if (!confirm(`Delete "${item.name}"? This deactivates the item.`)) return
  await withBusy(item.id, async () => {
    await deleteItem(item.id)
    if (includeInactive.value) {
      const idx = items.value.findIndex((i) => i.id === item.id)
      if (idx >= 0) items.value[idx] = { ...item, active: false }
    } else {
      items.value = items.value.filter((i) => i.id !== item.id)
    }
  })
}

async function handleReactivate(item: ItemResponse) {
  await withBusy(item.id, async () => {
    const updated = await reactivateItem(item.id)
    const idx = items.value.findIndex((i) => i.id === updated.id)
    if (idx >= 0) items.value[idx] = updated
  })
}

watch([typeFilter, includeInactive], fetchItems)

onMounted(async () => {
  await itemTypeStore.fetchItemTypes()
  await fetchItems()
})
</script>

<template>
  <div class="items-mgmt">
    <header class="items-mgmt__bar">
      <BaseSelect v-model="typeFilter" :options="typeOptions" />
      <label class="items-mgmt__check">
        <input v-model="includeInactive" type="checkbox" /> Include inactive
      </label>
      <BaseButton variant="primary" size="sm" @click="openCreate">New item</BaseButton>
    </header>

    <AdminTable :items="visibleItems" :loading="loading" empty-message="No items">
      <template #head>
        <th>Name</th>
        <th>Type</th>
        <th>Rarity</th>
        <th>Tradeable</th>
        <th>Status</th>
        <th class="right">Actions</th>
      </template>

      <template #default="{ item }: { item: ItemResponse }">
        <td>
          <span class="items-mgmt__name">{{ item.name }}</span>
        </td>
        <td class="muted">{{ item.typeKey }}</td>
        <td>{{ item.rarity }}</td>
        <td>{{ item.tradeable ? 'Yes' : 'No' }}</td>
        <td>
          <span v-if="!item.active">Inactive</span>
          <span v-else-if="item.deprecated">Deprecated</span>
          <span v-else-if="!item.visible">Hidden</span>
          <span v-else>Active</span>
        </td>
        <td class="right">
          <div class="items-mgmt__actions">
            <BaseButton size="sm" :disabled="actionBusy[item.id]" @click="openEdit(item)">Edit</BaseButton>
            <BaseButton
              v-if="item.active && !item.deprecated"
              size="sm"
              :loading="actionBusy[item.id]"
              @click="handleDeprecate(item)"
            >Deprecate</BaseButton>
            <BaseButton
              v-if="item.active"
              size="sm"
              variant="destructive"
              :loading="actionBusy[item.id]"
              @click="handleDelete(item)"
            >Delete</BaseButton>
            <BaseButton
              v-else
              size="sm"
              variant="primary"
              :loading="actionBusy[item.id]"
              @click="handleReactivate(item)"
            >Reactivate</BaseButton>
          </div>
        </td>
      </template>
    </AdminTable>

    <BaseModal :open="modalOpen" :title="editing ? 'Edit item' : 'New item'" max-width="640px" @close="modalOpen = false">
      <div class="items-mgmt__form">
        <BaseSelect
          v-model="form.typeId"
          :options="typeOptionsRequired"
          label="Type"
          :disabled="!!editing"
        />
        <BaseInput v-model="form.name" label="Name" />
        <BaseInput v-model="form.description" label="Description" />
        <BaseInput v-model="form.iconUrl" label="Icon URL" />
        <BaseInput
          :model-value="form.requirement ?? ''"
          label="Requirement (optional)"
          placeholder="e.g. Reach level 50"
          @update:model-value="(v) => form.requirement = String(v).trim() || null"
        />
        <BaseSelect
          :model-value="form.rarity ?? 'common'"
          :options="rarityOptions"
          label="Rarity"
          @update:model-value="(v: string) => form.rarity = v as ItemRarity"
        />

        <div class="items-mgmt__check-row">
          <label class="items-mgmt__check">
            <input v-model="form.tradeable" type="checkbox" /> Tradeable
          </label>
          <label class="items-mgmt__check">
            <input v-model="form.visible" type="checkbox" /> Visible
          </label>
          <label class="items-mgmt__check">
            <input v-model="form.stackable" type="checkbox" /> Stackable
          </label>
        </div>

        <BaseInput
          :model-value="form.worth == null ? '' : String(form.worth)"
          label="Worth (optional)"
          type="number"
          step="any"
          placeholder="e.g. 100"
          @update:model-value="(v) => form.worth = parseNullableNumber(String(v))"
        />

        <div class="items-mgmt__value">
          <label class="items-mgmt__value-label">Value (JSON)</label>
          <textarea
            v-model="valueText"
            class="items-mgmt__value-input"
            rows="6"
            spellcheck="false"
            placeholder="{}"
          />
          <div v-if="valueError" class="items-mgmt__value-error">{{ valueError }}</div>
          <details v-if="selectedTypeSchema" class="items-mgmt__schema">
            <summary>Value schema for this type</summary>
            <pre>{{ JSON.stringify(selectedTypeSchema, null, 2) }}</pre>
          </details>
        </div>
      </div>

      <template #footer>
        <BaseButton size="sm" @click="modalOpen = false">Cancel</BaseButton>
        <BaseButton variant="primary" size="sm" :loading="submitting" @click="submit">
          {{ editing ? 'Save' : 'Create' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.items-mgmt {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.items-mgmt__bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.items-mgmt__check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  cursor: pointer;
}

.items-mgmt__check-row {
  display: flex;
  gap: var(--space-md);
}

.items-mgmt__name {
  font-weight: 500;
}

.items-mgmt__actions {
  display: inline-flex;
  gap: var(--space-xs);
  justify-content: flex-end;
}

.items-mgmt__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.items-mgmt__value {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.items-mgmt__value-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.items-mgmt__value-input {
  width: 100%;
  padding: var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  resize: vertical;
  outline: none;
}

.items-mgmt__value-input:focus {
  border-color: var(--accent);
}

.items-mgmt__value-error {
  font-size: var(--text-caption);
  color: var(--error);
}

.items-mgmt__schema {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.items-mgmt__schema pre {
  margin: var(--space-xs) 0 0;
  padding: var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  overflow: auto;
  max-height: 200px;
}
</style>
