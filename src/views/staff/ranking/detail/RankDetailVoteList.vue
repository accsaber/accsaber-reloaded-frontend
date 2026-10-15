<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { VoteListResponse, VoteResponse } from '@/types/api/maps'
import type { VoteType } from '@/types/enums'
import { formatRelativeDate } from '@/utils/formatters'
import { pickAvatarUrl } from '@/utils/media'

const props = defineProps<{
  difficultyId: string
  voteData: VoteListResponse | null
  loading: boolean
  isHeadRanking: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const CRITERIA_LABEL: Record<VoteType, string> = {
  UPVOTE: 'Pass',
  DOWNVOTE: 'Fail',
  NEUTRAL: 'Neutral',
}

function voteModifier(vote: VoteType): string {
  if (vote === 'UPVOTE') return 'up'
  if (vote === 'DOWNVOTE') return 'down'
  return 'neutral'
}

function avatarUrl(vote: VoteResponse): string {
  return pickAvatarUrl(vote.staff)
}

async function deactivate(voteId: string) {
  try {
    const { deactivateVote } = await import('@/api/ranking/voting')
    await deactivateVote(props.difficultyId, voteId)
    emit('changed')
  } catch {
  }
}
</script>

<template>
  <div class="votes">
    <h3 class="votes__title field-label">
      Votes
      <span v-if="voteData" class="votes__count">({{ voteData.votes.length }})</span>
    </h3>

    <div v-if="loading" class="votes__loading">
      <SkeletonLoader variant="text" />
      <SkeletonLoader variant="text" />
    </div>

    <div v-else-if="voteData && voteData.votes.length" class="votes__list">
      <div v-for="vote in voteData.votes" :key="vote.id" class="vote">
        <div class="vote__header">
          <img v-if="avatarUrl(vote)" :src="avatarUrl(vote)" alt="" class="vote__avatar" loading="lazy"
            decoding="async" />
          <div v-else class="vote__avatar vote__avatar--placeholder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span class="vote__username">{{ vote.staff.username ?? 'Unknown' }}</span>
          <span v-if="vote.staff.role === 'RANKING_HEAD'" class="vote__head-pill" title="Head Ranking Staff">Head</span>
          <span class="vote__icon" :class="`vote__icon--${voteModifier(vote.vote)}`">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path v-if="vote.vote === 'UPVOTE'"
                d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              <path v-else-if="vote.vote === 'DOWNVOTE'"
                d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              <line v-else x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span class="vote__action">{{ vote.type }}</span>
          <span v-if="vote.suggestedComplexity != null" class="vote__complexity"
            :class="{ 'vote__complexity--highlight': vote.vote === 'UPVOTE' }">
            {{ vote.suggestedComplexity }}
          </span>
          <span class="vote__date">{{ formatRelativeDate(vote.createdAt) }}</span>
          <BaseButton v-if="isHeadRanking" size="sm" variant="destructive" class="vote__deactivate"
            @click="deactivate(vote.id)">
            Deactivate
          </BaseButton>
        </div>
        <div v-if="vote.criteriaVote || vote.criteriaVoteOverride" class="vote__criteria-row">
          <span v-if="vote.criteriaVote" class="vote__criteria"
            :class="`vote__criteria--${voteModifier(vote.criteriaVote)}`">
            Criteria: {{ CRITERIA_LABEL[vote.criteriaVote] }}
          </span>
          <span v-if="vote.criteriaVoteOverride" class="vote__override">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Criteria Override
          </span>
        </div>
        <p v-if="vote.reason" class="vote__reason">{{ vote.reason }}</p>
      </div>
    </div>

    <div v-else class="votes__empty">
      No votes yet.
    </div>
  </div>
</template>

<style scoped>
.votes {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
}

.votes__title {
  margin: 0 0 var(--space-md);
}

.votes__count {
  font-weight: 400;
  color: var(--text-tertiary);
}

.votes__loading,
.votes__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.votes__empty {
  color: var(--text-tertiary);
  font-size: var(--text-body);
  text-align: center;
  padding: var(--space-xl);
}

.vote {
  background: var(--bg-elevated);
  border-radius: var(--radius-btn);
  padding: var(--space-md);
}

.vote__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.vote__avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-card);
  object-fit: cover;
}

.vote__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  color: var(--text-tertiary);
}

.vote__username {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--text-body);
}

.vote__head-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--warning) 18%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 35%, transparent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
}

.vote__icon {
  display: flex;
  align-items: center;
}

.vote__icon--up {
  color: var(--success);
}

.vote__icon--down {
  color: var(--error);
}

.vote__icon--neutral {
  color: var(--text-tertiary);
}

.vote__action {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vote__complexity {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  padding: 2px var(--space-sm);
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.vote__complexity--highlight {
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--success) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
}

.vote__date {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  margin-left: auto;
}

.vote__deactivate {
  margin-left: var(--space-sm);
}

.vote__criteria-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-left: calc(28px + var(--space-sm));
  margin-top: var(--space-xs);
}

.vote__criteria {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
}

.vote__criteria--up {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}

.vote__criteria--down {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
}

.vote__criteria--neutral {
  background: color-mix(in srgb, var(--text-tertiary) 15%, transparent);
  color: var(--text-tertiary);
}

.vote__override {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--warning);
  padding: 1px var(--space-sm);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
}

.vote__reason {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.5;
  padding-left: calc(28px + var(--space-sm));
}

@media (max-width: 767px) {
  .vote__header {
    gap: var(--space-xs);
  }

  .vote__date {
    margin-left: 0;
    width: 100%;
  }
}
</style>
