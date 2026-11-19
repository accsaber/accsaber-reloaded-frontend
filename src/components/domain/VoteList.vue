<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import VoteBody from '@/components/domain/VoteBody.vue'
import VoteTime from '@/components/domain/VoteTime.vue'
import type { VoteListResponse, VoteResponse } from '@/types/api/maps'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { voteNicknames } from '@/utils/voteNickname'
import { computed, watch } from 'vue'

const props = defineProps<{
  difficultyId: string
  voteData: VoteListResponse | null
  loading: boolean
}>()

defineSlots<{
  action?: (props: { vote: VoteResponse }) => unknown
}>()

const FIRST_LOAD_VOTES = 3

const votes = computed(() => props.voteData?.votes ?? [])
const countKey = computed(() => `rank-votes:${props.difficultyId}`)
const nicknames = computed(() => voteNicknames(votes.value.filter((vote) => !vote.staff).map((vote) => vote.id)))

watch(
  () => props.voteData,
  (data) => {
    if (data) rememberCount(countKey.value, data.votes.length)
  },
)
</script>

<template>
  <section class="surface-card votes">
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
          <VoteBody :vote="vote" :nickname="nicknames.get(vote.id)" />
          <VoteTime :vote="vote" />
          <slot name="action" :vote="vote" />
        </li>
      </template>
    </SwapList>
  </section>
</template>

<style scoped>
.votes {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
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
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-height: 64px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-btn);
}

.vote > :first-child {
  flex: 1;
}
</style>
