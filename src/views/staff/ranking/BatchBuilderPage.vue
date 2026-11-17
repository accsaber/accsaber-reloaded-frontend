<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import IconButton from '@/components/common/IconButton.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { usePageMeta } from '@/composables/usePageMeta'
import { useCategoryStore } from '@/stores/categories'
import type { BatchResponse } from '@/types/api/batches'
import type { MapDifficultyResponse } from '@/types/api/maps'
import type { CategoryInfo } from '@/types/display'
import { CATEGORY_ORDER } from '@/utils/constants'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BatchCategoryColumns from './BatchCategoryColumns.vue'
import BatchMapCard from './BatchMapCard.vue'

const QUEUE_PAGE_SIZE = 200
const OTHER_BATCHES_SIZE = 100

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()

const batchId = computed(() => (route.params.batchId as string) || null)
const isNew = computed(() => !batchId.value)

usePageMeta({ title: computed(() => (isNew.value ? 'New Batch | Ranking' : 'Edit Batch | Ranking')) })

const batch = ref<BatchResponse | null>(null)
const name = ref('')
const description = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const queue = ref<MapDifficultyResponse[]>([])
const queueLoading = ref(true)
const selectedIds = ref<Set<string>>(new Set())
const otherBatchOf = ref<Map<string, string>>(new Map())

const isDraft = computed(() => !batch.value || batch.value.status === 'DRAFT')
const isReleaseReady = computed(() => batch.value?.status === 'RELEASE_READY')
const trimmedName = computed(() => name.value.trim())
const trimmedDescription = computed(() => description.value.trim())

const detailsDirty = computed(
  () => !!batch.value && (trimmedName.value !== batch.value.name || trimmedDescription.value !== (batch.value.description ?? '')),
)

const mapsDirty = computed(() => {
  const current = batch.value?.difficulties ?? []
  return current.length !== selectedIds.value.size || current.some((d) => !selectedIds.value.has(d.id))
})

const canSave = computed(
  () => !!trimmedName.value && (isNew.value || detailsDirty.value || (isDraft.value && mapsDirty.value)),
)

const categories = computed<CategoryInfo[]>(() =>
  categoryStore.categoryInfoList
    .filter((c) => c.code !== 'xp' && c.code !== 'overall')
    .sort((a, b) => (CATEGORY_ORDER as readonly string[]).indexOf(a.code) - (CATEGORY_ORDER as readonly string[]).indexOf(b.code)),
)

function groupByCategory(difficulties: MapDifficultyResponse[]) {
  const groups = new Map<string, MapDifficultyResponse[]>(categories.value.map((c) => [c.code, []]))
  const fallback = categories.value[0]?.code ?? 'overall'
  for (const diff of difficulties) {
    const code = categoryStore.getCategoryCode(diff.categoryId) ?? fallback
    groups.get(groups.has(code) ? code : fallback)?.push(diff)
  }
  return groups
}

const selected = computed(() => {
  const byId = new Map<string, MapDifficultyResponse>()
  for (const diff of [...queue.value, ...(batch.value?.difficulties ?? [])]) {
    if (selectedIds.value.has(diff.id)) byId.set(diff.id, diff)
  }
  return [...byId.values()]
})

const qualified = computed(() => queue.value.filter((d) => !selectedIds.value.has(d.id) && d.status === 'QUALIFIED'))
const queued = computed(() => queue.value.filter((d) => !selectedIds.value.has(d.id) && d.status === 'QUEUE'))

const selectedGroups = computed(() => groupByCategory(selected.value))
const qualifiedGroups = computed(() => groupByCategory(qualified.value))
const queuedGroups = computed(() => groupByCategory(queued.value))

let loadId = 0

async function fetchBatch() {
  const id = batchId.value
  if (!id) {
    loading.value = false
    return
  }
  try {
    const { getBatch } = await import('@/api/ranking/batches')
    const fetched = await getBatch(id)
    if (id !== batchId.value) return
    batch.value = fetched
    name.value = fetched.name
    description.value = fetched.description ?? ''
    selectedIds.value = new Set(fetched.difficulties.map((d) => d.id))
  } catch (err) {
    if (id === batchId.value) error.value = parseApiError(err, 'Could not load the batch').message
  } finally {
    if (id === batchId.value) loading.value = false
  }
}

