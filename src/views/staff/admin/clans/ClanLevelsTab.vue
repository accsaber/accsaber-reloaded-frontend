<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminItemPicker from '@/components/admin/AdminItemPicker.vue'
import DataTable from '@/components/common/DataTable.vue'
import IconButton from '@/components/common/IconButton.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import type {
  ClanArena,
  ClanCapacity,
  ClanLevelStepResponse,
  ClanRuleset,
  ClanWarModeAxis,
} from '@/types/api/clans'
import type { ItemResponse } from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { formatCount } from '@/utils/formatters'
import { CLAN_ARENA_LABEL, CLAN_CAPACITY_LABEL, CLAN_RULESET_LABEL } from '@/utils/clans'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { computed, onMounted, ref, type VNode } from 'vue'

const CAPACITIES: ClanCapacity[] = [
  'member_slots',
  'officer_slots',
  'commander_slots',
  'ally_slots',
]
const ARENAS = Object.keys(CLAN_ARENA_LABEL) as ClanArena[]
const RULESETS = Object.keys(CLAN_RULESET_LABEL) as ClanRuleset[]
const AXES: { key: ClanWarModeAxis; field: 'arenas' | 'rulesets'; label: string }[] = [
  { key: 'arena', field: 'arenas', label: 'Arenas' },
  { key: 'ruleset', field: 'rulesets', label: 'Rulesets' },
]
const AXIS_OPTIONS = [
  { value: 'arena', label: 'Arena' },
  { value: 'ruleset', label: 'Ruleset' },
]
const DEFAULT_MODE: Record<ClanWarModeAxis, string> = { arena: 'mixed', ruleset: 'duel' }

const steps = ref<ClanLevelStepResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref(false)
const extraLevels = ref<number[]>([])

const editing = ref<{ level: number; capacity: ClanCapacity; amount: string } | null>(null)
const newLevel = ref('')
const modeAxis = ref<ClanWarModeAxis>('arena')
const modeKey = ref<string>(DEFAULT_MODE.arena)
const modeLevel = ref('')
const pickerLevel = ref<number | null>(null)
const { confirmModal, ask } = useConfirmAction(busy)

const rows = computed(() => {
  const byLevel = new Map(steps.value.map((s) => [s.level, s]))
  const levels = new Set([...byLevel.keys(), ...extraLevels.value])
  return [...levels].sort((a, b) => a - b).map((level) => byLevel.get(level) ?? emptyStep(level))
})

const columns = computed<TableColumn[]>(() => [
  { key: 'level', label: 'Level', mono: true, width: '80px' },
  { key: 'xp', label: 'XP', align: 'right', mono: true, width: '120px' },
  ...CAPACITIES.map((capacity) => ({ key: capacity, label: CLAN_CAPACITY_LABEL[capacity].replace(/\b\w/g, (c) => c.toUpperCase()), align: 'right' as const, width: '130px', noLink: true })),
  ...AXES.map((axis) => ({ key: axis.key, label: axis.label, noLink: true })),
  { key: 'cosmetics', label: 'Cosmetics', noLink: true },
])

const tableRows = computed<Record<string, unknown>[]>(() =>
  rows.value.map((step) => ({ level: step.level, xp: formatCount(step.totalXpRequired), step })),
)

function stepOf(row: Record<string, unknown>): ClanLevelStepResponse {
  return row.step as ClanLevelStepResponse
}

function setAxis(axis: string) {
  modeAxis.value = axis as ClanWarModeAxis
  modeKey.value = DEFAULT_MODE[modeAxis.value]
}

const modeOptions = computed(() =>
  modeAxis.value === 'arena'
    ? ARENAS.map((a) => ({ value: a, label: CLAN_ARENA_LABEL[a] }))
    : RULESETS.map((r) => ({ value: r, label: CLAN_RULESET_LABEL[r] })),
)

const levelItemIds = computed(() => steps.value.flatMap((s) => s.unlocks.cosmetics.map((c) => c.id)))

function emptyStep(level: number): ClanLevelStepResponse {
  return { level, totalXpRequired: 0, unlocks: { capacities: {}, arenas: [], rulesets: [], cosmetics: [] } }
}

