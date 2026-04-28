<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BatchResponse } from '@/types/api/batches'
import type { BatchStatus } from '@/types/enums'
import AdminTable from '@/components/admin/AdminTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import { DIFF_COLOR } from '@/utils/constants'

const page = ref(1)
const size = 15
const statusFilter = ref<BatchStatus | ''>('')
const totalPages = ref(0)
const totalElements = ref(0)
const batches = ref<BatchResponse[]>([])
const loading = ref(false)
const expandedId = ref<string | null>(null)

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'release_ready', label: 'Release Ready' },
  { value: 'released', label: 'Released' },
]

const STATUS_STYLE: Record<string, string> = {
  draft: 'var(--text-tertiary)',
  release_ready: 'var(--warning)',
  released: 'var(--success)',
}

async function fetchBatches() {
  loading.value = true
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const res = await listBatches({
      page: page.value - 1,
      size,
      status: statusFilter.value || undefined,
      sort: 'createdAt,DESC',
    })
    batches.value = res.content
    totalPages.value = res.totalPages
    totalElements.value = res.totalElements
  } finally {
    loading.value = false
  }
}

watch(statusFilter, () => {
  page.value = 1
  fetchBatches()
}, { immediate: true })

watch(page, () => {
  fetchBatches()
})

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

</script>

<template>
  <div class="tab">
    <div class="tab__header">
      <div>
        <h2 class="tab__title">Batches</h2>
        <p class="tab__meta">{{ totalElements }} batches</p>
      </div>
      <BaseSelect v-model="statusFilter" :options="STATUS_OPTIONS" style="width: 170px" />
    </div>

    <AdminTable :items="batches" :loading="loading" :loading-rows="size" empty-message="No batches found">
      <template #head>
        <th>Name</th>
        <th style="width: 120px">Status</th>
        <th class="mono" style="width: 60px">Maps</th>
        <th class="mono" style="width: 130px">Released</th>
        <th class="mono" style="width: 130px">Created</th>
        <th class="right" style="width: 80px" />
      </template>
      <template #default="{ item }">
        <td>
          <div class="batch-name">
            <span>{{ item.name }}</span>
            <span v-if="item.description" class="batch-desc">{{ item.description }}</span>
          </div>
        </td>
        <td>
          <span class="status-pill" :style="{ color: STATUS_STYLE[item.status], borderColor: STATUS_STYLE[item.status] }">
            {{ item.status.replace('_', ' ') }}
          </span>
        </td>
        <td class="mono">{{ item.difficulties.length }}</td>
        <td class="mono muted">{{ formatDate(item.releasedAt) }}</td>
        <td class="mono muted">{{ formatDate(item.createdAt) }}</td>
        <td class="right">
          <BaseButton v-if="item.difficulties.length" size="sm" @click="toggleExpand(item.id)">
            {{ expandedId === item.id ? 'Hide' : 'View' }}
          </BaseButton>
        </td>
      </template>
    </AdminTable>

    <div v-if="expandedId" class="batch-detail">
      <div class="batch-detail__header">
        <h3 class="batch-detail__title">{{ batches.find((b) => b.id === expandedId)?.name }} - Maps</h3>
        <BaseButton size="sm" @click="expandedId = null">Close</BaseButton>
      </div>
      <div class="diff-grid">
        <div
          v-for="diff in batches.find((b) => b.id === expandedId)?.difficulties ?? []"
          :key="diff.id"
          class="diff-card"
        >
          <img :src="diff.coverUrl" class="diff-card__cover" :alt="diff.songName" loading="lazy" />
          <div class="diff-card__info">
            <span class="diff-card__name">{{ diff.songName }}</span>
            <span class="diff-card__author">{{ diff.songAuthor }}</span>
          </div>
          <span class="diff-card__diff" :style="{ color: DIFF_COLOR[diff.difficulty] ?? 'var(--text-secondary)' }">
            {{ diff.difficulty.replace('EXPERT_PLUS', 'Ex+').replace('EXPERT', 'Ex') }}
          </span>
          <ComplexityBadge :complexity="diff.complexity" />
        </div>
      </div>
    </div>

    <PaginationControls :page="page" :total-pages="totalPages" @update:page="(p: number) => { page = p }" />
  </div>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); }

.tab__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-lg); }
.tab__title { font-size: var(--text-section-heading); font-weight: 600; color: var(--text-primary); margin: 0; }
.tab__meta { font-size: var(--text-caption); color: var(--text-secondary); margin: 2px 0 0; }

.batch-name { display: flex; flex-direction: column; }
.batch-desc { font-size: var(--text-caption); color: var(--text-secondary); }

.status-pill {
  font-size: var(--text-caption);
  font-family: var(--font-mono);
  font-weight: 500;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid;
  background: transparent;
}

.batch-detail {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.batch-detail__header { display: flex; align-items: center; justify-content: space-between; }
.batch-detail__title { font-size: var(--text-body); font-weight: 600; color: var(--text-primary); margin: 0; }

.diff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-sm); }
.diff-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}
.diff-card__cover { width: 32px; height: 32px; border-radius: var(--radius-btn); object-fit: cover; flex-shrink: 0; }
.diff-card__info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.diff-card__name { font-size: var(--text-body); color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.diff-card__author { font-size: var(--text-caption); color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.diff-card__diff { font-size: var(--text-caption); font-weight: 600; font-family: var(--font-mono); flex-shrink: 0; }
</style>