async function fetchQueue() {
  const request = loadId
  try {
    const { getRankingDifficulties } = await import('@/api/ranking/maps')
    const [qualifiedPage, queuePage] = await Promise.all([
      getRankingDifficulties({ page: 0, size: QUEUE_PAGE_SIZE, status: 'QUALIFIED', sort: 'createdAt,desc' } as never),
      getRankingDifficulties({ page: 0, size: QUEUE_PAGE_SIZE, status: 'QUEUE', sort: 'createdAt,desc' } as never),
    ])
    if (request === loadId) queue.value = [...qualifiedPage.content, ...queuePage.content]
  } catch {
    if (request === loadId) queue.value = []
  } finally {
    if (request === loadId) queueLoading.value = false
  }
}

async function fetchOtherBatches() {
  const request = loadId
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const [drafts, ready] = await Promise.all([
      listBatches({ status: 'DRAFT', page: 0, size: OTHER_BATCHES_SIZE }),
      listBatches({ status: 'RELEASE_READY', page: 0, size: OTHER_BATCHES_SIZE }),
    ])
    if (request !== loadId) return
    const owners = new Map<string, string>()
    for (const other of [...drafts.content, ...ready.content]) {
      if (other.id === batchId.value) continue
      for (const diff of other.difficulties) owners.set(diff.id, other.name)
    }
    otherBatchOf.value = owners
  } catch {
    if (request === loadId) otherBatchOf.value = new Map()
  }
}

watch(
  batchId,
  () => {
    loadId++
    loading.value = !!batchId.value
    queueLoading.value = true
    void Promise.all([fetchBatch(), fetchQueue(), fetchOtherBatches()])
  },
  { immediate: true },
)

const { confirmModal, ask } = useConfirmAction()

function addWarnings(diff: MapDifficultyResponse): string[] {
  const warnings: string[] = []
  if (diff.status === 'QUEUE') warnings.push('This map is still in the queue and is not qualified yet.')
  if (diff.headCriteriaVote === 'DOWNVOTE') warnings.push('A head ranker voted criteria fail on it.')
  else if (diff.criteriaDownvotes > diff.criteriaUpvotes) warnings.push('Its criteria votes are negative, so it may need a head override.')
  else if (!diff.criteriaUpvotes && !diff.criteriaDownvotes && diff.criteriaStatus !== 'PASSED') warnings.push('It has no criteria votes yet.')
  const owner = otherBatchOf.value.get(diff.id)
  if (owner) warnings.push(`It is already in ${owner}.`)
  return warnings
}

function add(diffId: string) {
  selectedIds.value = new Set([...selectedIds.value, diffId])
}

function requestAdd(diffId: string) {
  const diff = queue.value.find((d) => d.id === diffId)
  if (!diff || !isDraft.value) return
  const warnings = addWarnings(diff)
  if (!warnings.length) return add(diffId)
  ask({
    title: 'Add Anyway?',
    message: warnings.join(' '),
    confirmLabel: 'Add Anyway',
    run: () => add(diffId),
  })
}

function remove(diffId: string) {
  if (!isDraft.value) return
  const next = new Set(selectedIds.value)
  next.delete(diffId)
  selectedIds.value = next
}

async function syncMaps(id: string) {
  const { addDifficultyToBatch, removeDifficultyFromBatch } = await import('@/api/ranking/batches')
  const current = new Set(batch.value?.difficulties.map((d) => d.id) ?? [])
  for (const diffId of current) {
    if (!selectedIds.value.has(diffId)) await removeDifficultyFromBatch(id, diffId)
  }
  for (const diffId of selectedIds.value) {
    if (!current.has(diffId)) await addDifficultyToBatch(id, diffId)
  }
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  error.value = ''
  try {
    const api = await import('@/api/ranking/batches')
    let id = batchId.value
    if (!id) {
      const created = await api.createBatch({ name: trimmedName.value, description: trimmedDescription.value })
      id = created.id
      await syncMaps(id)
      await router.replace({ name: 'ranking-batch-builder', params: { batchId: id } })
      return
    }
    if (detailsDirty.value) {
      await api.updateBatch(id, { name: trimmedName.value, description: trimmedDescription.value || null })
    }
    if (isDraft.value) await syncMaps(id)
    await fetchBatch()
  } catch (err) {
    error.value = parseApiError(err, 'Could not save the batch').message
  } finally {
    saving.value = false
  }
}

function askMarkReady() {
  ask({
    title: 'Mark Ready',
    message: 'Mark this batch as release ready? Its maps get locked.',
    confirmLabel: 'Mark Ready',
    run: async () => {
      const { updateBatchStatus } = await import('@/api/ranking/batches')
      await updateBatchStatus(batchId.value!, { status: 'RELEASE_READY' })
      await fetchBatch()
    },
  })
}

