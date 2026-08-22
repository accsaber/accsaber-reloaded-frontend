<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
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

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()

const batchId = computed(() => (route.params.batchId as string) || null)
const isNew = computed(() => !batchId.value)

usePageMeta({ title: computed(() => isNew.value ? 'New Batch | Ranking' : 'Edit Batch | Ranking') })

const batch = ref<BatchResponse | null>(null)
const batchName = ref('')
const batchDescription = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const queueDifficulties = ref<MapDifficultyResponse[]>([])
const queueLoading = ref(true)

const batchDifficultyIds = ref<Set<string>>(new Set())

const isDraft = computed(() => !batch.value || batch.value.status === 'DRAFT')
const isReleaseReady = computed(() => batch.value?.status === 'RELEASE_READY')

const trimmedName = computed(() => batchName.value.trim())
const trimmedDescription = computed(() => batchDescription.value.trim())

const detailsDirty = computed(() => {
  if (!batch.value) return false
  return (
    trimmedName.value !== batch.value.name ||
    trimmedDescription.value !== (batch.value.description ?? '')
  )
})

const difficultiesDirty = computed(() => {
  if (!batch.value) return batchDifficultyIds.value.size > 0
  const current = batch.value.difficulties
  if (current.length !== batchDifficultyIds.value.size) return true
  return current.some((d) => !batchDifficultyIds.value.has(d.id))
})

const hasChanges = computed(() =>
  isNew.value || detailsDirty.value || (isDraft.value && difficultiesDirty.value)
)

const canSave = computed(() => !!trimmedName.value && hasChanges.value)

const activeCategories = computed<CategoryInfo[]>(() =>
  categoryStore.categoryInfoList
    .filter((c) => c.code !== 'xp' && c.code !== 'overall')
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.code as typeof CATEGORY_ORDER[number]) - CATEGORY_ORDER.indexOf(b.code as typeof CATEGORY_ORDER[number]))
)

function groupByCategory(difficulties: MapDifficultyResponse[]) {
  const groups = new Map<string, MapDifficultyResponse[]>()
  for (const cat of activeCategories.value) groups.set(cat.code, [])

  const fallback = activeCategories.value[0]?.code ?? 'overall'
  for (const diff of difficulties) {
    const code = categoryStore.getCategoryCode(diff.categoryId) ?? fallback
    const key = groups.has(code) ? code : fallback
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(diff)
  }

  return groups
}

const selectedDifficulties = computed(() => {
  const seen = new Set<string>()
  const selected: MapDifficultyResponse[] = []
  for (const diff of [...queueDifficulties.value, ...(batch.value?.difficulties ?? [])]) {
    if (!batchDifficultyIds.value.has(diff.id) || seen.has(diff.id)) continue
    seen.add(diff.id)
    selected.push(diff)
  }
  return selected
})

const availableQualified = computed(() =>
  queueDifficulties.value.filter((d) => !batchDifficultyIds.value.has(d.id) && d.status === 'QUALIFIED')
)

const availableQueued = computed(() =>
  queueDifficulties.value.filter((d) => !batchDifficultyIds.value.has(d.id) && d.status === 'QUEUE')
)

const batchByCategory = computed(() => groupByCategory(selectedDifficulties.value))
const qualifiedByCategory = computed(() => groupByCategory(availableQualified.value))
const queuedByCategory = computed(() => groupByCategory(availableQueued.value))

const totalSelected = computed(() => batchDifficultyIds.value.size)

async function fetchBatch() {
  if (!batchId.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { getBatch } = await import('@/api/ranking/batches')
    const b = await getBatch(batchId.value)
    batch.value = b
    batchName.value = b.name
    batchDescription.value = b.description ?? ''
    batchDifficultyIds.value = new Set(b.difficulties.map((d) => d.id))
  } catch {
    error.value = 'Failed to load batch.'
  }
  loading.value = false
}

const diffBatchMap = ref<Map<string, string>>(new Map())

