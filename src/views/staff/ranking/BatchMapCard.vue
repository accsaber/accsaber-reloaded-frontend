<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import IconButton from '@/components/common/IconButton.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import CriteriaVerdict from '@/components/domain/CriteriaVerdict.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import type { MapDifficultyResponse } from '@/types/api/maps'
import { nextTick, ref } from 'vue'
import { buildRankingMapRoute } from '@/utils/mapRoute'

const props = defineProps<{
  diff: MapDifficultyResponse
  action?: 'add' | 'remove' | null
  editable?: boolean
  batchLabel?: string | null
}>()

const emit = defineEmits<{
  act: [id: string]
  saveComplexity: [id: string, complexity: number]
}>()

const editing = ref(false)
const draft = ref(0)
const field = ref<HTMLInputElement | null>(null)

async function startEdit() {
  draft.value = props.diff.complexity ?? 0
  editing.value = true
  await nextTick()
  field.value?.select()
}

function commit() {
  if (!editing.value) return
  editing.value = false
  if (Number.isFinite(draft.value) && draft.value !== props.diff.complexity) {
    emit('saveComplexity', props.diff.id, draft.value)
  }
}
</script>

<template>
  <div class="batch-card">
    <RouterLink class="batch-card__map" :to="buildRankingMapRoute(diff)">
      <CoverImage :source="diff" :alt="diff.songName" :size="40" />
      <span class="batch-card__name">
        <SongTitle class="batch-card__song" :name="diff.songName" :sub-name="diff.songSubName" />
        <DifficultyBadge :difficulty="diff.difficulty" />
      </span>
    </RouterLink>

    <input
      v-if="editing"
      ref="field"
      v-model.number="draft"
      class="inline-edit batch-card__complexity-input"
      type="number"
      step="0.1"
      aria-label="Complexity"
      @keydown.enter.prevent="commit"
      @keydown.escape.prevent="editing = false"
      @blur="commit"
    />
    <button
      v-else-if="editable && diff.complexity != null"
      type="button"
      class="batch-card__complexity pressable"
      :aria-label="`Edit complexity, ${diff.complexity.toFixed(1)}`"
      @click="startEdit"
    >
      <ComplexityBadge :complexity="diff.complexity" />
    </button>
    <ComplexityBadge v-else-if="diff.complexity != null" :complexity="diff.complexity" />
    <span v-else />
    <CriteriaVerdict :source="diff" icon />

    <IconButton v-if="action === 'remove'" label="Remove from batch" icon="close" @click="emit('act', diff.id)" />
    <IconButton v-else-if="action === 'add'" label="Add to batch" @click="emit('act', diff.id)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </IconButton>

    <p v-if="batchLabel" class="caption batch-card__note">In {{ batchLabel }}</p>
  </div>
</template>

<style scoped>
.batch-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 0 var(--space-sm);
  min-height: 56px;
  padding: var(--space-sm);
  background: var(--bg-elevated);
  border-radius: var(--radius-btn);
}

.batch-card__map {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.batch-card__name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.batch-card__song {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-card__complexity {
  padding: 0;
  font: inherit;
  background: none;
  border: none;
  cursor: text;
}

.batch-card__complexity-input {
  width: 6ch;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  text-align: right;
  color: var(--text-primary);
}

.batch-card__note {
  grid-column: 1 / -1;
  color: var(--warning);
}
</style>
