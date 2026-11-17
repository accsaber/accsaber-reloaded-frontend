<script setup lang="ts">
import {
  createAdminUnusualEffect,
  setAdminUnusualEffectActive,
  getAdminUnusualEffects,
  updateAdminUnusualEffect,
} from '@/api/admin/unusual-effects'
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import DataTable from '@/components/common/DataTable.vue'
import type { TableColumn } from '@/types/display'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import type { ModifierEffectSpec } from '@/types/cosmetics/effects'
import type { UnusualEffectResponse } from '@/types/api/items'
import { computed, onMounted, ref } from 'vue'

const STARTER_SPEC = `{
  "contractVersion": 1,
  "compositions": []
}`

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', primary: true },
  { key: 'key', label: 'Key', width: '200px' },
  { key: 'compositions', label: 'Compositions', width: '320px' },
  { key: 'active', label: 'Active', width: '90px', noLink: true },
  { key: 'actions', label: '', align: 'right', width: '90px', noLink: true },
]

const effects = ref<UnusualEffectResponse[]>([])
const loading = ref(false)

const modalOpen = ref(false)
const editing = ref<UnusualEffectResponse | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const form = ref({ key: '', name: '', description: '', specText: STARTER_SPEC })

const parsedSpec = computed<ModifierEffectSpec | null>(() => {
  try {
    const value = JSON.parse(form.value.specText)
    if (!value || typeof value !== 'object' || !Array.isArray(value.compositions)) return null
    return value as ModifierEffectSpec
  } catch {
    return null
  }
})

function compositionSummary(spec: ModifierEffectSpec | null): string {
  const types = spec?.compositions?.map((c) => c.type) ?? []
  return types.length ? types.join(', ') : 'None'
}

async function fetchEffects() {
  loading.value = true
  try {
    effects.value = await getAdminUnusualEffects(true)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { key: '', name: '', description: '', specText: STARTER_SPEC }
  formError.value = null
  fieldErrors.value = {}
  modalOpen.value = true
}

function openEdit(effect: UnusualEffectResponse) {
  editing.value = effect
  form.value = {
    key: effect.key,
    name: effect.name,
    description: effect.description ?? '',
    specText: JSON.stringify(effect.effectSpec ?? { contractVersion: 1, compositions: [] }, null, 2),
  }
  formError.value = null
  fieldErrors.value = {}
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function validate(): ModifierEffectSpec | null {
  fieldErrors.value = {}
  formError.value = null
  if (!editing.value && !form.value.key.trim()) {
    fieldErrors.value.key = 'Key is required.'
  }
  if (!form.value.name.trim()) {
    fieldErrors.value.name = 'Name is required.'
  }
  const spec = parsedSpec.value
  if (!spec) {
    fieldErrors.value.specText = 'Effect spec must be valid JSON with a compositions array.'
  }
  if (Object.keys(fieldErrors.value).length) return null
  return spec
}

async function save() {
  const spec = validate()
  if (!spec) return
  const description = form.value.description.trim() ? form.value.description.trim() : null
  saving.value = true
  try {
    if (editing.value) {
      const updated = await updateAdminUnusualEffect(editing.value.id, {
        name: form.value.name.trim(),
        description: description ?? '',
        effectSpec: spec,
      })
      effects.value = effects.value.map((e) => (e.id === updated.id ? updated : e))
    } else {
      const created = await createAdminUnusualEffect({
        key: form.value.key.trim(),
        name: form.value.name.trim(),
        description,
        effectSpec: spec,
      })
      effects.value = [...effects.value, created]
    }
    closeModal()
  } catch (e) {
    const parsed = parseApiError(e, 'Failed to save unusual effect')
    for (const fe of parsed.fieldErrors) fieldErrors.value[fe.field] = fe.message
    formError.value = parsed.message
  } finally {
    saving.value = false
  }
}

const rows = computed<Record<string, unknown>[]>(() =>
  effects.value.map((effect) => ({ ...effect, effect, compositions: compositionSummary(effect.effectSpec) })),
)

const togglingId = ref<string | null>(null)

async function toggleActive(effect: UnusualEffectResponse) {
  togglingId.value = effect.id
  try {
    const updated = await setAdminUnusualEffectActive(effect.id, !effect.active)
    effects.value = effects.value.map((e) => (e.id === updated.id ? updated : e))
  } finally {
    togglingId.value = null
  }
}

onMounted(fetchEffects)
</script>

<template>
  <div class="ue-tab">
    <BaseButton class="ue-tab__new" variant="primary" @click="openCreate">New Effect</BaseButton>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="8" :row-height="56" row-key="id"
      empty-message="No unusual effects">
      <template #cell-name="{ row }">
        <span class="ue-tab__identity">
          <span class="ue-tab__name">{{ row.name }}</span>
          <span v-if="row.description" class="caption">{{ row.description }}</span>
        </span>
      </template>
      <template #cell-active="{ row }">
        <BaseSwitch :model-value="(row.active as boolean)" :aria-label="`${row.name} active`" :disabled="togglingId === row.id"
          @update:model-value="toggleActive(row.effect as UnusualEffectResponse)" />
      </template>
      <template #cell-actions="{ row }">
        <BaseButton size="sm" @click="openEdit(row.effect as UnusualEffectResponse)">Edit</BaseButton>
      </template>
    </DataTable>

    <BaseModal :open="modalOpen" :title="editing ? `Edit ${editing.name}` : 'New Unusual Effect'" max-width="680px" @close="closeModal">
      <form class="ue-tab__form" @submit.prevent="save">
        <BaseInput v-model="form.key" label="Key" :disabled="!!editing" :error="fieldErrors.key" />
        <BaseInput v-model="form.name" label="Name" :error="fieldErrors.name" />
        <BaseTextarea v-model="form.description" label="Description" :rows="2" />
        <div class="ue-tab__spec">
          <BaseTextarea v-model="form.specText" class="ue-tab__code" label="Effect Spec (JSON)" :rows="12" spellcheck="false"
            :error="fieldErrors.specText" />
          <div class="ue-tab__preview" aria-hidden="true">
            <span class="field-label">Preview</span>
            <div class="ue-tab__preview-tile">
              <ModifierCompositions v-if="parsedSpec" :spec="parsedSpec" />
            </div>
          </div>
        </div>
        <p class="caption ue-tab__error" role="alert">{{ formError }}</p>
      </form>

      <template #footer>
        <BaseButton @click="closeModal">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="save">Save</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.ue-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.ue-tab__new {
  align-self: flex-end;
}

.ue-tab__identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ue-tab__name {
  font-weight: 600;
  color: var(--text-primary);
}

.ue-tab__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.ue-tab__spec {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  gap: var(--space-md);
  align-items: start;
}

.ue-tab__code :deep(textarea) {
  font-family: var(--font-code);
}

.ue-tab__preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ue-tab__preview-tile {
  position: relative;
  width: 160px;
  height: 160px;
  overflow: hidden;
  background: var(--bg-base);
  border-radius: var(--radius-card);
}

.ue-tab__error {
  min-height: 1lh;
  color: var(--error);
}
</style>