async function fetchQueue() {
  queueLoading.value = true
  try {
    const { getRankingDifficulties } = await import('@/api/ranking/maps')
    const [qualifiedRes, queueRes] = await Promise.all([
      getRankingDifficulties({ page: 0, size: 200, status: 'QUALIFIED', sort: 'createdAt,desc' } as never),
      getRankingDifficulties({ page: 0, size: 200, status: 'QUEUE', sort: 'createdAt,desc' } as never),
    ])
    queueDifficulties.value = [...qualifiedRes.content, ...queueRes.content]
  } catch {
    queueDifficulties.value = []
  }
  queueLoading.value = false
}

async function fetchOtherBatches() {
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const [draftRes, readyRes] = await Promise.all([
      listBatches({ status: 'DRAFT', page: 0, size: 100 }),
      listBatches({ status: 'RELEASE_READY', page: 0, size: 100 }),
    ])
    const map = new Map<string, string>()
    for (const b of [...draftRes.content, ...readyRes.content]) {
      if (b.id === batchId.value) continue
      for (const d of b.difficulties) {
        map.set(d.id, b.name)
      }
    }
    diffBatchMap.value = map
  } catch {
    diffBatchMap.value = new Map()
  }
}

watch(batchId, () => {
  fetchBatch()
  fetchQueue()
  fetchOtherBatches()
}, { immediate: true })

const pendingAdd = ref<string | null>(null)
const pendingAddWarning = ref('')

function requestAdd(diffId: string) {
  if (!isDraft.value) return

  const diff = queueDifficulties.value.find((d) => d.id === diffId)
  if (!diff) return

  const warnings: string[] = []

  if (diff.status === 'QUEUE') {
    warnings.push('This map is still in QUEUE and has not been qualified yet.')
  }

  if (diff.headCriteriaVote === 'DOWNVOTE') {
    warnings.push('Head ranker voted criteria fail on this map.')
  } else if (diff.criteriaDownvotes > diff.criteriaUpvotes) {
    warnings.push('Criteria votes are negative - may require a RANKING_HEAD override.')
  } else if (diff.criteriaUpvotes === 0 && diff.criteriaDownvotes === 0 && diff.criteriaStatus !== 'PASSED') {
    warnings.push('No criteria votes yet.')
  }

  const otherBatch = diffBatchMap.value.get(diffId)
  if (otherBatch) {
    warnings.push(`This map is already in batch "${otherBatch}".`)
  }

  if (warnings.length > 0) {
    pendingAdd.value = diffId
    pendingAddWarning.value = warnings.join(' ')
    return
  }

  addToBatch(diffId)
}

function confirmAdd() {
  if (pendingAdd.value) {
    addToBatch(pendingAdd.value)
    pendingAdd.value = null
    pendingAddWarning.value = ''
  }
}

function cancelAdd() {
  pendingAdd.value = null
  pendingAddWarning.value = ''
}

function addToBatch(diffId: string) {
  batchDifficultyIds.value = new Set([...batchDifficultyIds.value, diffId])
}

function removeFromBatch(diffId: string) {
  if (!isDraft.value) return
  const next = new Set(batchDifficultyIds.value)
  next.delete(diffId)
  batchDifficultyIds.value = next
}

async function saveBatch() {
  if (!canSave.value) return
  saving.value = true
  error.value = ''

  try {
    const api = await import('@/api/ranking/batches')
    let id = batchId.value

    if (!id) {
      const created = await api.createBatch({
        name: trimmedName.value,
        description: trimmedDescription.value,
      })
      id = created.id
      batch.value = created
      batchDescription.value = created.description ?? ''
      router.replace({ name: 'ranking-batch-builder', params: { batchId: id } })
    } else if (detailsDirty.value) {
      await api.updateBatch(id, {
        name: trimmedName.value,
        description: trimmedDescription.value || null,
      })
    }

    if (isDraft.value) {
      await syncDifficulties(id)
    }

    await fetchBatch()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save batch.'
  } finally {
    saving.value = false
  }
}

