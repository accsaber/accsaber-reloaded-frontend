<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import BatchListView from '@/components/domain/BatchListView.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useAuthStore } from '@/stores/auth'
import type { BatchResponse } from '@/types/api/batches'
import type { MapDisplay, Tab } from '@/types/display'
import type { BatchStatus } from '@/types/enums'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { computed, ref, watch } from 'vue'

const PAGE_SIZE = 20
const STATUS_TABS: Tab[] = [
  { key: '', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'RELEASE_READY', label: 'Release Ready' },
  { key: 'RELEASED', label: 'Released' },
]

const authStore = useAuthStore()
const { queryRef } = useQueryParams()

usePageMeta({
  title: 'Batches | AccSaber Ranking',
  description: 'Manage ranking batches.',
})

const isHead = computed(() => authStore.hasRole('RANKING_HEAD'))
const status = queryRef<BatchStatus>('status')

const { currentPage, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const batches = ref<BatchResponse[]>([])
const totalPages = ref(0)
const loading = ref(true)

function setStatus(value: string) {
  if (currentPage.value !== 1) setPage(1)
  status.value = value as BatchStatus | ''
}

const countKey = computed(() => `ranking-batches:${status.value}:${currentPage.value}`)

let requestId = 0

async function fetchBatches() {
  const id = ++requestId
  loading.value = true
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const res = await listBatches({
      page: currentPage.value - 1,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
      status: status.value || undefined,
    })
    rememberCount(countKey.value, res.content.length)
    if (id !== requestId) return
    batches.value = res.content
    totalPages.value = res.totalPages
  } catch {
    if (id !== requestId) return
    batches.value = []
    totalPages.value = 0
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch([status, currentPage], fetchBatches, { immediate: true })

function mapRouteTo(map: Pick<MapDisplay, 'difficultyId'>) {
  return { name: 'ranking-map-detail', params: { ref: map.difficultyId } }
}

function builderRoute(batchId?: string) {
  return { name: 'ranking-batch-builder', params: batchId ? { batchId } : {} }
}

const releasing = ref<{ id: string; name: string; count: number } | null>(null)
const releaseBusy = ref(false)
const releaseError = ref<string | null>(null)

function askRelease(batch: { id: string; name: string; difficulties: unknown[] }) {
  releaseError.value = null
  releasing.value = { id: batch.id, name: batch.name, count: batch.difficulties.length }
}

async function release() {
  if (!releasing.value) return
  releaseBusy.value = true
  releaseError.value = null
  try {
    const { releaseBatch } = await import('@/api/ranking/batches')
    await releaseBatch(releasing.value.id)
    releasing.value = null
    await fetchBatches()
  } catch (err) {
    releaseError.value = parseApiError(err, 'Could not release the batch').message
  } finally {
    releaseBusy.value = false
  }
}
</script>

<template>
  <div class="batches-page">
    <header class="batches-page__header">
      <h1>Batches</h1>
      <BaseButton v-if="isHead" variant="primary" :href="$router.resolve(builderRoute()).href">Create Batch</BaseButton>
    </header>

    <BaseTabs class="batches-page__status" variant="segmented" label="Batch status" :tabs="STATUS_TABS" :model-value="status" @update:model-value="setStatus" />

    <BatchListView
      :batches="batches"
      :loading="loading && batches.length === 0"
      :refreshing="loading && batches.length > 0"
      :map-route-to="mapRouteTo"
      empty-message="No batches found"
      collapsible
      :placeholders="knownCount(countKey, PAGE_SIZE)"
    >
      <template v-if="isHead" #actions="{ batch }">
        <BaseButton v-if="batch.status === 'RELEASE_READY'" variant="primary" @click="askRelease(batch)">Release</BaseButton>
        <BaseButton :href="$router.resolve(builderRoute(batch.id)).href">
          {{ batch.status === 'DRAFT' ? 'Edit' : 'Rename' }}
        </BaseButton>
      </template>
    </BatchListView>

    <div class="batches-page__pages">
      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
    </div>

    <ConfirmModal
      :open="releasing !== null"
      title="Release Batch"
      :message="`Release ${releasing?.name} with ${releasing?.count} difficulties? Every map in it gets ranked and scores are backfilled. This cannot be undone.`"
      confirm-label="Release"
      destructive
      :loading="releaseBusy"
      :error="releaseError"
      @confirm="release"
      @close="releasing = null"
    />
  </div>
</template>

<style scoped>
.batches-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.batches-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.batches-page__status {
  align-self: flex-start;
}

.batches-page__pages {
  min-height: var(--control-h);
}
</style>
