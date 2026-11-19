<script setup lang="ts">
import type { VoteResponse } from '@/types/api/maps'
import type { VoteType } from '@/types/enums'
import { pickAvatarUrl } from '@/utils/media'
import VoteIcon from '@/components/domain/VoteIcon.vue'

defineProps<{
  vote: VoteResponse
  nickname?: string
  clamp?: boolean
}>()

const VOTE: Record<VoteType, { label: string; criteria: string; tone: string }> = {
  UPVOTE: { label: 'Upvote', criteria: 'Criteria pass', tone: 'up' },
  DOWNVOTE: { label: 'Downvote', criteria: 'Criteria fail', tone: 'down' },
  NEUTRAL: { label: 'Neutral', criteria: 'Criteria neutral', tone: 'neutral' },
}
</script>

<template>
  <div class="vote-body">
    <img v-if="pickAvatarUrl(vote.staff)" class="vote-body__avatar" :src="pickAvatarUrl(vote.staff)" alt=""
      loading="lazy" decoding="async" />
    <span v-else class="vote-body__avatar">
      <svg v-if="!vote.staff" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
    <div class="vote-body__text">
      <div class="vote-body__line">
        <span class="vote-body__name">{{ vote.staff ? (vote.staff.username ?? 'Unknown') : `Anonymous ${nickname}` }}</span>
        <span v-if="vote.staff?.role === 'RANKING_HEAD'" class="caption">Head</span>
        <VoteIcon class="vote-body__icon" :vote="vote.vote" :label="VOTE[vote.vote].label" />
        <span v-if="vote.criteriaVote" class="vote-body__criteria" :class="`vote-body--${VOTE[vote.criteriaVote].tone}`">
          {{ VOTE[vote.criteriaVote].criteria }}
        </span>
        <span v-if="vote.criteriaVoteOverride" class="caption vote-body__override">Override</span>
        <span v-if="vote.suggestedComplexity != null" class="caption">Suggests {{ vote.suggestedComplexity }}</span>
      </div>
      <p v-if="vote.reason" class="vote-body__reason" :class="{ 'vote-body__reason--clamp': clamp }"
        :title="clamp ? vote.reason : undefined">{{ vote.reason }}</p>
    </div>
  </div>
</template>

<style scoped>
.vote-body {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.vote-body__avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  object-fit: cover;
  color: var(--text-secondary);
  background: var(--bg-overlay);
  border-radius: var(--radius-avatar);
}

.vote-body__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.vote-body__line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--space-md);
}

.vote-body__name {
  font-weight: 600;
  color: var(--text-primary);
}

.vote-body__icon {
  align-self: center;
}

.vote-body__criteria {
  font-weight: 600;
}

.vote-body--up {
  color: var(--success);
}

.vote-body--down {
  color: var(--error);
}

.vote-body--neutral {
  color: var(--text-secondary);
}

.vote-body__override {
  color: var(--warning);
}

.vote-body__reason {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.vote-body__reason--clamp {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
</style>
