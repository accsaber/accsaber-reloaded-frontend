<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { ScoreResponse } from '@/types/api/users'
import { formatAccuracy, formatRelativeDate } from '@/utils/formatters'
import { buildMapRoute } from '@/utils/mapRoute'
import { getRankClass } from '@/utils/ranking'
import { computed, ref } from 'vue'

const COMMENT_MAX = 280

const props = defineProps<{
  score: ScoreResponse
  comment?: string | null
  editable?: boolean
}>()

const emit = defineEmits<{
  unpin: [scoreId: string]
  'open-detail': [score: ScoreResponse]
  'save-comment': [payload: { scoreId: string, comment: string | null }]
}>()

const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const draft = ref<string | null>(null)

const accent = computed(() => {
  const code = categoryStore.getCategoryCode(props.score.categoryId)
  return code ? categoryStore.getAccent(code) : 'var(--accent)'
})
const modifiers = computed(() => modifierStore.resolveModifierCodes(props.score.modifierIds).join(', '))
const mapTarget = computed(() => buildMapRoute({
  beatsaverCode: props.score.beatsaverCode,
  mapId: props.score.mapId,
  difficulty: props.score.difficulty,
  difficultyId: props.score.mapDifficultyId,
  characteristic: props.score.characteristic,
}))

function saveComment() {
  const next = draft.value?.trim() || null
  if (next !== (props.comment ?? null)) emit('save-comment', { scoreId: props.score.id, comment: next })
  draft.value = null
}
</script>

<template>
  <article class="pin-card" :style="{ '--card-accent': accent }">
    <RouterLink :to="mapTarget" class="pin-card__main">
      <CoverImage :source="score" :alt="score.songName" :size="64" />
      <div class="pin-card__info">
        <h3 class="card-title pin-card__song" :title="score.songName">
          <span class="rank" :class="getRankClass(score.rank)">#{{ score.rank }}</span>
          {{ score.songName }}
        </h3>
        <span class="pin-card__meta">
          <DifficultyBadge :difficulty="score.difficulty" />
          <ComplexityBadge v-if="score.complexity != null" :complexity="score.complexity" />
          <span>{{ formatRelativeDate(score.timeSet) }}</span>
          <span v-if="modifiers">{{ modifiers }}</span>
        </span>
      </div>
      <div class="pin-card__stats">
        <span class="pin-card__acc">{{ formatAccuracy(score.accuracy) }}</span>
        <span class="pin-card__ap">{{ score.ap.toFixed(2) }} AP</span>
      </div>
    </RouterLink>

    <div v-if="draft !== null" class="pin-card__edit">
      <BaseTextarea v-model="draft" :maxlength="COMMENT_MAX" :rows="2" placeholder="Say something about this score"
        aria-label="Comment" @keydown.escape="draft = null" @keydown.ctrl.enter="saveComment" />
      <div class="pin-card__actions">
        <BaseButton size="sm" @click="draft = null">Cancel</BaseButton>
        <BaseButton size="sm" variant="primary" @click="saveComment">Save</BaseButton>
      </div>
    </div>
    <div v-else class="pin-card__foot">
      <button v-if="editable" type="button" class="pin-card__comment pin-card__comment--edit"
        :class="{ 'pin-card__comment--quote': comment }" @click="draft = comment ?? ''">
        {{ comment ? `“${comment}”` : 'Add a comment' }}
      </button>
      <p v-else-if="comment" class="pin-card__comment pin-card__comment--quote">&ldquo;{{ comment }}&rdquo;</p>
      <div class="pin-card__actions">
        <button v-if="editable" class="pin-card__icon" type="button" aria-label="Unpin score" title="Unpin score"
          @click="emit('unpin', score.id)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 4h6l-1 5 4 3v3h-5v6l-1 1-1-1v-6H6v-3l4-3-1-5z" />
          </svg>
        </button>
        <button class="pin-card__icon" type="button" aria-label="View score details" title="Score details"
          @click="emit('open-detail', score)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 17l5-8 4 4 4-6 5 10" />
            <path d="M3 21h18" />
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.pin-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.pin-card__main {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.pin-card__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.pin-card__song {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pin-card__main:hover .pin-card__song {
  color: var(--card-accent);
}

.pin-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-xs) var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.pin-card__stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  white-space: nowrap;
}

.pin-card__acc {
  font-size: var(--text-section-heading);
  font-weight: 500;
  line-height: 1;
  color: var(--text-primary);
}

.pin-card__ap {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--card-accent);
}

.pin-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  min-height: 28px;
}

.pin-card__comment {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--text-body);
  color: var(--text-secondary);
  text-align: start;
  overflow-wrap: anywhere;
}

.pin-card__comment--quote {
  font-style: italic;
}

.pin-card__comment--edit {
  cursor: text;
  transition: color var(--dur-fast) var(--ease-out);
}

.pin-card__comment--edit:hover {
  color: var(--text-primary);
}

.pin-card__edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.pin-card__edit .pin-card__actions {
  align-self: flex-end;
}

.pin-card__actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-xs);
  margin-inline-start: auto;
}

.pin-card__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--radius-btn);
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}

.pin-card__icon:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
</style>
