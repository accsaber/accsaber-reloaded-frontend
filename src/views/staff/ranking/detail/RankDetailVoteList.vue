<script setup lang="ts">
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import IconButton from '@/components/common/IconButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import type { VoteListResponse, VoteResponse } from '@/types/api/maps'
import { formatRelativeDate } from '@/utils/formatters'
import { knownCount, rememberCount } from '@/utils/knownCount'
import VoteBody from '@/views/staff/ranking/detail/VoteBody.vue'
import { computed, watch } from 'vue'

const props = defineProps<{
  difficultyId: string
  voteData: VoteListResponse | null
  loading: boolean
  isHeadRanking: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const FIRST_LOAD_VOTES = 3

const { confirmModal, ask } = useConfirmAction()
const votes = computed(() => props.voteData?.votes ?? [])
const countKey = computed(() => `rank-votes:${props.difficultyId}`)

watch(
  () => props.voteData,
  (data) => {
    if (data) rememberCount(countKey.value, data.votes.length)
  },
)

function askDeactivate(vote: VoteResponse) {
  ask({
    title: 'Deactivate Vote',
    message: `Deactivate the vote from ${vote.staff.username ?? 'this staff member'}?`,
    confirmLabel: 'Deactivate',
    destructive: true,
    run: async () => {
      const { deactivateVote } = await import('@/api/ranking/voting')
      await deactivateVote(props.difficultyId, vote.id)
      emit('changed')
    },
  })
}
</script>

<template>
  <section class="votes">
    <h2 class="section-title votes__title">
      Votes <span v-if="voteData" class="caption">{{ votes.length }}</span>
    </h2>

    <p v-if="!loading && !votes.length" class="caption votes__empty">No votes yet</p>
    <SwapList
      v-else
      as="ul"
      class="votes__list"
      :items="votes"
      :item-key="(vote) => vote.id"
      :loading="loading && !voteData"
      :refreshing="loading && !!voteData"
      :placeholders="knownCount(countKey, FIRST_LOAD_VOTES)"
    >
      <template #placeholder>
        <li class="placeholder"><SkeletonLoader height="64px" /></li>
      </template>
      <template #default="{ item: vote, swap }">
        <li v-bind="swap" class="vote">
          <VoteBody :vote="vote" />
          <span class="caption vote__date">{{ formatRelativeDate(vote.createdAt) }}</span>
          <IconButton
            v-if="isHeadRanking"
            icon="close"
            :label="`Deactivate ${vote.staff.username ?? 'this'} vote`"
            @click="askDeactivate(vote)"
          />
        </li>
      </template>
    </SwapList>

    <ConfirmModal v-bind="confirmModal" />
  </section>
</template>

<style scoped>
.votes {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.votes__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0;
}

.votes__empty {
  display: flex;
  align-items: center;
  min-height: 64px;
}

.votes__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.vote {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0 var(--space-md);
  min-height: 64px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-btn);
}

.vote__date {
  white-space: nowrap;
}
</style>
