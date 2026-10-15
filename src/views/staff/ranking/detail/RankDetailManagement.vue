<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { rankingDashboardRoute } from '@/router'
import type { MapDifficultyResponse } from '@/types/api/maps'
import RankDetailCollapsible from '@/views/staff/ranking/detail/RankDetailCollapsible.vue'
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
  updated: [difficulty: MapDifficultyResponse]
  refresh: []
}>()

const router = useRouter()

const pinLoading = ref(false)
const pinError = ref('')
const batchOptions = ref<{ value: string; label: string }[]>([])

async function fetchBatches() {
  try {
    const { listBatches } = await import('@/api/ranking/batches')
    const res = await listBatches({ status: 'DRAFT', page: 0, size: 50 })
    batchOptions.value = res.content.map((b) => ({ value: b.id, label: b.name }))
  } catch {
    batchOptions.value = []
  }
}

watch(() => props.difficulty.id, () => {
  pinError.value = ''
  fetchBatches()
}, { immediate: true })

async function togglePin() {
  pinLoading.value = true
  pinError.value = ''
  try {
    const { setComplexityPin } = await import('@/api/ranking/maps')
    emit('updated', await setComplexityPin(props.difficulty.id, !props.difficulty.complexityPinned))
  } catch (e) {
    pinError.value = parseApiError(e, 'Could not change the pin.').message
  } finally {
    pinLoading.value = false
  }
}

async function addToBatch(batchId: string) {
  try {
    const { addDifficultyToBatch } = await import('@/api/ranking/batches')
    await addDifficultyToBatch(batchId, props.difficulty.id)
  } catch {
  }
}

async function deactivate() {
  if (!confirm('Are you sure you want to deactivate this difficulty?')) return
  try {
    const { deactivateMapDifficulty } = await import('@/api/ranking/maps')
    await deactivateMapDifficulty(props.difficulty.id)
    router.push({ name: rankingDashboardRoute })
  } catch {
  }
}
</script>

<template>
  <RankDetailCollapsible title="Management">
    <div class="management__actions">
      <BaseButton size="sm" :loading="pinLoading" @click="togglePin">
        {{ difficulty.complexityPinned ? 'Unpin Complexity' : 'Pin Complexity' }}
      </BaseButton>
      <BaseSelect v-if="batchOptions.length"
        :options="[{ value: '', label: 'Add to Batch...' }, ...batchOptions]"
        model-value="" @update:model-value="(v: string) => v && addToBatch(v)" />
      <BaseButton v-if="canRefresh" size="sm" :disabled="!driftInfo || driftChecking"
        :loading="driftChecking"
        :title="driftChecking ? 'Checking BeatSaver for updates...' : driftInfo ? 'A newer version of this map is available on BeatSaver' : 'Already on the latest version'"
        @click="emit('refresh')">
        Refresh from BeatSaver
      </BaseButton>
      <BaseButton variant="destructive" size="sm" @click="deactivate">Deactivate</BaseButton>
    </div>
    <p class="management__note">
      The script's apply leaves a pinned map alone in every round until you unpin it. Single,
      bulk and batch reweights still go through.
    </p>
    <p v-if="pinError" class="management__error">{{ pinError }}</p>
  </RankDetailCollapsible>
</template>

<style scoped>
.management__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
}

.management__note {
  margin: var(--space-sm) 0 0;
  max-width: 62ch;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.management__error {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
