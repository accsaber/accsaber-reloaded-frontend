<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminItemPicker from '@/components/admin/AdminItemPicker.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
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
import { CLAN_ARENA_LABEL, CLAN_CAPACITY_LABEL, CLAN_RULESET_LABEL } from '@/utils/clans'
import { computed, onMounted, ref } from 'vue'

const CAPACITIES: ClanCapacity[] = [
  'member_slots',
  'officer_slots',
  'commander_slots',
  'ally_slots',
  'lend_slots',
  'receive_slots',
]
const ARENAS = Object.keys(CLAN_ARENA_LABEL) as ClanArena[]
const RULESETS = Object.keys(CLAN_RULESET_LABEL) as ClanRuleset[]

interface PendingConfirm {
  title: string
  message: string
  confirmLabel: string
  destructive: boolean
  run: () => Promise<ClanLevelStepResponse[]>
}

const steps = ref<ClanLevelStepResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref(false)
const extraLevels = ref<number[]>([])

const editing = ref<{ level: number; capacity: ClanCapacity; amount: string } | null>(null)
const newLevel = ref('')
const modeAxis = ref<ClanWarModeAxis>('arena')
const modeKey = ref<string>('mixed')
const modeLevel = ref('')
const pickerLevel = ref<number | null>(null)
const confirm = ref<PendingConfirm | null>(null)
const confirmError = ref<string | null>(null)

const rows = computed(() => {
  const byLevel = new Map(steps.value.map((s) => [s.level, s]))
  const levels = new Set([...byLevel.keys(), ...extraLevels.value])
  return [...levels].sort((a, b) => a - b).map((level) => byLevel.get(level) ?? emptyStep(level))
})

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
    error.value = parseApiError(err, 'Could not load the level table.').message
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

function startEdit(level: number, capacity: ClanCapacity, current: number | undefined) {
  editing.value = { level, capacity, amount: current === undefined ? '' : String(current) }
}

async function saveCapacity() {
  const edit = editing.value
  if (!edit) return
  const amount = Number(edit.amount)
  if (!Number.isInteger(amount) || amount <= 0) return
  const api = await import('@/api/admin/clans')
  if (await apply(() => api.setClanLevelCapacity(edit.level, edit.capacity, { amount }), 'Could not save that step.')) {
    editing.value = null
  }
}

