<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapNameCell from '@/components/domain/MapNameCell.vue'
import type { MapResponse } from '@/types/api/maps'
import type { TableColumn } from '@/types/display'
import { computed, ref, watch } from 'vue'

const PAGE_SIZE = 25
const COLUMNS: TableColumn[] = [
  { key: 'cover', label: '', width: '76px' },
  { key: 'map', label: 'Map', primary: true },
  { key: 'actions', label: '', align: 'right', width: '110px', noLink: true },
]

const search = ref('')
const page = ref(1)
const maps = ref<MapResponse[]>([])
const totalPages = ref(0)
const loading = ref(true)
const error = ref('')
const busyId = ref<string | null>(null)

const rows = computed<Record<string, unknown>[]>(() => maps.value.map((map) => ({ id: map.id, map })))

function mapOf(row: Record<string, unknown>): MapResponse {
  return row.map as MapResponse
}

let requestId = 0

async function load() {
  const id = ++requestId
  loading.value = true
  error.value = ''
  const query = search.value.trim()
  try {
    const { getRankingMaps } = await import('@/api/ranking/maps')
    const res = await getRankingMaps({ page: page.value - 1, size: PAGE_SIZE, ...(query ? { search: query } : { warBanned: true }) })
    if (id !== requestId) return
    maps.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    if (id === requestId) error.value = parseApiError(err, 'Could not load the maps').message
  } finally {
    if (id === requestId) loading.value = false
  }
}

async function toggle(map: MapResponse) {
  busyId.value = map.id
  error.value = ''
  try {
    const { setMapWarBanned } = await import('@/api/ranking/maps')
    const saved = await setMapWarBanned(map.id, !map.warBanned)
    if (search.value.trim()) maps.value = maps.value.map((m) => (m.id === saved.id ? saved : m))
    else await load()
  } catch (err) {
    error.value = parseApiError(err, 'Could not change that map').message
  } finally {
    busyId.value = null
  }
}

watch(search, () => {
  if (page.value === 1) void load()
  else page.value = 1
})
watch(page, load, { immediate: true })
</script>

<template>
  <div class="banned-maps">
    <SearchBox v-model="search" placeholder="Search maps to ban" />
    <p v-if="error" class="caption banned-maps__error" role="alert">{{ error }}</p>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !maps.length" :refreshing="loading && maps.length > 0"
      :loading-rows="5" :row-height="64" row-key="id" :empty-message="search.trim() ? 'No maps found' : 'No banned maps'">
      <template #cell-cover="{ row }">
        <CoverImage :source="mapOf(row)" :size="44" />
      </template>
      <template #cell-map="{ row }">
        <MapNameCell :name="mapOf(row).songName" :sub-name="mapOf(row).songSubName" :artist="mapOf(row).songAuthor"
          :mapper="mapOf(row).mapAuthor">
          <DifficultyBadge v-for="diff in mapOf(row).difficulties" :key="diff.id" :difficulty="diff.difficulty" />
        </MapNameCell>
      </template>
      <template #cell-actions="{ row }">
        <BaseButton size="sm" :variant="mapOf(row).warBanned ? 'default' : 'destructive'" :loading="busyId === row.id"
          @click="toggle(mapOf(row))">
          {{ mapOf(row).warBanned ? 'Unban' : 'Ban' }}
        </BaseButton>
      </template>
    </DataTable>

    <div class="banned-maps__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="page = $event" />
    </div>
  </div>
</template>

<style scoped>
.banned-maps {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.banned-maps__error {
  color: var(--error);
}

.banned-maps__pages {
  min-height: var(--control-h);
}
</style>
