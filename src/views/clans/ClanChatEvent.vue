<script setup lang="ts">
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ChatEvent, ChatMessageResponse } from '@/types/api/chat'
import { computed } from 'vue'

const props = defineProps<{
  message: ChatMessageResponse
  count: number
}>()

type Slot = 'actor' | 'subject' | 'clan'

interface Sentence {
  before?: string
  first?: Slot
  middle?: string
  second?: Slot
  after?: string
}

const SENTENCES: Record<ChatEvent, Sentence> = {
  member_joined: { first: 'subject', middle: 'joined the clan' },
  member_left: { first: 'subject', middle: 'left the clan' },
  member_kicked: { first: 'subject', middle: 'was kicked by', second: 'actor' },
  alliance_formed: { before: 'Alliance formed with', first: 'clan' },
  alliance_ended: { before: 'Alliance ended with', first: 'clan' },
  rival_declared: { first: 'actor', middle: 'called', second: 'clan', after: 'a rival' },
  rivaled_by: { first: 'clan', middle: 'called this clan a rival' },
  war_declared: { first: 'actor', middle: 'declared war on', second: 'clan' },
  war_received: { first: 'clan', middle: 'declared war on this clan' },
  war_started: { before: 'The war with', first: 'clan', middle: 'has started' },
  war_hit: { first: 'actor', middle: 'hit', second: 'subject' },
  war_break: { first: 'actor', middle: 'broke the guard of', second: 'subject' },
  war_ended: { before: 'The war with', first: 'clan', middle: 'has ended' },
}

const sentence = computed(() => SENTENCES[props.message.event!])

const players = computed(() => ({
  actor: props.message.author,
  subject: props.message.subject ?? props.message.author,
}))
</script>

<template>
  <span class="chat-event">
    <template v-if="count > 1">
      <span class="chat-event__count">{{ count }} hits</span>
      <span>, latest:</span>
    </template>
    <span v-if="sentence.before">{{ sentence.before }}</span>
    <template v-for="(slot, index) in [sentence.first, sentence.second]" :key="index">
      <ClanTag v-if="slot === 'clan' && message.clan" :clan="message.clan" size="sm" />
      <UserChip v-else-if="slot && slot !== 'clan' && players[slot]" :user="players[slot]!" size="xs" compact link />
      <span v-if="index === 0 && sentence.middle">{{ sentence.middle }}</span>
    </template>
    <span v-if="sentence.after">{{ sentence.after }}</span>
  </span>
</template>

<style scoped>
.chat-event {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0 var(--space-xs);
}

.chat-event__count {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-secondary);
}
</style>
