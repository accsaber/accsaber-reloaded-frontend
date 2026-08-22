<script setup lang="ts">
import GlowImage from '@/components/common/GlowImage.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import type { MapDifficultyResponse } from '@/types/api/maps'
import { truncate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  diff: MapDifficultyResponse
  action?: 'add' | 'remove' | null
  selected?: boolean
  batchLabel?: string | null
  editingComplexity?: boolean
}>()

const emit = defineEmits<{
  open: [id: string]
  act: [id: string]
  startEdit: [id: string]
  saveComplexity: [id: string, complexity: number]
  cancelEdit: []
}>()

const editValue = ref(0)

watch(
  () => props.editingComplexity,
  (editing) => {
    if (editing) editValue.value = props.diff.complexity ?? 0
  },
  { immediate: true },
)

const criteriaClass = computed(() => {
  const d = props.diff
  if (d.headCriteriaVote === 'UPVOTE') return 'batch-card__criteria--pass'
  if (d.headCriteriaVote === 'DOWNVOTE') return 'batch-card__criteria--fail'
  if (d.criteriaUpvotes > d.criteriaDownvotes) return 'batch-card__criteria--pass'
  if (d.criteriaDownvotes > d.criteriaUpvotes) return 'batch-card__criteria--fail'
  return 'batch-card__criteria--pending'
})

const coverFallback = computed(() => {
  const d = props.diff
  return d.cdnCoverUrl && d.coverUrl && d.cdnCoverUrl !== d.coverUrl ? d.coverUrl : null
})

const actionClass = computed(() => (props.action ? `batch-card__action--${props.action}` : ''))
</script>

<template>
  <div class="batch-card" :class="{ 'batch-card--selected': selected }">
    <span class="batch-card__criteria" :class="criteriaClass">
      <svg v-if="diff.criteriaUpvotes > diff.criteriaDownvotes" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      <svg v-else-if="diff.criteriaDownvotes > diff.criteriaUpvotes" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      <svg v-else width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
    </span>

    <GlowImage
      :src="diff.cdnCoverUrl ?? diff.coverUrl"
      :fallback-src="coverFallback"
      alt=""
      :size="36"
      class="batch-card__cover"
      @click="emit('open', diff.id)"
    />

    <div class="batch-card__info" @click="emit('open', diff.id)">
      <span class="batch-card__title">{{ truncate(diff.songName, 22) }}</span>
      <span class="batch-card__meta">
        <DifficultyBadge :difficulty="diff.difficulty" />
        <span class="batch-card__author">{{ truncate(diff.songAuthor, 18) }}</span>
        <span v-if="diff.mapAuthor" class="batch-card__mapper">· {{ truncate(diff.mapAuthor, 16) }}</span>
      </span>
    </div>

    <span v-if="batchLabel" class="batch-card__batch">{{ batchLabel }}</span>

    <template v-if="editingComplexity">
      <input
        v-model.number="editValue"
        type="number"
        step="0.1"
        class="batch-card__complexity-input"
        @keydown.enter="emit('saveComplexity', diff.id, editValue)"
        @keydown.escape="emit('cancelEdit')"
      />
      <button class="batch-card__complexity-save" aria-label="Save complexity" @click="emit('saveComplexity', diff.id, editValue)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </template>
    <span
      v-else-if="diff.complexity != null"
      class="batch-card__complexity"
      :class="{ 'batch-card__complexity--editable': selected }"
      @click="selected && emit('startEdit', diff.id)"
    >
      <ComplexityBadge :complexity="diff.complexity" />
    </span>

    <button
      v-if="action"
      class="batch-card__action"
      :class="actionClass"
      :aria-label="action === 'add' ? 'Add to batch' : 'Remove from batch'"
      @click.stop="emit('act', diff.id)"
    >
      <svg v-if="action === 'add'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.batch-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-btn);
  background: var(--bg-elevated);
  border: 1px solid transparent;
  transition: border-color 120ms ease, background 120ms ease;
}

.batch-card--selected {
  border-color: color-mix(in srgb, var(--cat-accent, var(--accent)) 30%, transparent);
}

.batch-card__criteria {
  position: absolute;
  top: -3px;
  left: -3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.batch-card__criteria--pass {
  background: var(--success);
  color: var(--bg-base);
}

.batch-card__criteria--fail {
  background: var(--error);
  color: var(--bg-base);
}

.batch-card__criteria--pending {
  background: var(--text-tertiary);
  color: var(--bg-base);
}

.batch-card__cover,
.batch-card__info {
  cursor: pointer;
}

.batch-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.batch-card__title {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.batch-card__meta {
  font-size: 0.65rem;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.batch-card__author,
.batch-card__mapper {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-card__batch {
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--info) 15%, transparent);
  color: var(--info);
  border: 1px solid color-mix(in srgb, var(--info) 30%, transparent);
}

.batch-card__complexity--editable {
  cursor: pointer;
}

.batch-card__complexity-input {
  width: 64px;
  padding: 2px 6px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  text-align: center;
}

.batch-card__complexity-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}

.batch-card__complexity-save {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--success);
  cursor: pointer;
  padding: 2px;
}

.batch-card__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-btn);
  border: 1px solid var(--bg-overlay);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.batch-card__action--remove:hover {
  color: var(--error);
  border-color: var(--error);
  background: color-mix(in srgb, var(--error) 10%, transparent);
}

.batch-card__action--add:hover {
  color: var(--success);
  border-color: var(--success);
  background: color-mix(in srgb, var(--success) 10%, transparent);
}

@media (max-width: 767px) {
  .batch-card__action {
    width: 32px;
    height: 32px;
  }
}
</style>
