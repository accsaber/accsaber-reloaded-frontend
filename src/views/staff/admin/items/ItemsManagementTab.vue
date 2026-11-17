<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import ItemIconExportModal from './ItemIconExportModal.vue'
import SchemaValueForm from './value-form/SchemaValueForm.vue'
import {
  createItem,
  deleteItemIcon,
  deprecateItem,
  getAdminItems,
  setItemActive,
  updateItem,
  uploadItemIcon,
} from '@/api/admin/items'
import { parseApiError } from '@/api/client'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useItemTypeStore } from '@/stores/itemTypes'
import type {
  CreateItemRequest,
  ItemRarity,
  ItemResponse,
  UpdateItemRequest,
} from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { parseNullableNumber } from '@/utils/formatters'
import { RARITY_ORDER } from '@/utils/items'
import { cleanValue, type JsonSchema } from './value-form/schemaUtils'
import { computed, onMounted, ref, watch } from 'vue'

const itemTypeStore = useItemTypeStore()

const items = ref<ItemResponse[]>([])
const loading = ref(false)
const includeInactive = ref(false)
const typeFilter = ref<string>('')

const editing = ref<ItemResponse | null>(null)
const modalOpen = ref(false)
const iconExportOpen = ref(false)
const submitting = ref(false)
const activeToggling = ref(false)

const formError = ref<string | null>(null)
const nameError = ref<string | null>(null)
const valueError = ref<string | null>(null)

interface ItemForm {
  typeId: string
  name: string
  description: string
  rarity: ItemRarity
  tradeable: boolean
  visible: boolean
  stackable: boolean
  welcomeGrant: boolean
  missionPoolable: boolean
  active: boolean
  worth: number | null
  requirement: string | null
  unlockLevel: number | null
}

function blankForm(typeId = ''): ItemForm {
  return {
    typeId,
    name: '',
    description: '',
    rarity: 'common',
    tradeable: false,
    visible: true,
    stackable: false,
    welcomeGrant: false,
    missionPoolable: false,
    active: true,
    worth: null,
    requirement: null,
    unlockLevel: null,
  }
}

const form = ref<ItemForm>(blankForm())
const valueModel = ref<Record<string, unknown>>({})

const iconUrl = ref<string | null>(null)
const stagedIcon = ref<File | null>(null)
const stagedIconUrl = ref<string | null>(null)

const rarityOptions = RARITY_ORDER.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))

const typeOptions = computed(() => [
  { value: '', label: 'All types' },
  ...itemTypeStore.itemTypes.map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
])

const typeOptionsRequired = computed(() =>
  itemTypeStore.itemTypes
    .filter((t) => t.active)
    .map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
)

const selectedType = computed(() => itemTypeStore.byId.get(form.value.typeId) ?? null)

const selectedTypeLabel = computed(() =>
  selectedType.value ? `${selectedType.value.name} (${selectedType.value.key})` : '-',
)

const selectedTypeSchema = computed<JsonSchema | null>(
  () => (selectedType.value?.valueSchema as JsonSchema | undefined) ?? null,
)

const visibleItems = computed(() =>
  typeFilter.value
    ? items.value.filter((i) => i.typeId === typeFilter.value)
    : items.value,
)

const nameCache = new Map<string, { id: string; name: string }[]>()

async function ensureNames(typeId: string): Promise<{ id: string; name: string }[]> {
  if (!typeId) return []
  const cached = nameCache.get(typeId)
  if (cached) return cached
  const list = await getAdminItems({ typeId, includeInactive: true })
  const mapped = list.map((i) => ({ id: i.id, name: i.name }))
  nameCache.set(typeId, mapped)
  return mapped
}

function isDuplicateName(candidate: string): boolean {
  const list = nameCache.get(form.value.typeId) ?? []
  const norm = candidate.trim().toLowerCase()
  return list.some((x) => x.id !== editing.value?.id && x.name.trim().toLowerCase() === norm)
}

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

function clearStagedIcon() {
  if (stagedIconUrl.value) URL.revokeObjectURL(stagedIconUrl.value)
  stagedIcon.value = null
  stagedIconUrl.value = null
}

function resetErrors() {
  formError.value = null
  nameError.value = null
  valueError.value = null
}

function openCreate() {
  editing.value = null
  form.value = blankForm(itemTypeStore.itemTypes.find((t) => t.active)?.id ?? '')
  valueModel.value = {}
  iconUrl.value = null
  clearStagedIcon()
  resetErrors()
  modalOpen.value = true
  if (form.value.typeId) void ensureNames(form.value.typeId)
}

