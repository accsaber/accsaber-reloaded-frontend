<script setup lang="ts">
import ChatPanel from '@/components/domain/ChatPanel.vue'
import type { UseChatReturn } from '@/composables/useChat'
import { useAuthStore } from '@/stores/auth'

withDefaults(defineProps<{
  difficultyId: string
  chat: UseChatReturn
  title?: string
  warning?: string
}>(), {
  title: 'Comments',
  warning: undefined,
})

const auth = useAuthStore()
</script>

<template>
  <ChatPanel :key="difficultyId" class="map-comments" :chat="chat" :title="title" placeholder="Add a comment"
    empty-text="No comments yet" :readonly="!auth.userId">
    <template #title>
      <div class="map-comments__title">
        <h2 class="section-title">{{ title }}</h2>
        <span v-if="warning" class="caption map-comments__warning">{{ warning }}</span>
      </div>
      <slot name="action" />
    </template>
  </ChatPanel>
</template>

<style scoped>
.map-comments {
  --chat-panel-height: min(560px, 70vh);
  --chat-panel-border: 0;
  --chat-panel-radius: var(--radius-card);
  --chat-panel-inset: var(--space-lg);
  min-height: var(--chat-panel-height);
}

.map-comments__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--space-md);
  min-width: 0;
}

.map-comments__warning {
  color: var(--warning);
}
</style>
