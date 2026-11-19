<script setup lang="ts">
import AutoCriteriaCheck from '@/components/domain/AutoCriteriaCheck.vue'
import CriteriaVerdict from '@/components/domain/CriteriaVerdict.vue'
import HeroFact from '@/components/domain/HeroFact.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  AutoCriteriaCheckResponse,
  MapDifficultyResponse,
  PublicMapDifficultyResponse,
  VoteListResponse,
} from '@/types/api/maps'
import { MAP_STATUS_LABELS } from '@/utils/constants'
import { computed } from 'vue'

type Shared = 'id' | 'status' | 'criteriaStatus' | 'autoCriteriaStatus' | 'deactivatedAt' | 'importedBy'
type StaffVotes = 'criteriaUpvotes' | 'criteriaDownvotes' | 'headCriteriaVote'

const props = defineProps<{
  difficulty: Pick<PublicMapDifficultyResponse, Shared> & Partial<Pick<MapDifficultyResponse, StaffVotes>>
  voteData: VoteListResponse | null
  run?: () => Promise<AutoCriteriaCheckResponse>
}>()

const criteriaSource = computed(() => ({
  criteriaStatus: props.difficulty.criteriaStatus,
  autoCriteriaStatus: null,
  criteriaUpvotes: props.voteData?.criteriaUpvotes ?? props.difficulty.criteriaUpvotes,
  criteriaDownvotes: props.voteData?.criteriaDownvotes ?? props.difficulty.criteriaDownvotes,
  headCriteriaVote: props.voteData?.headCriteriaVote ?? props.difficulty.headCriteriaVote,
}))
</script>

<template>
  <slot />
  <HeroFact label="Status">{{ difficulty.deactivatedAt ? 'Rejected' : MAP_STATUS_LABELS[difficulty.status] }}</HeroFact>
  <HeroFact v-if="difficulty.importedBy" label="Suggested By">
    <UserChip :user="difficulty.importedBy" size="sm" link tooltip hide-clan hide-flag />
  </HeroFact>
  <template v-if="difficulty.status !== 'RANKED' && !difficulty.deactivatedAt">
    <HeroFact label="Criteria"><CriteriaVerdict :source="criteriaSource" /></HeroFact>
    <AutoCriteriaCheck :difficulty-id="difficulty.id" :status="difficulty.autoCriteriaStatus" :run="run" />
  </template>
  <slot name="end" />
</template>
