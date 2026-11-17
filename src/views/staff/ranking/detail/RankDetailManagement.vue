<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import StoredFold from '@/components/common/StoredFold.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { rankingDashboardRoute } from '@/router'
import type { MapDifficultyResponse } from '@/types/api/maps'
import type { DifficultyDrift } from '@/views/staff/ranking/detail/useDifficultyDrift'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  canRefresh: boolean
  driftInfo: DifficultyDrift | null
  driftChecking: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const DRAFT_BATCHES_SIZE = 50

const router = useRouter()
const { confirmModal, ask } = useConfirmAction()

const adding = ref(false)
const notice = ref('')
const error = ref('')
const batches = ref<{ value: string; label: string }[]>([])

async function loadBatches() {
  if (batches.value.length) return
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const page = await listBatches({ status: 'DRAFT', page: 0, size: DRAFT_BATCHES_SIZE })
    batches.value = page.content.map((b) => ({ value: b.id, label: b.name }))
  } catch {
    batches.value = []
  }
}

watch(() => props.difficulty.id, () => {
  notice.value = ''
  error.value = ''
})

async function addToBatch(batchId: string) {
  if (!batchId) return
  adding.value = true
  notice.value = ''
  error.value = ''
  try {
    const { addDifficultyToBatch } = await import('@/api/ranking/batches')
    await addDifficultyToBatch(batchId, props.difficulty.id)
    notice.value = `Added to ${batches.value.find((b) => b.value === batchId)?.label ?? 'the batch'}`
  } catch (err) {
    error.value = parseApiError(err, 'Could not add it to the batch').message
  } finally {
    adding.value = false
  }
}

function askDeactivate() {
  ask({
    title: 'Deactivate Difficulty',
    message: `Deactivate ${props.difficulty.songName}? It leaves the queue.`,
    confirmLabel: 'Deactivate',
    destructive: true,
    run: async () => {
      const { deactivateMapDifficulty } = await import('@/api/ranking/maps')
      await deactivateMapDifficulty(props.difficulty.id)
      await router.push({ name: rankingDashboardRoute })
    },
  })
}
</script>

<template>
  <StoredFold class="management" label="Management" storage-key="rank-management" default-collapsed>
    <div class="management__actions" @vue:mounted="loadBatches">
      <BaseSelect v-if="batches.length" :options="batches" model-value="" placeholder="Add to Batch"
        :disabled="adding" @update:model-value="addToBatch" />
      <BaseButton v-if="canRefresh" :disabled="!driftInfo" :loading="driftChecking" @click="emit('refresh')">
        {{ driftChecking || driftInfo ? 'Refresh from BeatSaver' : 'Up to Date with BeatSaver' }}
      </BaseButton>
      <BaseButton variant="destructive" @click="askDeactivate">Deactivate</BaseButton>
    </div>
    <p class="caption management__status" :class="{ 'management__status--error': error }" :role="error ? 'alert' : 'status'">
      {{ error || notice }}
    </p>

    <ConfirmModal v-bind="confirmModal" />
  </StoredFold>
</template>

<style scoped>
.management {
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.management__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.management__status {
  min-height: 1lh;
  margin-top: var(--space-xs);
}

.management__status--error {
  color: var(--error);
}
</style>
