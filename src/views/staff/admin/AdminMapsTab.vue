<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MapDifficultyResponse } from '@/types/api/maps'
import type { MapDifficultyStatus } from '@/types/enums'
import AdminTable from '@/components/admin/AdminTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { DIFF_COLOR } from '@/utils/constants'

const searchInput = ref('')
const search = useDebouncedRef(searchInput, 300)
const statusFilter = ref<MapDifficultyStatus | ''>('')
const page = ref(1)
const size = 25

const difficulties = ref<MapDifficultyResponse[]>([])
const totalPages = ref(0)
const totalElements = ref(0)
const loading = ref(false)
const actionLoading = ref<Record<string, boolean>>({})

const editingComplexityId = ref<string | null>(null)
const editComplexityValue = ref('')


async function fetchDifficulties() {
  loading.value = true
  try {
    const { getRankingDifficulties } = await import('@/api/ranking/maps')
    const res = await getRankingDifficulties({
      page: page.value - 1,
      size,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
    })
    difficulties.value = res.content
    totalPages.value = res.totalPages
    totalElements.value = res.totalElements
  } finally {
    loading.value = false
  }
}

watch([search, statusFilter], () => {
  page.value = 1
  fetchDifficulties()
}, { immediate: true })

watch(page, () => {
  fetchDifficulties()
})

function startEdit(diff: MapDifficultyResponse) {
  editingComplexityId.value = diff.id
  editComplexityValue.value = String(diff.complexity)
}

async function saveComplexity(diff: MapDifficultyResponse) {
  const val = parseFloat(editComplexityValue.value)
  editingComplexityId.value = null
  if (isNaN(val) || val === diff.complexity) return
  actionLoading.value[diff.id] = true
  try {
    const { updateMapComplexity } = await import('@/api/ranking/maps')
    const updated = await updateMapComplexity(diff.id, { complexity: val })
    const idx = difficulties.value.findIndex((d) => d.id === diff.id)
    if (idx !== -1) difficulties.value[idx] = updated
  } finally {
    delete actionLoading.value[diff.id]
  }
}

async function setStatus(diff: MapDifficultyResponse, status: MapDifficultyStatus) {
  actionLoading.value[diff.id] = true
  try {
    const { updateMapStatus } = await import('@/api/ranking/maps')
    const updated = await updateMapStatus(diff.id, { status })
    const idx = difficulties.value.findIndex((d) => d.id === diff.id)
    if (idx !== -1) difficulties.value[idx] = updated
  } finally {
    delete actionLoading.value[diff.id]
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'RANKED', label: 'Ranked' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'QUEUE', label: 'In Queue' },
]

const NEXT_STATUS: Partial<Record<MapDifficultyStatus, MapDifficultyStatus>> = {
  QUEUE: 'QUALIFIED',
  QUALIFIED: 'RANKED',
}

</script>

<template>
  <div class="tab">
    <div class="tab__header">
      <div>
        <h2 class="tab__title">Map Difficulties</h2>
        <p class="tab__meta">{{ totalElements.toLocaleString() }} difficulties</p>
      </div>
      <div class="filter-row">
        <BaseSelect v-model="statusFilter" :options="STATUS_OPTIONS" style="width: 160px" />
        <BaseInput v-model="searchInput" placeholder="Search maps…" style="width: 240px" />
      </div>
    </div>

    <AdminTable :items="difficulties" :loading="loading" :loading-rows="size" empty-message="No maps found">
      <template #head>
        <th>Map</th>
        <th style="width: 80px">Diff</th>
        <th style="width: 110px">Status</th>
        <th style="width: 150px">Complexity</th>
        <th class="right">Actions</th>
      </template>
      <template #default="{ item }">
        <td>
          <div class="map-cell">
            <img :src="item.coverUrl" class="cover" :alt="item.songName" loading="lazy" />
            <div class="map-info">
              <span class="map-name">{{ item.songName }}</span>
              <span class="map-author">{{ item.songAuthor }}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="diff-label" :style="{ color: DIFF_COLOR[item.difficulty] ?? 'var(--text-secondary)' }">
            {{ item.difficulty.replace('EXPERT_PLUS', 'Ex+').replace('EXPERT', 'Ex') }}
          </span>
        </td>
        <td>
          <span class="status-pill" :class="`status-pill--${item.status.toLowerCase()}`">
            {{ item.status }}
          </span>
        </td>
        <td class="tight">
          <div class="complexity-cell" @click.stop>
            <template v-if="editingComplexityId === item.id">
              <input
                v-model="editComplexityValue"
                class="complexity-input"
                type="number"
                step="0.01"
                autofocus
                @keyup.enter="saveComplexity(item)"
                @keyup.esc="editingComplexityId = null"
                @blur="saveComplexity(item)"
              />
            </template>
            <template v-else>
              <ComplexityBadge :complexity="item.complexity" />
              <button class="edit-btn" aria-label="Edit complexity" @click="startEdit(item)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </template>
          </div>
        </td>
        <td class="right tight">
          <div class="actions">
            <BaseButton
              v-if="NEXT_STATUS[item.status]"
              size="sm"
              variant="primary"
              :loading="actionLoading[item.id]"
              @click="setStatus(item, NEXT_STATUS[item.status]!)"
            >
              → {{ NEXT_STATUS[item.status] }}
            </BaseButton>
            <BaseButton size="sm" :href="`/maps/${item.mapId}?difficultyId=${item.id}`">View</BaseButton>
          </div>
        </td>
      </template>
    </AdminTable>

    <PaginationControls :page="page" :total-pages="totalPages" @update:page="(p: number) => { page = p }" />
  </div>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); }

.tab__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-lg); flex-wrap: wrap; }
.tab__title { font-size: var(--text-section-heading); font-weight: 600; color: var(--text-primary); margin: 0; }
.tab__meta { font-size: var(--text-caption); color: var(--text-secondary); margin: 2px 0 0; }
.filter-row { display: flex; align-items: center; gap: var(--space-sm); }

.map-cell { display: flex; align-items: center; gap: var(--space-sm); }
.cover { width: 32px; height: 32px; border-radius: var(--radius-btn); object-fit: cover; flex-shrink: 0; }
.map-info { display: flex; flex-direction: column; }
.map-name { font-size: var(--text-body); color: var(--text-primary); }
.map-author { font-size: var(--text-caption); color: var(--text-secondary); }

.diff-label { font-size: var(--text-caption); font-weight: 600; font-family: var(--font-mono); }

.complexity-cell { display: flex; align-items: center; gap: var(--space-xs); }
.complexity-input {
  width: 80px;
  padding: 3px 6px;
  background: var(--bg-base);
  border: 1px solid var(--accent);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  outline: none;
}

.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 100ms, color 100ms;
}
tr:hover .edit-btn { opacity: 1; }
.edit-btn:hover { color: var(--text-primary); }

.actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-sm); }
</style>
