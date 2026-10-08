<script setup lang="ts">
import ChatPanel from '@/components/domain/ChatPanel.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { UseChatReturn } from '@/composables/useChat'
import type { ConnectionStatus } from '@/types/display'
import ClanChatEvent from './ClanChatEvent.vue'
import type { PresenceNotice } from './useClanChat'

defineProps<{
  chat: UseChatReturn
  notices: PresenceNotice[]
  status: ConnectionStatus
}>()
</script>

<template>
  <section class="clan-chat">
    <p v-if="status === 'reconnecting'" class="clan-chat__stale">Reconnecting, new messages may be late.</p>
    <ChatPanel
      :chat="chat"
      title="Clan chat"
      placeholder="Message your clan"
      empty-text="Nothing said yet."
      :notices="notices"
      :collapse-events="['war_hit']"
    >
      <template #event="{ message, count }">
        <RouterLink
          v-if="message.war"
          class="clan-chat__war-link"
          :to="{ name: 'clan-war', params: { warId: message.war.id } }"
        >
          <ClanChatEvent :message="message" :count="count" />
        </RouterLink>
        <ClanChatEvent v-else :message="message" :count="count" />
      </template>
      <template #notice="{ notice }">
        <span class="clan-chat__presence">
          <UserChip :user="(notice as PresenceNotice).player" size="xs" compact />
          <span>{{ (notice as PresenceNotice).online ? 'came online' : 'went offline' }}</span>
        </span>
      </template>
    </ChatPanel>
  </section>
</template>

<style scoped>
.clan-chat {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.clan-chat__stale {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.clan-chat__war-link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dotted var(--text-tertiary);
}

.clan-chat__war-link:hover {
  color: var(--page-accent, var(--accent));
  border-bottom-color: currentColor;
}

.clan-chat__presence {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}
</style>
