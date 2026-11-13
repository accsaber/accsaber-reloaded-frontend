<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import type { MilestoneCompletionResponse } from '@/types/api/milestones'
import { formatAccuracy } from '@/utils/formatters'
import { formatDifficulty, milestoneScoreAccuracy } from '@/utils/mappers'
import { computed } from 'vue'

const props = defineProps<{ milestone: MilestoneCompletionResponse }>()

const accuracy = computed(() => milestoneScoreAccuracy(props.milestone))
</script>

<template>
  <div v-if="accuracy !== null" class="milestone-score">
    <CoverImage v-if="milestone.map" :source="milestone.map" :alt="milestone.map.songName" :size="40" />
    <div class="milestone-score__info">
      <span class="milestone-score__text">
        <strong>{{ formatAccuracy(accuracy) }}</strong> on
        <span class="milestone-score__song">
          <SongTitle :name="milestone.map?.songName ?? 'Unknown Song'" :sub-name="milestone.map?.songSubName" />
          <template v-if="milestone.map?.songAuthor"> - {{ milestone.map.songAuthor }}</template>
        </span>
        <template v-if="milestone.map"> ({{ formatDifficulty(milestone.map.difficulty) }})</template>
      </span>
      <span v-if="milestone.map?.mapAuthor" class="caption">Mapped by {{ milestone.map.mapAuthor }}</span>
    </div>
  </div>
</template>

<style scoped>
.milestone-score {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.milestone-score__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.milestone-score__text {
  font-size: var(--text-body);
  line-height: 1.4;
  color: var(--text-secondary);
}

.milestone-score__text strong {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-primary);
}

.milestone-score__song {
  color: var(--text-primary);
}
</style>