function modeLabel(axis: ClanWarModeAxis, mode: string): string {
  return axis === 'arena' ? (CLAN_ARENA_LABEL[mode as ClanArena] ?? mode) : (CLAN_RULESET_LABEL[mode as ClanRuleset] ?? mode)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { getClanLevels } = await import('@/api/clans')
    steps.value = await getClanLevels()
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the level table').message
  } finally {
    loading.value = false
  }
}

async function apply(action: () => Promise<ClanLevelStepResponse[]>, fallback: string) {
  busy.value = true
  error.value = null
  try {
    steps.value = await action()
    extraLevels.value = extraLevels.value.filter((l) => !steps.value.some((s) => s.level === l))
    return true
  } catch (err) {
    error.value = parseApiError(err, fallback).message
    return false
  } finally {
    busy.value = false
  }
}

function selectField(vnode: VNode) {
  ;(vnode.el as HTMLInputElement).select()
}

function startEdit(level: number, capacity: ClanCapacity, current: number | undefined) {
  editing.value = { level, capacity, amount: current === undefined ? '' : String(current) }
}

async function saveCapacity() {
  const edit = editing.value
  if (!edit) return
  const amount = Number(edit.amount)
  if (!Number.isInteger(amount) || amount <= 0) return
  const api = await import('@/api/admin/clans')
  if (await apply(() => api.setClanLevelCapacity(edit.level, edit.capacity, { amount }), 'Could not save that step')) {
    editing.value = null
  }
}

function commitCapacity(step: ClanLevelStepResponse) {
  const edit = editing.value
  if (!edit) return
  const current = step.unlocks.capacities[edit.capacity]
  if (edit.amount === '' && current !== undefined) void removeCapacity()
  else if (edit.amount === '' || Number(edit.amount) === current) editing.value = null
  else void saveCapacity()
}

async function removeCapacity() {
  const edit = editing.value
  if (!edit) return
  const api = await import('@/api/admin/clans')
  if (await apply(() => api.removeClanLevelCapacity(edit.level, edit.capacity), 'Could not remove that step')) {
    editing.value = null
  }
}

function addLevelRow() {
  const level = Number(newLevel.value)
  if (!Number.isInteger(level) || level < 0) return
  if (!rows.value.some((r) => r.level === level)) extraLevels.value = [...extraLevels.value, level]
  newLevel.value = ''
}

async function unlockMode() {
  const level = Number(modeLevel.value)
  if (!Number.isInteger(level) || level < 0) return
  const api = await import('@/api/admin/clans')
  await apply(() => api.setClanWarMode(modeAxis.value, modeKey.value, { level }), 'Could not unlock that mode')
}

async function lockMode(axis: ClanWarModeAxis, mode: string) {
  const api = await import('@/api/admin/clans')
  await apply(() => api.removeClanWarMode(axis, mode), 'Could not lock that mode')
}

function askAddItem(item: ItemResponse) {
  const level = pickerLevel.value
  pickerLevel.value = null
  if (level === null) return
  ask({
    title: `Reward ${item.name} at Level ${level}`,
    message: `Every clan already at level ${level} or past it gets ${item.name} straight away, and new clans get it the moment they reach it.`,
    confirmLabel: 'Add Reward',
    destructive: false,
    run: async () => {
      steps.value = await (await import('@/api/admin/clans')).setClanLevelItem(level, item.id)
    },
  })
}

function askRemoveItem(item: ItemResponse) {
  ask({
    title: `Stop Rewarding ${item.name}`,
    message: `${item.name} stops being a level reward. Clans that already own it keep it.`,
    confirmLabel: 'Remove Reward',
    destructive: true,
    run: async () => {
      steps.value = await (await import('@/api/admin/clans')).removeClanLevelItem(item.id)
    },
  })
}

onMounted(load)
</script>

