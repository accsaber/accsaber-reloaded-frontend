<script setup lang="ts">
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import IconButton from '@/components/common/IconButton.vue'
import VoteList from '@/components/domain/VoteList.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import type { VoteListResponse, VoteResponse } from '@/types/api/maps'

const props = defineProps<{
  difficultyId: string
  voteData: VoteListResponse | null
  loading: boolean
  isHeadRanking: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const { confirmModal, ask } = useConfirmAction()

function askDeactivate(vote: VoteResponse) {
  ask({
    title: 'Deactivate Vote',
    message: `Deactivate the vote from ${vote.staff?.username ?? 'this staff member'}?`,
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
  <VoteList :difficulty-id="difficultyId" :vote-data="voteData" :loading="loading">
    <template v-if="isHeadRanking" #action="{ vote }">
      <IconButton icon="close" :label="`Deactivate ${vote.staff?.username ?? 'this'} vote`" @click="askDeactivate(vote)" />
    </template>
  </VoteList>
  <ConfirmModal v-bind="confirmModal" />
</template>