function openEdit(item: ItemResponse) {
  editing.value = item
  form.value = {
    typeId: item.typeId,
    name: item.name,
    description: item.description ?? '',
    rarity: item.rarity,
    tradeable: item.tradeable,
    visible: item.visible,
    stackable: item.stackable,
    welcomeGrant: item.welcomeGrant,
    missionPoolable: item.missionPoolable,
    active: item.active,
    worth: item.worth,
    requirement: item.requirement,
    unlockLevel: item.unlockLevel,
  }
  valueModel.value = item.value ? { ...(item.value as unknown as Record<string, unknown>) } : {}
  iconUrl.value = item.iconUrl
  clearStagedIcon()
  resetErrors()
  modalOpen.value = true
  void ensureNames(item.typeId)
}

function closeModal() {
  clearStagedIcon()
  modalOpen.value = false
}

watch(
  () => form.value.typeId,
  (typeId) => {
    if (editing.value) return
    valueModel.value = {}
    valueError.value = null
    if (typeId) void ensureNames(typeId)
  },
)

function applyUpdatedItem(updated: ItemResponse) {
  const idx = items.value.findIndex((i) => i.id === updated.id)
  if (idx >= 0) items.value[idx] = updated
  if (editing.value?.id === updated.id) editing.value = updated
  const names = nameCache.get(updated.typeId)
  if (names) {
    const ni = names.findIndex((n) => n.id === updated.id)
    if (ni >= 0) names[ni] = { id: updated.id, name: updated.name }
    else names.push({ id: updated.id, name: updated.name })
  }
}

async function onIconUpload(file: File) {
  if (editing.value) {
    const updated = await uploadItemIcon(editing.value.id, file)
    iconUrl.value = updated.iconUrl
    applyUpdatedItem(updated)
  } else {
    clearStagedIcon()
    stagedIcon.value = file
    stagedIconUrl.value = URL.createObjectURL(file)
  }
}

async function onIconRemove() {
  if (editing.value) {
    const updated = await deleteItemIcon(editing.value.id)
    iconUrl.value = updated.iconUrl
    applyUpdatedItem(updated)
  } else {
    clearStagedIcon()
  }
}

const iconPreview = computed(() => (editing.value ? iconUrl.value : stagedIconUrl.value))

async function toggleActive() {
  if (!editing.value) return
  activeToggling.value = true
  resetErrors()
  try {
    applyUpdatedItem(await setItemActive(editing.value.id, !editing.value.active))
  } catch (e) {
    formError.value = parseApiError(e, 'Failed to change active state').message
  } finally {
    activeToggling.value = false
  }
}

function buildValuePayload(): Record<string, unknown> | undefined {
  if (!selectedTypeSchema.value) return undefined
  return cleanValue(valueModel.value) as Record<string, unknown> | undefined
}

function mapError(e: unknown, fallback: string) {
  const parsed = parseApiError(e, fallback)
  if (parsed.fieldErrors.length) {
    for (const fe of parsed.fieldErrors) {
      if (fe.field === 'name') nameError.value = fe.message
      else if (fe.field === 'value' || fe.field.startsWith('value')) valueError.value = fe.message
    }
    formError.value = parsed.message
  } else if (parsed.status === 422) {
    valueError.value = parsed.message
  } else if (parsed.status === 500) {
    formError.value =
      'Unexpected server error. If another item in this type already uses this name, pick a different one.'
  } else {
    formError.value = parsed.message
  }
}

async function submit() {
  resetErrors()

  const name = form.value.name.trim()
  if (!name) {
    nameError.value = 'Name is required'
    return
  }
  try {
    await ensureNames(form.value.typeId)
  } catch {
    void 0
  }
  if (isDuplicateName(name)) {
    nameError.value = 'An item with this name already exists in this type'
    return
  }

  submitting.value = true
  try {
    const valuePayload = buildValuePayload()
    if (editing.value) {
      const req: UpdateItemRequest = {
        name,
        description: form.value.description.trim() || undefined,
        value: valuePayload,
        rarity: form.value.rarity,
        tradeable: form.value.tradeable,
        visible: form.value.visible,
        stackable: form.value.stackable,
        welcomeGrant: form.value.welcomeGrant,
        missionPoolable: form.value.missionPoolable,
        worth: form.value.worth,
        requirement: form.value.requirement,
        unlockLevel: form.value.unlockLevel,
      }
      applyUpdatedItem(await updateItem(editing.value.id, req))
    } else {
      const req: CreateItemRequest = {
        typeId: form.value.typeId,
        name,
        description: form.value.description.trim() || undefined,
        value: valuePayload,
        rarity: form.value.rarity,
        tradeable: form.value.tradeable,
        visible: form.value.visible,
        stackable: form.value.stackable,
        welcomeGrant: form.value.welcomeGrant,
        missionPoolable: form.value.missionPoolable,
        active: form.value.active,
        worth: form.value.worth,
        requirement: form.value.requirement,
        unlockLevel: form.value.unlockLevel,
      }
      let created = await createItem(req)
      if (stagedIcon.value) {
        try {
          created = await uploadItemIcon(created.id, stagedIcon.value)
        } catch (e) {
          formError.value = parseApiError(e, 'Item created, but icon upload failed').message
        }
      }
      items.value.unshift(created)
      const names = nameCache.get(created.typeId)
      if (names) names.push({ id: created.id, name: created.name })
    }
    closeModal()
  } catch (e) {
    mapError(e, 'Failed to save item')
  } finally {
    submitting.value = false
  }
}