<template>
  <div class="clan-levels">
    <div class="clan-levels__forms">
      <form class="clan-levels__form" @submit.prevent="addLevelRow">
        <BaseInput v-model="newLevel" class="clan-levels__number" type="number" min="1" label="Level" />
        <BaseButton :disabled="!newLevel" @click="addLevelRow">Add Row</BaseButton>
      </form>
      <form class="clan-levels__form" @submit.prevent="unlockMode">
        <BaseSelect class="clan-levels__select" :model-value="modeAxis" label="Axis" :options="AXIS_OPTIONS" @update:model-value="setAxis" />
        <BaseSelect v-model="modeKey" class="clan-levels__select" label="Mode" :options="modeOptions" />
        <BaseInput v-model="modeLevel" class="clan-levels__number" type="number" min="0" label="Unlocks At" />
        <BaseButton :loading="busy" :disabled="modeLevel === ''" @click="unlockMode">Unlock</BaseButton>
      </form>
    </div>

    <p v-if="error" class="caption clan-levels__error" role="alert">{{ error }}</p>

    <DataTable :columns="columns" :rows="tableRows" :loading="loading" :loading-rows="6" :row-height="56" row-key="level"
      empty-message="No level steps yet">
      <template v-for="capacity in CAPACITIES" :key="capacity" #[`cell-${capacity}`]="{ row }">
        <input
          v-if="editing && editing.level === row.level && editing.capacity === capacity"
          v-model="editing.amount"
          class="inline-edit clan-levels__input"
          type="number"
          min="0"
          :aria-label="`${CLAN_CAPACITY_LABEL[capacity]} at level ${row.level}`"
          @vue:mounted="selectField"
          @keydown.enter.prevent="commitCapacity(stepOf(row))"
          @keydown.escape.prevent="editing = null"
          @blur="commitCapacity(stepOf(row))"
        />
        <button v-else type="button" class="clan-levels__cell pressable"
          :class="{ 'clan-levels__cell--empty': stepOf(row).unlocks.capacities[capacity] === undefined }"
          :aria-label="`Edit ${CLAN_CAPACITY_LABEL[capacity]} at level ${row.level}`"
          @click="startEdit(stepOf(row).level, capacity, stepOf(row).unlocks.capacities[capacity])">
          {{ stepOf(row).unlocks.capacities[capacity] === undefined ? 'Add' : `+${stepOf(row).unlocks.capacities[capacity]}` }}
        </button>
      </template>
      <template v-for="axis in AXES" :key="axis.key" #[`cell-${axis.key}`]="{ row }">
        <span class="clan-levels__unlocks">
          <span v-for="mode in stepOf(row).unlocks[axis.field]" :key="mode" class="clan-levels__unlock">
            {{ modeLabel(axis.key, mode) }}
            <IconButton icon="close" :label="`Lock ${modeLabel(axis.key, mode)}`" :disabled="busy" @click="lockMode(axis.key, mode)" />
          </span>
        </span>
      </template>
      <template #cell-cosmetics="{ row }">
        <span class="clan-levels__unlocks">
          <span v-for="item in stepOf(row).unlocks.cosmetics" :key="item.id" class="clan-levels__unlock">
            {{ item.name }}
            <IconButton icon="close" :label="`Remove ${item.name}`" :disabled="busy" @click="askRemoveItem(item)" />
          </span>
          <button type="button" class="clan-levels__cell clan-levels__cell--empty pressable" :disabled="busy"
            @click="pickerLevel = stepOf(row).level">
            Add
          </button>
        </span>
      </template>
    </DataTable>

    <AdminItemPicker v-if="pickerLevel !== null" title="Pick a Clan Cosmetic" parent-type-key="clan_cosmetic" :exclude-ids="levelItemIds"
      @close="pickerLevel = null" @pick="askAddItem" />

    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.clan-levels {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.clan-levels__forms {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-md) var(--space-2xl);
}

.clan-levels__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-sm);
}

.clan-levels__number {
  width: 120px;
}

.clan-levels__select {
  width: 180px;
}

.clan-levels__error {
  color: var(--error);
}

.clan-levels__cell {
  padding: 0;
  font: inherit;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: none;
  border: none;
  cursor: pointer;
}

.clan-levels__cell--empty {
  font-family: var(--font-sans);
  color: var(--text-tertiary);
}

.clan-levels__cell--empty:hover {
  color: var(--text-primary);
}

.clan-levels__input {
  width: 6ch;
  font: inherit;
  font-family: var(--font-mono);
  color: var(--text-primary);
  text-align: right;
}

.clan-levels__unlocks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--space-md);
}

.clan-levels__unlock {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
