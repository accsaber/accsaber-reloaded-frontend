<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import MapPickerModal, { type FixedMapFilters } from '@/components/domain/MapPickerModal.vue'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { computed, ref } from 'vue'
import WarMapRow from './WarMapRow.vue'

const props = defineProps<{
  count: number
  categoryId?: string | null
  complexityMin?: number | null
  complexityMax?: number | null
  disabled?: boolean
}>()

const picks = defineModel<PublicMapDifficultyResponse[]>({ required: true })

const pickerOpen = ref(false)

const full = computed(() => picks.value.length >= props.count)
const remaining = computed(() => Math.max(0, props.count - picks.value.length))
const pickedIds = computed(() => picks.value.map((d) => d.id))
const fixedFilters = computed<FixedMapFilters>(() => ({
  categoryId: props.categoryId,
  complexityMin: props.complexityMin,
  complexityMax: props.complexityMax,
}))

function bannedLabel(diff: PublicMapDifficultyResponse): string | null {
  return diff.warBanned ? 'Not allowed in wars' : null
}

function legal(diff: PublicMapDifficultyResponse): boolean {
  if (diff.status !== 'RANKED' || diff.warBanned) return false
  if (props.categoryId && diff.categoryId !== props.categoryId) return false
  const complexity = diff.complexity ?? 0
  if (props.complexityMin != null && complexity < props.complexityMin) return false
  if (props.complexityMax != null && complexity > props.complexityMax) return false
  return true
}

const rows = computed(() =>
  picks.value.map((diff) => ({ diff, flag: legal(diff) ? null : (bannedLabel(diff) ?? 'Not legal here') })),
)

function add(picked: PublicMapDifficultyResponse[]) {
  pickerOpen.value = false
  const known = new Set(pickedIds.value)
  picks.value = [...picks.value, ...picked.filter((d) => !known.has(d.id))].slice(0, props.count)
}

function remove(id: string) {
  picks.value = picks.value.filter((d) => d.id !== id)
}
</script>

<template>
  <div class="map-picks">
    <div class="map-picks__head">
      <span class="map-picks__count" :class="{ 'map-picks__count--full': full }">
        {{ picks.length }}/{{ count }} picked
      </span>
      <BaseButton v-if="!full" size="sm" :disabled="disabled" @click="pickerOpen = true">
        {{ picks.length ? 'Add more' : 'Pick maps' }}
      </BaseButton>
    </div>

    <ul v-if="picks.length" class="map-picks__list">
      <li v-for="row in rows" :key="row.diff.id" class="map-picks__row">
        <WarMapRow :difficulty="row.diff">
          <span v-if="row.flag" class="map-picks__flag" role="alert">{{ row.flag }}</span>
          <BaseButton size="sm" :disabled="disabled" @click="remove(row.diff.id)">Remove</BaseButton>
        </WarMapRow>
      </li>
    </ul>
    <p v-else class="map-picks__empty">No maps picked yet.</p>

    <MapPickerModal
      v-if="pickerOpen"
      title="Pick war maps"
      ranked-only
      initial-multi
      :mode-toggle="false"
      :limit="remaining"
      :fixed-filters="fixedFilters"
      :used-difficulty-ids="pickedIds"
      used-label="Picked"
      disable-used
      :blocked-label="bannedLabel"
      :commit-label="(n) => `Add ${n} ${n === 1 ? 'map' : 'maps'}`"
      @close="pickerOpen = false"
      @pick="add"
    />
  </div>
</template>

<style scoped>
.map-picks {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.map-picks__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.map-picks__count {
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-secondary);
}

.map-picks__count--full {
  color: var(--success);
}

.map-picks__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.map-picks__row {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.map-picks__row:last-child {
  border-bottom: none;
}

.map-picks__row:nth-child(even) {
  background: var(--bg-elevated);
}

.map-picks__flag {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--error);
}

.map-picks__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
