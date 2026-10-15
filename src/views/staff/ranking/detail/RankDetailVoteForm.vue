<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import type { MapVoteAction, VoteType } from '@/types/enums'
import RankDetailCollapsible from '@/views/staff/ranking/detail/RankDetailCollapsible.vue'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  voteData: VoteListResponse | null
  isHeadRanking: boolean
}>()

const emit = defineEmits<{
  voted: []
}>()

const authStore = useAuthStore()

const isRanked = computed(() => props.difficulty.status === 'RANKED')
const voteAction = computed<MapVoteAction>(() => (isRanked.value ? 'REWEIGHT' : 'RANK'))
const title = computed(() => (isRanked.value ? 'Cast Reweight Vote' : 'Cast Rank Vote'))

const voteType = ref<VoteType>('UPVOTE')
const reason = ref('')
const suggestedComplexity = ref<number | string>('')
const criteriaVote = ref<VoteType | undefined>(undefined)
const criteriaOverride = ref(false)
const submitting = ref(false)
const error = ref('')

const VOTE_BUTTONS: { type: VoteType; label: string; modifier: string }[] = [
  { type: 'UPVOTE', label: 'Upvote', modifier: 'up' },
  { type: 'DOWNVOTE', label: 'Downvote', modifier: 'down' },
  { type: 'NEUTRAL', label: 'Neutral', modifier: 'neutral' },
]

const CRITERIA_BUTTONS: { type: VoteType; label: string; modifier: string }[] = [
  { type: 'UPVOTE', label: 'Pass', modifier: 'up' },
  { type: 'DOWNVOTE', label: 'Fail', modifier: 'down' },
  { type: 'NEUTRAL', label: 'Neutral', modifier: 'neutral' },
]

function prefillFromExistingVote() {
  const staffId = authStore.staffId
  if (!props.voteData || !staffId) return
  const existing = props.voteData.votes.find((v) => v.staff.id === staffId && v.type === voteAction.value)
  if (!existing) {
    const suggestion = props.difficulty.scriptComplexity
    if (voteAction.value === 'REWEIGHT' && suggestion != null) suggestedComplexity.value = suggestion
    return
  }
  voteType.value = existing.vote
  reason.value = existing.reason ?? ''
  suggestedComplexity.value = existing.suggestedComplexity ?? ''
  criteriaVote.value = existing.criteriaVote ?? undefined
  criteriaOverride.value = existing.criteriaVoteOverride ?? false
}

watch([() => props.voteData, voteAction], prefillFromExistingVote, { immediate: true })

function toggleCriteria(type: VoteType) {
  criteriaVote.value = criteriaVote.value === type ? undefined : type
}

async function submit() {
  submitting.value = true
  error.value = ''
  if (voteAction.value === 'REWEIGHT' && !suggestedComplexity.value) {
    error.value = 'Suggested complexity is required for reweight votes.'
    submitting.value = false
    return
  }
  try {
    const { castVote } = await import('@/api/ranking/voting')
    await castVote(props.difficulty.id, {
      vote: voteType.value,
      type: voteAction.value,
      reason: reason.value || undefined,
      suggestedComplexity: Number(suggestedComplexity.value) || undefined,
      criteriaVote: isRanked.value ? undefined : criteriaVote.value || undefined,
      criteriaVoteOverride: isRanked.value ? undefined : criteriaOverride.value || undefined,
    })
    reason.value = ''
    suggestedComplexity.value = ''
    criteriaVote.value = undefined
    criteriaOverride.value = false
    emit('voted')
  } catch (e) {
    error.value = parseApiError(e, 'Failed to submit vote').message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RankDetailCollapsible :title="title">
    <div class="vote-form">
      <div class="vote-form__type-row">
        <button v-for="b in VOTE_BUTTONS" :key="b.type" class="vote-btn" :class="[`vote-btn--${b.modifier}`,
          { 'vote-btn--active': voteType === b.type }]" @click="voteType = b.type">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path v-if="b.type === 'UPVOTE'"
              d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            <path v-else-if="b.type === 'DOWNVOTE'"
              d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            <line v-else x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {{ b.label }}
        </button>
      </div>

      <div class="vote-form__complexity">
        <BaseInput v-model.number="suggestedComplexity" type="number"
          label="Suggested Complexity" placeholder="e.g. 8.5" />
        <p v-if="voteAction === 'REWEIGHT' && difficulty.scriptComplexity != null" class="vote-form__note">
          The script suggests {{ difficulty.scriptComplexity.toFixed(1) }} on
          <span class="vote-form__script-version">{{ difficulty.scriptVersion }}</span>.
        </p>
      </div>

      <div v-if="!isRanked" class="vote-form__criteria">
        <label class="field-label">Criteria Vote</label>
        <div class="vote-form__criteria-row">
          <button v-for="b in CRITERIA_BUTTONS" :key="b.type" class="vote-btn vote-btn--sm"
            :class="[`vote-btn--${b.modifier}`, { 'vote-btn--active': criteriaVote === b.type }]"
            @click="toggleCriteria(b.type)">{{ b.label }}</button>
        </div>
        <label v-if="isHeadRanking" class="vote-form__override">
          <input type="checkbox" v-model="criteriaOverride" />
          <span>Override criteria check</span>
          <span class="vote-form__override-hint">Signals that the automated criteria verdict should be
            bypassed</span>
        </label>
      </div>

      <textarea v-model="reason" class="vote-form__reason" placeholder="Reason (optional)" rows="3" />

      <div v-if="error" class="vote-form__error">{{ error }}</div>

      <BaseButton variant="primary" :loading="submitting" @click="submit">
        Submit Vote
      </BaseButton>
    </div>
  </RankDetailCollapsible>
</template>

<style scoped>
.vote-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.vote-form__type-row {
  display: flex;
  gap: var(--space-sm);
}

.vote-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-btn);
  border: 1px solid var(--bg-overlay);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-caption);
  font-weight: 600;
  transition: all 120ms ease;
}

.vote-btn:hover {
  border-color: var(--text-tertiary);
}

.vote-btn--up.vote-btn--active {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  border-color: var(--success);
  color: var(--success);
}

.vote-btn--down.vote-btn--active {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  border-color: var(--error);
  color: var(--error);
}

.vote-btn--neutral.vote-btn--active {
  background: color-mix(in srgb, var(--text-secondary) 15%, transparent);
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

.vote-btn--sm {
  padding: var(--space-xs) var(--space-sm);
}

.vote-form__complexity {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.vote-form__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.vote-form__script-version {
  color: var(--text-tertiary);
  font-family: var(--font-code);
  font-size: var(--text-caption);
}

.vote-form__criteria {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.vote-form__criteria-row {
  display: flex;
  gap: var(--space-xs);
}

.vote-form__override {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  cursor: pointer;
  flex-wrap: wrap;
}

.vote-form__override input {
  accent-color: var(--warning);
  margin-top: 2px;
}

.vote-form__override-hint {
  width: 100%;
  font-size: 0.65rem;
  color: var(--text-tertiary);
  padding-left: calc(16px + var(--space-sm));
}

.vote-form__reason {
  width: 100%;
  min-height: 72px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-body);
  resize: vertical;
  transition: border-color 120ms ease;
}

.vote-form__reason::placeholder {
  color: var(--text-tertiary);
}

.vote-form__reason:focus {
  outline: none;
  border-color: var(--page-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent, var(--accent)) 20%, transparent);
}

.vote-form__error {
  color: var(--error);
  font-size: var(--text-caption);
}

@media (max-width: 767px) {
  .vote-form__type-row {
    flex-wrap: wrap;
  }
}
</style>
