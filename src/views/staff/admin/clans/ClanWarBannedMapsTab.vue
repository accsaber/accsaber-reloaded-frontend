<script setup lang="ts">
import { parseApiError } from '@/api/client'
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { pickCoverUrl } from '@/utils/media'
import type { MapResponse } from '@/types/api/maps'
import type { Page } from '@/types/pagination'
import { ref, watch } from 'vue'

const PAGE_SIZE = 25

const search = ref('')
const page = ref(1)
const maps = ref<Page<MapResponse> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const query = search.value.trim()
  try {
    const { getRankingMaps } = await import('@/api/ranking/maps')
    maps.value = await getRankingMaps({
      page: page.value - 1,
      size: PAGE_SIZE,
      ...(query ? { search: query } : { warBanned: true }),
    })
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the maps.').message
  } finally {
    loading.value = false
  }
}

async function toggle(map: MapResponse) {
  busyId.value = map.id
  error.value = null
  try {
    const { setMapWarBanned } = await import('@/api/ranking/maps')
    const saved = await setMapWarBanned(map.id, !map.warBanned)
    if (search.value.trim() && maps.value) {
      maps.value.content = maps.value.content.map((m) => (m.id === saved.id ? saved : m))
    } else {
      await load()
    }
  } catch (err) {
    error.value = parseApiError(err, 'Could not change that map.').message
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
    <h2 class="section-title">Banned maps</h2>
    <SearchBox v-model="search" placeholder="Search maps to ban..." />
    <p v-if="error" class="banned-maps__error" role="alert">{{ error }}</p>

    <AdminTable
      :items="maps?.content ?? []"
      :loading="loading"
      :loading-rows="5"
      :empty-message="search.trim() ? 'No maps found' : 'No banned maps'"
    >
      <template #head>
        <th>Map</th>
        <th>Difficulties</th>
        <th class="right" style="width: 120px">Actions</th>
      </template>
      <template #default="{ item: map }">
        <td>
          <span class="banned-maps__map">
            <img class="banned-maps__cover" :src="pickCoverUrl(map)" alt="" loading="lazy" decoding="async" />
            <span class="banned-maps__song">
              <SongTitle :name="map.songName" :sub-name="map.songSubName" />
              <span class="banned-maps__mapper">{{ map.mapAuthor }}</span>
            </span>
          </span>
        </td>
        <td>
          <span class="banned-maps__diffs">
            <DifficultyBadge v-for="diff in map.difficulties" :key="diff.id" :difficulty="diff.difficulty" />
          </span>
        </td>
        <td class="right">
          <BaseButton
            size="sm"
            :variant="map.warBanned ? 'default' : 'destructive'"
            :loading="busyId === map.id"
            @click="toggle(map)"
          >
            {{ map.warBanned ? 'Unban' : 'Ban' }}
          </BaseButton>
        </td>
      </template>
    </AdminTable>

    <PaginationControls
      v-if="(maps?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="maps!.totalPages"
      @update:page="page = $event"
    />
  </div>
</template>

<style scoped>
.banned-maps {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.banned-maps__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.banned-maps__map {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.banned-maps__cover {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: var(--radius-btn);
}

.banned-maps__song {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-weight: 600;
  color: var(--text-primary);
}

.banned-maps__mapper {
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--text-secondary);
}

.banned-maps__diffs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
</style>
