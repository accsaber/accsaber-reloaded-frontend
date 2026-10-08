<script setup lang="ts">
import { onAvatarError, pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import { messageTimeMillis, type UseChatReturn } from '@/composables/useChat'
import { useAuthStore } from '@/stores/auth'
import type { ChatEvent, ChatMessageResponse } from '@/types/api/chat'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, nextTick, ref, watch } from 'vue'

export interface ChatNotice {
  id: string
  at: number
}

type ChatEntry =
  | { kind: 'message'; key: string; message: ChatMessageResponse }
  | { kind: 'event'; key: string; message: ChatMessageResponse; count: number }
  | { kind: 'notice'; key: string; notice: ChatNotice }

const MAX_LIVE_MESSAGES = 300

const props = withDefaults(
  defineProps<{
    chat: UseChatReturn
    title: string
    placeholder: string
    emptyText: string
    floating?: boolean
    notices?: ChatNotice[]
    collapseEvents?: ChatEvent[]
    authorColor?: (userId: string) => string
  }>(),
  { notices: () => [], collapseEvents: () => [] },
)

const emit = defineEmits<{ typing: []; 'typing-stop': [] }>()

const auth = useAuthStore()

const open = ref(!props.floating)
const draft = ref('')
const seenIds = ref(new Set<string>())
const scroller = ref<HTMLDivElement | null>(null)

const messages = computed(() => props.chat.messages.value)

const unread = computed(() => {
  if (open.value) return 0
  let n = 0
  for (const m of messages.value) if (!seenIds.value.has(m.id)) n += 1
  return n
})

function markSeen() {
  const list = messages.value
  if (list.length === 0) return
  const next = new Set(seenIds.value)
  let changed = false
  for (const m of list) {
    if (!next.has(m.id)) {
      next.add(m.id)
      changed = true
    }
  }
  if (changed) seenIds.value = next
}

function isSelf(m: ChatMessageResponse): boolean {
  return !!auth.userId && m.author.id === auth.userId
}

function displayTime(m: ChatMessageResponse): string {
  const ms = messageTimeMillis(m.createdAt)
  return ms ? formatRelativeDate(new Date(ms).toISOString()) : 'just now'
}

function isoTime(m: ChatMessageResponse): string {
  const ms = messageTimeMillis(m.createdAt)
  return ms ? new Date(ms).toISOString() : ''
}

function colorOf(m: ChatMessageResponse): string | undefined {
  return props.authorColor?.(m.author.id)
}

function sameRun(a: ChatMessageResponse, b: ChatMessageResponse): boolean {
  return !!a.event && a.event === b.event && props.collapseEvents.includes(a.event) && a.war?.id === b.war?.id
}

const entries = computed<ChatEntry[]>(() => {
  const timeline: { at: number; entry: ChatEntry }[] = []
  for (const m of messages.value) {
    const at = messageTimeMillis(m.createdAt)
    const last = timeline[timeline.length - 1]?.entry
    if (m.event && last?.kind === 'event' && sameRun(last.message, m)) {
      timeline[timeline.length - 1] = {
        at,
        entry: { kind: 'event', key: last.key, message: m, count: last.count + 1 },
      }
    } else if (m.event) {
      timeline.push({ at, entry: { kind: 'event', key: m.id, message: m, count: 1 } })
    } else {
      timeline.push({ at, entry: { kind: 'message', key: m.id, message: m } })
    }
  }
  for (const notice of props.notices) {
    const index = timeline.findIndex((t) => t.at > notice.at)
    const item = { at: notice.at, entry: { kind: 'notice', key: notice.id, notice } as ChatEntry }
    if (index === -1) timeline.push(item)
    else timeline.splice(index, 0, item)
  }
  return timeline.map((t) => t.entry)
})

