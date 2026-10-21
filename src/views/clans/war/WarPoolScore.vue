<script setup lang="ts">
import type { MyScoreSummary } from '@/types/api/users'
import { formatAccuracy } from '@/utils/formatters'

defineProps<{
  score: MyScoreSummary
}>()
</script>

<template>
  <span class="war-pool-score__acc">{{ formatAccuracy(score.accuracy) }}</span>
  <span>{{ Math.round(score.ap ?? 0) }} AP</span>
</template>

<style scoped>
.war-pool-score__acc {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}
</style>