const FLAGS: { key: 'tradeable' | 'welcomeGrant' | 'missionPoolable' | 'stackable'; label: string }[] = [
  { key: 'tradeable', label: 'Tradeable' },
  { key: 'welcomeGrant', label: 'Welcome grant' },
  { key: 'missionPoolable', label: 'Mission reward' },
  { key: 'stackable', label: 'Stackable' },
]
const FORM_SWITCHES: { key: 'tradeable' | 'visible' | 'stackable' | 'welcomeGrant' | 'missionPoolable'; label: string }[] = [
  { key: 'tradeable', label: 'Tradeable' },
  { key: 'visible', label: 'Visible' },
  { key: 'stackable', label: 'Stackable' },
  { key: 'welcomeGrant', label: 'Grant to Every New Player' },
  { key: 'missionPoolable', label: 'Eligible Mission Reward' },
]
const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', primary: true },
  { key: 'type', label: 'Type', width: '200px' },
  { key: 'rarity', label: 'Rarity', width: '130px' },
  { key: 'flags', label: 'Flags', width: '300px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'actions', label: '', align: 'right', width: '250px', noLink: true },
]

const { confirmModal, ask } = useConfirmAction()

function statusOf(item: ItemResponse): string {
  if (!item.active) return 'Inactive'
  if (item.deprecated) return 'Deprecated'
  return item.visible ? 'Active' : 'Hidden'
}

const rows = computed<Record<string, unknown>[]>(() =>
  visibleItems.value.map((item) => ({
    id: item.id,
    item,
    name: item.name,
    type: itemTypeStore.typeLabel(item.typeKey),
    rarity: item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1),
    flags: FLAGS.filter((flag) => item[flag.key]).map((flag) => flag.label).join(', ') || '-',
    status: statusOf(item),
  })),
)

function itemOf(row: Record<string, unknown>): ItemResponse {
  return row.item as ItemResponse
}

function askDeprecate(item: ItemResponse) {
  ask({
    title: 'Deprecate Item',
    message: `Deprecate "${item.name}"? It cannot be undone, and every copy players own is marked vintage.`,
    confirmLabel: 'Deprecate',
    destructive: true,
    run: async () => applyUpdatedItem(await deprecateItem(item.id)),
  })
}

function askDelete(item: ItemResponse) {
  ask({
    title: 'Delete Item',
    message: `Delete "${item.name}"? It becomes inactive and can be reactivated.`,
    confirmLabel: 'Delete',
    destructive: true,
    run: async () => {
      const updated = await setItemActive(item.id, false)
      if (includeInactive.value) applyUpdatedItem(updated)
      else items.value = items.value.filter((i) => i.id !== item.id)
    },
  })
}

const reactivating = ref<string | null>(null)

async function reactivate(item: ItemResponse) {
  reactivating.value = item.id
  try {
    applyUpdatedItem(await setItemActive(item.id, true))
  } finally {
    reactivating.value = null
  }
}

function onIconsExported(updated: ItemResponse[]) {
  for (const item of updated) applyUpdatedItem(item)
}

function onUnlockLevelInput(raw: string) {
  const n = parseNullableNumber(raw)
  form.value.unlockLevel = n == null ? null : Math.trunc(n)
}

watch([typeFilter, includeInactive], fetchItems)

onMounted(async () => {
  await itemTypeStore.fetchItemTypes()
  await fetchItems()
})
</script>