function scrollToBottom() {
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

function nearBottom(): boolean {
  const el = scroller.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  void props.chat.loadHistory()
  await nextTick()
  scrollToBottom()
  markSeen()
}

const TOP_THRESHOLD = 64

async function loadMoreAtTop() {
  const el = scroller.value
  if (!el) return
  const prevHeight = el.scrollHeight
  const prevTop = el.scrollTop
  await props.chat.loadOlder()
  await nextTick()
  el.scrollTop = prevTop + (el.scrollHeight - prevHeight)
}

function onScroll() {
  const el = scroller.value
  if (!el) return
  if (el.scrollTop <= TOP_THRESHOLD && props.chat.hasMore.value && !props.chat.loadingMore.value) {
    void loadMoreAtTop()
  }
}

async function onSend() {
  const ok = await props.chat.send(draft.value)
  if (!ok) return
  draft.value = ''
  emit('typing-stop')
  await nextTick()
  scrollToBottom()
  markSeen()
}

watch(
  () => entries.value.length,
  async () => {
    if (!open.value) return
    const stick = nearBottom()
    if (stick) props.chat.trim(MAX_LIVE_MESSAGES)
    await nextTick()
    if (stick) scrollToBottom()
    markSeen()
  },
)

if (!props.floating) void props.chat.loadHistory()
</script>

<template>
  <section
    class="chat-panel"
    :class="{ 'chat-panel--open': open, 'chat-panel--floating': floating }"
    :aria-label="title"
  >
    <button
      v-if="floating"
      type="button"
      class="chat-panel__toggle"
      :aria-expanded="open"
      :aria-label="title"
      @click="toggle"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span class="chat-panel__toggle-label">Chat</span>
      <span
        v-if="unread > 0"
        :key="unread"
        class="chat-panel__badge"
        :aria-label="`${unread} unread ${unread === 1 ? 'message' : 'messages'}`"
        >{{ unread > 99 ? '99+' : unread }}</span
      >
    </button>

    <div v-if="open" class="chat-panel__panel">
      <header class="chat-panel__head">
        <h2 class="chat-panel__title">{{ title }}</h2>
        <button
          v-if="floating"
          type="button"
          class="chat-panel__close"
          aria-label="Collapse chat"
          @click="toggle"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </header>

      <div
        ref="scroller"
        class="chat-panel__log"
        role="log"
        aria-live="polite"
        @scroll.passive="onScroll"
      >
        <div v-if="chat.loading.value && messages.length === 0" class="chat-panel__state">
          Loading messages…
        </div>

        <div v-if="messages.length > 0" class="chat-panel__spacer" aria-hidden="true" />

        <div v-if="chat.loadingMore.value" class="chat-panel__loading-more" aria-live="polite">
          <span class="chat-panel__spinner" aria-hidden="true" />
          Loading earlier messages…
        </div>

        <p
          v-if="!chat.loading.value && messages.length === 0"
          class="chat-panel__state chat-panel__state--empty"
        >
          {{ emptyText }}
        </p>

        <template v-for="entry in entries" :key="entry.key">
        <div v-if="entry.kind === 'event'" class="chat-panel__line">
          <slot name="event" :message="entry.message" :count="entry.count" />
        </div>
        <div v-else-if="entry.kind === 'notice'" class="chat-panel__line">
          <slot name="notice" :notice="entry.notice" />
        </div>
        <article
          v-else
          class="chat-panel__msg"
          :class="{ 'chat-panel__msg--self': isSelf(entry.message) }"
          :style="colorOf(entry.message) ? { '--author-color': colorOf(entry.message) } : undefined"
        >
          <span class="chat-panel__avatar" aria-hidden="true">
            <img
              v-if="pickAvatarUrl(entry.message.author)"
              :src="pickAvatarUrl(entry.message.author)"
              :alt="entry.message.author.name"
              loading="lazy"
              @error="onAvatarError(pickAvatarFallback(entry.message.author))($event)"
            />
            <span v-else class="chat-panel__avatar-initial">{{ entry.message.author.name.charAt(0) }}</span>
          </span>
          <div class="chat-panel__bubble">
            <div class="chat-panel__meta">
              <span class="chat-panel__author">{{ entry.message.author.name }}</span>
              <time class="chat-panel__time" :datetime="isoTime(entry.message)">
                {{ displayTime(entry.message) }}
              </time>
            </div>
            <p class="chat-panel__text">{{ entry.message.content }}</p>
          </div>
        </article>
        </template>
      </div>

      <div class="chat-panel__composer">
        <p v-if="chat.error.value" class="chat-panel__error" role="alert">
          {{ chat.error.value }}
        </p>
        <p v-if="chat.contentError.value" class="chat-panel__error" role="alert">
          {{ chat.contentError.value }}
        </p>
        <div class="chat-panel__input-row">
          <textarea
            v-model="draft"
            class="chat-panel__input"
            rows="1"
            :placeholder="placeholder"
            aria-label="Message"
            :aria-invalid="!!chat.contentError.value"
            @focus="emit('typing')"
            @input="emit('typing')"
            @blur="emit('typing-stop')"
            @keydown.enter.exact.prevent="onSend"
          />
          <button
            type="button"
            class="chat-panel__send"
            aria-label="Send message"
            :disabled="chat.sending.value || draft.trim().length === 0"
            @click="onSend"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.chat-panel--floating {
  position: absolute;
  right: var(--space-md);
  bottom: var(--space-md);
  z-index: 6;
  align-items: flex-end;
  gap: var(--space-sm);
  width: auto;
  pointer-events: none;
}

.chat-panel__toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}

