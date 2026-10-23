<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChatPanel from '@/components/domain/ChatPanel.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { UseChatReturn } from '@/composables/useChat'
import type { ChatMessageResponse } from '@/types/api/chat'
import type { ConnectionStatus } from '@/types/display'
import ClanChatEvent from './ClanChatEvent.vue'
import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { PresenceNotice } from '@/composables/useClanChat'

const VIEWS = [
  { key: 'chat', label: 'Chat' },
  { key: 'feed', label: 'Notifications' },
]

const props = defineProps<{
  chat: UseChatReturn
  feed?: UseChatReturn
  notices?: PresenceNotice[]
  status?: ConnectionStatus
  readonly?: boolean
  closable?: boolean
  clanSlug?: string
}>()

const emit = defineEmits<{ close: [] }>()

const view = ref('chat')
const showFeed = computed(() => !!props.feed && view.value === 'feed')

function eventTo(message: ChatMessageResponse): RouteLocationRaw | null {
  if (message.war) return { name: 'clan-war', params: { warId: message.war.id } }
  if (message.event === 'missions_refreshed' && props.clanSlug) {
    return { name: 'clan-detail', params: { slugOrId: props.clanSlug }, query: { tab: 'missions' } }
  }
  return null
}
</script>

<template>
  <section class="clan-chat">
    <p v-if="status === 'reconnecting'" class="clan-chat__stale">Reconnecting, new messages may be late.</p>
    <ChatPanel
      :key="view"
      :chat="showFeed && feed ? feed : chat"
      title="Clan chat"
      placeholder="Message your clan"
      :empty-text="showFeed ? 'Nothing happened yet.' : 'Nothing said yet.'"
      :notices="showFeed || !feed ? notices : []"
      :collapse-events="['war_hit']"
      :feed="showFeed"
      :readonly="readonly || showFeed"
      :closable="closable"
      @close="emit('close')"
    >
      <template v-if="feed" #title>
        <BaseTabs v-model="view" :tabs="VIEWS" variant="segmented" label="Clan chat" />
      </template>
      <template #event="{ message, count }">
        <RouterLink
          v-if="eventTo(message)"
          class="clan-chat__event-link"
          :class="{ 'clan-chat__event-link--row': showFeed }"
          :to="eventTo(message)!"
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

.clan-chat__event-link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dotted var(--text-tertiary);
}

.clan-chat__event-link--row {
  border-bottom: none;
}

.clan-chat__event-link:hover {
  color: var(--page-accent, var(--accent));
  border-bottom-color: currentColor;
}

.clan-chat__presence {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}
</style>