function askRelease() {
  ask({
    title: 'Release Batch',
    message: `Release ${trimmedName.value} with ${selectedIds.value.size} difficulties? Every map in it gets ranked and scores are backfilled. This cannot be undone.`,
    confirmLabel: 'Release',
    destructive: true,
    run: async () => {
      const { releaseBatch } = await import('@/api/ranking/batches')
      await releaseBatch(batchId.value!)
      await router.push({ name: 'staff-ranking-head' })
    },
  })
}

async function saveComplexity(diffId: string, complexity: number) {
  error.value = ''
  try {
    const { updateMapComplexity } = await import('@/api/ranking/maps')
    await updateMapComplexity(diffId, { complexity })
    await Promise.all([fetchQueue(), fetchBatch()])
  } catch (err) {
    error.value = parseApiError(err, 'Could not change the complexity').message
  }
}
</script>

<template>
  <div class="batch-builder">
    <header class="batch-builder__header">
      <IconButton icon="back" label="Back to batches" @click="router.push({ name: 'staff-ranking-head' })" />
      <div class="batch-builder__titles">
        <input v-model="name" class="inline-edit batch-builder__name" placeholder="Batch name" aria-label="Name" maxlength="100" />
        <input v-model="description" class="inline-edit batch-builder__description" placeholder="Description" aria-label="Description" />
      </div>
      <div class="batch-builder__actions">
        <BaseButton v-if="isDraft && !isNew && selectedIds.size > 0" :disabled="canSave" @click="askMarkReady">Mark Ready</BaseButton>
        <BaseButton v-if="isReleaseReady" variant="destructive" @click="askRelease">Release</BaseButton>
        <BaseButton variant="primary" :loading="saving" :disabled="!canSave" @click="save">Save</BaseButton>
      </div>
    </header>

    <p class="caption batch-builder__status" :class="{ 'batch-builder__status--error': error }" :role="error ? 'alert' : undefined">
      {{ error || (isDraft ? '' : 'Maps are locked') }}
    </p>

    <section class="batch-builder__section">
      <h2 class="section-title">In This Batch <span class="caption">{{ selectedIds.size }}</span></h2>
      <BatchCategoryColumns :categories="categories" :groups="selectedGroups" :loading="loading">
        <template #card="{ diff }">
          <BatchMapCard :diff="diff" :action="isDraft ? 'remove' : null" :editable="isDraft" @act="remove" @save-complexity="saveComplexity" />
        </template>
      </BatchCategoryColumns>
    </section>

    <template v-if="isDraft">
      <section v-if="queueLoading || qualified.length" class="batch-builder__section">
        <h2 class="section-title">Qualified <span v-if="!queueLoading" class="caption">{{ qualified.length }}</span></h2>
        <BatchCategoryColumns :categories="categories" :groups="qualifiedGroups" :loading="queueLoading">
          <template #card="{ diff }">
            <BatchMapCard :diff="diff" action="add" :batch-label="otherBatchOf.get(diff.id) ?? null" @act="requestAdd" />
          </template>
        </BatchCategoryColumns>
      </section>

      <section v-if="!queueLoading && queued.length" class="batch-builder__section">
        <h2 class="section-title">Queued <span class="caption">{{ queued.length }}</span></h2>
        <BatchCategoryColumns :categories="categories" :groups="queuedGroups">
          <template #card="{ diff }">
            <BatchMapCard :diff="diff" action="add" :batch-label="otherBatchOf.get(diff.id) ?? null" @act="requestAdd" />
          </template>
        </BatchCategoryColumns>
      </section>

      <EmptyState v-if="!queueLoading && !qualified.length && !queued.length" message="No maps left to add" />
    </template>

    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.batch-builder {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

.batch-builder__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.batch-builder__header > .icon-button {
  margin-top: var(--space-sm);
}

.batch-builder__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.batch-builder__name {
  width: 100%;
  font-family: var(--font-sans);
  font-size: var(--text-page-title);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
}

.batch-builder__description {
  width: 100%;
  font: inherit;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.batch-builder__actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-sm);
}

.batch-builder__status {
  min-height: 1lh;
  margin-top: calc(-1 * var(--space-md));
}

.batch-builder__status--error {
  color: var(--error);
}

.batch-builder__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.batch-builder__section .section-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0;
}

@media (max-width: 767px) {
  .batch-builder__header {
    flex-wrap: wrap;
  }

  .batch-builder__actions {
    flex-basis: 100%;
    justify-content: flex-end;
  }
}
</style>
