<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import StoredFold from '@/components/common/StoredFold.vue'
import { useAuthStore } from '@/stores/auth'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import type { Tab } from '@/types/display'
import type { MapVoteAction, VoteType } from '@/types/enums'
import VoteIcon from '@/components/domain/VoteIcon.vue'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  voteData: VoteListResponse | null
  isHeadRanking: boolean
}>()

const emit = defineEmits<{
  voted: []
}>()

const VOTE_TABS: Tab[] = [
  { key: 'UPVOTE', label: 'Upvote', accentColor: 'var(--success)' },
  { key: 'DOWNVOTE', label: 'Downvote', accentColor: 'var(--error)' },
  { key: 'NEUTRAL', label: 'Neutral', accentColor: 'var(--text-primary)' },
]
const CRITERIA_TABS: Tab[] = [
  { key: '', label: 'No Vote', accentColor: 'var(--text-primary)' },
  { key: 'UPVOTE', label: 'Pass', accentColor: 'var(--success)' },
  { key: 'DOWNVOTE', label: 'Fail', accentColor: 'var(--error)' },
  { key: 'NEUTRAL', label: 'Neutral', accentColor: 'var(--text-primary)' },
]
const OVERRIDE_HINT = 'Signals that the automated criteria verdict should be bypassed.'

const authStore = useAuthStore()

const isRanked = computed(() => props.difficulty.status === 'RANKED')
const voteAction = computed<MapVoteAction>(() => (isRanked.value ? 'REWEIGHT' : 'RANK'))

const voteType = ref<VoteType>('UPVOTE')
const reason = ref('')
const suggestedComplexity = ref<number | string>('')
const criteriaVote = ref<VoteType | ''>('')
const criteriaOverride = ref(false)
const submitting = ref(false)
const error = ref('')
const sent = ref(false)

function prefill() {
  const staffId = authStore.staffId
  if (!props.voteData || !staffId) return
  const existing = props.voteData.votes.find((v) => v.staff?.id === staffId && v.type === voteAction.value)
  if (!existing) {
    if (isRanked.value && props.difficulty.scriptComplexity != null) suggestedComplexity.value = props.difficulty.scriptComplexity
    return
  }
  voteType.value = existing.vote
  reason.value = existing.reason ?? ''
  suggestedComplexity.value = existing.suggestedComplexity ?? ''
  criteriaVote.value = existing.criteriaVote ?? ''
  criteriaOverride.value = existing.criteriaVoteOverride ?? false
}

watch([() => props.voteData, voteAction], prefill, { immediate: true })

async function submit() {
  error.value = ''
  sent.value = false
  if (isRanked.value && !suggestedComplexity.value) {
    error.value = 'A reweight vote needs a suggested complexity'
    return
  }
  submitting.value = true
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
    sent.value = true
    emit('voted')
  } catch (err) {
    error.value = parseApiError(err, 'Could not submit the vote').message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StoredFold class="surface-card vote-form" :label="isRanked ? 'Cast Reweight Vote' : 'Cast Rank Vote'" storage-key="rank-vote-form">
    <form class="vote-form__fields" @submit.prevent="submit">
      <div class="vote-form__field">
        <span class="field-label">Vote</span>
        <BaseTabs v-model="voteType" variant="segmented" label="Vote" :tabs="VOTE_TABS">
          <template #tab="{ tab }">
            <span class="vote-form__choice"><VoteIcon :vote="(tab.key as VoteType)" />{{ tab.label }}</span>
          </template>
        </BaseTabs>
      </div>

      <div v-if="!isRanked" class="vote-form__field">
        <span class="field-label">Criteria</span>
        <BaseTabs v-model="criteriaVote" variant="segmented" label="Criteria vote" :tabs="CRITERIA_TABS" />
        <span v-if="isHeadRanking" class="vote-form__override">
          <BaseSwitch v-model="criteriaOverride" label="Override Criteria Check" />
          <HintTooltip :text="OVERRIDE_HINT" />
        </span>
      </div>

      <div class="vote-form__field vote-form__complexity">
        <BaseInput v-model.number="suggestedComplexity" type="number" step="0.1" label="Suggested Complexity" placeholder="8.5" />
        <p v-if="isRanked && difficulty.scriptComplexity != null" class="caption">
          Script: {{ difficulty.scriptComplexity.toFixed(1) }} ({{ difficulty.scriptVersion }})
        </p>
      </div>

      <BaseTextarea v-model="reason" label="Reason" :rows="3" />

      <div class="vote-form__submit">
        <BaseButton variant="primary" :class="{ confirm: sent }" :loading="submitting" @click="submit">Submit Vote</BaseButton>
        <p class="caption vote-form__status" :class="{ 'vote-form__status--error': error }" :role="error ? 'alert' : 'status'">
          {{ error || (sent ? 'Vote saved' : '') }}
        </p>
      </div>
    </form>
  </StoredFold>
</template>

<style scoped>
.vote-form :deep(.stored-fold__label) {
  font-size: var(--text-section-heading);
}

.vote-form :deep(.stored-fold__toggle) {
  color: var(--text-primary);
}

.vote-form :deep(.base-tabs__tab--active) {
  color: var(--tab-accent);
}

.vote-form__choice {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.vote-form__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.vote-form__field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.vote-form__complexity {
  max-width: 200px;
}

.vote-form__override {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.vote-form__submit {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.vote-form__status {
  min-height: 1lh;
}

.vote-form__status--error {
  color: var(--error);
}
</style>