async function removeCapacity() {
  const edit = editing.value
  if (!edit) return
  const api = await import('@/api/admin/clans')
  if (await apply(() => api.removeClanLevelCapacity(edit.level, edit.capacity), 'Could not remove that step.')) {
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
  await apply(() => api.setClanWarMode(modeAxis.value, modeKey.value, { level }), 'Could not unlock that mode.')
}

async function lockMode(axis: ClanWarModeAxis, mode: string) {
  const api = await import('@/api/admin/clans')
  await apply(() => api.removeClanWarMode(axis, mode), 'Could not lock that mode.')
}

function askAddItem(item: ItemResponse) {
  const level = pickerLevel.value
  pickerLevel.value = null
  if (level === null) return
  ask({
    title: `Reward ${item.name} at level ${level}`,
    message: `Every clan already at level ${level} or past it gets ${item.name} straight away, and new clans get it the moment they reach it.`,
    confirmLabel: 'Add reward',
    destructive: false,
    run: async () => (await import('@/api/admin/clans')).setClanLevelItem(level, item.id),
  })
}

function askRemoveItem(item: ItemResponse) {
  ask({
    title: `Stop rewarding ${item.name}`,
    message: `${item.name} stops being a level reward. Clans that already own it keep it.`,
    confirmLabel: 'Remove reward',
    destructive: true,
    run: async () => (await import('@/api/admin/clans')).removeClanLevelItem(item.id),
  })
}

function ask(pending: PendingConfirm) {
  confirmError.value = null
  confirm.value = pending
}

async function runConfirm() {
  const pending = confirm.value
  if (!pending) return
  busy.value = true
  confirmError.value = null
  try {
    steps.value = await pending.run()
    confirm.value = null
  } catch (err) {
    confirmError.value = parseApiError(err, 'That did not go through.').message
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="clan-levels">
    <div class="clan-levels__header">
      <div>
        <h2 class="clan-levels__title">Level table</h2>
        <p class="clan-levels__meta">Each capacity amount stacks on top of every lower level.</p>
      </div>
    </div>

    <div class="clan-levels__forms">
      <form class="clan-levels__form" @submit.prevent="addLevelRow">
        <BaseInput v-model="newLevel" type="number" label="Level" placeholder="12" />
        <BaseButton size="sm" :disabled="!newLevel">Add row</BaseButton>
      </form>
      <form class="clan-levels__form" @submit.prevent="unlockMode">
        <BaseSelect
          :model-value="modeAxis"
          label="Axis"
          :options="[{ value: 'arena', label: 'Arena' }, { value: 'ruleset', label: 'Ruleset' }]"
          @update:model-value="modeAxis = $event as ClanWarModeAxis; modeKey = $event === 'arena' ? 'mixed' : 'duel'"
        />
        <BaseSelect v-model="modeKey" label="Mode" :options="modeOptions" />
        <BaseInput v-model="modeLevel" type="number" label="Unlocks at" placeholder="0" />
        <BaseButton size="sm" :loading="busy" :disabled="modeLevel === ''">Unlock</BaseButton>
      </form>
    </div>

    <p v-if="error" class="clan-levels__error" role="alert">{{ error }}</p>

    <AdminTable :items="rows" :loading="loading" :loading-rows="6" empty-message="No level steps yet">
      <template #head>
        <th style="width: 70px">Level</th>
        <th class="right" style="width: 110px">XP</th>
        <th v-for="capacity in CAPACITIES" :key="capacity" class="right">{{ CLAN_CAPACITY_LABEL[capacity] }}</th>
        <th>Arenas</th>
        <th>Rulesets</th>
        <th>Cosmetics</th>
      </template>
      <template #default="{ item: step }">
        <td class="mono">{{ step.level }}</td>
        <td class="mono right">{{ step.totalXpRequired.toLocaleString() }}</td>
        <td v-for="capacity in CAPACITIES" :key="capacity" class="right">
          <form
            v-if="editing && editing.level === step.level && editing.capacity === capacity"
            class="clan-levels__edit"
            @submit.prevent="saveCapacity"
          >
            <BaseInput v-model="editing.amount" type="number" placeholder="5" />
            <BaseButton size="sm" variant="primary" :loading="busy">Save</BaseButton>
            <BaseButton
              v-if="step.unlocks.capacities[capacity] !== undefined"
              size="sm"
              variant="destructive"
              :disabled="busy"
              @click="removeCapacity"
            >
              Remove
            </BaseButton>
            <BaseButton size="sm" :disabled="busy" @click="editing = null">Cancel</BaseButton>
          </form>
          <button
            v-else
            type="button"
            class="clan-levels__cell"
            :class="{ 'clan-levels__cell--empty': step.unlocks.capacities[capacity] === undefined }"
            @click="startEdit(step.level, capacity, step.unlocks.capacities[capacity])"
          >
            {{ step.unlocks.capacities[capacity] === undefined ? '+' : `+${step.unlocks.capacities[capacity]}` }}
          </button>
        </td>
        <td>
          <span class="clan-levels__chips">
            <span v-for="arena in step.unlocks.arenas" :key="arena" class="clan-levels__chip">
              {{ modeLabel('arena', arena) }}
              <button type="button" class="clan-levels__chip-x" :aria-label="`Lock ${arena}`" :disabled="busy" @click="lockMode('arena', arena)">×</button>
            </span>
          </span>
        </td>
        <td>
          <span class="clan-levels__chips">
            <span v-for="ruleset in step.unlocks.rulesets" :key="ruleset" class="clan-levels__chip">
              {{ modeLabel('ruleset', ruleset) }}
              <button type="button" class="clan-levels__chip-x" :aria-label="`Lock ${ruleset}`" :disabled="busy" @click="lockMode('ruleset', ruleset)">×</button>
            </span>
          </span>
        </td>
        <td>
          <span class="clan-levels__chips">
            <span v-for="item in step.unlocks.cosmetics" :key="item.id" class="clan-levels__chip">
              {{ item.name }}
              <button type="button" class="clan-levels__chip-x" :aria-label="`Remove ${item.name}`" :disabled="busy" @click="askRemoveItem(item)">×</button>
            </span>
            <button type="button" class="clan-levels__cell clan-levels__cell--empty" :disabled="busy" @click="pickerLevel = step.level">+</button>
          </span>
        </td>
      </template>
    </AdminTable>

    <AdminItemPicker
      v-if="pickerLevel !== null"
      title="Pick a clan cosmetic"
      parent-type-key="clan_cosmetic"
      :exclude-ids="levelItemIds"
      @close="pickerLevel = null"
      @pick="askAddItem"
    />

    <ConfirmModal
      :open="confirm !== null"
      :title="confirm?.title ?? ''"
      :message="confirm?.message ?? ''"
      :confirm-label="confirm?.confirmLabel ?? ''"
      :destructive="confirm?.destructive"
      :loading="busy"
      :error="confirmError"
      @confirm="runConfirm"
      @close="confirm = null"
    />
  </div>
</template>

<style scoped>
.clan-levels {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.clan-levels__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
}

.clan-levels__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.clan-levels__meta {
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.clan-levels__forms {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.clan-levels__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.clan-levels__form :deep(.base-input),
.clan-levels__form :deep(.base-select) {
  width: 150px;
}

.clan-levels__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.clan-levels__cell {
  min-width: 36px;
  padding: 2px 8px;
  font: inherit;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.clan-levels__cell:hover {
  border-color: var(--bg-overlay);
  background: var(--bg-elevated);
}

.clan-levels__cell--empty {
  color: var(--text-tertiary);
}

.clan-levels__edit {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-xs);
}

.clan-levels__edit :deep(.base-input) {
  width: 80px;
}

.clan-levels__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
}

.clan-levels__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: var(--text-caption);
  color: var(--text-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  white-space: nowrap;
}

.clan-levels__chip-x {
  padding: 0 2px;
  font: inherit;
  line-height: 1;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
}

.clan-levels__chip-x:hover {
  color: var(--error);
}
</style>
