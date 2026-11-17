<script setup lang="ts">
import { parseApiError } from '@/api/client'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import IconButton from '@/components/common/IconButton.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import type { MapDifficultyResponse } from '@/types/api/maps'
import ComplexityPin from '@/views/staff/ranking/complexity/ComplexityPin.vue'
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  editable: boolean
}>()

const emit = defineEmits<{
  updated: [difficulty: MapDifficultyResponse, reweighting: boolean]
}>()

const { confirmModal, ask } = useConfirmAction()

const editing = ref(false)
const draft = ref<number | string>('')
const field = ref<HTMLInputElement | null>(null)
const pinning = ref(false)
const pinChanged = ref(false)
const error = ref('')

watch(() => props.difficulty.id, () => {
  editing.value = false
  error.value = ''
})

async function startEdit() {
  draft.value = props.difficulty.complexity ?? ''
  editing.value = true
  await nextTick()
  field.value?.select()
}

async function save(complexity: number) {
  const { updateMapComplexity } = await import('@/api/ranking/maps')
  const ranked = props.difficulty.status === 'RANKED'
  emit('updated', await updateMapComplexity(props.difficulty.id, { complexity }), ranked)
}

async function commit() {
  if (!editing.value) return
  editing.value = false
  const next = Number(draft.value)
  if (draft.value === '' || !Number.isFinite(next) || next === props.difficulty.complexity) return
  error.value = ''
  if (props.difficulty.status === 'RANKED') {
    ask({
      title: 'Reweight Map',
      message: `Set ${props.difficulty.songName} to ${next}? Every score on it is reweighted.`,
      confirmLabel: 'Reweight',
      run: () => save(next),
    })
    return
  }
  try {
    await save(next)
  } catch (err) {
    error.value = parseApiError(err, 'Could not save the complexity').message
  }
}

async function togglePin() {
  pinning.value = true
  pinChanged.value = false
  error.value = ''
  try {
    const { setComplexityPin } = await import('@/api/ranking/maps')
    emit('updated', await setComplexityPin(props.difficulty.id, !props.difficulty.complexityPinned), false)
    pinChanged.value = true
  } catch (err) {
    error.value = parseApiError(err, 'Could not change the pin').message
  } finally {
    pinning.value = false
  }
}
</script>

<template>
  <span class="complexity">
    <input
      v-if="editing"
      ref="field"
      v-model="draft"
      class="inline-edit complexity__input"
      type="number"
      step="0.1"
      min="0"
      aria-label="Complexity"
      @keydown.enter.prevent="commit"
      @keydown.escape.prevent="editing = false"
      @blur="commit"
    />
    <button v-else-if="editable" type="button" class="complexity__value pressable"
      :aria-label="difficulty.complexity != null ? `Edit complexity, ${difficulty.complexity}` : 'Set complexity'"
      @click="startEdit">
      <ComplexityBadge v-if="difficulty.complexity != null" :complexity="difficulty.complexity" />
      <template v-else>Set Complexity</template>
    </button>
    <ComplexityBadge v-else-if="difficulty.complexity != null" :complexity="difficulty.complexity" />

    <IconButton
      v-if="editable"
      class="complexity__pin"
      :class="{ 'complexity__pin--on': difficulty.complexityPinned, 'complexity__pin--busy': pinning, confirm: pinChanged }"
      @animationend="pinChanged = false"
      :label="difficulty.complexityPinned ? 'Unpin Complexity' : 'Pin Complexity'"
      :title="difficulty.complexityPinned ? 'Unpin Complexity' : 'Pin Complexity'"
      :aria-pressed="difficulty.complexityPinned"
      :disabled="pinning"
      @click="togglePin"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" :fill="difficulty.complexityPinned ? 'currentColor' : 'none'"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      </svg>
    </IconButton>
    <ComplexityPin v-else-if="difficulty.complexityPinned" />

    <span v-if="error" class="caption complexity__error" role="alert">{{ error }}</span>

    <ConfirmModal v-bind="confirmModal" />
  </span>
</template>

<style scoped>
.complexity {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.complexity__value {
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: var(--text-primary);
  background: none;
  border: none;
  cursor: pointer;
}

.complexity__input {
  width: 5ch;
  font: inherit;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
  appearance: textfield;
}

.complexity .complexity__pin {
  color: var(--text-tertiary);
}

.complexity .complexity__pin--busy {
  opacity: 0.5;
}

.complexity .complexity__pin--on {
  color: var(--page-accent, var(--accent));
}

.complexity__error {
  color: var(--error);
}
</style>
