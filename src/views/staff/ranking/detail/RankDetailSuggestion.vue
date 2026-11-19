<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import type { MapDifficultyResponse } from '@/types/api/maps'
import { ref } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
}>()

const emit = defineEmits<{
  updated: [difficulty: MapDifficultyResponse]
}>()

const queueing = ref(false)
const error = ref('')

async function addToQueue() {
  queueing.value = true
  error.value = ''
  try {
    const { queueSuggestion } = await import('@/api/ranking/maps')
    emit('updated', await queueSuggestion(props.difficulty.id))
  } catch (err) {
    error.value = parseApiError(err, 'Could not add it to the queue').message
  } finally {
    queueing.value = false
  }
}
</script>

<template>
  <section class="surface-card suggestion">
    <h2 class="section-title">Suggestion</h2>
    <div class="suggestion__actions">
      <BaseButton variant="primary" :loading="queueing" @click="addToQueue">Add to Queue</BaseButton>
      <p class="caption suggestion__error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.suggestion {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.suggestion__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.suggestion__error {
  margin: 0;
  color: var(--error);
}
</style>