async function syncDifficulties(id: string) {
  const { addDifficultyToBatch, removeDifficultyFromBatch } = await import('@/api/ranking/batches')

  const currentIds = new Set(batch.value?.difficulties.map((d) => d.id) ?? [])
  const targetIds = batchDifficultyIds.value

  const toRemove = [...currentIds].filter((diffId) => !targetIds.has(diffId))
  const toAdd = [...targetIds].filter((diffId) => !currentIds.has(diffId))

  for (const diffId of toRemove) {
    await removeDifficultyFromBatch(id, diffId)
  }
  for (const diffId of toAdd) {
    await addDifficultyToBatch(id, diffId)
  }
}

const showMarkReady = ref(false)
const markReadyLoading = ref(false)

async function handleMarkReady() {
  if (!batchId.value) return
  markReadyLoading.value = true
  try {
    const { updateBatchStatus } = await import('@/api/ranking/batches')
    await updateBatchStatus(batchId.value, { status: 'RELEASE_READY' })
    showMarkReady.value = false
    await fetchBatch()
  } catch {
  } finally {
    markReadyLoading.value = false
  }
}

const showRelease = ref(false)
const releaseLoading = ref(false)

async function handleRelease() {
  if (!batchId.value) return
  releaseLoading.value = true
  try {
    const { releaseBatch } = await import('@/api/ranking/batches')
    await releaseBatch(batchId.value)
    showRelease.value = false
    router.push({ name: 'staff-ranking-head' })
  } catch {
  } finally {
    releaseLoading.value = false
  }
}

function goBack() {
  router.push({ name: 'staff-ranking-head' })
}

function goToDetail(diffId: string) {
  router.push({ name: 'ranking-map-detail', params: { difficultyId: diffId } })
}

const editingComplexity = ref<string | null>(null)

async function saveComplexity(diffId: string, complexity: number) {
  try {
    const { updateMapComplexity } = await import('@/api/ranking/maps')
    await updateMapComplexity(diffId, { complexity })
    editingComplexity.value = null
    await fetchQueue()
    await fetchBatch()
  } catch {
  }
}
</script>

