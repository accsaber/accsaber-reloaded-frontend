<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { MapComplexityHistoryResponse, MapDifficultyResponse } from '@/types/api/maps'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  difficulty: MapDifficultyResponse
}>()

const emit = defineEmits<{
  close: []
  saved: [difficulty: MapDifficultyResponse, wasRanked: boolean]
}>()

const SCRIPT_REASON = 'complexity script'

const value = ref(0)
const loading = ref(false)
const error = ref('')
const history = ref<MapComplexityHistoryResponse[]>([])

const scriptSetThis = computed(() => {
  if (props.difficulty.complexity == null) return false
  const entry = history.value.find((row) => row.mapDifficultyId === props.difficulty.id && row.active)
  return (entry?.reason?.trim().toLowerCase() ?? '').startsWith(SCRIPT_REASON)
})

async function loadHistory() {
  try {
    const { getComplexityHistory } = await import('@/api/maps')
    history.value = await getComplexityHistory(props.difficulty.mapId)
  } catch {
    history.value = []
  }
}

watch(() => props.open, (open) => {
  if (!open) return
  value.value = props.difficulty.complexity ?? 0
  error.value = ''
  loadHistory()
})

async function save() {
  const wasRanked = props.difficulty.status === 'RANKED'
  loading.value = true
  error.value = ''
  try {
    const { updateMapComplexity } = await import('@/api/ranking/maps')
    emit('saved', await updateMapComplexity(props.difficulty.id, { complexity: value.value }), wasRanked)
  } catch (e) {
    error.value = parseApiError(e, 'Could not save the complexity.').message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Set Complexity" max-width="400px" @close="emit('close')">
    <div class="complexity-form">
      <BaseInput v-model.number="value" type="number" label="Complexity" placeholder="e.g. 8.5" />
      <p v-if="scriptSetThis" class="caption">
        The complexity script suggested this value at import.
      </p>
      <p v-if="difficulty.status === 'RANKED'" class="caption">
        Saving runs a full reweight, and scores, statistics, rankings, milestones, XP and skills
        adjust in the background.
      </p>
      <p class="caption">
        Saving pins this map and the script's apply leaves it alone.
      </p>
      <div v-if="difficulty.scriptComplexity != null" class="script">
        <BaseButton size="sm" :disabled="value === difficulty.scriptComplexity"
          @click="value = difficulty.scriptComplexity">
          Use the script number
        </BaseButton>
        <span class="script__value">
          {{ difficulty.scriptComplexity.toFixed(1) }}
          <span class="script__version">{{ difficulty.scriptVersion }}</span>
        </span>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
    <template #footer>
      <div class="modal-actions">
        <BaseButton @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="loading" @click="save">Save</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.complexity-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}


.script {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.script__value {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-xs);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.script__version {
  color: var(--text-tertiary);
  font-family: var(--font-code);
  font-size: var(--text-caption);
}

.error {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}
</style>
