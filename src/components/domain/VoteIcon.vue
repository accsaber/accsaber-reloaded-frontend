<script setup lang="ts">
import type { VoteType } from '@/types/enums'

defineProps<{
  vote: VoteType
  label?: string
}>()

const PATH: Record<VoteType, string> = {
  UPVOTE: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
  DOWNVOTE: 'M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17',
  NEUTRAL: 'M5 12h14',
}
</script>

<template>
  <svg class="vote-icon" :class="`vote-icon--${vote.toLowerCase()}`" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : true">
    <title v-if="label">{{ label }}</title>
    <path :d="PATH[vote]" />
  </svg>
</template>

<style scoped>
.vote-icon {
  flex-shrink: 0;
}

.vote-icon[role='img'].vote-icon--upvote {
  color: var(--success);
}

.vote-icon[role='img'].vote-icon--downvote {
  color: var(--error);
}

.vote-icon[role='img'].vote-icon--neutral {
  color: var(--text-secondary);
}
</style>
