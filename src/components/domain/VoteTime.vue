<script setup lang="ts">
import type { VoteResponse } from '@/types/api/maps'
import { formatDateTime, formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'

const props = defineProps<{
  vote: Pick<VoteResponse, 'createdAt' | 'updatedAt'>
}>()

const EDIT_THRESHOLD_MS = 1000

const edited = computed(() => Date.parse(props.vote.updatedAt) - Date.parse(props.vote.createdAt) > EDIT_THRESHOLD_MS)
</script>

<template>
  <time class="caption vote-time" :datetime="vote.updatedAt" :title="edited ? `Voted ${formatDateTime(vote.createdAt)}` : undefined">
    {{ edited ? 'Edited ' : '' }}{{ formatRelativeDate(vote.updatedAt) }}
  </time>
</template>

<style scoped>
.vote-time {
  white-space: nowrap;
}
</style>