<template>
  <div class="batch-builder">
    <div class="batch-builder__header">
      <button class="batch-builder__back" @click="goBack" aria-label="Back to batches">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h1 class="batch-builder__title">{{ isNew ? 'New Batch' : (trimmedName || 'Untitled Batch') }}</h1>
      <div class="batch-builder__header-actions">
        <BaseButton size="sm" :loading="saving" :disabled="!canSave" @click="saveBatch">
          Save
        </BaseButton>
        <BaseButton v-if="isDraft && !isNew && totalSelected > 0" size="sm" variant="primary" @click="showMarkReady = true">
          Mark Ready
        </BaseButton>
        <BaseButton v-if="isReleaseReady" size="sm" variant="primary" @click="showRelease = true">
          Release
        </BaseButton>
      </div>
    </div>

    <div class="batch-builder__name-row">
      <BaseInput v-model="batchName" label="Name" placeholder="Batch name" />
      <BaseInput v-model="batchDescription" label="Description" placeholder="Description (optional)" />
    </div>
    <p v-if="!isDraft" class="batch-builder__name-hint">
      Maps are locked for this batch - only the name and description can be edited.
    </p>

    <div v-if="error" class="batch-builder__error">{{ error }}</div>

    <BatchCategoryColumns :categories="activeCategories" :groups="batchByCategory">
      <template #card="{ diff }">
        <BatchMapCard
          :diff="diff"
          selected
          :action="isDraft ? 'remove' : null"
          :editing-complexity="editingComplexity === diff.id"
          @open="goToDetail"
          @act="removeFromBatch"
          @start-edit="editingComplexity = $event"
          @cancel-edit="editingComplexity = null"
          @save-complexity="saveComplexity"
        />
      </template>
    </BatchCategoryColumns>

    <template v-if="isDraft">
      <div v-if="queueLoading" class="batch-builder__queue-section">
        <div class="batch-builder__queue-loading">Loading maps...</div>
      </div>

      <div v-if="!queueLoading && availableQualified.length > 0" class="batch-builder__queue-section">
        <h2 class="batch-builder__queue-title">
          Qualified
          <span class="batch-builder__queue-count">{{ availableQualified.length }}</span>
        </h2>
        <BatchCategoryColumns :categories="activeCategories" :groups="qualifiedByCategory">
          <template #card="{ diff }">
            <BatchMapCard
              :diff="diff"
              action="add"
              :batch-label="diffBatchMap.get(diff.id) ?? null"
              @open="goToDetail"
              @act="requestAdd"
            />
          </template>
        </BatchCategoryColumns>
      </div>

      <div v-if="!queueLoading && availableQueued.length > 0" class="batch-builder__queue-section">
        <h2 class="batch-builder__queue-title">
          Queued
          <span class="batch-builder__queue-count">{{ availableQueued.length }}</span>
        </h2>
        <BatchCategoryColumns :categories="activeCategories" :groups="queuedByCategory">
          <template #card="{ diff }">
            <BatchMapCard
              :diff="diff"
              action="add"
              :batch-label="diffBatchMap.get(diff.id) ?? null"
              @open="goToDetail"
              @act="requestAdd"
            />
          </template>
        </BatchCategoryColumns>
      </div>

      <EmptyState v-if="!queueLoading && availableQualified.length === 0 && availableQueued.length === 0" message="No maps available" />
    </template>

    <BaseModal :open="showMarkReady" title="Mark Ready" max-width="400px" @close="showMarkReady = false">
      <p style="color: var(--text-secondary); margin: 0">
        Mark this batch as release ready? Editing will be locked.
      </p>
      <template #footer>
        <div style="display: flex; gap: var(--space-sm); justify-content: flex-end">
          <BaseButton @click="showMarkReady = false">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="markReadyLoading" @click="handleMarkReady">Confirm</BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseModal :open="showRelease" title="Release Batch" max-width="420px" @close="showRelease = false">
      <p style="color: var(--text-secondary); margin: 0">
        Release <strong>{{ batchName }}</strong> with {{ totalSelected }} difficulties?
        This will rank all maps in the batch and trigger score backfill. This action is irreversible.
      </p>
      <template #footer>
        <div style="display: flex; gap: var(--space-sm); justify-content: flex-end">
          <BaseButton @click="showRelease = false">Cancel</BaseButton>
          <BaseButton variant="destructive" :loading="releaseLoading" @click="handleRelease">Release</BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseModal :open="!!pendingAdd" title="Warning" max-width="420px" @close="cancelAdd">
      <p style="color: var(--warning); margin: 0">{{ pendingAddWarning }}</p>
      <p style="color: var(--text-secondary); margin: var(--space-sm) 0 0">Add to batch anyway?</p>
      <template #footer>
        <div style="display: flex; gap: var(--space-sm); justify-content: flex-end">
          <BaseButton @click="cancelAdd">Cancel</BaseButton>
          <BaseButton variant="primary" @click="confirmAdd">Add Anyway</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.batch-builder {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-xl) var(--space-3xl);
}

.batch-builder__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.batch-builder__back {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-btn);
  display: flex;
  align-items: center;
  transition: color 120ms ease, background 120ms ease;
}

.batch-builder__back:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.batch-builder__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.batch-builder__header-actions {
  display: flex;
  gap: var(--space-sm);
}

.batch-builder__name-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.batch-builder__name-row > * {
  flex: 1;
}

.batch-builder__name-hint {
  margin: calc(-1 * var(--space-md)) 0 var(--space-lg);
  color: var(--text-tertiary);
  font-size: var(--text-caption);
}

.batch-builder__error {
  padding: var(--space-sm) var(--space-md);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
  border-radius: var(--radius-btn);
  color: var(--error);
  font-size: var(--text-caption);
  margin-bottom: var(--space-lg);
}

.batch-builder__queue-section {
  border-top: 1px solid var(--bg-overlay);
  margin-top: var(--space-xl);
  padding-top: var(--space-xl);
}

.batch-builder__queue-title {
  font-size: var(--text-section);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.batch-builder__queue-count {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-weight: 400;
}

.batch-builder__queue-loading {
  color: var(--text-secondary);
  font-size: var(--text-body);
  padding: var(--space-xl);
  text-align: center;
}

@media (max-width: 767px) {
  .batch-builder {
    padding: var(--space-md) var(--space-md) var(--space-2xl);
  }

  .batch-builder__name-row {
    flex-direction: column;
  }
}
</style>
