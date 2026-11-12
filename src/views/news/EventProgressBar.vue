<script setup lang="ts">
import ProgressBar from '@/components/common/ProgressBar.vue'
import type { EventProfileResponse } from '@/types/api/events'
import { computed } from 'vue'

const props = defineProps<{
  profile: EventProfileResponse
  totalMissions: number
}>()

const progress = computed(() =>
  props.totalMissions > 0 ? props.profile.missionsCompleted / props.totalMissions : 0,
)

const completed = computed(() => props.profile.completedAt != null || props.profile.bonusAwarded)
</script>

<template>
  <div class="event-progress" :class="{ 'event-progress--done': completed }">
    <span class="event-progress__label">
      {{ completed ? 'Event complete' : `${profile.missionsCompleted} of ${totalMissions} missions` }}
    </span>
    <ProgressBar :value="progress" />
  </div>
</template>

<style scoped>
.event-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  max-width: 480px;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.event-progress__label {
  font-weight: 600;
}

.event-progress--done {
  --bar-color: var(--success);
}

.event-progress--done .event-progress__label {
  color: var(--success);
}
</style>
