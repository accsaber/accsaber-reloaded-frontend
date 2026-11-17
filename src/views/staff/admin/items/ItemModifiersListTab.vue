<script setup lang="ts">
import { patchAdminItemModifier } from '@/api/admin/items'
import { getItemModifiers } from '@/api/items'
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import DataTable from '@/components/common/DataTable.vue'
import type { TableColumn } from '@/types/display'
import type {
  ItemModifierResponse,
  PatchItemModifierRequest,
} from '@/types/api/items'
import {
  decimalToPercent,
  formatChancePercent,
  formatSeasonWindow,
  MONTH_OPTIONS,
  maxDayForMonth,
  parseMonthDay,
  percentToDecimal,
  toMonthDay,
} from '@/utils/modifiers'
import { computed, onMounted, ref } from 'vue'

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', primary: true },
  { key: 'key', label: 'Key', width: '220px' },
  { key: 'chance', label: 'Global Chance', align: 'right', mono: true, width: '150px' },
  { key: 'season', label: 'Season', width: '220px' },
  { key: 'actions', label: '', align: 'right', width: '90px', noLink: true },
]

const modifiers = ref<ItemModifierResponse[]>([])
const loading = ref(false)

const editing = ref<ItemModifierResponse | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const form = ref({
  rollsGlobally: false,
  chancePct: '',
  seasonal: false,
  startMonth: '10',
  startDay: '25',
  endMonth: '11',
  endDay: '1',
})

async function fetchModifiers() {
  loading.value = true
  try {
    modifiers.value = await getItemModifiers()
  } finally {
    loading.value = false
  }
}

function openEdit(mod: ItemModifierResponse) {
  editing.value = mod
  formError.value = null
  fieldErrors.value = {}
  const start = parseMonthDay(mod.seasonStart)
  const end = parseMonthDay(mod.seasonEnd)
  form.value = {
    rollsGlobally: mod.globalDropChance != null,
    chancePct:
      mod.globalDropChance != null ? String(decimalToPercent(mod.globalDropChance)) : '',
    seasonal: !!(mod.seasonStart && mod.seasonEnd),
    startMonth: String(start?.month ?? 10),
    startDay: String(start?.day ?? 25),
    endMonth: String(end?.month ?? 11),
    endDay: String(end?.day ?? 1),
  }
}

function closeEdit() {
  editing.value = null
}

function buildPayload(): PatchItemModifierRequest | null {
  fieldErrors.value = {}
  formError.value = null

  if (!form.value.rollsGlobally) {
    return { globalDropChance: null, seasonStart: null, seasonEnd: null }
  }

  const chanceStr = String(form.value.chancePct).trim()
  const pct = Number(chanceStr)
  if (!chanceStr || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
    fieldErrors.value.globalDropChance = 'Enter a percentage between 0 (exclusive) and 100.'
    return null
  }

  if (!form.value.seasonal) {
    return {
      globalDropChance: percentToDecimal(pct),
      seasonStart: null,
      seasonEnd: null,
    }
  }

  const startMonth = Number(form.value.startMonth)
  const startDay = Number(form.value.startDay)
  const endMonth = Number(form.value.endMonth)
  const endDay = Number(form.value.endDay)

  if (startDay < 1 || startDay > maxDayForMonth(startMonth)) {
    fieldErrors.value.seasonStart = 'Invalid day for the selected month.'
    return null
  }
  if (endDay < 1 || endDay > maxDayForMonth(endMonth)) {
    fieldErrors.value.seasonEnd = 'Invalid day for the selected month.'
    return null
  }

  return {
    globalDropChance: percentToDecimal(pct),
    seasonStart: toMonthDay(startMonth, startDay),
    seasonEnd: toMonthDay(endMonth, endDay),
  }
}

async function save() {
  if (!editing.value) return
  const payload = buildPayload()
  if (!payload) return
  saving.value = true
  try {
    const updated = await patchAdminItemModifier(editing.value.id, payload)
    modifiers.value = modifiers.value.map((m) => (m.id === updated.id ? updated : m))
    closeEdit()
  } catch (e) {
    const parsed = parseApiError(e, 'Failed to update modifier')
    if (parsed.fieldErrors.length) {
      for (const fe of parsed.fieldErrors) fieldErrors.value[fe.field] = fe.message
    }
    formError.value = parsed.message
  } finally {
    saving.value = false
  }
}