.chat-panel__toggle:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.chat-panel--open .chat-panel__toggle {
  display: none;
}

.chat-panel__badge {
  position: absolute;
  top: -7px;
  right: -7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--bg-base);
  background: var(--page-accent, var(--accent));
  border: 2px solid var(--bg-base);
  border-radius: 999px;
  transform-origin: center;
  animation: chat-badge-pop 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes chat-badge-pop {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-panel__badge {
    animation: none;
  }
}

.chat-panel__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: min(620px, 70vh);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: 6px;
  overflow: hidden;
  pointer-events: auto;
}

.chat-panel--floating .chat-panel__panel {
  width: min(340px, calc(100vw - var(--space-lg)));
  height: min(460px, 60vh);
}

.chat-panel__line {
  align-self: center;
  max-width: 100%;
  font-size: var(--text-caption);
  line-height: 1.6;
  text-align: center;
  color: var(--text-tertiary);
}

.chat-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.chat-panel__title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  transition:
    color 120ms ease,
    background 120ms ease;
}

.chat-panel__close:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.chat-panel__log {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
}

.chat-panel__log::-webkit-scrollbar {
  width: 5px;
}

.chat-panel__log::-webkit-scrollbar-thumb {
  background: var(--bg-overlay);
  border-radius: 3px;
}

.chat-panel__spacer {
  flex: 1 0 0;
}

.chat-panel__state {
  margin: auto;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.5;
}

.chat-panel__loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 2px 0 4px;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.chat-panel__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--bg-overlay);
  border-top-color: var(--page-accent, var(--accent));
  border-radius: 50%;
  animation: chat-spin 700ms linear infinite;
}

@keyframes chat-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-panel__spinner {
    animation: none;
  }
}

.chat-panel__msg {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
  align-self: flex-start;
  max-width: 85%;
}

.chat-panel__msg--self {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.chat-panel__avatar {
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid var(--author-color, var(--bg-overlay));
  overflow: hidden;
  background: var(--bg-elevated);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-panel__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.chat-panel__avatar-initial {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.chat-panel__bubble {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: 4px;
}

.chat-panel__msg--self .chat-panel__bubble {
  border-color: color-mix(in srgb, var(--author-color, var(--bg-overlay)) 35%, var(--bg-overlay));
}

.chat-panel__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.chat-panel__author {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--author-color, var(--text-primary));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-panel__time {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  color: var(--text-tertiary);
}

.chat-panel__text {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-panel__composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-sm) var(--space-md) var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.chat-panel__error {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--error);
  line-height: 1.4;
}

.chat-panel__input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 6px;
  align-items: end;
}

.chat-panel__input {
  width: 100%;
  min-height: 34px;
  max-height: 110px;
  padding: 8px 10px;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-primary);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  outline: none;
  resize: none;
  line-height: 1.4;
  transition: border-color 120ms ease;
}

.chat-panel__input:focus {
  border-color: var(--page-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent, var(--accent)) 20%, transparent);
}

.chat-panel__input[aria-invalid='true'] {
  border-color: var(--error);
}

.chat-panel__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--page-accent, var(--accent));
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: 3px;
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.chat-panel__send:hover:not(:disabled) {
  border-color: var(--page-accent, var(--accent));
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 10%, transparent);
}

.chat-panel__send:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

@media (max-width: 860px) {
  .chat-panel--floating {
    position: fixed;
  }
}
</style>
