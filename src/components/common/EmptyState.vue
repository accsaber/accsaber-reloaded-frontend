<script setup lang="ts">
import BaseButton from './BaseButton.vue';

defineProps<{
  icon?: string
  message: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="empty-state">
    <span v-if="icon" class="empty-state__icon">{{ icon }}</span>
    <p class="empty-state__message">{{ message }}</p>
    <BaseButton v-if="actionLabel" variant="primary" @click="$emit('action')">
      {{ actionLabel }}
    </BaseButton>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-3xl) var(--space-lg);
  text-align: center;
}

.empty-state__icon {
  font-size: 2rem;
  opacity: 0.5;
}

.empty-state__message {
  color: var(--text-secondary);
  font-size: var(--text-body);
  margin: 0;
  max-width: 320px;
}
</style>