const rows = computed<Record<string, unknown>[]>(() =>
  modifiers.value.map((modifier) => ({
    id: modifier.key,
    modifier,
    name: modifier.name,
    key: modifier.key,
    chance: modifier.globalDropChance != null ? formatChancePercent(modifier.globalDropChance) : 'Off',
    season: modifier.globalDropChance != null ? formatSeasonWindow(modifier.seasonStart, modifier.seasonEnd) : '-',
  })),
)

const SEASON_EDGES = [
  { key: 'start', label: 'Season Start', month: 'startMonth', day: 'startDay', error: 'seasonStart' },
  { key: 'end', label: 'Season End', month: 'endMonth', day: 'endDay', error: 'seasonEnd' },
] as const

const dayHint = computed(() => ({
  start: maxDayForMonth(Number(form.value.startMonth)),
  end: maxDayForMonth(Number(form.value.endMonth)),
}))

onMounted(fetchModifiers)
</script>

<template>
  <div class="modifiers-tab">
    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="8" :row-height="56" row-key="id"
      empty-message="No modifiers">
      <template #cell-name="{ row }">
        <span class="modifiers-tab__name" :style="{ color: (row.modifier as ItemModifierResponse).colorHex }">{{ row.name }}</span>
      </template>
      <template #cell-actions="{ row }">
        <BaseButton size="sm" @click="openEdit(row.modifier as ItemModifierResponse)">Edit</BaseButton>
      </template>
    </DataTable>

    <BaseModal :open="!!editing" :title="editing ? `Edit ${editing.name}` : ''" max-width="520px" @close="closeEdit">
      <form v-if="editing" class="modifiers-tab__form" @submit.prevent="save">
        <BaseSwitch v-model="form.rollsGlobally" label="Rolls on Every Crate" />

        <div class="modifiers-tab__group" :class="{ 'modifiers-tab__group--off': !form.rollsGlobally }">
          <BaseInput v-model="form.chancePct" label="Global Drop Chance (%)" type="number" min="0" max="100" step="any"
            :disabled="!form.rollsGlobally" :error="fieldErrors.globalDropChance" />
          <BaseSwitch v-model="form.seasonal" label="Only Inside a Season Window" :disabled="!form.rollsGlobally" />

          <Transition name="collapse">
            <div v-if="form.seasonal" class="collapsible">
              <div class="modifiers-tab__season">
                <div v-for="edge in SEASON_EDGES" :key="edge.key" class="modifiers-tab__edge">
                  <span class="field-label">{{ edge.label }}</span>
                  <span class="modifiers-tab__date">
                    <BaseSelect v-model="form[edge.month]" :options="MONTH_OPTIONS" />
                    <BaseInput v-model="form[edge.day]" class="modifiers-tab__day" type="number" min="1" :max="dayHint[edge.key]"
                      :aria-label="`${edge.label} day`" :disabled="!form.rollsGlobally" />
                  </span>
                  <p v-if="fieldErrors[edge.error]" class="caption modifiers-tab__error" role="alert">{{ fieldErrors[edge.error] }}</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <p class="caption modifiers-tab__error modifiers-tab__form-error" role="alert">{{ formError }}</p>
      </form>

      <template #footer>
        <BaseButton @click="closeEdit">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="save">Save</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.modifiers-tab__name {
  font-weight: 600;
}

.modifiers-tab__form,
.modifiers-tab__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modifiers-tab__group--off {
  opacity: 0.5;
}

.modifiers-tab__season {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.modifiers-tab__edge {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.modifiers-tab__date {
  display: flex;
  gap: var(--space-sm);
}

.modifiers-tab__day {
  width: 88px;
}

.modifiers-tab__error {
  color: var(--error);
}

.modifiers-tab__form-error {
  min-height: 1lh;
}
</style>