<template>
  <div class="items-mgmt">
    <div class="items-mgmt__bar">
      <BaseSelect v-model="typeFilter" class="items-mgmt__type" :options="typeOptions" />
      <BaseSwitch v-model="includeInactive" label="Include Inactive" />
      <span class="items-mgmt__right">
        <BaseButton @click="iconExportOpen = true">Export Icons</BaseButton>
        <BaseButton variant="primary" @click="openCreate">New Item</BaseButton>
      </span>
    </div>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !items.length" :refreshing="loading && items.length > 0"
      :loading-rows="20" :row-height="56" row-key="id" empty-message="No items">
      <template #cell-name="{ row }">
        <span class="items-mgmt__name">{{ row.name }}</span>
      </template>
      <template #cell-actions="{ row }">
        <span class="items-mgmt__actions">
          <BaseButton size="sm" @click="openEdit(itemOf(row))">Edit</BaseButton>
          <BaseButton v-if="itemOf(row).active && !itemOf(row).deprecated" size="sm" @click="askDeprecate(itemOf(row))">Deprecate</BaseButton>
          <BaseButton v-if="itemOf(row).active" size="sm" variant="destructive" @click="askDelete(itemOf(row))">Delete</BaseButton>
          <BaseButton v-else size="sm" variant="primary" :loading="reactivating === row.id" @click="reactivate(itemOf(row))">Reactivate</BaseButton>
        </span>
      </template>
    </DataTable>

    <ItemIconExportModal :open="iconExportOpen" @close="iconExportOpen = false" @updated="onIconsExported" />

    <BaseModal :open="modalOpen" :title="editing ? 'Edit Item' : 'New Item'" max-width="680px" @close="closeModal">
      <form class="items-mgmt__form" @submit.prevent="submit">
        <BaseSelect v-if="!editing" v-model="form.typeId" :options="typeOptionsRequired" label="Type" searchable />
        <span v-else class="items-mgmt__readonly">
          <span class="field-label">Type</span>
          <span>{{ selectedTypeLabel }}</span>
        </span>

        <BaseInput v-model="form.name" label="Name" :error="nameError ?? undefined" />
        <BaseTextarea v-model="form.description" label="Description" :rows="2" />
        <BaseSelect :model-value="form.rarity" :options="rarityOptions" label="Rarity"
          @update:model-value="(v: string) => form.rarity = v as ItemRarity" />

        <ImageUploader label="Icon" aspect-ratio="1 / 1" :image-url="iconPreview" :upload-handler="onIconUpload"
          :remove-handler="onIconRemove" />

        <div v-if="selectedTypeSchema" class="items-mgmt__value">
          <span class="field-label">Value</span>
          <SchemaValueForm :key="form.typeId" v-model="valueModel" :schema="selectedTypeSchema" :value-error="valueError" />
        </div>

        <div class="items-mgmt__switches">
          <BaseSwitch v-for="toggle in FORM_SWITCHES" :key="toggle.key" v-model="form[toggle.key]" :label="toggle.label" />
          <BaseSwitch v-if="!editing" v-model="form.active" label="Active" />
          <BaseSwitch v-else :model-value="editing.active" label="Active, Saves at Once" :disabled="activeToggling"
            @update:model-value="toggleActive" />
        </div>

        <div class="items-mgmt__numbers">
          <BaseInput :model-value="form.worth == null ? '' : String(form.worth)" label="Worth" type="number" step="any"
            @update:model-value="(v) => form.worth = parseNullableNumber(String(v))" />
          <BaseInput :model-value="form.unlockLevel == null ? '' : String(form.unlockLevel)" label="Unlock Level" type="number" step="1"
            @update:model-value="(v) => onUnlockLevelInput(String(v))" />
        </div>

        <BaseInput :model-value="form.requirement ?? ''" label="Requirement" placeholder="Reach level 50"
          @update:model-value="(v) => form.requirement = String(v).trim() || null" />

        <p class="caption items-mgmt__form-error" role="alert">{{ formError }}</p>
      </form>

      <template #footer>
        <BaseButton @click="closeModal">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="submit">{{ editing ? 'Save' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.items-mgmt {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.items-mgmt__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.items-mgmt__type {
  width: 240px;
}

.items-mgmt__right {
  display: inline-flex;
  gap: var(--space-sm);
  margin-left: auto;
}

.items-mgmt__name {
  font-weight: 600;
  color: var(--text-primary);
}

.items-mgmt__actions {
  display: inline-flex;
  gap: var(--space-xs);
}

.items-mgmt__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.items-mgmt__readonly,
.items-mgmt__value {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.items-mgmt__switches,
.items-mgmt__numbers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm) var(--space-lg);
}

.items-mgmt__form :deep(.image-uploader) {
  max-width: 200px;
}

.items-mgmt__form-error {
  min-height: 1lh;
  color: var(--error);
}
</style>
